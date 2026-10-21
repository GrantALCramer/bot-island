// Bot Island server: folds <bot>.jsonl event files from the configured sources (lib/sources.js) into a state
// snapshot, serves the built frontend (dist/), GET /api/state, /agent.txt, and pushes updates over WebSocket (/ws).
// Run directly (`node server.js [--config f] [--port n] ...`, never opens a browser) or via the launcher cli.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';
import { loadConfig, redactUrl } from './lib/config.js';
import { makeSources } from './lib/sources.js';
import { Hooks, ChatStore, BOT_RE, MAX_TEXT, checkUrl, checkHeader, deliver, limiter, DEFAULT_HEADER, DEFAULT_PREFIX } from './lib/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.BOTISLAND_DIST ? path.resolve(process.env.BOTISLAND_DIST) : path.join(__dirname, 'dist');
const SPEC = path.join(__dirname, 'AGENT_REPORTING.md');
// filled in by startServer(config)
let C = null; let SOURCES = []; let HOOKS = null; let CHAT = null;

const STATE_ALIASES = {
  coding: 'working', writing: 'working', building: 'working', busy: 'working',
  research: 'researching', browsing: 'researching', reading: 'researching',
  waiting: 'waiting_on_user', waiting_on_you: 'waiting_on_user', blocked: 'waiting_on_user', needs_you: 'waiting_on_user',
  failed: 'error', errored: 'error', finished: 'done', complete: 'done', completed: 'done',
  sleeping: 'stale', asleep: 'stale', break: 'thinking', cafe: 'thinking', planning: 'thinking',
};
const STATES = new Set(['idle', 'working', 'researching', 'thinking', 'waiting_on_user', 'error', 'done', 'stale']);
const normState = (s) => { s = String(s || 'idle').toLowerCase().trim().replace(/[\s-]+/g, '_'); s = STATE_ALIASES[s] || s; return STATES.has(s) ? s : 'working'; };
const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- profiles of real Grok Bots on this box (read-only, optional) ----------
function readProfiles() {
  const out = []; const AGENTS_DIR = C?.agentsDir; if (!AGENTS_DIR) return out;
  try {
    for (const id of fs.readdirSync(AGENTS_DIR)) {
      const f = path.join(AGENTS_DIR, id, 'profile.json');
      try {
        const p = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!p.name) continue;
        out.push({ id: slug(p.name), agentId: id, name: p.name, title: p.title || p.description || '', shape: p.avatarShape || null, color: p.avatarColor || null });
      } catch {}
    }
  } catch {}
  return out;
}

// ---------- fold real events ----------
let CONFIG_FILE = null; let DATA_DIR = null; let reloadEvents = () => {};
const VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version; } catch { return '?'; } })();
let LOG = []; // every event (newest last), for the activity log panel
function readEvents() {
  const bots = {}; const all = []; const log = []; const seen = new Set();
  // gather every source (folders, git caches); the same bot may report into several, so fold in time order
  for (const src of SOURCES) {
    let files = [];
    try { files = fs.readdirSync(src.dir).filter((f) => f.endsWith('.jsonl')); } catch {}
    for (const f of files) {
      let lines = [];
      try { lines = fs.readFileSync(path.join(src.dir, f), 'utf8').split('\n').filter(Boolean).slice(-300); } catch {}
      for (const line of lines) {
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (!e || typeof e !== 'object') continue;
        const ts = e.ts ? new Date(e.ts).getTime() : Date.now();
        const key = `${f}|${line.trim()}`; // the same report in two sources (local folder + git) counts once
        if (Number.isFinite(ts) && !seen.has(key)) { seen.add(key); all.push([ts, f, e]); }
      }
    }
  }
  all.sort((a, b) => a[0] - b[0]);
  {
    for (const [ts, f, e] of all) {
      const id = slug(e.bot || e.name || f.replace(/\.jsonl$/, ''));
      if (!id) continue;
      const b = bots[id] ||= { id, actions: [] };
      if (e.name) b.name = e.name;
      if (e.title || e.role) b.title = e.title || e.role;
      if (e.shape) b.shape = e.shape;
      if (e.color) b.color = e.color;
      if (e.state) { b.rawState = normState(e.state); b.stateSince = b.rawState !== b._last ? ts : b.stateSince; b._last = b.rawState; }
      if (e.task !== undefined) b.task = e.task;
      b.updatedAt = Math.max(b.updatedAt || 0, ts);
      // visiting: an explicit `with` field, or (checked in snapshot) another bot named in the note/action
      b.meet = { ts, with: e.with ? [].concat(e.with).map((x) => slug(String(x))).filter(Boolean) : [], text: String(e.action || e.note || '').slice(0, 300) };
      const text = e.action || e.note || (e.state ? `${normState(e.state)}${e.task ? ': ' + e.task : ''}` : null);
      if (text) b.actions.push({ ts, text: String(text).slice(0, 200), state: e.state ? normState(e.state) : undefined });
      log.push({ ts, bot: id, state: e.state ? normState(e.state) : undefined, task: e.task !== undefined ? String(e.task).slice(0, 200) : undefined, text: e.action || e.note ? String(e.action || e.note).slice(0, 200) : undefined, ...(e.with ? { with: [].concat(e.with).map((x) => slug(String(x))).filter(Boolean).slice(0, 4) } : {}) });
    }
  }
  for (const b of Object.values(bots)) { b.actions.sort((a, c) => a.ts - c.ts); b.actions = b.actions.slice(-10).reverse(); delete b._last; }
  LOG = log.slice(-3000);
  return bots;
}

// ---------- demo generator ----------
const DEMO_BOTS = [
  { id: 'pixel', name: 'Pixel', title: 'Frontend builder', shape: 'circle', color: 'blue' },
  { id: 'quill', name: 'Quill', title: 'Writer', shape: 'pill', color: 'purple' },
  { id: 'scout', name: 'Scout', title: 'Researcher', shape: 'triangle', color: 'green' },
  { id: 'pebble', name: 'Pebble', title: 'Inbox triage', shape: 'cloud', color: 'pink' },
  { id: 'bolt', name: 'Bolt', title: 'Ops & deploys', shape: 'hexagon', color: 'yellow' },
];
const TASKS = {
  working: ['Refactoring the landing page', 'Drafting the weekly report', 'Fixing the CSV import', 'Building a price tracker', 'Writing unit tests', 'Editing the podcast notes'],
  researching: ['Comparing 3D engines', 'Reading Grok Bot docs', 'Scanning X for agent dashboards', 'Pricing flights to Tokyo', 'Summarizing 12 papers'],
  thinking: ['Planning tomorrow', 'Sketching an approach', 'Coffee + outlining ideas'],
  waiting_on_user: ['Approve the email draft?', 'Which logo do you prefer?', 'Need a login for the CRM', 'OK to post this reply?'],
  error: ['Build failed: missing env var', 'Site blocked automation', 'API rate limit hit'],
  done: ['Shipped the report!', 'Inbox zero reached', 'Deployed v1.2', 'Research brief finished'],
  idle: ['Nothing queued', 'Chilling at home'],
  stale: ['No updates for a while'],
};
const WEIGHTS = {
  default: { working: 5, researching: 3, thinking: 2, waiting_on_user: 2, error: 1, done: 2, idle: 2, stale: 1 },
  pebble: { working: 2, researching: 1, thinking: 1, waiting_on_user: 1, error: 0.5, done: 1, idle: 4, stale: 4 },
};
const INITIAL = { pixel: 'working', quill: 'researching', scout: 'waiting_on_user', pebble: 'stale', bolt: 'error', sage: 'thinking', 'nova': 'done' };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function pickState(id, cur) {
  const w = WEIGHTS[id] || WEIGHTS.default; let tot = 0; const ent = Object.entries(w).filter(([s]) => s !== cur);
  for (const [, v] of ent) tot += v; let r = Math.random() * tot;
  for (const [s, v] of ent) { if ((r -= v) <= 0) return s; } return 'working';
}
let demo = {};
function demoReset(profiles) {
  demo = {}; const now = Date.now();
  let list = [...DEMO_BOTS, ...profiles.map((p) => ({ ...p }))];
  // DEMO_COUNT=N: pad (or trim) the demo roster to N bots, for testing island scaling
  const want = +(process.env.DEMO_COUNT || 0);
  if (want) {
    const NAMES = ['Nova', 'Kai', 'Juno', 'Ziggy', 'Pip', 'Remy', 'Taro', 'Lumi', 'Otto', 'Fern', 'Bix', 'Echo', 'Mika', 'Rook', 'Sunny', 'Wren', 'Dash', 'Koi', 'Indy', 'Moss', 'Gizmo', 'Tilly', 'Orbit', 'Peach', 'Rio', 'Sable', 'Tofu', 'Vex', 'Yuki', 'Zest', 'Ash', 'Bree', 'Cosmo', 'Dot', 'Ember', 'Flick', 'Gus', 'Hex', 'Ivy', 'Jinx'];
    const SH = ['circle', 'blob', 'oval', 'tablet', 'pill', 'triangle', 'hexagon', 'cloud', 'teardrop'];
    const CO = ['red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'coral', 'mint', 'lavender', 'gold', 'navy', 'lime'];
    for (let i = 0; list.length < want; i++) list.push({ id: `demo-${i}`, name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (1 + Math.floor(i / NAMES.length)) : ''), title: 'Demo bot', shape: SH[i % SH.length], color: CO[(i * 7) % CO.length] });
    list = list.slice(0, want);
  }
  for (const b of list) {
    const st = INITIAL[b.id] || pick(['working', 'researching', 'idle']);
    const task = pick(TASKS[st]);
    const actions = [];
    for (let i = 4; i >= 1; i--) { const s = pick(['working', 'researching', 'thinking', 'done']); actions.push({ ts: now - i * 7 * 60000 - Math.random() * 60000, text: `${s}: ${pick(TASKS[s])}`, state: s }); }
    actions.push({ ts: now, text: `${st}: ${task}`, state: st });
    demo[b.id] = { ...b, rawState: st, task, updatedAt: now, stateSince: now, actions: actions.reverse(), next: now + (process.env.DEMO_FIRST_MS ? +process.env.DEMO_FIRST_MS : 14000) + Math.random() * 10000, demo: true };
  }
}
function demoTick() {
  const now = Date.now(); let changed = false;
  for (const b of Object.values(demo)) {
    if (now < b.next) continue;
    const st = pickState(b.id, b.rawState); const task = pick(TASKS[st]);
    b.rawState = st; b.task = task; b.updatedAt = now; b.stateSince = now;
    b.actions.unshift({ ts: now, text: `${st}: ${task}`, state: st }); b.actions = b.actions.slice(0, 10);
    b.next = now + (st === 'stale' || st === 'idle' ? 20000 : 9000) + Math.random() * 9000;
    changed = true;
  }
  return changed;
}

// ---------- alert acks ----------
// The user can clear a bot's alert (waiting_on_user / error / done). We keep an ack record in the data dir keyed by
// the alert's report timestamp: that exact report shows as idle from then on (survives reloads, shared by every
// device), and any NEW report from the bot shows normally. Works for folder and git sources alike (never writes them).
const ALERTS = new Set(['waiting_on_user', 'error', 'done']);
let ACKS = {}; let ACK_FILE = null;
function loadAcks() { try { ACKS = JSON.parse(fs.readFileSync(ACK_FILE, 'utf8')).acks || {}; } catch { ACKS = {}; } }
function saveAcks() { const tmp = ACK_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ _comment: 'Bot Island: alerts the user cleared, keyed by bot -> report timestamp', acks: ACKS }, null, 2) + '\n'); fs.renameSync(tmp, ACK_FILE); }

// ---------- per-bot customization (color, hat, name tag), edited in the app; stored in the data dir ----------
export const HATS = ['none', 'tophat', 'crown', 'beanie', 'party', 'flower', 'cap'];
let CUSTOM = {}; let CUSTOM_FILE = null;
function loadCustom() { try { CUSTOM = JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf8')).bots || {}; } catch { CUSTOM = {}; } }
function saveCustom() { const tmp = CUSTOM_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ _comment: 'Bot Island: per-bot look set in the app (color, hat, name tag)', bots: CUSTOM }, null, 2) + '\n'); fs.renameSync(tmp, CUSTOM_FILE); }

// ---------- live weather (opt-in): Open-Meteo, no key; fetched here and cached ~15 min, stale cache when offline ----------
const US = 'AL:Alabama AK:Alaska AZ:Arizona AR:Arkansas CA:California CO:Colorado CT:Connecticut DE:Delaware FL:Florida GA:Georgia HI:Hawaii ID:Idaho IL:Illinois IN:Indiana IA:Iowa KS:Kansas KY:Kentucky LA:Louisiana ME:Maine MD:Maryland MA:Massachusetts MI:Michigan MN:Minnesota MS:Mississippi MO:Missouri MT:Montana NE:Nebraska NV:Nevada NH:New Hampshire NJ:New Jersey NM:New Mexico NY:New York NC:North Carolina ND:North Dakota OH:Ohio OK:Oklahoma OR:Oregon PA:Pennsylvania RI:Rhode Island SC:South Carolina SD:South Dakota TN:Tennessee TX:Texas UT:Utah VT:Vermont VA:Virginia WA:Washington WV:West Virginia WI:Wisconsin WY:Wyoming DC:District of Columbia'
  .split(/ (?=[A-Z]{2}:)/).reduce((o, x) => { const [k, v] = x.split(':'); o[k] = v; return o; }, {});
const WX_CACHE = new Map(); const WX_TTL = 15 * 60000;
// WMO weather code -> clear | cloudy | fog | rain | snow | storm
const wmo = (c) => (c <= 1 ? 'clear' : c <= 3 ? 'cloudy' : c <= 48 ? 'fog' : c <= 67 || (c >= 80 && c <= 82) ? 'rain' : c <= 77 || c === 85 || c === 86 ? 'snow' : 'storm');
async function getJson(u) { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(u, { signal: ac.signal, headers: { 'user-agent': 'BotIsland/1 (local app)' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); } }
async function liveWeather(loc) {
  const key = loc.toLowerCase(); const hit = WX_CACHE.get(key);
  if (hit && Date.now() - hit.at < WX_TTL) return { ...hit.data, cached: true };
  try {
    const [name, region] = loc.split(',').map((x) => x.trim());
    const g = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`);
    const want = region && (US[region.toUpperCase()] || region).toLowerCase();
    const place = (g.results || []).find((p) => !want || [p.admin1, p.country, p.country_code].some((x) => String(x || '').toLowerCase() === want)) || (g.results || [])[0];
    if (!place) return { error: 'place not found' };
    const f = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=weather_code,temperature_2m,is_day,wind_speed_10m&temperature_unit=fahrenheit&timezone=auto`);
    const cur = f.current || {};
    const data = { place: `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}`, code: cur.weather_code, cond: wmo(cur.weather_code ?? 0), tempF: cur.temperature_2m, isDay: !!cur.is_day, wind: cur.wind_speed_10m, time: cur.time, fetchedAt: Date.now() };
    WX_CACHE.set(key, { at: Date.now(), data }); return data;
  } catch (e) {
    if (hit) return { ...hit.data, offline: true }; // keep the last known weather when the network is gone
    return { error: 'offline', detail: String(e.message || e).slice(0, 80) };
  }
}

// ---------- snapshot ----------
let profiles = [];
let real = {};
const demoActive = () => C.demo === 'on' || (C.demo === 'auto' && Object.keys(real).length === 0);

function snapshot() {
  const now = Date.now(); const out = {}; const isDemo = demoActive();
  if (isDemo) for (const [k, v] of Object.entries(demo)) { const { next, ...rest } = v; out[k] = { ...rest, source: 'demo' }; }
  for (const p of profiles) if (!out[p.id]) out[p.id] = { ...p, rawState: 'stale', task: 'No reports yet', actions: [], updatedAt: 0, source: 'profile' };
  for (const [k, v] of Object.entries(real)) {
    const p = profiles.find((x) => x.id === k) || {};
    out[k] = { ...p, ...out[k], ...v, name: v.name || p.name || out[k]?.name || k, shape: v.shape || p.shape || out[k]?.shape, color: v.color || p.color || out[k]?.color, source: 'real' };
  }
  const VISIT_MS = 3 * 60000; const ids = Object.keys(out);
  const names = Object.values(out).map((b) => [b.id, String(b.name || b.id)]);
  const visitOf = (b) => { const m = b.meet; if (!m || now - m.ts > VISIT_MS) return null;
    const hit = m.with.find((x) => x !== b.id && ids.includes(x)); if (hit) return hit;
    for (const [id, nm] of names) { if (id === b.id || nm.length < 3) continue; const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^\\p{L}\\p{N}])@?(${esc(nm)}|${esc(id)})(?=$|[^\\p{L}\\p{N}])`, 'iu').test(m.text)) return id; }
    return null; };
  const bots = Object.values(out).map((b) => {
    let state = b.rawState || 'idle';
    if (b.source === 'real') {
      if (now - (b.updatedAt || 0) > C.staleMinutes * 60000) state = 'stale';
      else if (state === 'done' && now - (b.stateSince || b.updatedAt) > C.doneMinutes * 60000) state = 'idle';
    }
    let cleared = false; if (ALERTS.has(state) && ACKS[b.id] && ACKS[b.id].at >= (b.updatedAt || 0)) { state = 'idle'; cleared = true; }
    const cu = CUSTOM[b.id] || {};
    return { id: b.id, name: b.name || b.id, title: b.title || '', shape: b.shape || null, color: cu.color || b.color || null, hat: cu.hat || null, nameTag: cu.nameTag !== false, visit: b.source === 'real' ? visitOf(b) : null, custom: !!CUSTOM[b.id], state, task: b.task || '', updatedAt: b.updatedAt || 0, stateSince: b.stateSince || b.updatedAt || 0, actions: (b.actions || []).slice(0, 10), source: b.source, ...(cleared ? { cleared: true } : {}), profile: !!profiles.find((p) => p.id === b.id) };
  });
  // stable order: profile bots first, then alphabetical
  bots.sort((a, b) => (b.profile - a.profile) || a.name.localeCompare(b.name));
  return { demo: isDemo, now, staleMin: C.staleMinutes, sources: SOURCES.map((x) => x.status()), bots };
}

// ---------- access control ----------
// Every route (static, /api/*, /ws) needs auth. Ways in:
//  1. /?key=<access key>  -> sets a long-lived HttpOnly cookie, then redirects to the same URL without the key
//  2. the cookie (an HMAC of the key, so the key itself never sits in the cookie)
//  3. a direct loopback request on the LOCAL port with no proxy/Cloudflare headers (headless test scripts, box browser).
//     Never on the public port, and never when any forwarding header is present, so tunneled requests can't use it.
//  With remote access off (the default) there is no key at all, so only the local loopback path works.
export function loadKey(KEY_FILE) {
  try { const k = fs.readFileSync(KEY_FILE, 'utf8').trim(); if (k.length >= 32) return k; } catch {}
  const k = crypto.randomBytes(32).toString('base64url');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, k + '\n', { mode: 0o600 }); fs.chmodSync(KEY_FILE, 0o600);
  console.log('generated new access key in', KEY_FILE); return k;
}
let ACCESS_KEY = null; let COOKIE_VAL = null;
const COOKIE = 'botsim_auth';
const safeEq = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(); const y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const PROXY_HEADERS = ['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip', 'forwarded', 'via', 'cdn-loop', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry', 'cf-warp-tag-id', 'true-client-ip'];
const isLoopback = (a) => a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
function localBypass(req, isPublic) {
  if (isPublic) return false;
  if (!isLoopback(req.socket.remoteAddress)) return false;
  // DNS-rebinding guard: a web page can make a browser hit 127.0.0.1 under its own domain name; require a loopback Host
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(req.headers.host || ''))) return false;
  return !PROXY_HEADERS.some((h) => req.headers[h] !== undefined);
}
function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim(); }
  return null;
}
const clientIp = (req) => String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '?');
// rate limit: 10 failed key/cookie attempts per IP per 15 min -> 429 until the window ends
const FAILS = new Map(); const FAIL_MAX = 10, FAIL_WIN = 15 * 60000;
const limited = (ip) => { const f = FAILS.get(ip); return !!f && f.n >= FAIL_MAX && Date.now() - f.t0 < FAIL_WIN; };
function fail(ip) { const now = Date.now(); let f = FAILS.get(ip); if (!f || now - f.t0 > FAIL_WIN) f = { n: 0, t0: now }; f.n++; FAILS.set(ip, f); }
setInterval(() => { const now = Date.now(); for (const [ip, f] of FAILS) if (now - f.t0 > FAIL_WIN) FAILS.delete(ip); }, 60000);
// returns 'ok' | 'locked' | 'limited'
function checkAuth(req, isPublic, url) {
  if (localBypass(req, isPublic)) return 'ok';
  const ip = clientIp(req); if (limited(ip)) return 'limited';
  const c = readCookie(req, COOKIE); const k = url?.searchParams.get('key');
  if (c && COOKIE_VAL && safeEq(c, COOKIE_VAL)) return 'ok';
  if (k && ACCESS_KEY && safeEq(k, ACCESS_KEY)) return 'ok';
  if (c || k) fail(ip);
  return 'locked';
}
// 'ok' | 'locked' | 'limited' when an Authorization: Bearer header is present, else null (fall back to checkAuth)
function bearerAuth(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || '')); if (!m) return null;
  const ip = clientIp(req); if (limited(ip)) return 'limited';
  if (ACCESS_KEY && safeEq(m[1], ACCESS_KEY)) return 'ok';
  if (localBypass(req, false) && !ACCESS_KEY) return 'ok'; // remote access off: loopback bots may send any placeholder
  fail(ip); return 'locked';
}
const SEC_HEADERS = { 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' };
const LOCKED_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Locked</title>
<style>body{font:16px system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0f1d2b;color:#e8eef3}div{text-align:center}h1{font-size:44px;margin:0 0 8px}</style></head>
<body><div><h1>🔒</h1><p><b>Bot Island is locked.</b><br>Open the private link that includes <code>?key=…</code>.</p></div></body></html>`;
function deny(res, why) {
  res.writeHead(why === 'limited' ? 429 : 401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SEC_HEADERS });
  res.end(why === 'limited' ? LOCKED_HTML.replace('Bot Island is locked.', 'Too many failed attempts. Try again later.') : LOCKED_HTML);
}

// ---------- http + ws ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.webp': 'image/webp' };
function handle(req, res, isPublic) {
  const url = new URL(req.url, 'http://x');
  // install files (app manifest, icons, service worker) hold nothing private; Chrome fetches the manifest without cookies
  const PWA_PUBLIC = url.pathname === '/manifest.webmanifest' || url.pathname === '/sw.js' || /^\/icons\/[\w.-]+\.png$/.test(url.pathname);
  // a bot self-registering its chat webhook authenticates with the island key as a Bearer header (never in the URL)
  const bearer = url.pathname === '/api/chat/register' && !url.searchParams.has('key') ? bearerAuth(req) : null;
  const auth = PWA_PUBLIC && !url.searchParams.has('key') ? 'ok' : bearer ?? checkAuth(req, isPublic, url); req.viaBearer = bearer === 'ok';
  if (auth !== 'ok') return deny(res, auth);
  if (url.searchParams.has('key')) { // trade the key for a cookie, then drop it from the address bar
    const https = isPublic ? req.headers['x-forwarded-proto'] === 'https' || !!req.headers['cf-visitor']?.includes('https') : false;
    url.searchParams.delete('key'); const q = url.searchParams.toString();
    res.writeHead(302, { location: url.pathname + (q ? '?' + q : ''), 'set-cookie': `${COOKIE}=${COOKIE_VAL}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`, 'cache-control': 'no-store', ...SEC_HEADERS });
    return res.end();
  }
  if (url.pathname === '/agent.txt' || url.pathname === '/AGENT_REPORTING.md') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...SEC_HEADERS });
    return fs.createReadStream(SPEC).on('error', () => res.end('missing AGENT_REPORTING.md')).pipe(res);
  }
  if (url.pathname === '/api/state') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify(snapshot())); }
  if (url.pathname === '/api/demo/reset') {
    if (!localBypass(req, isPublic)) { res.writeHead(403, { 'content-type': 'text/plain', ...SEC_HEADERS }); return res.end('demo reset is local-only'); } profiles = readProfiles(); demoReset(profiles); broadcast(); res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (url.pathname.startsWith('/api/chat')) return chatRoute(req, res, url, isPublic);
  if (url.pathname === '/api/log') { const since = +url.searchParams.get('since') || 0; const bot = url.searchParams.get('bot');
    return json(res, 200, { events: LOG.filter((e) => e.ts >= since && (!bot || e.bot === bot)).slice(-1500) }); }
  if (url.pathname === '/api/weather') { const loc = String(url.searchParams.get('loc') || 'New York, NY').slice(0, 80).replace(/[^\p{L}\p{N} ,.'-]/gu, '');
    return liveWeather(loc).then((d) => json(res, d.error ? 503 : 200, d)); }
  if (url.pathname === '/api/info') { const g = SOURCES.find((x) => x.type === 'git');
    return json(res, 200, { version: process.env.BOTISLAND_APP_VERSION || VERSION, desktop: !!process.versions.electron, eventsDir: C.eventsDir, canEdit: !!CONFIG_FILE,
      git: g ? { url: redactUrl(g.url), branch: g.branch, hasToken: !!(g.tokenFile && fs.existsSync(g.tokenFile)), ok: !g.error, error: g.error, lastSync: g.last } : null }); }
  if (url.pathname === '/api/config/git') return gitRoute(req, res, isPublic);
  if (url.pathname === '/api/config/events-dir') return eventsDirRoute(req, res, isPublic);
  if (url.pathname === '/api/bots/custom') return customRoute(req, res, isPublic);
  if (url.pathname === '/api/alerts/clear') return clearRoute(req, res, isPublic);
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(DIST, p === '/' ? 'index.html' : p);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(500); return res.end('Run `npm run build` first.'); }
  const ext = path.extname(file);
  const base = path.basename(file);
  // sw.js must never be cached so updates activate; index + manifest stay fresh too
  const noCache = file.endsWith('index.html') || base === 'sw.js' || ext === '.webmanifest';
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', ...SEC_HEADERS, ...(noCache ? { 'cache-control': 'no-store' } : {}) });
  fs.createReadStream(file).pipe(res);
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...SEC_HEADERS }); res.end(JSON.stringify(obj)); };
// CSRF guard for state-changing requests: POST + JSON body + same origin. Browsers always send Origin on a POST;
// a request without one is only accepted on the local loopback path (scripts). Cross-site pages also can't send
// application/json without a CORS preflight, which this server never approves.
function sameOrigin(req, isPublic) {
  const site = req.headers['sec-fetch-site']; if (site && site !== 'same-origin') return false;
  const origin = req.headers.origin;
  if (!origin) return localBypass(req, isPublic);
  let host; try { host = new URL(origin).host; } catch { return false; }
  return [req.headers.host, req.headers['x-forwarded-host']].filter(Boolean).some((h) => String(h).split(',')[0].trim().toLowerCase() === host.toLowerCase());
}
function readJson(req, max = 16384) {
  return new Promise((ok) => {
    let n = 0; const parts = [];
    req.on('data', (d) => { n += d.length; if (n > max) { req.destroy(); ok({ tooBig: true }); } else parts.push(d); });
    req.on('end', () => { try { ok({ body: JSON.parse(Buffer.concat(parts).toString('utf8') || '{}') }); } catch { ok({ bad: true }); } });
    req.on('error', () => ok({ bad: true }));
  });
}
const clearLimit = limiter(60, 60000);
// shared guard for the small JSON POST endpoints (same checks as chat / alerts)
async function guardedJson(req, res, isPublic, lim) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); json(res, 405, { error: 'POST only' }); return null; }
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) { json(res, 415, { error: 'JSON only' }); return null; }
  if (!sameOrigin(req, isPublic)) { json(res, 403, { error: 'cross-origin request refused' }); return null; }
  if (!lim(clientIp(req))) { json(res, 429, { error: 'slow down' }); return null; }
  const { body, bad, tooBig } = await readJson(req, 2048);
  if (tooBig) { json(res, 413, { error: 'too big' }); return null; } if (bad || !body || typeof body !== 'object') { json(res, 400, { error: 'bad JSON' }); return null; }
  return body;
}
const customLimit = limiter(60, 60000); const cfgEditLimit = limiter(10, 60000);
// shared git repo from Island settings: {url, branch?, token?, clearToken?} or {remove: true}. The token is written to
// <dataDir>/git-token (mode 600) and never sent back to the browser; only "hasToken" is reported.
async function gitRoute(req, res, isPublic) {
  const body = await guardedJson(req, res, isPublic, cfgEditLimit); if (!body) return;
  if (!CONFIG_FILE) return json(res, 409, { error: 'no config file to save to (started without one)' });
  let file = {}; try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  const tokenFile = path.join(DATA_DIR, 'git-token');
  const folder = (Array.isArray(file.sources) ? file.sources.filter((x) => x.type === 'folder' || !x.type) : []);
  const base = folder.length ? folder : [{ type: 'folder', path: C.eventsDir }];
  if (body.remove === true) { file.sources = base; try { fs.rmSync(tokenFile, { force: true }); } catch {} }
  else {
    const url = String(body.url || '').trim(); const branch = String(body.branch || 'main').trim() || 'main';
    if (!/^(https:\/\/[^\s@]+|git@[\w.-]+:[\w./-]+)$/.test(url) || url.length > 300) return json(res, 400, { error: 'use an https://… or git@host:owner/repo URL (no token in the URL)' });
    if (!/^[\w./-]{1,100}$/.test(branch)) return json(res, 400, { error: 'bad branch name' });
    if (typeof body.token === 'string' && body.token.trim()) { const t = body.token.trim(); if (t.length > 400 || /\s/.test(t)) return json(res, 400, { error: 'that token looks wrong' });
      fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(tokenFile, t + '\n', { mode: 0o600 }); try { fs.chmodSync(tokenFile, 0o600); } catch {} }
    if (body.clearToken === true) try { fs.rmSync(tokenFile, { force: true }); } catch {}
    file.sources = [...base, { type: 'git', url, branch, subdir: 'events', pollSeconds: 15, ...(fs.existsSync(tokenFile) ? { tokenFile } : {}) }];
  }
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true }); fs.writeFileSync(CONFIG_FILE, JSON.stringify(file, null, 2) + '\n', { mode: 0o600 });
  // swap git sources live
  SOURCES.filter((x) => x.type === 'git').forEach((x) => x.stop());
  const fresh = makeSources({ sources: file.sources.filter((x) => x.type === 'git') }, DATA_DIR);
  SOURCES = [...SOURCES.filter((x) => x.type !== 'git'), ...fresh]; for (const x of fresh) await x.start(reloadEvents);
  real = readEvents(); broadcast(); console.log(`[config] git source -> ${fresh.length ? fresh[0].label : 'none'}`);
  const g = fresh[0]; return json(res, 200, { ok: true, git: g ? { url: redactUrl(g.url), branch: g.branch, hasToken: !!g.tokenFile, ok: !g.error, error: g.error } : null });
}
// change the local events folder from Island settings: saved to the config file and applied right away
async function eventsDirRoute(req, res, isPublic) {
  const body = await guardedJson(req, res, isPublic, cfgEditLimit); if (!body) return;
  if (!CONFIG_FILE) return json(res, 409, { error: 'no config file to save to (started without one)' });
  let dir = String(body.eventsDir || '').trim(); if (!dir) dir = path.join(DATA_DIR, 'events');
  dir = dir.replace(/^~(?=$|[\\/])/, process.env.HOME || process.env.USERPROFILE || '');
  if (!path.isAbsolute(dir) || dir.length > 400) return json(res, 400, { error: 'use a full folder path' });
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.R_OK); } catch (e) { return json(res, 400, { error: `can't use that folder (${e.code || e.message})` }); }
  let file = {}; try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
  file.eventsDir = dir; if (Array.isArray(file.sources)) file.sources = file.sources.map((x) => (x.type === 'folder' || !x.type ? { ...x, path: dir } : x));
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true }); fs.writeFileSync(CONFIG_FILE, JSON.stringify(file, null, 2) + '\n', { mode: 0o600 });
  // swap the folder source(s) live; git sources keep running
  const old = SOURCES.filter((x) => x.type === 'folder'); old.forEach((x) => x.stop());
  C.eventsDir = dir; const fresh = makeSources({ sources: [{ type: 'folder', path: dir }] }, DATA_DIR);
  SOURCES = [...fresh, ...SOURCES.filter((x) => x.type !== 'folder')]; for (const x of fresh) await x.start(reloadEvents);
  real = readEvents(); broadcast(); console.log(`[config] events folder -> ${dir}`);
  return json(res, 200, { ok: true, eventsDir: dir });
}
async function customRoute(req, res, isPublic) { // POST {bot, color?: '#rrggbb'|null, hat?: HATS, nameTag?: bool, reset?: true}
  const body = await guardedJson(req, res, isPublic, customLimit); if (!body) return;
  const bot = String(body.bot || ''); if (!BOT_RE.test(bot)) return json(res, 400, { error: 'bad bot id' });
  if (body.reset === true) delete CUSTOM[bot];
  else { const c = { ...(CUSTOM[bot] || {}) };
    if ('color' in body) { if (body.color === null || body.color === '') delete c.color; else if (/^#[0-9a-f]{6}$/i.test(String(body.color))) c.color = String(body.color).toLowerCase(); else return json(res, 400, { error: 'color must be #rrggbb' }); }
    if ('hat' in body) { if (!HATS.includes(body.hat)) return json(res, 400, { error: 'unknown hat' }); if (body.hat === 'none') delete c.hat; else c.hat = body.hat; }
    if ('nameTag' in body) { if (typeof body.nameTag !== 'boolean') return json(res, 400, { error: 'nameTag must be true/false' }); if (body.nameTag) delete c.nameTag; else c.nameTag = false; }
    if (Object.keys(c).length) CUSTOM[bot] = c; else delete CUSTOM[bot]; }
  saveCustom(); broadcast(); return json(res, 200, { ok: true, custom: CUSTOM[bot] || {} });
}
async function clearRoute(req, res, isPublic) { // POST {bot} or {all: true}; same CSRF/origin rules as chat
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return json(res, 405, { error: 'POST only' }); }
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'JSON only' });
  if (!sameOrigin(req, isPublic)) return json(res, 403, { error: 'cross-origin request refused' });
  if (!clearLimit(clientIp(req))) return json(res, 429, { error: 'slow down' });
  const { body, bad, tooBig } = await readJson(req, 2048);
  if (tooBig) return json(res, 413, { error: 'too big' }); if (bad || !body || typeof body !== 'object') return json(res, 400, { error: 'bad JSON' });
  const snap = snapshot(); const all = body.all === true; const bot = String(body.bot || '');
  if (!all && !BOT_RE.test(bot)) return json(res, 400, { error: 'bad bot id' });
  const hit = snap.bots.filter((b) => ALERTS.has(b.state) && (all || b.id === bot));
  if (!all && !hit.length) return json(res, 409, { error: 'no alert to clear' });
  for (const b of hit) { ACKS[b.id] = { at: b.updatedAt, state: b.state, by: 'the user', clearedAt: Date.now() }; console.log(`[alerts] cleared ${b.id} (${b.state})`); }
  if (hit.length) { saveAcks(); broadcast(); }
  return json(res, 200, { ok: true, cleared: hit.map((b) => b.id) });
}
// ---------- chat ----------
const sendLimitMin = limiter(10, 60000), sendLimitHour = limiter(120, 3600000), testLimit = limiter(6, 60000), cfgLimit = limiter(30, 60000);
function chatConnected() { const o = {}; for (const b of Object.keys(HOOKS.data)) if (HOOKS.connected(b)) o[b] = true; return o; }
function chatPush(bots) { // push changed threads (or everything) to every open page
  const threads = {}; for (const b of bots || Object.keys(CHAT.threads)) threads[b] = CHAT.threads[b] || [];
  const msg = JSON.stringify({ type: 'chat', full: !bots, threads, connected: chatConnected() });
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}
function chatReload(force) { const ch = CHAT.readAll(); if (ch.length || force) chatPush(force ? null : ch); }
async function chatRoute(req, res, url, isPublic) {
  const p = url.pathname; const ip = clientIp(req);
  if (req.method === 'GET' && p === '/api/chat') return json(res, 200, { threads: CHAT.threads, connected: chatConnected(), maxText: MAX_TEXT });
  if (req.method === 'GET' && p === '/api/chat/config') return json(res, 200, { bots: HOOKS.publicView(), defaults: { header: DEFAULT_HEADER, prefix: DEFAULT_PREFIX } });
  if (!['/api/chat/send', '/api/chat/config', '/api/chat/test', '/api/chat/register'].includes(p)) return json(res, 404, { error: 'not found' });
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return json(res, 405, { error: 'POST only' }); }
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'JSON only' });
  if (!(p === '/api/chat/register' && req.viaBearer) && !sameOrigin(req, isPublic)) return json(res, 403, { error: 'cross-origin request refused' });
  const { body, bad, tooBig } = await readJson(req);
  if (tooBig) return json(res, 413, { error: 'too big' }); if (bad || !body || typeof body !== 'object') return json(res, 400, { error: 'bad JSON' });
  const bot = String(body.bot || ''); if (!BOT_RE.test(bot)) return json(res, 400, { error: 'bad bot id' });
  if (p === '/api/chat/send') {
    const text = String(body.text ?? '').trim();
    if (!text) return json(res, 400, { error: 'empty message' }); if (text.length > MAX_TEXT) return json(res, 413, { error: `max ${MAX_TEXT} characters` });
    const hook = HOOKS.get(bot); if (!hook?.url) return json(res, 409, { error: 'chat not connected' });
    if (!sendLimitMin(ip) || !sendLimitHour(ip)) return json(res, 429, { error: 'slow down: too many messages' });
    const m = CHAT.newUserMsg(bot, text); chatReload();
    json(res, 200, { ok: true, id: m.id });
    const r = await deliver(hook, { source: 'bot-island', bot, messageId: m.id, text: m.text, ts: m.ts });
    CHAT.setStatus(bot, m.id, r); chatReload();
    console.log(`[chat] ${bot} ${m.id} -> ${r.ok ? 'delivered' : 'failed'} (HTTP ${r.http || '-'})${r.detail ? ' body: ' + r.detail : ''}`); // never the URL or key
    return;
  }
  if (!cfgLimit(ip)) return json(res, 429, { error: 'slow down' });
  if (p === '/api/chat/register' || p === '/api/chat/config') {
    if (body.remove && p === '/api/chat/config') { HOOKS.remove(bot); chatPush([]); return json(res, 200, { ok: true, bots: HOOKS.publicView() }); }
    const cur = HOOKS.get(bot) || {};
    const urlIn = body.url != null && String(body.url).trim() !== '' ? String(body.url).trim() : cur.url;
    if (!urlIn) return json(res, 400, { error: 'paste the webhook URL' });
    const ue = checkUrl(urlIn); if (ue) return json(res, 400, { error: ue });
    const header = body.header ? String(body.header).trim() : undefined; if (header) { const he = checkHeader(header); if (he) return json(res, 400, { error: he }); }
    const prefix = body.prefix != null ? String(body.prefix).slice(0, 40).replace(/[\r\n]/g, '') : undefined;
    const key = body.key ? String(body.key).trim() : '';
    if (/[\r\n]/.test(key) || key.length > 4096) return json(res, 400, { error: 'bad key' });
    HOOKS.set(bot, { url: urlIn, key, header, prefix }); chatPush([]);
    if (p === '/api/chat/register') { console.log(`[chat] ${bot} registered its webhook${req.viaBearer ? ' (island key)' : ' (local)'}`); return json(res, 200, { ok: true, bot, connected: true }); } // never echo the URL or key
    return json(res, 200, { ok: true, bots: HOOKS.publicView() });
  }
  if (p === '/api/chat/test') {
    const hook = HOOKS.get(bot); if (!hook?.url) return json(res, 409, { error: 'chat not connected' });
    if (!testLimit(ip)) return json(res, 429, { error: 'slow down' });
    const ts = new Date().toISOString();
    const r = await deliver(hook, { source: 'bot-island', bot, messageId: 'test-' + Date.now().toString(36), text: 'Test from Bot Island: please ignore (no reply needed).', ts, test: true });
    console.log(`[chat] test ${bot} -> HTTP ${r.http || '-'}${r.detail ? ' body: ' + r.detail : ''}`);
    return json(res, 200, { ok: r.ok, http: r.http, error: r.error });
  }
}

const wss = new WebSocketServer({ noServer: true });
function upgrade(req, sock, head, isPublic) {
  const url = new URL(req.url, 'http://x');
  const reject = (code, msg) => { sock.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); sock.destroy(); };
  if (url.pathname !== '/ws') return reject(404, 'Not Found');
  const auth = checkAuth(req, isPublic, null); // cookie only (or local bypass); keys are never accepted on the ws URL
  if (auth !== 'ok') return reject(auth === 'limited' ? 429 : 401, auth === 'limited' ? 'Too Many Requests' : 'Unauthorized');
  // cross-site WebSocket hijacking guard: a browser Origin must match the Host it connects to
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return reject(403, 'Forbidden'); } catch { return reject(403, 'Forbidden'); } }
  wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req));
}
function broadcast() { const msg = JSON.stringify(snapshot()); for (const c of wss.clients) if (c.readyState === 1) c.send(msg); }
wss.on('connection', (ws) => { ws.send(JSON.stringify(snapshot())); ws.send(JSON.stringify({ type: 'chat', full: true, threads: CHAT.threads, connected: chatConnected() })); });

// ---------- start / stop ----------
export async function startServer(config, dataDir, opts = {}) {
  C = config; CONFIG_FILE = opts.configFile || null; DATA_DIR = dataDir;
  if (C.remote?.enabled) { ACCESS_KEY = loadKey(C.remote.keyFile); COOKIE_VAL = crypto.createHmac('sha256', ACCESS_KEY).update('botsim-cookie-v1').digest('base64url'); }
  SOURCES = makeSources(C, dataDir);
  HOOKS = new Hooks(C.chatWebhooksFile);
  CHAT = new ChatStore(C.chatDir, () => SOURCES.filter((s) => s.type === 'git' && s.cache).map((s) => path.join(s.cache, 'chat')));
  fs.mkdirSync(C.chatDir, { recursive: true }); CHAT.readAll();
  let ct = null; let chatWatch = null; try { chatWatch = fs.watch(C.chatDir, () => { clearTimeout(ct); ct = setTimeout(() => chatReload(), 120); }); } catch {}
  ACK_FILE = path.join(dataDir, 'alert-acks.json'); fs.mkdirSync(dataDir, { recursive: true }); loadAcks(); CUSTOM_FILE = path.join(dataDir, 'bot-custom.json'); loadCustom();
  profiles = readProfiles(); demoReset(profiles);
  let t = null; const reload = reloadEvents = () => { clearTimeout(t); t = setTimeout(() => { real = readEvents(); broadcast(); chatReload(); }, 150); };
  for (const s of SOURCES) await s.start(reload);
  real = readEvents();
  const timers = [
    setInterval(() => { real = readEvents(); chatReload(); }, 10000), // safety net for missed fs events
    setInterval(() => { profiles = readProfiles(); }, 60000),
    setInterval(() => { if (demoActive() && demoTick()) broadcast(); }, 1000),
    setInterval(broadcast, 15000), // refresh stale/done timers
  ];
  const server = http.createServer((req, res) => handle(req, res, false));
  server.on('upgrade', (req, sock, head) => upgrade(req, sock, head, false));
  const listen = (srv, port, host = '127.0.0.1') => new Promise((ok, bad) => { srv.once('error', bad); srv.listen(port, host, () => ok()); });
  await listen(server, C.port);
  const localUrl = `http://127.0.0.1:${C.port}`;
  console.log(`Bot Island on ${localUrl}  sources=${SOURCES.map((x) => `${x.type}:${x.label}`).join(', ')}  demo=${C.demo}`);
  let pub = null;
  if (C.remote?.enabled) {
    pub = http.createServer((req, res) => handle(req, res, true));
    pub.on('upgrade', (req, sock, head) => upgrade(req, sock, head, true));
    await listen(pub, C.remote.port, C.remote.bind || '127.0.0.1');
    console.log(`Remote endpoint on http://${C.remote.bind || '127.0.0.1'}:${C.remote.port} (access key always required; key file ${C.remote.keyFile})`);
  }
  const close = () => new Promise((done) => {
    timers.forEach(clearInterval); SOURCES.forEach((s) => s.stop()); chatWatch?.close();
    for (const c of wss.clients) c.terminate();
    let n = pub ? 2 : 1; const fin = () => { if (--n === 0) done(); };
    server.close(fin); server.closeAllConnections?.(); if (pub) { pub.close(fin); pub.closeAllConnections?.(); }
    setTimeout(done, 2000).unref();
  });
  return { localUrl, remoteUrl: pub ? `http://127.0.0.1:${C.remote.port}` : null, close, accessKey: ACCESS_KEY };
}

// `node server.js ...` runs the server alone (no browser, no tunnel). The launcher is cli.mjs.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { config, file, fileFound, dataDir } = loadConfig();
  if (fileFound) console.log('config:', file);
  const app = await startServer(config, dataDir, { configFile: fileFound ? file : null });
  const bye = async () => { await app.close(); process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
}
