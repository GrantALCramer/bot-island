// Per-device chat look preferences (localStorage), shared live between the pop-out and Island settings.
import { useEffect, useState } from 'react';
const KEY = 'botisland.chatPrefs';
export const CHAT_DEFAULTS = { look: 'auto', contrast: false, botColors: true, textPct: 100, frame: 'theme', holiday: 'halloween', meColor: null };
const read = () => { try { return { ...CHAT_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...CHAT_DEFAULTS }; } };
const subs = new Set();
export function setChatPrefs(patch) { const n = { ...read(), ...patch }; n.textPct = Math.max(100, Math.min(200, Math.round(+n.textPct || 100)));
  localStorage.setItem(KEY, JSON.stringify(n)); subs.forEach((f) => f(n)); }
export function useChatPrefs() {
  const [p, setP] = useState(read);
  useEffect(() => { subs.add(setP); const onS = (e) => { if (e.key === KEY) setP(read()); }; addEventListener('storage', onS);
    return () => { subs.delete(setP); removeEventListener('storage', onS); }; }, []);
  return [p, setChatPrefs];
}
export function useMedia(q) {
  const [m, setM] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
  useEffect(() => { if (typeof matchMedia !== 'function') return; const mq = matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener?.('change', f); return () => mq.removeEventListener?.('change', f); }, [q]);
  return m;
}

// resolved look: 'light' | 'grey' | 'dark' (Auto follows the system)
export function useLook(prefs) { const sysDark = useMedia('(prefers-color-scheme: dark)'); return prefs.look === 'auto' ? (sysDark ? 'dark' : 'light') : (['light', 'grey', 'dark'].includes(prefs.look) ? prefs.look : 'light'); }
// sent-bubble colour + readable text colour (black/white by WCAG contrast)
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const readableOn = (hex) => (contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff');
export const ME_SWATCH = ['#2b6fd6', '#16a34a', '#0d9488', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#f5c542', '#475569'];
export function meVars(prefs) { const c = /^#[0-9a-f]{6}$/i.test(prefs.meColor || '') ? prefs.meColor : null; return c && !prefs.contrast ? { '--me': c, '--me-fg': readableOn(c) } : {}; }
