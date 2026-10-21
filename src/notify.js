// Alert notifications: a browser notification (and optional chime) when a bot ENTERS waiting_on_user or error.
// One per report (keyed by bot + report time, remembered in localStorage so reloads don't repeat); cleared alerts
// come back from the server as idle, so they never fire.
import { useEffect, useRef } from 'react';
const ALERT = { waiting_on_user: 'is waiting on you', error: 'hit an error' };
const SEEN_KEY = 'botsim.notified';
const loadSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } };
const saveSeen = (s) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200))); } catch {} };
export function chime() {
  try { const A = window.__botsimAudio ||= new (window.AudioContext || window.webkitAudioContext)(); const t = A.currentTime;
    [660, 880].forEach((f, i) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t + i * 0.16); g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.16 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.35);
      o.connect(g).connect(A.destination); o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.4); }); } catch {}
}
export async function askPermission() { if (!('Notification' in window)) return 'unsupported'; if (Notification.permission === 'default') return Notification.requestPermission(); return Notification.permission; }
export function useAlertNotifications(bots, { notify, sound }, onClick) {
  const seen = useRef(null);
  useEffect(() => {
    const alerts = bots.filter((b) => ALERT[b.state] && !b.cleared && b.source !== 'demo');
    if (!seen.current) { seen.current = loadSeen(); alerts.forEach((b) => seen.current.add(`${b.id}@${b.updatedAt}`)); saveSeen(seen.current); return; } // existing alerts at load don't fire
    const fresh = alerts.filter((b) => !seen.current.has(`${b.id}@${b.updatedAt}`)); if (!fresh.length) return;
    fresh.forEach((b) => seen.current.add(`${b.id}@${b.updatedAt}`)); saveSeen(seen.current);
    window.__botsimNotified = (window.__botsimNotified || 0) + fresh.length;
    if (sound) chime();
    if (notify && 'Notification' in window && Notification.permission === 'granted') for (const b of fresh) {
      try { const n = new Notification(`${b.name} ${ALERT[b.state]}`, { body: b.task || '', tag: `botsim-${b.id}`, icon: '/favicon.ico' }); n.onclick = () => { window.focus(); onClick?.(b.id); n.close(); }; } catch {}
    }
  }, [bots, notify, sound]); // eslint-disable-line
}
