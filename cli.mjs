#!/usr/bin/env node
// Bot Island launcher: `npm start` / `npx botisland` / `node cli.mjs`.
// Builds the frontend if needed, starts the server on 127.0.0.1, opens your browser, and stops cleanly on Ctrl+C.
//   --setup             (re)run the first-run setup (where do bots report?)
//   --config <file>     use this config file (default ~/.botisland/botisland.config.json)
//   --port <n>  --events-dir <dir>  --agents-dir <dir>  --no-open  --demo auto|on|off
//   --remote            enable phone access (key-protected endpoint)   --tunnel   also start a Cloudflare quick tunnel
//   --build             force a frontend rebuild
//   --yes               first run: take the default setup (local folder) without asking
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig, parseArgs, configPath, dataDir as getDataDir, redactUrl } from './lib/config.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }

// ---------- first-run setup ----------
async function setup(file) {
  const dd = getDataDir(); const def = path.join(dd, 'events');
  const cfg = { port: 8787, openBrowser: true, eventsDir: def, sources: null, demo: 'auto', remote: { enabled: false, port: 8797, keyFile: path.join(dd, 'access-key'), tunnel: false } };
  if (process.stdin.isTTY && !args.yes && !process.env.BOTISLAND_SETUP_DEFAULTS) { // --yes: accept the defaults, no prompts
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n🏝️  Bot Island first-run setup (rerun any time with --setup; edit ' + file + ' later)\n');
    console.log('Where do your bots report their status?');
    console.log(`  1) a folder on this computer (${def})  [default]`);
    console.log('  2) another folder, e.g. a Dropbox/iCloud/Syncthing folder the bots write to');
    console.log('  3) a git repo the bots push to (the app pulls it)');
    const pick = (await rl.question('Choose 1-3: ')).trim() || '1';
    if (pick === '2') { const p = (await rl.question('Folder path: ')).trim(); if (p) cfg.eventsDir = path.resolve(p.replace(/^~(?=$|\/)/, process.env.HOME || '')); }
    if (pick === '3') {
      const url = (await rl.question('Repo URL (ssh like git@github.com:you/bot-status.git, or https with a credential helper; no tokens in the URL): ')).trim();
      const branch = (await rl.question('Branch [main]: ')).trim() || 'main';
      if (url) cfg.sources = [{ type: 'folder', path: def }, { type: 'git', url, branch, subdir: 'events', pollSeconds: 30 }];
      if (/\/\/[^/@]+:[^/@]+@/.test(url)) console.log('⚠️  That URL contains a password/token. It stays in your local config only, but prefer SSH or a credential helper.');
    }
    const yn = (await rl.question('Open the browser automatically when Bot Island starts? [Y/n]: ')).trim().toLowerCase();
    cfg.openBrowser = yn !== 'n' && yn !== 'no'; rl.close();
  } else console.log(`(no terminal: writing default config to ${file}; bots report into ${def})`);
  if (!cfg.sources) delete cfg.sources;
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  fs.mkdirSync(cfg.eventsDir, { recursive: true });
  console.log(`Saved ${file}. Bots: see AGENT_REPORTING.md (also at http://127.0.0.1:${cfg.port}/agent.txt).\n`);
}
const file = configPath(args);
if (args.setup || (!fs.existsSync(file) && !args.config && !process.env.BOTISLAND_CONFIG)) await setup(file);

// ---------- build if needed ----------
const dist = path.join(ROOT, 'dist', 'index.html');
if (args.build || !fs.existsSync(dist)) {
  console.log('Building the frontend (first run only)...');
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) { console.error('Build failed. Run `npm install` first.'); process.exit(1); }
}

// ---------- start ----------
const { config, dataDir, file: cfgFile } = loadConfig();
const { startServer } = await import('./server.js');
let app;
try { app = await startServer(config, dataDir, { configFile: cfgFile }); }
catch (e) {
  if (e.code === 'EADDRINUSE') { console.error(`Port ${e.port} is busy: Bot Island may already be running (open http://127.0.0.1:${config.port}), or use --port.`); process.exit(1); }
  throw e;
}

// optional phone access: Cloudflare quick tunnel to the key-protected endpoint (off unless remote.tunnel)
let tunnel = null;
if (config.remote?.enabled && config.remote.tunnel) {
  const urlFile = path.join(dataDir, 'tunnel-url');
  tunnel = spawn(config.remote.cloudflared || 'cloudflared', ['tunnel', '--no-autoupdate', '--url', app.remoteUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
  let url = null; const scan = (d) => { const s = String(d); url ||= s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if (url && /Registered tunnel connection/.test(s)) { fs.writeFileSync(urlFile, url + '\n', { mode: 0o600 }); console.log(`📱 Phone link (keep it private): ${url}/?key=${app.accessKey}`); } };
  tunnel.stdout.on('data', scan); tunnel.stderr.on('data', scan);
  tunnel.on('error', (e) => console.error('tunnel: could not start cloudflared:', e.message));
  tunnel.on('exit', (c) => { try { fs.rmSync(urlFile); } catch {} if (!stopping) console.error(`tunnel: cloudflared exited (${c}); restart Bot Island to get a new link`); });
} else if (config.remote?.enabled) console.log(`Remote endpoint is on (${app.remoteUrl}); put your own tunnel/proxy in front of it. Key file: ${config.remote.keyFile}`);

console.log(`\n🏝️  Bot Island is running at ${app.localUrl}   (Ctrl+C to quit)`);
for (const s of config.sources) console.log(`   reading ${s.type === 'git' ? `git ${redactUrl(s.url)}#${s.branch || 'main'}` : s.path}`);

function openBrowser(url) {
  const [cmd, a] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : ['xdg-open', [url]];
  try { const p = spawn(cmd, a, { stdio: 'ignore', detached: true }); p.on('error', () => console.log(`(open ${url} in your browser)`)); p.unref(); } catch { console.log(`(open ${url} in your browser)`); }
}
if (config.openBrowser) openBrowser(app.localUrl);

// ---------- clean shutdown ----------
let stopping = false;
async function stop(sig) {
  if (stopping) process.exit(1); // second Ctrl+C: force
  stopping = true; console.log(`\nStopping Bot Island (${sig})...`);
  if (tunnel) tunnel.kill();
  await app.close(); console.log('Bye!'); process.exit(0);
}
process.on('SIGINT', () => stop('Ctrl+C')); process.on('SIGTERM', () => stop('SIGTERM')); process.on('SIGHUP', () => stop('SIGHUP'));
