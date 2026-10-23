// Bot Island desktop (Electron). Starts the normal Bot Island server in-process on 127.0.0.1 (a free port, 8787 if
// it's available), opens it in a window without browser chrome, and stops the server when the window closes.
// Data stays in %APPDATA%\BotIsland (lib/config.js), so it survives reinstalls. No account, no VPN, nothing remote by default.
// Remote island (optional): <userData>/remote.json = { "enabled": true, "servers": ["https://island.example.ts.net", "http://192.168.1.20:8797"],
//   "key": "<island access key>" }. On launch the first server that answers is opened (key traded for a cookie, so no
//   login prompt); if none answers, the built-in local island starts instead. Tray menu: switch server / edit settings.
const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage, clipboard, ipcMain, session } = require('electron');
let autoUpdater = null; try { ({ autoUpdater } = require('electron-updater')); } catch {}
const path = require('node:path'); const fs = require('node:fs'); const net = require('node:net'); const { pathToFileURL } = require('node:url');

// Portable exe: own profile + own island data (never touches the installed app's %APPDATA% files or remote.json)
if (process.env.PORTABLE_EXECUTABLE_DIR) { const P = path.join(app.getPath('appData'), 'BotIsland-Portable');
  app.setPath('userData', P); if (!process.env.BOTISLAND_HOME) process.env.BOTISLAND_HOME = path.join(P, 'island'); }
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.setAppUserModelId('com.botisland.app'); // Windows: taskbar pinning + notifications
const ISLAND = path.join(__dirname, 'island'); const ICON = path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
let win = null; let island = null; let tray = null; let quitting = false; let islandFile = null;
const HIDDEN = process.argv.includes('--hidden'); // launched at login: stay in the tray
// desktop settings (Tray toggles): <island config>.remote.enabled = 'Allow bot connections' (key-protected port 8797);
// <userData>/desktop.json { startWithWindows } = 'Start with Windows' (login item, starts hidden in the tray). Both default off.
const DESK_FILE = () => path.join(app.getPath('userData'), 'desktop.json');
function readDesk() { try { return JSON.parse(fs.readFileSync(DESK_FILE(), 'utf8')); } catch { return {}; } }
function writeDesk(d) { fs.mkdirSync(path.dirname(DESK_FILE()), { recursive: true }); fs.writeFileSync(DESK_FILE(), JSON.stringify(d, null, 2) + '\n'); }
function readIslandCfg() { try { return JSON.parse(fs.readFileSync(islandFile, 'utf8').replace(/^\uFEFF/, '')); } catch { return {}; } }
// Full screen (windowed): Electron's own fullscreen = a borderless window covering the monitor the app is on. It never
// grabs the mouse (pointer lock is denied below), the cursor moves freely to other monitors, Win key / Alt+Tab work,
// and leaving it restores the previous window size/position. Remembered in desktop.json { fullscreen } (off by default).
// Main process is the single source of truth: fsWant = the state the user asked for (every F11 / checkbox / tray press flips
// THIS, never the possibly-stale win.isFullScreen() which lags during the Windows transition). fsApply() drives the window
// toward fsWant and re-checks after enter/leave events (and a safety timer) so rapid presses always settle on the last one.
let fsWant = false, fsTimer = null;
function fsBroadcast() { try { win?.webContents.send('bi:fs', fsWant); } catch {} buildTray(); }
function fsApply() { clearTimeout(fsTimer); if (!win) return;
  if (win.isFullScreen() !== fsWant) { if (!fsWant && !win.isVisible()) win.show(); win.setFullScreen(fsWant); }
  fsTimer = setTimeout(() => { if (win && win.isFullScreen() !== fsWant) win.setFullScreen(fsWant); }, 700); }
function setFullscreen(on) { on = !!on; fsWant = on; const d = readDesk(); if (!!d.fullscreen !== on) { d.fullscreen = on; writeDesk(d); }
  fsApply(); fsBroadcast(); }
ipcMain.handle('bi:fs:get', () => fsWant);
ipcMain.handle('bi:fs:set', (_e, on) => { setFullscreen(on); return fsWant; });
ipcMain.handle('bi:fs:toggle', () => { setFullscreen(!fsWant); return fsWant; });
ipcMain.on('bi:fs:esc', () => { if (fsWant) setFullscreen(false); });
function setStartWithWindows(on) { const d = readDesk(); d.startWithWindows = !!on; writeDesk(d);
  try { app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] }); } catch {} buildTray(); }
async function setAllowBots(on) {
  if (!islandFile) { const { loadConfig } = await import(pathToFileURL(path.join(ISLAND, 'lib', 'config.js')).href); islandFile = loadConfig({ argv: [] }).file; }
  const c = readIslandCfg(); c.remote = { ...(c.remote || {}), enabled: !!on };
  fs.mkdirSync(path.dirname(islandFile), { recursive: true }); fs.writeFileSync(islandFile, JSON.stringify(c, null, 2) + '\n', { mode: 0o600 });
  if (island) { const old = island; island = null; await Promise.race([old.close(), new Promise((r) => setTimeout(r, 3000))]); await startIsland();
    if (!current?.remote) { current = { url: island.localUrl, remote: false, load: localLoad() }; win?.loadURL(current.load); } }
  if (on && island && !island.remoteUrl) dialog.showMessageBox(win, { type: 'warning', message: 'Port 8797 is busy', detail: 'Bot connections could not be opened because another program is using port 8797.' });
  buildTray();
}

const portFree = (p) => new Promise((ok) => { const s = net.createServer(); s.once('error', () => ok(false)); s.listen(p, '127.0.0.1', () => s.close(() => ok(true))); });
async function freePort(start) { for (let p = start; p < start + 40; p++) if (await portFree(p)) return p;
  return new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); }); }

async function startIsland() {
  process.env.BOTISLAND_APP_VERSION = app.getVersion();
  const { loadConfig } = await import(pathToFileURL(path.join(ISLAND, 'lib', 'config.js')).href);
  let L = loadConfig({ argv: [] }); islandFile = L.file;
  if (!L.fileFound) { // first run: no console questions; default to the local folder (changeable in Island settings)
    const cfg = { port: 8787, openBrowser: false, eventsDir: path.join(L.dataDir, 'events'), demo: 'auto' };
    fs.mkdirSync(path.dirname(L.file), { recursive: true }); fs.writeFileSync(L.file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    fs.mkdirSync(cfg.eventsDir, { recursive: true }); L = loadConfig({ argv: [] }); islandFile = L.file;
  }
  const config = { ...L.config, openBrowser: false, port: await freePort(L.config.port || 8787) };
  if (config.remote?.enabled && !(await portFree(config.remote.port))) config.remote = { ...config.remote, enabled: false };
  const { startServer } = await import(pathToFileURL(path.join(ISLAND, 'server.js')).href);
  island = await startServer(config, L.dataDir, { configFile: L.file });
  return island.localUrl;
}

// the app's own window holds the key (when bot connections are on), so admin parts (pairing QR, key rotation) work;
// the key goes over loopback once and is swapped for a cookie by the server
const localLoad = () => openUrl(island.localUrl, island.accessKey);
// ---------- remote island ----------
const REMOTE_FILE = () => path.join(app.getPath('userData'), 'remote.json');
function readRemote() { try { const r = JSON.parse(fs.readFileSync(REMOTE_FILE(), 'utf8').replace(/^\uFEFF/, '')); r.servers = (r.servers || []).map(String).filter((u) => /^https?:\/\//.test(u)).map((u) => u.replace(/\/+$/, '')); return r; } catch { return null; } }
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
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') } });
  // never lock/capture the mouse: deny pointer lock (and keyboard lock) requests, and stub the API in every page
  win.webContents.session.setPermissionRequestHandler((_wc, perm, cb) => cb(!['pointerLock', 'keyboardLock'].includes(perm)));
  win.webContents.on('dom-ready', () => win?.webContents.executeJavaScript('try{Element.prototype.requestPointerLock=function(){return Promise.reject(new Error("pointer lock disabled"))};document.exitPointerLock?.()}catch{}').catch(() => {}));
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11' && !i.alt && !i.control && !i.meta) { e.preventDefault(); if (!i.isAutoRepeat) setFullscreen(!fsWant); } });
  // transition finished: if the user pressed again meanwhile, keep driving toward fsWant; otherwise just re-sync the UI
  const fsSync = () => { setTimeout(() => { if (win && win.isFullScreen() !== fsWant) fsApply(); fsBroadcast(); }, 50); };
  win.on('enter-full-screen', fsSync); win.on('leave-full-screen', fsSync);
  const sameSite = (u) => { try { return new URL(u).origin === new URL(current?.url || url).origin; } catch { return false; } };
  win.webContents.setWindowOpenHandler(({ url: u }) => { // agent.txt etc. open in a small window; outside links in the real browser
    if (sameSite(u)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON, width: 860, height: 760 } };
    if (/^https?:/.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, u) => { if (!sameSite(u)) { e.preventDefault(); if (/^https?:/.test(u)) shell.openExternal(u); } });
  fsWant = !!readDesk().fullscreen;
  win.once('ready-to-show', () => { if (!HIDDEN) win.show(); if (fsWant) setTimeout(fsApply, 100); });
  win.webContents.on('did-finish-load', fsBroadcast);
  win.on('closed', () => { win = null; app.quit(); });
  win.loadURL(url);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
async function connect() { // returns { url, load }
  const r = readRemote(); const remote = await pickRemote(r);
  if (remote) return { url: remote, remote: true, load: openUrl(remote, r.key) };
  if (!island) await startIsland(); return { url: island.localUrl, remote: false, load: localLoad(), failed: !!(r?.enabled && r.servers.length) };
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
      { label: 'Open in browser', click: () => current && shell.openExternal(current.url) },
      { label: 'Pair with link from clipboard…', click: () => pairFromClipboard() },
      { label: updState === 'ready' ? 'Restart to install update' : updState === 'downloading' ? 'Downloading update…' : 'Check for updates…', enabled: updState !== 'downloading', click: () => manualCheck() }, { type: 'separator' },
      { label: 'Allow bot connections (port 8797, needs access key)', type: 'checkbox', checked: !!readIslandCfg().remote?.enabled, click: (m) => setAllowBots(m.checked).catch((e) => dialog.showErrorBox('Bot Island', String(e?.message || e))) },
      ...(island?.accessKey ? [{ label: 'Copy access key', click: () => clipboard.writeText(island.accessKey) }] : []),
      { label: 'Full screen (windowed)    F11', type: 'checkbox', checked: fsWant, click: (m) => setFullscreen(m.checked) },
      { label: 'Start with Windows', type: 'checkbox', checked: !!readDesk().startWithWindows, click: (m) => setStartWithWindows(m.checked) }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]));
  } catch {}
}
// ---------- pairing: paste the link from Island settings -> Pair a phone or PC (https://host/?key=...) ----------
function parsePairLink(t) { try { const u = new URL(String(t || '').trim()); const key = u.searchParams.get('key');
  if (!/^https?:$/.test(u.protocol) || !key || key.length < 16) return null; return { server: u.origin, key }; } catch { return null; } }
async function pairFromClipboard() {
  const p = parsePairLink(clipboard.readText());
  if (!p) return dialog.showMessageBox(win, { type: 'info', message: 'No pairing link on the clipboard', detail: 'On the island open Island settings → Pair a phone or PC → Copy pairing link, then choose this again.' });
  const { response } = await dialog.showMessageBox(win, { type: 'question', buttons: ['Pair', 'Cancel'], defaultId: 0, cancelId: 1, message: `Connect this app to ${p.server}?`, detail: 'The app will open that island on start (this PC\'s own island stays available in the tray → Server menu).' });
  if (response !== 0) return;
  const r = readRemote() || { servers: [] }; writeRemote({ ...r, enabled: true, servers: [p.server, ...(r.servers || []).filter((x) => x !== p.server)], key: p.key, prefer: p.server });
  clipboard.writeText(''); go(p.server);
}
// ---------- updates (installer build only; GitHub Releases via electron-updater) ----------
const CAN_UPDATE = !!autoUpdater && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR;
let updState = '';
function setupUpdater() {
  if (!CAN_UPDATE) return; autoUpdater.autoDownload = false; autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', async (i) => { updState = 'available'; buildTray();
    const { response } = await dialog.showMessageBox(win, { type: 'info', buttons: ['Download', 'Later'], defaultId: 0, cancelId: 1, message: `Bot Island ${i.version} is available`, detail: `You have ${app.getVersion()}. Download it now? Your island data is kept.` });
    if (response === 0) { updState = 'downloading'; buildTray(); autoUpdater.downloadUpdate().catch(() => {}); } });
  autoUpdater.on('update-downloaded', async (i) => { updState = 'ready'; buildTray();
    const { response } = await dialog.showMessageBox(win, { type: 'info', buttons: ['Restart now', 'Later'], defaultId: 0, cancelId: 1, message: `Bot Island ${i.version} is ready`, detail: 'Restart to install it (or it installs the next time you quit).' });
    if (response === 0) autoUpdater.quitAndInstall(); });
  autoUpdater.on('error', () => { if (updState === 'downloading') updState = ''; buildTray(); });
  const check = () => autoUpdater.checkForUpdates().catch(() => {}); setTimeout(check, 15000); setInterval(check, 6 * 3600e3);
}
async function manualCheck() {
  if (!CAN_UPDATE) return dialog.showMessageBox(win, { type: 'info', message: 'Updates', detail: 'The portable version can\'t update itself: download the new one from the Releases page.' });
  if (updState === 'ready') return autoUpdater.quitAndInstall();
  try { const r = await autoUpdater.checkForUpdates(); if (!r || !r.isUpdateAvailable) dialog.showMessageBox(win, { type: 'info', message: `You're up to date (${app.getVersion()}).` }); }
  catch (e) { dialog.showMessageBox(win, { type: 'warning', message: 'Could not check for updates', detail: String(e?.message || e).slice(0, 300) }); }
}
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null); setupUpdater();
  try { await go(); } catch (e) { dialog.showErrorBox('Bot Island could not start', String(e?.stack || e)); app.quit(); }
});
app.on('before-quit', (e) => { if (quitting || !island) return; e.preventDefault(); quitting = true; // stop the server, then really quit
  Promise.race([island.close(), new Promise((r) => setTimeout(r, 3000))]).finally(() => { island = null; app.quit(); }); });
app.on('window-all-closed', () => app.quit());
