// Bot Island desktop (Electron). Starts the normal Bot Island server in-process on 127.0.0.1 (a free port, 8787 if
// it's available), opens it in a window without browser chrome, and stops the server when the window closes.
// Data stays in %APPDATA%\BotIsland (lib/config.js), so it survives reinstalls. No account, no VPN, nothing remote.
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

function createWindow(url) {
  win = new BrowserWindow({ width: 1320, height: 860, minWidth: 720, minHeight: 480, title: 'Bot Island', icon: ICON, backgroundColor: '#5ab8e2', show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
  const origin = new URL(url).origin;
  win.webContents.setWindowOpenHandler(({ url: u }) => { // agent.txt etc. open in a small window; outside links in the real browser
    if (u.startsWith(origin)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON, width: 860, height: 760 } };
    if (/^https?:/.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, u) => { if (!u.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(u)) shell.openExternal(u); } });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; app.quit(); });
  win.loadURL(url);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try { const url = await startIsland(); createWindow(url);
    try { tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 })); tray.setToolTip(`Bot Island (${url})`);
      tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Show Bot Island', click: () => win && (win.show(), win.focus()) }, { label: 'Open in browser', click: () => shell.openExternal(url) }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]));
      tray.on('click', () => win && (win.show(), win.focus())); } catch {}
  } catch (e) { dialog.showErrorBox('Bot Island could not start', String(e?.stack || e)); app.quit(); }
});
app.on('before-quit', (e) => { if (quitting || !island) return; e.preventDefault(); quitting = true; // stop the server, then really quit
  Promise.race([island.close(), new Promise((r) => setTimeout(r, 3000))]).finally(() => { island = null; app.quit(); }); });
app.on('window-all-closed', () => app.quit());
