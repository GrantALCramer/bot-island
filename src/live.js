// Live time + weather (opt-in). Time: the viewer's own clock. Weather: the server asks Open-Meteo for a place
// (cached ~15 min server-side); each theme maps the real condition onto its own weathers. Offline -> theme default.
import { useEffect, useState } from 'react';
export const localHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const MAP = { // real condition -> theme weather (used when the theme lacks the real one)
  atlantis: { clear: 'calm', cloudy: 'plankton', rain: 'currents', storm: 'currents', fog: 'murky', snow: 'plankton' },
  antarctica: { cloudy: 'snow', rain: 'snow', storm: 'blizzard' },
  heaven: { cloudy: 'haze', rain: 'rainbow', storm: 'haze', fog: 'haze', snow: 'golden' },
  hell: { cloudy: 'smoke', rain: 'ashfall', storm: 'eruption', fog: 'smoke', snow: 'ashfall' },
  jungle: { fog: 'mist', snow: 'cloudy' },
  moon: { clear: 'vacuum', cloudy: 'vacuum', rain: 'meteors', storm: 'flare', fog: 'duststorm', snow: 'meteors' },
  sakura: { cloudy: 'petals', rain: 'springrain', storm: 'springrain', fog: 'mist', snow: 'lightsnow' },
  tropical: { snow: 'cloudy' },
  city: {},
  cave: { clear: 'still', cloudy: 'cavemist', rain: 'drips', storm: 'glowpulse', fog: 'cavemist', snow: 'shimmer' },
  haunted: { cloudy: 'fog', rain: 'rain', storm: 'storm', fog: 'fog', snow: 'witching' },
  west: { cloudy: 'cloudy', rain: 'storm', fog: 'duststorm', snow: 'cloudy' },
  candy: { cloudy: 'haze', rain: 'sprinkles', storm: 'sprinkles', fog: 'haze', snow: 'sugarsnow' },
  glade: { cloudy: 'mist', rain: 'springrain', storm: 'springrain', fog: 'fog', snow: 'spores' },
};
export function themeWeather(theme, cond) {
  if (!cond) return theme.defaultWeather || theme.weathers[0];
  const m = MAP[theme.id]?.[cond]; if (m && theme.weathers.includes(m)) return m;
  if (theme.weathers.includes(cond)) return cond;
  return theme.defaultWeather || theme.weathers[0];
}
export function useLiveWeather(on, loc) {
  const [wx, setWx] = useState(null);
  useEffect(() => { if (!on) return; let dead = false;
    const load = () => fetch(`/api/weather?loc=${encodeURIComponent(loc || 'New York, NY')}`).then((r) => r.json()).then((d) => { if (!dead) setWx(d); }).catch(() => { if (!dead) setWx((w) => (w && !w.error ? { ...w, offline: true } : { error: 'offline' })); });
    load(); const iv = setInterval(load, 15 * 60000); return () => { dead = true; clearInterval(iv); }; }, [on, loc]);
  return on ? wx : null;
}
