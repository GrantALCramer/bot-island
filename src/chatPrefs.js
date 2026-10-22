// Per-device chat look preferences (localStorage), shared live between the pop-out and Island settings.
import { useEffect, useState } from 'react';
const KEY = 'botisland.chatPrefs';
export const CHAT_DEFAULTS = { look: 'auto', contrast: false, botColors: true, textPct: 100, frame: 'theme', holiday: 'halloween' };
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
