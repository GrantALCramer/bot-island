// Bot Island desktop preload: a tiny, read-only bridge for the full screen (windowed) toggle. Nothing else is exposed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('botislandDesktop', {
  isDesktop: true,
  getFullscreen: () => ipcRenderer.invoke('bi:fs:get'),
  setFullscreen: (on) => ipcRenderer.invoke('bi:fs:set', !!on),
  onFullscreen: (cb) => { const h = (_e, on) => cb(!!on); ipcRenderer.on('bi:fs', h); return () => ipcRenderer.removeListener('bi:fs', h); },
});
// Esc leaves full screen only when nothing on the page uses it: no chat/task window or dialog open, not typing,
// and no page handler called preventDefault (checked after the page's own handlers ran).
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.repeat) return;
  const busy = !!document.querySelector('.cpwin, [role="dialog"], dialog[open], .modal') || !!document.activeElement?.closest?.('input, textarea, select, [contenteditable="true"]');
  setTimeout(() => { if (!busy && !e.defaultPrevented) ipcRenderer.send('bi:fs:esc'); }, 0);
}, true);
