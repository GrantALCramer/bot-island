// Pop-out chat: a large, movable, resizable dialog over the island, with look/contrast/text-size/frame settings.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatThread } from './Chat.jsx';
import { useChatPrefs, useMedia, useLook, meVars, ME_SWATCH, readableOn } from './chatPrefs.js';
import { useFloatWin } from './floatWin.jsx';
import { THEME_FRAMES, HOLIDAY_FRAMES } from './frames.js';
import { HOLIDAYS, holidayFor } from './holidays.js';
import './chat-pop.css';

const GEO_KEY = 'botisland.chatPop';
const DEF = { w: (W) => W * 0.6, h: (H) => H * 0.7 };

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
      {[['light', 'Light'], ['grey', 'Grey'], ['dark', 'Dark'], ['auto', 'Auto']].map(([k, l]) => <button key={k} type="button" aria-pressed={prefs.look === k} className={prefs.look === k ? 'on' : ''} onClick={() => set({ look: k })}>{l}</button>)}
    </div>
    <label className="cptog"><input type="checkbox" checked={prefs.contrast} onChange={(e) => set({ contrast: e.target.checked })} /> High contrast</label>
    <label className="cptog"><input type="checkbox" checked={prefs.botColors} onChange={(e) => set({ botColors: e.target.checked })} /> Bot colors</label>
    {compact ? <details className="cpme"><summary>Sent color</summary><MeColorPicker prefs={prefs} set={set} /></details> : <MeColorPicker prefs={prefs} set={set} />}
    {!compact && <>
      <label className="cpsel">Frame <select value={prefs.frame} onChange={(e) => set({ frame: e.target.value })} aria-label="Decorative frame">
        <option value="off">Off</option><option value="theme">Match island theme</option><option value="holiday">Holiday (auto by date)</option><option value="pick">Always a holiday…</option></select></label>
      {prefs.frame === 'pick' && <select value={prefs.holiday} onChange={(e) => set({ holiday: e.target.value })} aria-label="Holiday frame">{HOLIDAYS.map((h) => <option key={h.id} value={h.id}>{h.icon} {h.name}</option>)}</select>}
    </>}
  </div>);
}

export function MeColorPicker({ prefs, set }) {
  const cur = prefs.meColor;
  return (<div className="mepick" role="group" aria-label="Sent message color"><span className="mel">Sent bubbles</span>
    <button type="button" className={'mesw def' + (!cur ? ' on' : '')} aria-pressed={!cur} title="Default blue" onClick={() => set({ meColor: null })}>Default</button>
    {ME_SWATCH.slice(1).map((c) => <button key={c} type="button" className={'mesw' + (cur === c ? ' on' : '')} aria-pressed={cur === c} style={{ background: c, color: readableOn(c) }} title={c} aria-label={`Sent color ${c}`} onClick={() => set({ meColor: c })}>{cur === c ? '✓' : ''}</button>)}
    <input type="color" aria-label="Custom sent color" title="Custom color" value={/^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#2b6fd6'} onChange={(e) => set({ meColor: e.target.value })} />
    {prefs.contrast && <span className="mel">(high contrast uses yellow)</span>}
  </div>);
}

export function ChatPop({ bot, chat, themeId, color, onClose, now, seasonHoliday }) {
  const [prefs, set] = useChatPrefs();
  const look = useLook(prefs); const still = useMedia('(prefers-reduced-motion: reduce)'); const narrow = useMedia('(max-width: 700px)');
  const fw = useFloatWin(GEO_KEY, DEF, { disabled: narrow, min: { w: 320, h: 260 } });
  const pinned = !narrow && !!fw.extra.pinned;
  const win = useRef(); const prevFocus = useRef(null); const ours = useRef(false);
  const frame = pickFrame(prefs, themeId, now || new Date(), { seasonHoliday });
  // Android back / browser back closes the pop-out: one history entry while open
  const close = useRef(onClose); close.current = onClose;
  const requestClose = () => { if (ours.current && history.state?.botislandChat) history.back(); else close.current(); };
  useEffect(() => {
    history.pushState({ ...(history.state || {}), botislandChat: 1 }, ''); ours.current = true;
    const pop = () => { ours.current = false; close.current(); };
    addEventListener('popstate', pop);
    return () => removeEventListener('popstate', pop);
  }, []);
  // Escape closes even when focus is on the island (pinned window, island interactive)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !win.current?.contains(document.activeElement)) requestClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  useLayoutEffect(() => { prevFocus.current = document.activeElement; const el = win.current; (el.querySelector('textarea') || el.querySelector('.cpx'))?.focus(); return () => prevFocus.current?.focus?.(); }, []);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); requestClose(); return; }
    if (e.key !== 'Tab' || pinned) return; // pinned = non-modal: Tab may leave the window
    const f = [...win.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const cls = ['cpwin', look, prefs.contrast && 'hc', narrow && 'full', frame && 'framed', prefs.botColors && !prefs.contrast && 'tint', pinned && 'pinned', fw.max && 'maxed'].filter(Boolean).join(' ');
  return createPortal(<div className={'cpback' + (pinned ? ' pinned' : '')} onPointerDown={(e) => { if (e.target === e.currentTarget && !pinned) requestClose(); }}>
    <div ref={win} className={cls} onKeyDown={onKey} role="dialog" aria-modal={!pinned} aria-labelledby="cp-title" style={{ ...fw.style, '--cp-scale': prefs.textPct / 100, '--bot': color || '#888', ...meVars(prefs) }}>
      <Frame frame={frame} still={still} />
      <div className="cpinner">
        <div className="cptitle" onPointerDown={fw.onMoveDown} onDoubleClick={(e) => { if (!narrow && !e.target.closest('button')) fw.setMax(!fw.max); }}>
          <i className="dot" style={{ background: color }} aria-hidden="true" />
          <h2 id="cp-title">Chat with {bot.name}</h2>
          {!narrow && <>
            <button type="button" className={'wbtn' + (pinned ? ' on' : '')} aria-pressed={pinned} aria-label={pinned ? 'Unpin chat window' : 'Pin chat window (stays open while you use the island)'} title={pinned ? 'Pinned: stays open while you use the island' : 'Pin: keep open while using the island'} onClick={() => fw.setExtra({ pinned: !pinned })}><svg className="pinico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><g transform="rotate(45 12 12)" fill="currentColor"><path d="M8 2h8v2h-1.2l.7 7 2.5 2.2V15H6v-1.8L8.5 11l.7-7H8z"/><path d="M11.2 15h1.6l-.3 7h-1z"/></g></svg></button>
            <button type="button" className="wbtn" aria-label={fw.max ? 'Restore window size' : 'Maximize window'} title={fw.max ? 'Restore' : 'Maximize'} onClick={() => fw.setMax(!fw.max)}>{fw.max ? '❐' : '□'}</button>
          </>}
          <button type="button" className="cpx" aria-label="Close chat" onClick={requestClose}>✕</button>
        </div>
        <ChatLookControls prefs={prefs} set={set} compact />
        <ChatThread bot={bot} chat={chat} big />
      </div>
      {fw.handles}
    </div>
  </div>, document.body);
}
