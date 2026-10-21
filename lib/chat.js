// Bot Island chat: the user -> bot via the bot's webhook (e.g. a Grok Bot routine with a Webhook trigger),
// bot -> the user via reply.sh, which appends to chat/<bot>.jsonl. Everything is append-only JSON lines:
//   {"type":"msg","id":"m-…","ts":"…","bot":"nova","from":"user","text":"…","status":"sending"}
//   {"type":"status","id":"m-…","ts":"…","status":"delivered"|"failed"|"replied","http":200,"error":"…"}
//   {"type":"msg","id":"r-…","ts":"…","bot":"nova","from":"nova","text":"…","replyTo":"m-…"}
// Webhook URLs and sender keys live only in the webhooks file (chmod 600, outside the repo). They are never sent
// to the browser (the key is shown as "saved", the URL partly masked) and never logged.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const BOT_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const MAX_TEXT = 2000;
const SECRET = /(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|crsr_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+)/gi;
export const clean = (t, max = MAX_TEXT) => String(t ?? '').replace(SECRET, '[redacted]').replace(/\r\n?/g, '\n').slice(0, max);
const nowIso = () => new Date().toISOString();
export const DEFAULT_HEADER = 'Authorization';
export const DEFAULT_PREFIX = 'Bearer ';

// ---------- webhook settings (server-side only) ----------
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
export class Hooks {
  constructor(file) { this.file = file; this.data = {}; this.load(); }
  load() { try { const d = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.data = d && typeof d.bots === 'object' ? d.bots : {}; } catch { this.data = {}; } }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = this.file + '.tmp' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify({ _comment: 'Bot Island chat webhooks. Secret: keep this file private (chmod 600).', bots: this.data }, null, 2) + '\n', { mode: 0o600 });
    fs.chmodSync(tmp, 0o600); fs.renameSync(tmp, this.file); fs.chmodSync(this.file, 0o600);
  }
  get(bot) { return this.data[bot] || null; }
  connected(bot) { const h = this.data[bot]; return !!(h && h.url); }
  set(bot, { url, key, header, prefix }) {
    const cur = this.data[bot] || {};
    const next = { url: url ?? cur.url, key: key ? key : cur.key || '', header: header || cur.header || DEFAULT_HEADER, prefix: prefix ?? cur.prefix ?? DEFAULT_PREFIX };
    this.data[bot] = next; this.save();
  }
  remove(bot) { delete this.data[bot]; this.save(); }
  // what the browser may see
  // the browser only ever sees whether a hook exists + its host name; never the URL path/query or the key
  publicView() {
    const out = {};
    for (const [bot, h] of Object.entries(this.data)) out[bot] = { connected: !!h.url, host: hostOf(h.url), hasKey: !!h.key, header: h.header || DEFAULT_HEADER, prefix: h.prefix ?? DEFAULT_PREFIX };
    return out;
  }
}
export function maskUrl(u) {
  try { const x = new URL(u); const p = x.pathname; const tail = p.length > 14 ? p.slice(0, 6) + '…' + p.slice(-4) : p; return `${x.protocol}//${x.host}${tail}${x.search ? '?…' : ''}`; } catch { return '(invalid)'; }
}
// https anywhere; plain http only to this machine (local testing). No credentials inside the URL.
export function checkUrl(u) {
  let x; try { x = new URL(String(u || '').trim()); } catch { return 'not a valid URL'; }
  if (x.username || x.password) return 'remove the user:password part from the URL';
  if (x.protocol === 'https:') return null;
  if (x.protocol === 'http:' && /^(127\.0\.0\.1|localhost|\[::1\])$/i.test(x.hostname)) return null;
  return 'use an https:// URL (plain http only works for 127.0.0.1)';
}
export const checkHeader = (h) => (/^[A-Za-z0-9-]{1,64}$/.test(h) ? null : 'header name: letters, digits and dashes only');

export function scrub(text, hook) {
  let t = String(text || '').replace(/\s+/g, ' ').slice(0, 400);
  const secrets = [hook?.key, (() => { try { return new URL(hook.url).pathname.split('/').pop(); } catch { return ''; } })()].filter((x) => x && x.length >= 6);
  for (const s of secrets) t = t.split(s).join('<redacted>');
  return t.replace(/(crsr_|Bearer\s+)[A-Za-z0-9._-]+/g, '$1<redacted>');
}
// POST the payload; never follows redirects (so the key can't leak to another host), 15 s timeout.
export async function deliver(hook, payload) {
  const headers = { 'content-type': 'application/json', 'user-agent': 'BotIsland/0.1' };
  if (hook.key) headers[(hook.header || DEFAULT_HEADER).toLowerCase()] = (hook.prefix ?? DEFAULT_PREFIX) + hook.key;
  try {
    const r = await fetch(hook.url, { method: 'POST', headers, body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    let text = ''; try { text = await r.text(); } catch {}
    if (r.status >= 300 && r.status < 400) return { ok: false, http: r.status, error: 'redirect refused' };
    const ok = r.status >= 200 && r.status < 300;
    // on failure keep a short, scrubbed excerpt of the response for the server log (key / URL id / tokens removed)
    return { ok, http: r.status, error: ok ? undefined : `HTTP ${r.status}`, detail: ok ? undefined : scrub(text, hook) };
  } catch (e) { return { ok: false, http: 0, error: e.name === 'TimeoutError' ? 'timed out' : 'could not connect' }; }
}

// ---------- threads ----------
export function foldThread(lines) {
  const msgs = new Map();
  for (const e of lines) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string') continue;
    if (e.type === 'msg' && typeof e.text === 'string') {
      if (msgs.has(e.id)) continue;
      const m = { id: e.id.slice(0, 80), ts: e.ts, from: String(e.from || 'user').slice(0, 60), text: clean(e.text) };
      if (m.from === 'user') m.status = e.status || 'sending'; else if (e.replyTo) m.replyTo = String(e.replyTo).slice(0, 80);
      msgs.set(e.id, m);
      if (m.replyTo && msgs.get(m.replyTo)?.from === 'user') msgs.get(m.replyTo).status = 'replied';
    } else if (e.type === 'status') {
      const m = msgs.get(e.id); if (!m || m.from !== 'user') continue;
      if (m.status === 'replied' && e.status !== 'replied') continue; // a late 'delivered' never hides the reply
      m.status = e.status; if (e.http !== undefined) m.http = e.http; if (e.error) m.error = String(e.error).slice(0, 80); else delete m.error;
    }
  }
  return [...msgs.values()].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)).slice(-100);
}

export class ChatStore {
  // dir: where the server writes (and reply.sh writes on this machine). extraDirs(): read-only reply dirs (git caches).
  constructor(dir, extraDirs = () => []) { this.dir = dir; this.extraDirs = extraDirs; this.threads = {}; this.sig = {}; }
  file(bot) { return path.join(this.dir, bot + '.jsonl'); }
  readAll() {
    const lines = {};
    const add = (dir, userAllowed) => {
      let files = []; try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { return; }
      for (const f of files) {
        const bot = f.replace(/\.jsonl$/, ''); if (!BOT_RE.test(bot)) continue;
        let txt = ''; try { txt = fs.readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }
        const arr = lines[bot] ||= [];
        for (const l of txt.split('\n').slice(-2000)) { if (!l) continue; let e; try { e = JSON.parse(l); } catch { continue; }
          if (!userAllowed && (e.from === 'user' || (e.type === 'status' && e.status !== 'replied'))) continue; // git: only bot replies
          arr.push(e); }
      }
    };
    add(this.dir, true); for (const d of this.extraDirs()) add(d, false);
    const changed = [];
    const next = {};
    for (const [bot, arr] of Object.entries(lines)) {
      arr.sort((a, b) => (Date.parse(a.ts) || 0) - (Date.parse(b.ts) || 0));
      next[bot] = foldThread(arr); const sig = JSON.stringify(next[bot]);
      if (sig !== this.sig[bot]) { changed.push(bot); this.sig[bot] = sig; }
    }
    this.threads = next; return changed;
  }
  append(bot, e) { fs.mkdirSync(this.dir, { recursive: true }); fs.appendFileSync(this.file(bot), JSON.stringify(e) + '\n'); }
  newUserMsg(bot, text) {
    const m = { type: 'msg', id: 'm-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex'), ts: nowIso(), bot, from: 'user', text: clean(text), status: 'sending' };
    this.append(bot, m); return m;
  }
  setStatus(bot, id, r) { this.append(bot, { type: 'status', id, ts: nowIso(), status: r.ok ? 'delivered' : 'failed', http: r.http, ...(r.error ? { error: r.error } : {}) }); }
}

// sliding-window rate limiter: key -> timestamps
export function limiter(max, winMs) {
  const m = new Map();
  setInterval(() => { const t = Date.now(); for (const [k, a] of m) if (!a.length || t - a[a.length - 1] > winMs) m.delete(k); }, 60000).unref();
  return (key) => { const t = Date.now(); const a = (m.get(key) || []).filter((x) => t - x < winMs); if (a.length >= max) { m.set(key, a); return false; } a.push(t); m.set(key, a); return true; };
}
