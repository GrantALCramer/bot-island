// Bot Island desktop (Electron). Starts the normal Bot Island server in-process on 127.0.0.1 (a free port, 8787 if
// it's available), opens it in a window without browser chrome, and stops the server when the window closes.
// Data stays in %APPDATA%\BotIsland (lib/config.js), so it survives reinstalls. No account, no VPN, nothing remote by default.
// Remote island (optional): <userData>/remote.json = { "enabled": true, "servers": ["https://island.example.ts.net", "http://192.168.1.20:8797"],
//   "key": "<island access key>" }. On launch the first server that answers is opened (key traded for a cookie, so no
//   login prompt); if none answers, the built-in local island starts instead. Tray menu: switch server / edit settings.
const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage } = require('electron');
const path = require('node:path'); const fs = require('node:fs'); const net = require('node:net'); const { pathToFileURL } = require('node:url');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.setAppUserModelId('com.botisland.app'); // Windows: taskbar pinning + notifications
const ISLAND = path.join(__dirname, 'island'); const ICON = path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
let win = null; let island = null; let tray = null; let quitting = false;

const portFree = (p) => new Promise((ok) => { const s = net.createServer(); s.once('error', () => ok(false)); s.listen(p, '127.0.0.1', () => s.close(() => ok(true))); });
async function freePort(start) { for (let p = start; p < start + 40; p++) if (await portFree(p)) return p;
  return new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); }); }

async function startIsland() {
  process.env.BOTISLAND_APP_VERSION = app.getVersion();
  const { loadConfig } = await import(pathToFileURL(path.join(ISLAND, 'lib', 'config.js')).href);
  let L = loadConfig({ argv: [] });
  if (!L.fileFound) { // first run: no console questions; default to the local folder (changeable in Island settings)
    const cfg = { port: 8787, openBrowser: false, eventsDir: path.join(L.dataDir, 'events'), demo: 'auto' };
    fs.mkdirSync(path.dirname(L.file), { recursive: true }); fs.writeFileSync(L.file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    fs.mkdirSync(cfg.eventsDir, { recursive: true }); L = loadConfig({ argv: [] });
  }
  const config = { ...L.config, openBrowser: false, port: await freePort(L.config.port || 8787) };
  if (config.remote?.enabled && !(await portFree(config.remote.port))) config.remote = { ...config.remote, enabled: false };
  const { startServer } = await import(pathToFileURL(path.join(ISLAND, 'server.js')).href);
  island = await startServer(config, L.dataDir, { configFile: L.file });
  return island.localUrl;
}

// ---------- remote island ----------
const REMOTE_FILE = () => path.join(app.getPath('userData'), 'remote.json');
function readRemote() { try { const r = JSON.parse(fs.readFileSync(REMOTE_FILE(), 'utf8')); r.servers = (r.servers || []).map(String).filter((u) => /^https?:\/\//.test(u)).map((u) => u.replace(/\/+$/, '')); return r; } catch { return null; } }
function writeRemote(r) { fs.mkdirSync(path.dirname(REMOTE_FILE()), { recursive: true }); fs.writeFileSync(REMOTE_FILE(), JSON.stringify(r, null, 2) + '\n', { mode: 0o600 }); }
async function reachable(u) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000);
  const r = await fetch(u + '/manifest.webmanifest', { signal: c.signal, redirect: 'manual' }); clearTimeout(t); return r.status < 500; } catch { return false; } }
async function pickRemote(r) { if (!r?.enabled || !r.servers.length) return null;
  const order = r.prefer ? [r.prefer, ...r.servers.filter((x) => x !== r.prefer)] : r.servers;
  for (const u of order) if (await reachable(u)) return u; return null; }
let current = null; // { url, remote }
function openUrl(base, key) { return key ? base + '/?key=' + encodeURIComponent(key) : base; }

function createWindow(url) {
  win = new BrowserWindow({ width: 1320, height: 860, minWidth: 720, minHeight: 480, title: 'Bot Island', icon: ICON, backgroundColor: '#5ab8e2', show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
  const sameSite = (u) => { try { return new URL(u).origin === new URL(current?.url || url).origin; } catch { return false; } };
  win.webContents.setWindowOpenHandler(({ url: u }) => { // agent.txt etc. open in a small window; outside links in the real browser
    if (sameSite(u)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON, width: 860, height: 760 } };
    if (/^https?:/.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, u) => { if (!sameSite(u)) { e.preventDefault(); if (/^https?:/.test(u)) shell.openExternal(u); } });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; app.quit(); });
  win.loadURL(url);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
async function connect() { // returns { url, load }
  const r = readRemote(); const remote = await pickRemote(r);
  if (remote) return { url: remote, remote: true, load: openUrl(remote, r.key) };
  if (!island) await startIsland(); return { url: island.localUrl, remote: false, load: island.localUrl, failed: !!(r?.enabled && r.servers.length) };
}
async function go(prefer) {
  if (prefer !== undefined) { const r = readRemote() || { enabled: false, servers: [] }; if (prefer === 'local') r.enabled = false; else { r.enabled = true; r.prefer = prefer; } writeRemote(r); }
  current = await connect();
  if (!win) createWindow(current.load); else win.loadURL(current.load);
  if (current.failed) dialog.showMessageBox(win, { type: 'warning', message: 'Remote island unreachable', detail: 'None of the servers in remote.json answered, so the island on this PC is open instead. Use the tray menu to retry.' });
  buildTray();
}
function buildTray() {
  try { if (!tray) { tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 })); tray.on('click', () => win && (win.show(), win.focus())); }
    const r = readRemote() || { servers: [] }; tray.setToolTip(`Bot Island (${current?.url || ''})`);
    const servers = r.servers.map((u) => ({ label: u, type: 'radio', checked: current?.url === u, click: () => go(u) }));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Show Bot Island', click: () => win && (win.show(), win.focus()) },
      { label: 'Server', submenu: [...servers, { label: 'This PC (local island)', type: 'radio', checked: !current?.remote, click: () => go('local') }, { type: 'separator' },
        { label: 'Reconnect', click: () => go() }, { label: 'Edit server settings…', click: () => { if (!fs.existsSync(REMOTE_FILE())) writeRemote({ enabled: false, servers: [], key: '' }); shell.openPath(REMOTE_FILE()); } }] },
      { label: 'Open in browser', click: () => current && shell.openExternal(current.url) }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]));
  } catch {}
}
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try { await go(); } catch (e) { dialog.showErrorBox('Bot Island could not start', String(e?.stack || e)); app.quit(); }
});
app.on('before-quit', (e) => { if (quitting || !island) return; e.preventDefault(); quitting = true; // stop the server, then really quit
  Promise.race([island.close(), new Promise((r) => setTimeout(r, 3000))]).finally(() => { island = null; app.quit(); }); });
app.on('window-all-closed', () => app.quit());
