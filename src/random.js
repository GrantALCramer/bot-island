// "Random" time and weather: a separate world clock and a slowly changing weather pick, both saved in settings.
// World clock: hour = h0 + (now - t0) / (rate minutes per in-world hour). It keeps running while the page is closed.
export const RATES = [1, 3, 5, 10]; // real minutes per in-world hour (3 -> a full day every 72 min)
export const DEFAULT_RATE = 3;
export const newClock = (hour = Math.random() * 24, now = Date.now()) => ({ h0: hour, t0: now });
export function clockHour(rc, rate = DEFAULT_RATE, now = Date.now()) {
  if (!rc || !Number.isFinite(rc.h0) || !Number.isFinite(rc.t0)) return 12;
  const h = (rc.h0 + (now - rc.t0) / (Math.max(0.1, rate) * 60000)) % 24; return h < 0 ? h + 24 : h;
}
// Weather: weighted toward the theme's calm default ("clear"), held for 10-30 minutes.
export const WX_MIN = [10, 30];
export function pickWeather(list, calm, prev, now = Date.now()) {
  const opts = list.map((w) => [w, w === calm ? Math.max(3, list.length - 1) : w === prev ? 0.4 : 1]);
  let tot = opts.reduce((a, [, v]) => a + v, 0); let r = Math.random() * tot; let w = calm;
  for (const [k, v] of opts) { if ((r -= v) <= 0) { w = k; break; } }
  return { w, since: now, until: now + (WX_MIN[0] + Math.random() * (WX_MIN[1] - WX_MIN[0])) * 60000 };
}
