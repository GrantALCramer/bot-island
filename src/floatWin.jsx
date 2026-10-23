// Floating, draggable, resizable window geometry (persisted in localStorage, clamped on-screen).
import { useEffect, useRef, useState } from 'react';
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
export function fitGeo(g, def, min = { w: 300, h: 200 }) {
  const W = innerWidth, H = innerHeight; const w = Math.min(Math.max(g?.w || def.w(W), min.w), W - 16), h = Math.min(Math.max(g?.h || def.h(H), min.h), H - 16);
  const x = Math.min(Math.max(g?.x ?? (def.x ? def.x(W, w) : (W - w) / 2), 8), W - w - 8), y = Math.min(Math.max(g?.y ?? (def.y ? def.y(H, h) : (H - h) / 2), 8), H - h - 8);
  return { x, y, w, h };
}
const EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
export function useFloatWin(key, def, { disabled, min } = {}) {
  const saved = useRef(load(key) || {});
  const [geo, setGeo] = useState(() => fitGeo(saved.current, def, min));
  const [max, setMaxS] = useState(!!saved.current.max);
  const [extra, setExtraS] = useState(saved.current.extra || {});
  const persist = (patch) => { saved.current = { ...saved.current, ...patch }; try { localStorage.setItem(key, JSON.stringify(saved.current)); } catch {} };
  useEffect(() => { const f = () => setGeo((g) => fitGeo(g, def, min)); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  const setMax = (v) => { setMaxS(v); persist({ max: v }); };
  const setExtra = (p) => setExtraS((e) => { const n = { ...e, ...p }; persist({ extra: n }); return n; });
  const start = (mode) => (e) => {
    if (disabled || max || e.button > 0 || (mode === 'move' && e.target.closest('button,input,select,label,textarea'))) return;
    e.preventDefault(); e.stopPropagation(); const sx = e.clientX, sy = e.clientY, g0 = geo; let g = g0;
    const mv = (ev) => { const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') g = fitGeo({ ...g0, x: g0.x + dx, y: g0.y + dy }, def, min);
      else { let { x, y, w, h } = g0; const mw = min?.w || 300, mh = min?.h || 200;
        if (mode.includes('e')) w = g0.w + dx; if (mode.includes('s')) h = g0.h + dy;
        if (mode.includes('w')) { w = Math.max(mw, g0.w - dx); x = g0.x + g0.w - w; }
        if (mode.includes('n')) { h = Math.max(mh, g0.h - dy); y = g0.y + g0.h - h; }
        x = Math.max(8, x); y = Math.max(8, y); w = Math.min(w, innerWidth - 8 - x); h = Math.min(h, innerHeight - 8 - y);
        g = fitGeo({ x, y, w, h }, def, min); }
      setGeo(g); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); persist({ x: g.x, y: g.y, w: g.w, h: g.h }); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  };
  const style = disabled ? {} : max ? { left: 8, top: 8, width: innerWidth - 16, height: innerHeight - 16 } : { left: geo.x, top: geo.y, width: geo.w, height: geo.h };
  const handles = disabled || max ? null : EDGES.map((d) => <div key={d} className={'fwedge fw-' + d} aria-hidden="true" onPointerDown={start(d)} />);
  return { style, max, setMax, onMoveDown: start('move'), handles, extra, setExtra };
}
