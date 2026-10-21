// Surroundings: every theme defines a "water" and a "land" variant (theme.surround.water / .land).
// The layout engine always runs on the base theme, so positions and scaling never change; this module
// only swaps what lies OUTSIDE the island: the ground height beyond the land radius, the water body,
// and the ground colors/scatter used by Ground.jsx and Surround.jsx.
//   water: open water around the shore (ocean, icy sea, lava sea, cloud sea...). Optional `rel` reshapes the drop-off.
//   land:  terrain continues to the horizon. `pond: true` keeps a ring of water/lava around the island (so docks and
//          over-water homes still make sense) with a bank rising to the plain; otherwise the island edge blends into the plain.
import { makeGroundY, profileFor } from './env.js';
import { seeded } from '../util.js';

export const SURROUND_MODES = ['water', 'land'];
export const surroundModesOf = (theme) => SURROUND_MODES.filter((m) => theme.surround?.[m]);
const BACK_A = Math.PI * 1.25; // behind the island as seen from the default camera
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// theme as rendered for a surround mode (layout still uses the base theme)
export function themeFor(base, mode) {
  const m = base.surround?.[mode] ? mode : base.surround?.water ? 'water' : Object.keys(base.surround || {})[0] || 'water'; const S = base.surround?.[m] || {};
  const kind = S.kind || m; // a mode can render as the other kind (e.g. Moon 'water' option = cratered dust land)
  const t = { ...base, surroundMode: m, surroundKind: kind, surroundCfg: S };
  if (S.water !== undefined) t.water = S.water && { ...(base.water || {}), ...S.water };
  if (kind === 'land' && !S.pond) t.water = null;
  return t;
}

// gentle rolling hills (positive only, so water under the plain never shows)
export function hillNoise(x, z) {
  return 0.5 + 0.5 * (Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13 - 0.4) + 0.5 * Math.sin(x * 0.23 - z * 0.19 + 2.0) + 0.25 * Math.sin(x * 0.52 + z * 0.41)) / 1.75;
}

// Planet curvature: beyond rc the ground (and water) falls away like a horizon, y -= (r - rc)^2 / (2 rp), so the
// world never shows a square/disc edge from any angle or zoom. Enclosed / underwater themes stay flat (theme.flatWorld).
export function curveFor(L, theme) {
  if (theme.flatWorld || theme.underwater) return null; const E = L.extent;
  const rc = theme.curveStart ? theme.curveStart(L) : E * 6.5; const rp = E * 10; return { rc, rp, far: Math.max(E * 30, rc + E * 16) };
}
export const curveDrop = (c, r) => (c && r > c.rc ? ((r - c.rc) ** 2) / (2 * c.rp) : 0);
export function surroundLayout(L, theme) {
  const c = curveFor(L, theme); const out = surroundLayoutFlat(L, theme); if (!c) return out;
  const g = out.groundY; return { ...out, curve: c, groundY: (x, z) => g(x, z) - curveDrop(c, Math.hypot(x, z)) };
}
function surroundLayoutFlat(L, theme) {
  const mode = theme.surroundKind || theme.surroundMode || 'water'; const S = theme.surroundCfg || {};
  let base = L.groundY;
  if (S.rel) base = makeGroundY(profileFor({ terrain: { ...theme.terrain, rel: S.rel } }, L.R));
  if (mode !== 'land') return { ...L, groundY: base, surround: 'water', edgeR: L.shoreR, bankR: null };
  const R = L.R; const top = theme.terrain.top ?? 0.04; const pond = !!S.pond;
  const edge = pond ? L.extent - 0.4 : R + 0.6; const plainY = S.plainY ?? (pond ? 0.14 : top - 0.03);
  const [h0, h1] = S.hills || [0.4, 5]; const yEdge = base(edge, 0);
  const crat = [];
  if (S.craters) { const r = seeded(S.craterSeed ?? 77); const cs = S.craterScale ?? 1; for (let i = 0; i < S.craters; i++) { const a = r() * Math.PI * 2; const rr = edge + 8 + Math.pow(r(), 0.7) * (L.extent * 3.5); const rad = (2 + r() * r() * 12) * cs; crat.push([Math.cos(a) * rr, Math.sin(a) * rr, rad, 0.25 + r() * 0.2]); } }
  const g = (x, z) => {
    const r = Math.hypot(x, z);
    if (pond ? r <= edge : r <= R) return base(x, z);
    let y = pond ? yEdge + (plainY - yEdge) * smooth(edge, edge + (S.bankW ?? 3.6), r) : top + (plainY - top) * smooth(R, R + 3, r);
    const amp = h0 * smooth(edge + 3, edge + 18, r) + h1 * smooth(edge + 25, edge + 120, r);
    y += amp * hillNoise(x, z);
    if (S.canyon && r > edge + 1) { // winding canyon running out behind the island, flat dry-wash floor, steep walls
      const a = Math.atan2(z, x); const ca = BACK_A + 0.32 * Math.sin(r * 0.035) + 0.12 * Math.sin(r * 0.09 + 1); let da = a - ca; da = Math.atan2(Math.sin(da), Math.cos(da));
      const lat = Math.abs(da) * r; const w = 5 + r * 0.06; const k = 1 - smooth(w * 0.55, w, lat); if (k > 0) y += (yEdge + 0.15 - y) * k * smooth(edge + 1, edge + 4, r); }
    for (const [cx, cz, rad, d] of crat) { const dd = Math.hypot(x - cx, z - cz) / rad; if (dd > 1.6) continue; y += dd < 1 ? -d * rad * 0.18 * (1 - dd * dd) + 0.05 * rad * Math.exp(-((dd - 1) ** 2) / 0.02) : 0.05 * rad * Math.exp(-((dd - 1) ** 2) / 0.02); }
    return y;
  };
  let bankR = null;
  if (pond && theme.water) { const lv = theme.water.level ?? -0.35; for (let r = edge; r < edge + 6; r += 0.05) if (g(r, 0) >= lv) { bankR = r; break; } bankR ??= edge + 3; }
  return { ...L, groundY: g, surround: 'land', pond, edgeR: edge, bankR, plainY, craters: crat };
}
