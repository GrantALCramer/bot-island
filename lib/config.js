// Bot Island configuration: shipped defaults < config file < environment < command line.
//
// Config file lookup (first that exists):  --config <file>  |  $BOTISLAND_CONFIG  |  <dataDir>/botisland.config.json
// dataDir: $BOTISLAND_HOME, else ~/.botisland (Windows: %APPDATA%\BotIsland). Relative paths in a config file are
// resolved against that file's folder; relative paths on the command line / env against the current directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function dataDir(env = process.env) {
  if (env.BOTISLAND_HOME) return path.resolve(env.BOTISLAND_HOME);
  if (process.platform === 'win32' && env.APPDATA) return path.join(env.APPDATA, 'BotIsland');
  return path.join(os.homedir(), '.botisland');
}

export function defaults(dd = dataDir()) {
  return {
    port: 8787,                // the app always binds to 127.0.0.1 (loopback only)
    openBrowser: true,         // the launcher (cli.mjs) opens the default browser; `node server.js` never does
    eventsDir: path.join(dd, 'events'), // the default local folder source (also where report.sh writes on this machine)
    chatDir: path.join(dd, 'chat'), // chat threads, one <bot>.jsonl each (reply.sh writes bot replies here)
    chatWebhooksFile: path.join(dd, 'chat-webhooks.json'), // per-bot webhook URL + sender key; SECRET, chmod 600, never in git
    chatDir: path.join(dd, 'chat'), // chat threads, one <bot>.jsonl each (reply.sh writes bot replies here)
    chatWebhooksFile: path.join(dd, 'chat-webhooks.json'), // per-bot webhook URL + sender key; SECRET, chmod 600, never in git
    agentsDir: null,           // optional folder of bot profiles (<id>/profile.json with name/avatarShape/avatarColor)
    sources: null,             // null -> [{ type: 'folder', path: eventsDir }]; see lib/sources.js for 'git'
    staleMinutes: 30,          // no report for N minutes -> the bot sleeps at home
    doneMinutes: 3,            // 'done' celebrates for N minutes, then idle
    demo: 'auto',              // auto (demo bots only while no real bots have reported) | on | off
    remote: {                  // optional phone access; OFF by default
      enabled: false,          // true -> second listener on 127.0.0.1:<port> that always requires the access key
      port: 8797,
      keyFile: path.join(dd, 'access-key'),
      tunnel: false,           // true -> the launcher also starts a Cloudflare quick tunnel to remote.port
      cloudflared: 'cloudflared', // path to the cloudflared binary
    },
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v; return o; }
const resolveIn = (base, p) => (p == null || p === '' ? p : path.resolve(base, String(p).replace(/^~(?=$|\/|\\)/, os.homedir())));

function resolvePaths(c, base) {
  const o = { ...c };
  if ('eventsDir' in o) o.eventsDir = resolveIn(base, o.eventsDir);
  if ('agentsDir' in o) o.agentsDir = resolveIn(base, o.agentsDir);
  if ('chatDir' in o) o.chatDir = resolveIn(base, o.chatDir);
  if ('chatWebhooksFile' in o) o.chatWebhooksFile = resolveIn(base, o.chatWebhooksFile);
  if ('chatDir' in o) o.chatDir = resolveIn(base, o.chatDir);
  if ('chatWebhooksFile' in o) o.chatWebhooksFile = resolveIn(base, o.chatWebhooksFile);
  if (o.remote) o.remote = { ...o.remote, ...(o.remote.keyFile ? { keyFile: resolveIn(base, o.remote.keyFile) } : {}),
    ...(o.remote.cloudflared && /[\\/]/.test(o.remote.cloudflared) ? { cloudflared: resolveIn(base, o.remote.cloudflared) } : {}) };
  if (Array.isArray(o.sources)) o.sources = o.sources.map((s) => ({ ...s, ...(s.path ? { path: resolveIn(base, s.path) } : {}), ...(s.cacheDir ? { cacheDir: resolveIn(base, s.cacheDir) } : {}) }));
  return o;
}

export function parseArgs(argv) {
  const a = {}; const it = argv[Symbol.iterator]();
  for (let x of it) {
    if (!x.startsWith('--')) continue; x = x.slice(2); let v;
    if (x.includes('=')) [x, v] = [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)];
    if (['no-open', 'open', 'remote', 'no-remote', 'tunnel', 'setup', 'help'].includes(x)) { a[x] = true; continue; }
    a[x] = v ?? it.next().value;
  }
  return a;
}

export function configPath(args = {}, env = process.env) {
  if (args.config) return path.resolve(args.config);
  if (env.BOTISLAND_CONFIG) return path.resolve(env.BOTISLAND_CONFIG);
  return path.join(dataDir(env), 'botisland.config.json');
}

export function loadConfig({ argv = process.argv.slice(2), env = process.env } = {}) {
  const args = parseArgs(argv); const dd = dataDir(env);
  let c = defaults(dd); const file = configPath(args, env); let fileFound = false;
  if (fs.existsSync(file)) {
    try { c = merge(c, resolvePaths(JSON.parse(fs.readFileSync(file, 'utf8')), path.dirname(file))); fileFound = true; }
    catch (e) { throw new Error(`bad config file ${file}: ${e.message}`); }
  }
  const cwd = process.cwd(); const E = (...ks) => ks.map((k) => env[k]).find((v) => v !== undefined && v !== '');
  // environment (BOTISLAND_* names; the short legacy names are kept for the dev/test scripts)
  const ov = {};
  const port = E('BOTISLAND_PORT', 'PORT'); if (port) ov.port = +port;
  const ev = E('BOTISLAND_EVENTS_DIR', 'EVENTS_DIR'); if (ev) { ov.eventsDir = path.resolve(cwd, ev); ov.sources = null; }
  const ag = E('BOTISLAND_AGENTS_DIR', 'AGENTS_DIR'); if (ag) ov.agentsDir = path.resolve(cwd, ag);
  const cd = E('BOTISLAND_CHAT_DIR'); if (cd) ov.chatDir = path.resolve(cwd, cd);
  const cw = E('BOTISLAND_CHAT_WEBHOOKS'); if (cw) ov.chatWebhooksFile = path.resolve(cwd, cw);
  const demo = E('BOTISLAND_DEMO', 'DEMO'); if (demo) ov.demo = demo.toLowerCase();
  const st = E('BOTISLAND_STALE_MIN', 'STALE_MIN'); if (st) ov.staleMinutes = +st;
  const dn = E('BOTISLAND_DONE_MIN', 'DONE_MIN'); if (dn) ov.doneMinutes = +dn;
  const op = E('BOTISLAND_OPEN'); if (op) ov.openBrowser = !/^(0|false|no)$/i.test(op);
  const rm = E('BOTISLAND_REMOTE'); if (rm) ov.remote = { enabled: !/^(0|false|no)$/i.test(rm) };
  const pp = E('BOTISLAND_REMOTE_PORT', 'PUBLIC_PORT'); if (pp !== undefined) ov.remote = { ...(ov.remote || {}), ...(+pp ? { port: +pp } : { enabled: false }) };
  const kf = E('BOTISLAND_KEY_FILE', 'ACCESS_KEY_FILE'); if (kf) ov.remote = { ...(ov.remote || {}), keyFile: path.resolve(cwd, kf) };
  const rb = E('BOTISLAND_REMOTE_BIND'); if (rb) ov.remote = { ...(ov.remote || {}), bind: rb }; // e.g. 0.0.0.0 in Docker/LXC; this listener ALWAYS requires the key
  c = merge(c, ov); if (ov.sources === null) c.sources = null;
  // command line
  if (args.port) c.port = +args.port;
  if (args['events-dir']) { c.eventsDir = path.resolve(cwd, args['events-dir']); c.sources = null; }
  if (args['agents-dir']) c.agentsDir = path.resolve(cwd, args['agents-dir']);
  if (args['chat-dir']) c.chatDir = path.resolve(cwd, args['chat-dir']);
  if (args['chat-webhooks']) c.chatWebhooksFile = path.resolve(cwd, args['chat-webhooks']);
  if (args.demo) c.demo = String(args.demo).toLowerCase();
  if (args['no-open']) c.openBrowser = false; if (args.open) c.openBrowser = true;
  if (args.remote) c.remote = { ...c.remote, enabled: true }; if (args['no-remote']) c.remote = { ...c.remote, enabled: false };
  if (args.tunnel) c.remote = { ...c.remote, enabled: true, tunnel: true };
  if (!Array.isArray(c.sources) || !c.sources.length) c.sources = [{ type: 'folder', path: c.eventsDir }];
  c.host = '127.0.0.1'; // never configurable: the app is local-only; phones go through remote + tunnel
  if (!['auto', 'on', 'off'].includes(c.demo)) c.demo = 'auto';
  return { config: c, file, fileFound, args, dataDir: dd };
}

// redact credentials in git URLs before printing them (https://user:token@host/... -> https://***@host/...)
export const redactUrl = (u) => String(u || '').replace(/\/\/[^/@\s]+@/, '//***@');
