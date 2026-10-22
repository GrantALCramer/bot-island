// Pop-out chat: a large, movable, resizable dialog over the island, with look/contrast/text-size/frame settings.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatThread } from './Chat.jsx';
import { useChatPrefs, useMedia } from './chatPrefs.js';
import { THEME_FRAMES, HOLIDAY_FRAMES } from './frames.js';
import { HOLIDAYS, holidayFor } from './holidays.js';
import './chat-pop.css';

const GEO_KEY = 'botisland.chatPop';
const loadGeo = () => { try { return JSON.parse(localStorage.getItem(GEO_KEY) || 'null'); } catch { return null; } };
function fitGeo(g) { const W = innerWidth, H = innerHeight; const w = Math.min(Math.max(g?.w || W * 0.7, 320), W - 16), h = Math.min(Math.max(g?.h || H * 0.7, 260), H - 16);
  const x = Math.min(Math.max(g?.x ?? (W - w) / 2, 8), W - w - 8), y = Math.min(Math.max(g?.y ?? (H - h) / 2, 8), H - h - 8); return { x, y, w, h }; }

// which frame to draw (null = none); exported for Island settings previews and tests
export function pickFrame(prefs, themeId, date = new Date(), { contrast, seasonHoliday } = {}) {
  if (contrast || prefs.contrast || prefs.frame === 'off') return null;
  if (prefs.frame === 'theme') return THEME_FRAMES[themeId] ? { ...THEME_FRAMES[themeId], label: themeId } : null;
  if (prefs.frame === 'holiday') { const h = (seasonHoliday && HOLIDAYS.find((x) => x.id === seasonHoliday)) || holidayFor(date); return h ? { ...HOLIDAY_FRAMES[h.id], label: h.name } : (THEME_FRAMES[themeId] ? { ...THEME_FRAMES[themeId], label: themeId } : null); }
  if (prefs.frame === 'pick') { const h = HOLIDAYS.find((x) => x.id === prefs.holiday); return h ? { ...HOLIDAY_FRAMES[h.id], label: h.name } : null; }
  return null;
}
export function Frame({ frame, still }) {
  if (!frame) return null; const ic = frame.icons; const row = (n, off) => Array.from({ length: n }, (_, i) => <span key={i} style={{ animationDelay: `${((i + off) % 5) * 0.4}s` }}>{ic[(i + off) % ic.length]}</span>);
  return (<div className={'cpframe' + (still ? ' still' : '')} aria-hidden="true" style={{ background: frame.bg }}>
    <div className="fr top">{row(9, 0)}</div><div className="fr bottom">{row(9, 2)}</div>
    <div className="fr left">{row(5, 1)}</div><div className="fr right">{row(5, 3)}</div>
  </div>);
}

export function ChatLookControls({ prefs, set, compact }) {
  return (<div className={'cplook' + (compact ? ' compact' : '')}>
    <label className="cptext" title="Text size">
      <button type="button" aria-label="Smaller text" onClick={() => set({ textPct: prefs.textPct - 10 })}>A−</button>
      <input type="range" min="100" max="200" step="10" value={prefs.textPct} aria-label="Chat text size" aria-valuetext={`${prefs.textPct}%`} onChange={(e) => set({ textPct: +e.target.value })} />
      <button type="button" aria-label="Larger text" onClick={() => set({ textPct: prefs.textPct + 10 })}>A+</button>
      <span className="pct">{prefs.textPct}%</span>
    </label>
    <div className="seg" role="group" aria-label="Chat look">
      {[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([k, l]) => <button key={k} type="button" aria-pressed={prefs.look === k} className={prefs.look === k ? 'on' : ''} onClick={() => set({ look: k })}>{l}</button>)}
    </div>
    <label className="cptog"><input type="checkbox" checked={prefs.contrast} onChange={(e) => set({ contrast: e.target.checked })} /> High contrast</label>
    <label className="cptog"><input type="checkbox" checked={prefs.botColors} onChange={(e) => set({ botColors: e.target.checked })} /> Bot colors</label>
    {!compact && <>
      <label className="cpsel">Frame <select value={prefs.frame} onChange={(e) => set({ frame: e.target.value })} aria-label="Decorative frame">
        <option value="off">Off</option><option value="theme">Match island theme</option><option value="holiday">Holiday (auto by date)</option><option value="pick">Always a holiday…</option></select></label>
      {prefs.frame === 'pick' && <select value={prefs.holiday} onChange={(e) => set({ holiday: e.target.value })} aria-label="Holiday frame">{HOLIDAYS.map((h) => <option key={h.id} value={h.id}>{h.icon} {h.name}</option>)}</select>}
    </>}
  </div>);
}

export function ChatPop({ bot, chat, themeId, color, onClose, now, seasonHoliday }) {
  const [prefs, set] = useChatPrefs();
  const sysDark = useMedia('(prefers-color-scheme: dark)'); const still = useMedia('(prefers-reduced-motion: reduce)'); const narrow = useMedia('(max-width: 700px)');
  const dark = prefs.look === 'dark' || (prefs.look === 'auto' && sysDark);
  const [geo, setGeo] = useState(() => fitGeo(loadGeo()));
  const win = useRef(); const prevFocus = useRef(null); const ours = useRef(false);
  const frame = pickFrame(prefs, themeId, now || new Date(), { seasonHoliday });
  const saveGeo = (g) => { setGeo(g); try { localStorage.setItem(GEO_KEY, JSON.stringify(g)); } catch {} };
  // Android back / browser back closes the pop-out: one history entry while open
  const close = useRef(onClose); close.current = onClose;
  const requestClose = () => { if (ours.current && history.state?.botislandChat) history.back(); else close.current(); };
  useEffect(() => {
    history.pushState({ ...(history.state || {}), botislandChat: 1 }, ''); ours.current = true;
    const pop = () => { ours.current = false; close.current(); };
    addEventListener('popstate', pop);
    const onResize = () => setGeo((g) => fitGeo(g)); addEventListener('resize', onResize);
    return () => { removeEventListener('popstate', pop); removeEventListener('resize', onResize); };
  }, []);
  // focus: move in, trap Tab, Escape closes, restore on close
  useLayoutEffect(() => { prevFocus.current = document.activeElement; const el = win.current; (el.querySelector('textarea') || el.querySelector('.cpx'))?.focus(); return () => prevFocus.current?.focus?.(); }, []);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); requestClose(); return; }
    if (e.key !== 'Tab') return;
    const f = [...win.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const drag = (mode) => (e) => { if (narrow || e.button > 0 || (mode === 'move' && e.target.closest('button,input,select,label'))) return;
    e.preventDefault(); const sx = e.clientX, sy = e.clientY, g0 = geo; let g = g0;
    const mv = (ev) => { const dx = ev.clientX - sx, dy = ev.clientY - sy;
      g = fitGeo(mode === 'move' ? { ...g0, x: g0.x + dx, y: g0.y + dy } : { ...g0, w: g0.w + dx, h: g0.h + dy }); setGeo(g); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); saveGeo(g); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  const cls = ['cpwin', dark ? 'dark' : 'light', prefs.contrast && 'hc', narrow && 'full', frame && 'framed', prefs.botColors && !prefs.contrast && 'tint'].filter(Boolean).join(' ');
  const style = narrow ? {} : { left: geo.x, top: geo.y, width: geo.w, height: geo.h };
  return createPortal(<div className="cpback" onKeyDown={onKey}>
    <div ref={win} className={cls} role="dialog" aria-modal="true" aria-labelledby="cp-title" style={{ ...style, '--cp-scale': prefs.textPct / 100, '--bot': color || '#888' }}>
      <Frame frame={frame} still={still} />
      <div className="cpinner">
        <div className="cptitle" onPointerDown={drag('move')}>
          <i className="dot" style={{ background: color }} aria-hidden="true" />
          <h2 id="cp-title">Chat with {bot.name}</h2>
          <button type="button" className="cpx" aria-label="Close chat" onClick={requestClose}>✕</button>
        </div>
        <ChatLookControls prefs={prefs} set={set} compact />
        <ChatThread bot={bot} chat={chat} big />
      </div>
      {!narrow && <div className="cpresize" role="separator" aria-label="Resize chat window" onPointerDown={drag('size')} />}
    </div>
  </div>, document.body);
}
