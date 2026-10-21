import { avatarColor } from './avatars.js';
import * as THREE from 'three';

export const COLOR_MAP = {
  black: '#33333f', brown: '#9a6440', red: '#e5484d', orange: '#f5862b', yellow: '#f2c230', green: '#46b45a',
  teal: '#22b8a8', cyan: '#38bdf8', blue: '#3b82f6', indigo: '#6366f1', purple: '#9b6bf2', violet: '#8b5cf6',
  pink: '#f472b6', magenta: '#e04fd0', cream: '#f1e4c6', white: '#f4f4f5', gray: '#8b8f99', grey: '#8b8f99',
  silver: '#c0c4cc', gold: '#e0b030', lime: '#9ad13b', mint: '#7fdcb0', navy: '#2c3e8c', coral: '#ff7f6b',
  peach: '#ffb38a', lavender: '#b9a5f0', beige: '#e3d3b0', tan: '#c9a27a', olive: '#8a8f3a', maroon: '#8c2f39',
};
const PALETTE = ['#3b82f6', '#9b6bf2', '#46b45a', '#f472b6', '#f2c230', '#22b8a8', '#f5862b', '#e5484d'];
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

export function botColor(bot) {
  const c = String(bot?.color || '').toLowerCase().trim();
  if (/^#[0-9a-f]{3,8}$/.test(c)) return c;
  const av = avatarColor(c); if (av) return av; // exact Grok Bot picker colors first
  if (COLOR_MAP[c]) return COLOR_MAP[c];
  return PALETTE[hash(bot?.id || bot?.name) % PALETTE.length];
}
export function isDark(hex) { const c = new THREE.Color(hex); return c.r * 0.299 + c.g * 0.587 + c.b * 0.114 < 0.3; }
export function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }

export const STATE_INFO = {
  working: { label: 'Working', color: '#f59e0b' },
  researching: { label: 'Researching', color: '#3b82f6' },
  thinking: { label: 'Thinking', color: '#a855f7' },
  waiting_on_user: { label: 'Waiting on you', color: '#ef4444' },
  error: { label: 'Error', color: '#57534e' },
  done: { label: 'Done!', color: '#22c55e' },
  idle: { label: 'Idle', color: '#94a3b8' },
  stale: { label: 'Asleep / stale', color: '#64748b' },
};

const ET = 'America/New_York';
export function etHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date);
  const h = +parts.find((p) => p.type === 'hour').value; const m = +parts.find((p) => p.type === 'minute').value;
  return h + m / 60;
}
export function fmtET(ts, withDate = false) {
  if (!ts) return '—';
  const d = new Date(ts);
  const opts = { timeZone: ET, hour: 'numeric', minute: '2-digit' };
  if (withDate) Object.assign(opts, { month: 'short', day: 'numeric' });
  return d.toLocaleString('en-US', opts) + ' ET';
}
export function fmtHour(h) {
  const hh = Math.floor(h) % 24; const mm = Math.floor((h % 1) * 60);
  const ampm = hh < 12 ? 'AM' : 'PM'; const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 0 = night, 1 = full day
export function dayFactor(h) { return smooth(5.5, 7.5, h) * (1 - smooth(17.5, 19.5, h)); }

const SKY_KEYS = [
  [0, '#0a0f26'], [4.5, '#141a3d'], [5.75, '#3b3567'], [6.5, '#f0a07a'], [7.5, '#a8d4f2'], [12, '#8ccbf5'],
  [17.2, '#a3cdec'], [18.4, '#f39a6e'], [19.2, '#5b3d6e'], [20.3, '#1c1d45'], [24, '#0a0f26'],
];
export function skyColor(h) {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const [h0, c0] = SKY_KEYS[i]; const [h1, c1] = SKY_KEYS[i + 1];
    if (h >= h0 && h <= h1) return new THREE.Color(c0).lerp(new THREE.Color(c1), (h - h0) / (h1 - h0));
  }
  return new THREE.Color(SKY_KEYS[0][1]);
}
export function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
