// Idle group activities: every few minutes, idle bots wander off together to a theme landmark (drinks at the bar /
// tea house, the plaza fire, a stroll down the dock, stargazing, a chat huddle, hanami in sakura) for 30-90 s.
// Pure scheduling + target overrides; the blobs' normal router (ring road + each landmark's approach waypoints)
// does the walking, so they keep off buildings and water exactly like their normal trips.
import { WEATHER } from './world/Sky.jsx';

export const FREQ = { rare: [8, 15], normal: [3, 6], often: [1, 2.5] }; // minutes between activities
const DRINK = { tropical: '🍹', jungle: '🥥', antarctica: '☕', atlantis: '🧋', moon: '🧃', heaven: '🍯', hell: '🌶️', sakura: '🍵' };
const strip = (l) => String(l || '').replace(/:.*$/, '').trim(); // "⚓ Dock: waiting on you" -> "⚓ Dock"

// kind -> how it looks and when it fits. weight(ctx) returns 0 when it doesn't fit right now.
export const KINDS = {
  drinks: { zone: 'social', solo: true, emojis: (t) => [t.drink || DRINK[t.id] || '☕', '😋', '💬'], label: (t) => `Drinks at ${strip(t.zones.social?.label) || 'the bar'}`,
    weight: (c) => 3 + (c.wet ? 2 : 0) },
  campfire: { zone: 'plaza', emojis: () => ['🔥', '😊', '🎶', '💬'], label: (t) => (t.actLabels?.campfire || (t.id === 'sakura' ? 'Lanterns in the stone garden' : `Around the ${t.zones.plaza?.style === 'campfire' ? 'campfire' : 'fire'}`)),
    weight: (c) => (c.wet || c.theme.underwater ? 0 : c.night ? 4 : c.dusk ? 2 : 0.5) },
  huddle: { zone: (c) => (c.wet ? 'social' : 'plaza'), emojis: () => ['💬', '😂', '☕', '🍹', '👀', '🙌'], label: (t, c) => (c?.wet ? 'Chat huddle (sheltering)' : 'Chat huddle'),
    weight: () => 2 },
  stroll: { zone: 'waiting', stroll: true, emojis: () => ['🌊', '😎', '👋'], label: (t) => t.actLabels?.stroll || `Stroll to ${strip(t.zones.waiting?.label) || 'the dock'}`,
    weight: (c) => (c.wet || c.night ? 0 : 2) },
  stargaze: { zone: 'waiting', pose: 'lie', emojis: () => ['✨', '🌠', '🌙', '⭐'], label: (t) => t.actLabels?.stargaze || 'Stargazing',
    weight: (c) => (c.theme.underwater || c.wet || c.cloudy ? 0 : c.night || c.theme.id === 'moon' ? 3 : 0) },
  // theme structures (theme.fun -> layout.zones[key]); only offered when the structure exists on the map
  hottub: { zone: 'hottub', fun: true, emojis: (t) => (t.id === 'heaven' ? ['☁️', '😇', '🫧'] : t.id === 'sakura' ? ['♨️', '😌', '🍶'] : ['♨️', '😌', '🫧', '😎']), weight: (c) => (c.night ? 4 : c.cold ? 4 : 2.5) },
  icebath: { zone: 'icebath', fun: true, solo: true, emojis: () => ['🥶', '🧊', '😬', '❄️'], weight: (c) => (c.night ? 2 : 3.5) },
  bubblevent: { zone: 'bubblevent', fun: true, emojis: () => ['🫧', '😆', '🐠'], weight: () => 3 },
  trampoline: { zone: 'trampoline', fun: true, emojis: () => ['🤸', '🚀', '😆', '🌍'], weight: () => 4 },
  volleyball: { zone: 'volleyball', fun: true, emojis: () => ['🏐', '🙌', '😂', '💪'], weight: (c) => (c.wet || c.night ? 0 : 3.5) },
  vineswing: { zone: 'vineswing', fun: true, emojis: () => ['🐒', '😆', '🌿', '🙌'], weight: (c) => (c.wet || c.night ? 0 : 3) },
  snowball: { zone: 'snowball', fun: true, emojis: () => ['❄️', '😂', '🎯', '😆'], weight: (c) => (c.night || c.storm ? 0 : 3.5) },
  seahorse: { zone: 'seahorse', fun: true, emojis: () => ['🐴', '🌊', '😄', '🫧'], weight: () => 3 },
  harp: { zone: 'harp', fun: true, emojis: () => ['🎵', '🎶', '😇', '🪽'], weight: (c) => (c.night || c.dusk ? 4 : 2.5) },
  marshmallow: { zone: 'marshmallow', fun: true, emojis: () => ['🍡', '🔥', '😋', '🤤'], weight: (c) => (c.night || c.dusk ? 4 : 2) },
  shooting: { zone: 'range', fun: true, emojis: () => ['🤠', '🎯', '💥', '🥫'], weight: (c) => (c.wet ? 0 : c.night ? 1.5 : 3.5) },
  lanternwalk: { zone: 'waiting', stroll: true, only: 'sakura', emojis: () => ['🏮', '✨', '🌙', '😊'], label: () => 'Lantern walk to the torii', weight: (c) => (c.wet ? 0 : c.night ? 5 : c.dusk ? 3 : 0) },
  hanami: { zone: 'plaza', emojis: () => ['🌸', '🍡', '🍵', '😊'], label: () => 'Hanami under the blossoms', only: 'sakura',
    weight: (c) => (c.wet || c.night ? 0 : 4) },
};

export function context(theme, hour, weather, layout) {
  const W = WEATHER[weather] || {}; const h = ((hour % 24) + 24) % 24;
  return { theme, layout, cold: theme.id === 'antarctica' || !!W.snow, storm: (W.snow || 0) > 2000 || (W.particles?.count || 0) > 2000, night: h >= 20 || h < 5, dusk: (h >= 18 && h < 20) || (h >= 5 && h < 6.5), wet: !!(W.rain || W.snow || W.particles?.count > 200 && weather !== 'petals' && !W.dry), cloudy: (W.gray ?? 0) > 0.35 };
}
const avail = (k, theme, layout) => (!KINDS[k].only || KINDS[k].only === theme.id) && (!KINDS[k].fun || !!layout?.zones[KINDS[k].zone]?.slots.length);
export function kindsFor(theme, layout) { return Object.keys(KINDS).filter((k) => avail(k, theme, layout)); }

export function pickKind(ctx, solo) {
  const opts = Object.entries(KINDS).filter(([k, d]) => avail(k, ctx.theme, ctx.layout) && (!solo || d.solo)).map(([k, d]) => [k, d.weight(ctx)]).filter(([, w]) => w > 0);
  let tot = opts.reduce((a, [, w]) => a + w, 0); if (!tot) return solo ? 'drinks' : 'huddle';
  let r = Math.random() * tot; for (const [k, w] of opts) if ((r -= w) <= 0) return k; return opts[0][0];
}

// build an activity for the given idle bot ids
export function makeActivity(kind, ids, theme, ctx, now = Date.now()) {
  const d = KINDS[kind]; const zone = typeof d.zone === 'function' ? d.zone(ctx) : d.zone;
  const cap = zone === 'waiting' ? ctx.layout?.zones.waiting?.slots.length : 0; if (cap) ids = ids.slice(0, cap); // docks don't grow; everything else seats everyone
  return { kind, zone, ids, pose: d.pose, stroll: !!d.stroll, emojis: theme.funEmojis?.[kind] || d.emojis(theme), label: d.label ? d.label(theme, ctx) : ctx.layout?.zones[zone]?.cfg.label || kind, start: now, until: now + (30 + Math.random() * 60) * 1000 + 20000 /* walking */ };
}
// Activity level slider 0..100 (0 = off). Gap between activities, log-interpolated through
// 1 -> ~30 min, 50 -> ~4.5 min (the old "normal"), 100 -> ~5 s (back-to-back). +/-35% jitter.
export const LEVEL_FROM_FREQ = { rare: 25, normal: 50, often: 68 };
export function gapMinutes(level) { const L = Math.max(0.01, Math.min(1, level / 100));
  return L <= 0.5 ? 30 * Math.pow(4.5 / 30, L / 0.5) : 4.5 * Math.pow(5 / 60 / 4.5, (L - 0.5) / 0.5); }
export const nextGap = (level) => gapMinutes(level) * 60000 * (0.65 + Math.random() * 0.7);
// sleeping (stale) bots wake up to join with this chance; the rest keep napping. 50 -> ~65%, 80+ -> ~always
export const wakeChance = (level) => Math.min(1, Math.max(0, (level - 10) / 70)) ** 0.6;
export const fmtGap = (level) => { const m = gapMinutes(level); return m < 1 ? `${Math.round(m * 60)} s` : `${m < 10 ? m.toFixed(1) : Math.round(m)} min`; };
