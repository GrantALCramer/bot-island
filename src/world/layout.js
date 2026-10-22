// Procedural, theme-agnostic layout engine.
// Given a theme and a bot count it picks the smallest land radius R where everything fits:
//  - one home per bot on 1-2 rings (over water or on land, per home type), never overlapping docks
//  - shared zones (work / research / social / lounge) with capacity that grows with the bot count,
//    built from FIXED-size instances (more holo pods, more bars, more hammocks) packed into sectors
//  - docks at the shore, a campfire plaza in the middle, a walking ring + spokes connecting it all.
// Models never scale; only R, spacing and instance counts change. `room` (0..1) adds extra space.
// Slot: { pos:[x,y,z], face, pose:'stand'|'lie'|'hammock', approach:[[x,y,z],...], lift, station }
import { makeGroundY, profileFor, shoreRadius } from './env.js';

const TAU = Math.PI * 2;
const faceDir = (dx, dz) => Math.atan2(dx, dz);
export const toWorld = (cx, cz, rot, lx, lz) => [cx + lx * Math.cos(rot) + lz * Math.sin(rot), cz - lx * Math.sin(rot) + lz * Math.cos(rot)];
export const facingCenterRot = (x, z) => Math.atan2(-x, -z); // local +z points at island center
export const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const CAM_AZ = Math.PI / 4;

// How much shared capacity each zone gets for n bots (theme-agnostic).
export const CAPACITY = {
  work: (n) => Math.max(3, Math.ceil(n / 1.5)),
  research: (n) => Math.max(2, Math.ceil(n / 3)),
  social: (n) => Math.max(3, Math.ceil(n / 2.5)),
  waiting: (n) => Math.max(3, Math.ceil(n / 3)),
  lounge: (n) => Math.max(1, Math.ceil(n / 5)),
  plaza: (n) => Math.max(5, Math.ceil(n / 2.5)),
};

// ---------- zone instance types: fixed footprint `foot` (radius), `per` slots per instance ----------
export const ZONE_TYPES = {
  HoloLab: { per: 6, foot: 3.2, order: [0, 3, 1, 4, 2, 5],
    slots(I) { const out = []; for (let i = 0; i < 6; i++) { const b = I.rot + 0.35 + (i / 6) * TAU; const ux = Math.cos(b), uz = Math.sin(b);
      out.push({ pos: [I.x + ux * 1.75, 0.26, I.z + uz * 1.75], face: faceDir(ux, uz), station: `${I.id}:${i}`, lift: (i % 2) * 0.3 }); } return out; } },
  HoloRing: { per: 4, foot: 2.8, order: [0, 2, 1, 3],
    slots(I) { const out = []; for (let i = 0; i < 4; i++) { const b = 0.8 + (i / 4) * TAU; out.push({ pos: [I.x + Math.cos(b) * 1.0, 0.12, I.z + Math.sin(b) * 1.0], face: faceDir(Math.cos(b), Math.sin(b)), lift: (i % 2) * 0.3, station: `${I.id}:${i}` }); } return out; } },
  TikiBar: { per: 4, foot: 3.0, order: [0, 2, 1, 3],
    slots(I) {
      const side = (lx) => { const [x, z] = toWorld(I.x, I.z, I.rot, lx, 2.2); return [x, 0, z]; };
      const a = toWorld(I.x, I.z, I.rot, -3.1, 0), b = toWorld(I.x, I.z, I.rot, 3.1, 0);
      const approach = [side(Math.hypot(...a) < Math.hypot(...b) ? -3.1 : 3.1)];
      return [-1.65, -0.55, 0.55, 1.65].map((lx, i) => { const [x, z] = toWorld(I.x, I.z, I.rot, lx, 1.05); return { pos: [x, 0.5, z], face: I.rot + Math.PI + (i % 2 ? -0.75 : 0.75), lift: (i % 2) * 0.3, approach }; });
    } },
  ClamLounge: { per: 6, foot: 2.6, order: [0, 3, 1, 4, 2, 5],
    slots(I) { const out = []; for (let i = 0; i < 6; i++) { const b = (i / 6) * TAU + 0.5; out.push({ pos: [I.x + Math.cos(b) * 1.65, 0.32, I.z + Math.sin(b) * 1.65], face: faceDir(-Math.cos(b), -Math.sin(b)), lift: (i % 2) * 0.3 }); } return out; } },
  Hammocks: { per: 1, foot: 1.8,
    slots(I) { const tx = Math.cos(I.rot), tz = -Math.sin(I.rot); // hammock axis = local x
      return [{ pos: [I.x - tx * 0.35, 0.62, I.z - tz * 0.35], face: faceDir(-tx, -tz), pose: 'hammock', lift: -0.2 }]; } },
};
// ---------- idle-activity structures (theme.fun): fixed footprints, placed after the regular zones ----------
const rel = (p) => Object.assign(p, { rel: true }); // approach point whose y is relative to the ground
const LW = (I, lx, lz, y = 0) => { const [x, z] = toWorld(I.x, I.z, I.rot, lx, lz); return [x, y, z]; };
const st = (I, i, o) => ({ ...o, station: `${I.id}:${i}` });
const ring = (I, n, r, y, a0, extra = {}) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * TAU; const [lx, lz] = [Math.cos(a) * r, Math.sin(a) * r]; const p = LW(I, lx, lz, y);
  return st(I, i, { pos: p, face: faceDir(I.x - p[0], I.z - p[2]), lift: (i % 2) * 0.3, approach: [LW(I, 0, (extra.out ?? I.foot) + 0.3), ...(extra.rim ? [rel(LW(I, 0, 1.3, extra.rim))] : [])], ...extra.slot }); });
Object.assign(ZONE_TYPES, {
  HotTub: { per: 4, foot: 1.9, slots: (I) => (I.cfg.style === 'vent' ? ring(I, 4, 0.6, 1.25, 0.4, { slot: { lift: 0.5 } }) : ring(I, 4, 0.66, 0.0, Math.PI / 4, { rim: 0.7, slot: { soak: true, lift: -0.25 } })) },
  Trampoline: { per: 3, foot: 1.8, slots: (I) => ring(I, 3, 0.55, 0.5, Math.PI / 2, { rim: 0.55 }) },
  Volleyball: { per: 4, foot: 2.6, order: [0, 2, 1, 3], slots: (I) => [[0.7, 1.2], [-0.7, -1.2], [-0.7, 1.2], [0.7, -1.2]].map(([lx, lz], i) =>
    st(I, i, { pos: LW(I, lx, lz), face: I.rot + (lz > 0 ? Math.PI : 0), lift: (i % 2) * 0.3, approach: lz > 0 ? [LW(I, 0, 2.7)] : [LW(I, 0, 2.7), LW(I, Math.sign(lx) * 2.2, 0.3)] })) },
  VineSwing: { per: 3, foot: 2.5, order: [1, 0, 2], slots: (I) => [-0.85, 0, 0.85].map((lx, i) => st(I, i, { pos: LW(I, lx, 0, 1.13), face: I.rot, lift: 0.2, swing: true, approach: [LW(I, lx, 1.4)] })) },
  SnowFort: { per: 4, foot: 2.4, order: [0, 1, 2, 3], slots: (I) => [[0.5, 1.55], [-0.5, -1.55], [-0.6, 1.6], [0.6, -1.6]].map(([lx, lz], i) =>
    st(I, i, { pos: LW(I, lx, lz), face: I.rot + (lz > 0 ? Math.PI : 0), lift: (i % 2) * 0.3, approach: lz > 0 ? [LW(I, 0, 2.6)] : [LW(I, 0, 2.6), LW(I, 2.2 * Math.sign(lx || 1), 0), LW(I, 1.6 * Math.sign(lx || 1), -2.0)] })) },
  SeahorseRide: { per: 4, foot: 2.3, slots: (I) => Array.from({ length: 4 }, (_, i) => { const a = (i / 4) * TAU; const c = Math.cos(a), sn = Math.sin(a);
    return st(I, i, { pos: [I.x + c * 1.45, 0.62, I.z + sn * 1.45], face: Math.atan2(-sn, c), lift: 0.4, ride: { c: [I.x, I.z], a, r: 1.45 }, approach: [[I.x + c * 2.5, 0, I.z + sn * 2.5]] }); }) },
  HarpStage: { per: 3, foot: 2.0, slots: (I) => [0, 1, 2].map((k) => { const a = -Math.PI / 2 + (k - 1) * 0.95; const p = LW(I, Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.22);
    return st(I, k, { pos: p, face: faceDir(I.x - p[0], I.z - p[2]), lift: (k % 2) * 0.3, approach: [LW(I, Math.cos(a) * 2.2, Math.sin(a) * 2.2)] }); }) },
  LavaPit: { per: 4, foot: 1.8, slots: (I) => ring(I, 4, 1.45, 0, Math.PI / 4) },
  // shooting range / any line-up: everyone stands in a row at local z=+1 facing the targets at -z
  Range: { per: 4, foot: 2.6, slots: (I) => [-1.2, -0.4, 0.4, 1.2].map((lx, i) => st(I, i, { pos: LW(I, lx, 1.0), face: I.rot + Math.PI, lift: 0, approach: [LW(I, lx, 2.4)] })) },
});
// ---------- activity structures GROW with the number of bots using them (explicit exception to "models never
// scale"; blobs, homes and other buildings still never scale). grow.scale(k) -> [sx, sz] for the model,
// grow.slots(I, k) -> k evenly spaced seats, grow.foot(n) -> footprint reserved for the max size (all n bots).
const SEAT = 1.0; // seat spacing along a rim/counter (blob is ~0.85 wide)
export const ringR = (r0, k, d = SEAT) => Math.max(r0, (k * d) / TAU);
// pad = seat ring -> model edge distance that stays constant: model scale = (r + pad) / (r0 + pad), so a 12-seat tub is
// ~2x wide, not 3x (the rim/steps don't need to grow as fast as the circle of seats)
const radial = (r0, foot0, { d = SEAT, y = 0, a0 = Math.PI / 4, rim, slot = {}, min = 1, pad = 0.6 } = {}) => { const F = (k) => (ringR(r0, k, d) + pad) / (r0 + pad); return {
  r: (k) => ringR(r0, k, d), scale: (k) => [F(k), F(k)], foot: (n) => foot0 * F(n),
  slots: (I, k) => { const r = ringR(r0, k, d); const f = F(k); const n = Math.max(min, k);
    return Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * TAU; const lx = Math.cos(a) * r, lz = Math.sin(a) * r; const p = LW(I, lx, lz, y);
      return st(I, i, { pos: p, face: faceDir(I.x - p[0], I.z - p[2]), lift: (i % 2) * 0.3, approach: [LW(I, Math.cos(a) * foot0 * f, Math.sin(a) * foot0 * f), ...(rim ? [rel(LW(I, Math.cos(a) * (r + 0.7), Math.sin(a) * (r + 0.7), rim))] : [])], ...slot }); }); } }; };
// two teams facing each other across local z (court / snow fort): m = ceil(k/2) a side, spread along local x
const teams = (w0, lz, foot0, approachZ) => { const sx = (k) => Math.max(1, (Math.ceil(k / 2) * SEAT) / w0);
  return { scale: (k) => [sx(k), 1], foot: (n) => foot0 + (w0 / 2 + 0.4) * (sx(n) - 1),
    slots: (I, k) => { const m = Math.max(1, Math.ceil(k / 2)); const sp = (w0 * sx(k)) / Math.max(2, m); const out = [];
      for (let i = 0; i < Math.max(k, 1); i++) { const side = i % 2 ? -1 : 1; const j = Math.floor(i / 2); const lx = (j - (m - 1) / 2) * sp; const ex = (w0 / 2) * sx(k) + 1.0;
        out.push(st(I, i, { pos: LW(I, lx, side * lz), face: I.rot + (side > 0 ? Math.PI : 0), lift: (i % 4 > 1) * 0.3, approach: side > 0 ? [LW(I, 0, approachZ)] : [LW(I, 0, approachZ), LW(I, (lx >= 0 ? 1 : -1) * ex, 0.3), LW(I, (lx >= 0 ? 1 : -1) * ex, -approachZ + 0.4)] })); }
      return out; } }; };
const lineup = (w0, foot0) => { const sx = (k) => Math.max(1, (k * SEAT) / w0);
  return { scale: (k) => [sx(k), 1], foot: (n) => foot0 + (w0 / 2 + 0.4) * (sx(n) - 1),
    slots: (I, k) => { const n = Math.max(1, k); const W = w0 * sx(k); return Array.from({ length: n }, (_, i) => { const lx = (i + 0.5) / n * W - W / 2; return st(I, i, { pos: LW(I, lx, 1.0), face: I.rot + Math.PI, lift: 0, approach: [LW(I, lx, 2.4)] }); }); } }; };
const GROW = {
  Range: () => lineup(3.2, 2.6),
  HotTub: (I) => (I.cfg.style === 'vent' ? radial(0.6, 1.9, { y: 1.25, a0: 0.4, pad: 0.4, slot: { lift: 0.5 } }) : radial(0.66, 1.9, { d: 1.35, pad: 0.25, rim: 0.7, slot: { soak: true, lift: -0.25 } })), // roomy: seats 1.35 apart, model grows ~2.2x at 8
  Trampoline: () => radial(0.55, 1.8, { d: 1.4, y: 0.5, a0: Math.PI / 2, rim: 0.55 }),
  LavaPit: () => radial(1.45, 1.8, { pad: -0.5 }),
  HarpStage: () => radial(1.15, 2.0, { y: 0.22, a0: -Math.PI / 2, pad: 0.45 }),
  ClamLounge: () => radial(1.65, 2.6, { y: 0.32, a0: 0.5, pad: 0.85 }),
  Volleyball: () => teams(2.4, 1.1, 2.6, 2.7),
  SnowFort: () => teams(2.4, 1.6, 2.4, 2.6),
  // seahorse carousel: one seahorse per rider (min 4) evenly around a ring that widens past 9 riders
  SeahorseRide: () => { const H = (k) => Math.max(4, k), R = (k) => ringR(1.45, H(k), 1.0);
    return { scale: (k) => [R(k) / 1.45, R(k) / 1.45], foot: (n) => 2.3 * (R(n) / 1.45), horses: H, R,
      slots: (I, k) => Array.from({ length: Math.max(1, k) }, (_, i) => { const a = (i / H(k)) * TAU; const c = Math.cos(a), sn = Math.sin(a); const r = R(k);
        return st(I, i, { pos: [I.x + c * r, 0.62, I.z + sn * r], face: Math.atan2(-sn, c), lift: 0.4, ride: { c: [I.x, I.z], a, r, i }, approach: [[I.x + c * (r + 1.05), 0, I.z + sn * (r + 1.05)]] }); }) }; },
  // vine swing: one vine per swinger (min 3), 0.85 apart; the branch lengthens
  VineSwing: () => { const V = (k) => Math.max(3, k), sx = (k) => Math.max(1, (V(k) * 0.85) / 2.55);
    return { scale: (k) => [sx(k), 1], foot: (n) => 2.5 + 1.45 * (sx(n) - 1), vines: V,
      slots: (I, k) => Array.from({ length: Math.max(1, k) }, (_, i) => { const n = V(k); const j = Math.round(((i + 0.5) * n) / Math.max(1, k) - 0.5); const lx = (j - (n - 1) / 2) * 0.85;
        return st(I, i, { pos: LW(I, lx, 0, 1.13), face: I.rot, lift: 0.2, swing: true, approach: [LW(I, lx, 1.4)] }); }) }; },
  // bar / tea house counter: K = max(4, k) stools 1.1 (<=4) or 1.0 apart; the counter lengthens past 4 stools
  TikiBar: () => { const K = (k) => Math.max(4, k), sp = (k) => (K(k) <= 4 ? 1.1 : SEAT), sx = (k) => (K(k) * sp(k)) / 4.4;
    return { scale: (k) => [sx(k), 1], foot: (n) => 3.0 + 2.9 * (sx(n) - 1), stools: (k) => Array.from({ length: K(k) }, (_, i) => (i - (K(k) - 1) / 2) * sp(k)),
      slots: (I, k) => { const xs = Array.from({ length: K(k) }, (_, i) => (i - (K(k) - 1) / 2) * sp(k)); const n = Math.max(1, k);
        const pick = Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) * xs.length) / n - 0.5)); const ex = 2.9 * sx(k) + 0.2;
        const side = (lx) => { const [x, z] = toWorld(I.x, I.z, I.rot, lx, 2.2); return [x, 0, z]; };
        const a = toWorld(I.x, I.z, I.rot, -ex, 0), b = toWorld(I.x, I.z, I.rot, ex, 0); const approach = [side(Math.hypot(...a) < Math.hypot(...b) ? -ex : ex)];
        return pick.map((j, i) => { const [x, z] = toWorld(I.x, I.z, I.rot, xs[j], 1.05); return st(I, i, { pos: [x, 0.5, z], face: I.rot + Math.PI + (i % 2 ? -0.75 : 0.75), lift: (i % 2) * 0.3, approach }); }); } }; },
};
// work station (holo lab): ONE lab that grows instead of copying. S = max(6, k) screen bays evenly around the core;
// screens (~2.1 wide incl. side panels) sit 0.95 outside the bot ring, so the ring widens once 6+ bays don't fit
// at the base radius; the deck scales with it (pad = ring -> deck edge stays ~1.45).
GROW.HoloLab = () => { const S = (k) => Math.max(6, k || 0), r = (k) => Math.max(1.75, (S(k) * 2.1) / TAU - 0.95), F = (k) => (r(k) + 1.45) / (1.75 + 1.45);
  const ORDER6 = [0, 3, 1, 4, 2, 5];
  return { bays: S, r, scale: (k) => [F(k), F(k)], foot: (n) => 3.2 * F(n),
    slots: (I, k) => { const n = S(k); const R = r(k); const all = Array.from({ length: n }, (_, i) => { const b = I.rot + 0.35 + (i / n) * TAU; const ux = Math.cos(b), uz = Math.sin(b);
      return { pos: [I.x + ux * R, 0.26, I.z + uz * R], face: faceDir(ux, uz), station: `${I.id}:${i}`, lift: (i % 2) * 0.3, approach: [[I.x + ux * (3.2 * F(k) + 0.4), 0, I.z + uz * (3.2 * F(k) + 0.4)]] }; });
      return n === 6 ? ORDER6.map((j) => all[j]) : all; } }; };
export const growOf = (type, I) => GROW[type]?.(I);
// campfire plaza: one ring of seats around the fire, 1.6 apart (roomy), at >= 2.35; the whole fire ring grows past 9
export const PLAZA = { r0: 2.35, d: 1.6, foot0: 3.7 };
export const plazaGrow = (k) => (ringR(PLAZA.r0, k, PLAZA.d) - 0.9) / (PLAZA.r0 - 0.9); // benches stay 0.9 inside the seats
function plazaRing(k) { const n = Math.max(1, k); const r = ringR(PLAZA.r0, n, PLAZA.d);
  return Array.from({ length: n }, (_, i) => { const b = 0.3 + (i / n) * TAU; return { pos: [Math.cos(b) * r, 0, Math.sin(b) * r], face: faceDir(-Math.cos(b), -Math.sin(b)), lift: (i % 2) * 0.3 }; }); }
// rot for a placed instance: face the island center, the camera, or tangential (hammocks)
function instRot(type, cfg, x, z) {
  if (type === 'Hammocks') return facingCenterRot(x, z); // local x (hammock axis) is tangential
  if (cfg.facing === 'camera') return CAM_AZ;
  return facingCenterRot(x, z);
}

// ---------- plaza (center) ----------
function plazaSlots(cap) {
  const out = []; const rings = [[2.35, 7, 0.3], [3.35, 10, 0.0], [4.3, 14, 0.15]]; let k = 0;
  for (const [r, m, off] of rings) for (let i = 0; i < m && k < cap; i++, k++) { const b = off + (i / m) * TAU; out.push({ pos: [Math.cos(b) * r, 0, Math.sin(b) * r], face: faceDir(-Math.cos(b), -Math.sin(b)), lift: (k % 2) * 0.3 }); }
  const spread = []; const r1 = out.slice(0, 7); [0, 3, 5, 1, 4, 2, 6].forEach((i) => r1[i] && spread.push(r1[i])); return [...spread, ...out.slice(7)];
}
const plazaFoot = (cap) => (cap > 17 ? 5.6 : cap > 7 ? 4.6 : 3.7);

// ---------- docks ----------
const DOCK_LEN = 6.3;
function dockInstance(a, from, y, id) {
  const ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux; const to = from + DOCK_LEN;
  const at = (r, lat) => [ux * r + px * lat, uz * r + pz * lat];
  const A = (r, yy) => { const [x, z] = at(r, 0); return [x, yy, z]; };
  const approach = [A(from - 0.7, 0), A(from + 0.4, y), A(to - 1.4, y)]; const face = faceDir(-ux, -uz);
  const slots = [[0.3, -0.6], [0.3, 0.6], [0.3, -1.8], [0.3, 1.8], [-0.8, -1.8], [-0.8, 1.8]].map(([dr, lat], i) => { const [x, z] = at(to + dr, lat); return { pos: [x, y, z], face, approach, lift: (i % 2) * 0.3, deck: true }; });
  return { id, angle: a, ux, uz, px, pz, from, to, y, slots, order: [0, 1, 2, 3, 4, 5] };
}

// ---------- homes ----------
export const HOME_TYPES = {
  // over-water bungalow on stilts, reached by a walkway from the beach
  Bungalow: { foot: 1.85, water: true, offset: 2.35, floor: 0.5,
    make(x, z, rot, a, ctx) { const f = 0.5; const L = (lx, lz, y) => { const [wx, wz] = toWorld(x, z, rot, lx, lz); return [wx, y, wz]; };
      const walkFrom = [Math.cos(a) * (ctx.R + 1.1), Math.sin(a) * (ctx.R + 1.1)];
      return { floor: f, walkFrom, bed: { pos: L(0.42, 0.2, f + 0.36), face: rot + Math.PI / 2, pose: 'lie', approach: [[walkFrom[0], 0, walkFrom[1]], L(0, 1.6, f), L(0.45, 0.95, f)], lift: 0 } }; } },
  // igloo on land: tunnel faces the island center, sleeping bag inside
  Igloo: { foot: 1.75, water: false, floor: 0.05,
    make(x, z, rot, a, ctx) { const L = (lx, lz, y) => { const [wx, wz] = toWorld(x, z, rot, lx, lz); return [wx, y, wz]; };
      return { floor: 0.05, walkFrom: L(0, 2.6, 0).filter((_, i) => i !== 1), bed: { pos: L(0.45, -0.25, 0.2), face: rot + Math.PI / 2, pose: 'lie', approach: [L(0, 2.7, 0), L(0, 1.2, 0.05), L(0.5, 0.45, 0.05)], lift: 0 } }; } },
  // treehouse: platform around a big trunk, rope ladder at the front
  Treehouse: { foot: 2.0, water: false, floor: 2.4,
    make(x, z, rot, a, ctx) { const f = 2.4; const L = (lx, lz, y) => { const [wx, wz] = toWorld(x, z, rot, lx, lz); return [wx, y, wz]; };
      return { floor: f, walkFrom: L(0, 2.9, 0).filter((_, i) => i !== 1), bed: { pos: L(0.45, 0.35, f + 0.36), face: rot + Math.PI / 2, pose: 'lie', approach: [L(0, 2.6, 0), L(0, 1.95, 0), L(0, 1.6, f), L(0.5, 1.05, f)], lift: 0 } }; } },
  // glass dome on the sea floor
  GlassDome: { foot: 1.8, water: false, floor: 0.12,
    make(x, z, rot, a, ctx) { const L = (lx, lz, y) => { const [wx, wz] = toWorld(x, z, rot, lx, lz); return [wx, y, wz]; };
      return { floor: 0.12, walkFrom: L(0, 2.6, 0).filter((_, i) => i !== 1), bed: { pos: L(0.42, -0.1, 0.12 + 0.36), face: rot + Math.PI / 2, pose: 'lie', approach: [L(0, 2.6, 0), L(0, 1.4, 0.12), L(0.45, 0.65, 0.12)], lift: 0 } }; } },
  // moon-base pod, marble gazebo (cloud cottage), obsidian cabin: land homes with the door toward the center
  MoonPod: { foot: 1.85, water: false, floor: 0.31, make: landHome(0.31, -0.15) },
  Gazebo: { foot: 1.95, water: false, floor: 0.3, make: landHome(0.3, -0.1) },
  Cabin: { foot: 1.9, water: false, floor: 0.22, make: landHome(0.22, -0.2) },
  Minka: { foot: 2.05, water: false, floor: 0.32, make: landHome(0.32, -0.55) },
  Townhouse: { foot: 1.95, water: false, floor: 0.2, make: landHome(0.2, -0.5) },
  Shack: { foot: 1.95, water: false, floor: 0.35, make: landHome(0.35, -0.45) },
  Gingerbread: { foot: 1.9, water: false, floor: 0.2, make: landHome(0.2, -0.4) },
  Shroom: { foot: 1.9, water: false, floor: 0.18, make: landHome(0.18, -0.35) },
  Geode: { foot: 1.9, water: false, floor: 0.18, make: landHome(0.18, -0.35) },
  Crypt: { foot: 1.95, water: false, floor: 0.24, make: landHome(0.24, -0.4) },
};
function landHome(f, bz) {
  return (x, z, rot) => { const L = (lx, lz, y) => { const [wx, wz] = toWorld(x, z, rot, lx, lz); return [wx, y, wz]; };
    return { floor: f, walkFrom: L(0, 2.7, 0).filter((_, i) => i !== 1), bed: { pos: L(0.42, bz, f + 0.36), face: rot + Math.PI / 2, pose: 'lie', approach: [L(0, 2.7, 0), L(0, 1.4, f), L(0.45, bz + 0.75, f)], lift: 0 } }; };
}

function placeHomes(theme, n, ctx, dockWindows) {
  // Homes fill an arc centered on theme.homes.center, alternating left/right from the middle and
  // skipping dock windows. Few homes spread over the preferred arc; many homes use 2 rows.
  const H = HOME_TYPES[theme.homes.type]; const C = theme.homes.center ?? Math.PI * 1.2; const pref = theme.homes.arc ?? 2.4; const maxArc = theme.homes.maxArc ?? 4.7;
  for (const rows of [1, 2]) {
    const gap = rows === 2 ? 1.9 : 1.2; const S = 2 * H.foot + gap;
    const R0 = H.water ? ctx.shoreR + H.offset : ctx.R - H.foot - 0.4;
    const radii = rows === 1 ? [R0] : H.water ? [R0, R0 + 2 * H.foot + 1.4] : [R0, R0 - 2 * H.foot - 1.4];
    const counts = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const minR = Math.min(...radii); const k = counts[0];
    const step = Math.max(S / minR, pref / k); if (rows === 2 && step * minR < 2 * H.foot + 1.0) continue;
    const out = []; let ok = true;
    radii.forEach((Rr, row) => {
      const off = row ? step / 2 : 0; const got = [];
      for (let i = 0; got.length < counts[row] && i < 400; i++) {
        const j = Math.ceil(i / 2) * (i % 2 ? 1 : -1); const d = (k % 2 ? 0 : step / 2) + off + j * step;
        if (Math.abs(d) > maxArc / 2) { if (Math.abs(j) * step > maxArc) break; continue; }
        const a = C + d; if (dockWindows.some(([da, w]) => Math.abs(angDiff(a, da)) < w + H.foot / Rr)) continue;
        got.push(a);
      }
      if (got.length < counts[row]) { ok = false; return; }
      got.sort((p, q) => p - q).forEach((a) => { const x = Math.cos(a) * Rr, z = Math.sin(a) * Rr; const rot = facingCenterRot(x, z);
        out.push({ x, z, rot, angle: a, row, radius: Rr, foot: H.foot, type: theme.homes.type, ...H.make(x, z, rot, a, ctx) }); });
    });
    if (ok && out.length === n) return { homes: out, inner: Math.min(...radii) - H.foot, outer: Math.max(...radii) + H.foot, water: H.water };
  }
  return null;
}

function packZone(type, cfg, m, ctx, placed, idBase) {
  // try the theme's sector first, then widen it (big bot counts) before giving up (=> bigger island)
  for (const k of [1, 1.6, 2.4]) { const snap = placed.length; const r = packZoneSpan(type, cfg, m, ctx, placed, idBase, (cfg.span ?? 1.9) * k); if (r) return r; placed.length = snap; }
  return null;
}
function packZoneSpan(type, cfg, m, ctx, placed, idBase, span) {
  const T0 = ZONE_TYPES[type]; const gf = GROW[type]?.({ cfg })?.foot; const T = gf ? { ...T0, foot: gf(ctx.n) } : T0; const anchors = cfg.angles ?? [cfg.angle]; // growable: reserve the max size
  const rMin = ctx.plazaFoot + T.foot + 0.4, rMax = (ctx.zoneR ?? ctx.Ro) - T.foot - 0.5; if (rMax < rMin) return null;
  const rStar = Math.min(rMax, Math.max(rMin, (cfg.frac ?? 0.6) * ctx.Ro));
  const candsFor = (a0) => { const ax = Math.cos(a0) * rStar, az = Math.sin(a0) * rStar; const c = [];
    for (let r = rMin; r <= rMax + 1e-6; r += 0.45) for (let d = -span / 2; d <= span / 2 + 1e-6; d += 0.5 / r) { const a = a0 + d; const x = Math.cos(a) * r, z = Math.sin(a) * r; c.push([Math.hypot(x - ax, z - az), x, z]); }
    return c.sort((p, q) => p[0] - q[0]); };
  const lists = anchors.map(candsFor); const out = [];
  for (let j = 0; j < m; j++) {
    let c = null;
    for (let t = 0; t < lists.length && !c; t++) c = lists[(j + t) % lists.length].find(([, x, z]) => placed.every((p) => Math.hypot(p.x - x, p.z - z) >= p.foot + T.foot + 0.9));
    if (!c) return null;
    const [, x, z] = c; const I = { id: `${idBase}${j}`, x, z, foot: T.foot, type, cfg, index: j };
    I.rot = instRot(type, cfg, x, z); I.slots = T.slots(I); if (gf) I.footBase = T0.foot; placed.push(I); out.push(I);
  }
  return out;
}

function tryLayout(theme, n, R) {
  const profile = profileFor(theme, R); const groundY = makeGroundY(profile);
  const shoreR = theme.water ? shoreRadius(profile, theme.water.level) : R + 1.8;
  const ctx = { R, shoreR, groundY, n };
  // docks first (homes must avoid them)
  const W = theme.zones.waiting; const nDocks = Math.ceil(CAPACITY.waiting(n) / 6); const docks = [];
  const dδ = 7.0 / shoreR;
  for (let k = 0; k < nDocks; k++) { const a = W.angle + (k - (nDocks - 1) / 2) * dδ; docks.push(dockInstance(a, shoreR - 0.9, theme.zones.waiting.deckY ?? 0.14, `dock${k}`)); }
  const dockWindows = docks.map((d) => [d.angle, 2.8 / (shoreR + 3)]);
  const H = placeHomes(theme, n, ctx, dockWindows); if (!H) return null;
  ctx.Ro = H.water ? R - 0.3 : H.inner - 1.0;
  const plazaCap = CAPACITY.plaza(n); ctx.plazaFoot = Math.max(plazaFoot(plazaCap), ringR(PLAZA.r0, n, PLAZA.d) + 1.35); // room for the biggest fire ring
  if (ctx.Ro < ctx.plazaFoot + 3.5) return null;
  const placed = [{ x: 0, z: 0, foot: ctx.plazaFoot - 0.6 }]; const zones = {};
  if (!H.water) {
    // land homes: zones may also use the outer band between/in front of homes (not just inside the ring road)
    ctx.zoneR = R - 0.2; const block = (x, z, foot) => placed.push({ x, z, foot, block: true });
    H.homes.forEach((h) => { block(h.x, h.z, h.foot + 0.3); const [wx, wz] = h.walkFrom; for (let t = 0; t <= 1.001; t += 0.25) { const r = ctx.Ro + (Math.hypot(wx, wz) - ctx.Ro) * t; block(Math.cos(h.angle) * r, Math.sin(h.angle) * r, 0.6); } });
    docks.forEach((d) => { for (let r = ctx.Ro; r <= R + 1; r += 1.2) block(d.ux * r, d.uz * r, 1.0); });
  }
  const keys = Object.keys(theme.zones).filter((k) => k !== 'waiting' && k !== 'plaza').sort((a, b) => (a === 'work' ? -1 : b === 'work' ? 1 : 0));
  for (const key of keys) {
    const cfg = theme.zones[key]; const T = ZONE_TYPES[cfg.type]; if (!T) continue;
    const cap = (CAPACITY[key] || CAPACITY.social)(n); const m = (key === 'social' || key === 'work') && GROW[cfg.type] ? 1 : Math.ceil(cap / T.per); // the bar / work lab grow instead of copying
    const inst = packZone(cfg.type, cfg, m, ctx, placed, key); if (!inst) return null;
    zones[key] = { key, cfg, type: cfg.type, instances: inst, slots: spread(inst, T.order) };
  }
  // idle-activity structures (fixed size). Must fit too, so a crowded island grows like for any other zone.
  for (const [key, cfg] of Object.entries(theme.fun || {})) {
    const T = ZONE_TYPES[cfg.type]; if (!T) continue; const snap = placed.length;
    const inst = packZoneSpan(cfg.type, cfg, 1, ctx, placed, key, cfg.span ?? 1.6) || packZoneSpan(cfg.type, cfg, 1, ctx, placed, key, TAU);
    if (!inst) { placed.length = snap; return null; }
    zones[key] = { key, cfg, type: cfg.type, fun: true, instances: inst, slots: spread(inst, T.order) };
  }
  zones.waiting = { key: 'waiting', cfg: W, type: W.type, instances: docks, slots: spread(docks, docks[0].order) };
  zones.plaza = { key: 'plaza', cfg: theme.zones.plaza, type: theme.zones.plaza.type, instances: [{ id: 'plaza', x: 0, z: 0, foot: ctx.plazaFoot, cap: plazaCap }], slots: plazaSlots(plazaCap) };
  return { R, profile, groundY, shoreR, Ro: ctx.Ro, plazaFoot: ctx.plazaFoot, homes: H.homes, homesOuter: H.outer, zones, placed };
}

// round-robin across instances so bots spread out (keeps labels apart)
function spread(instances, order) {
  const out = []; const per = Math.max(...instances.map((I) => I.slots.length));
  for (let k = 0; k < per; k++) for (const I of instances) { const idx = order ? (order[k] ?? k) : k; if (I.slots[idx]) out.push(I.slots[idx]); }
  return out;
}

// Build the layout: smallest R that fits, then add `room`.
export function buildLayout(theme, nBots, room = 0) {
  const n = Math.max(nBots, 1); let R = theme.terrain.minR ?? 7.5; let L = null;
  for (let i = 0; i < 160 && !(L = tryLayout(theme, n, R)); i++) R += 0.5;
  if (!L) throw new Error('layout failed');
  if (room > 0) { for (let R2 = R * (1 + room); R2 < R * (1 + room) + 10; R2 += 0.5) { const L2 = tryLayout(theme, n, R2); if (L2) { L = L2; break; } } }
  // ground-relative heights for slots / approaches
  const gy = L.groundY;
  const fixP = (p) => [p[0], p[1] + gy(p[0], p[2]), p[2]];
  for (const z of Object.values(L.zones)) z.slots.forEach((s) => { if (s._fixed) return; s._fixed = true; if (!s.deck) s.pos = fixP(s.pos); s.approach = (s.approach || []).map((p) => (p[1] === 0 || p.rel ? fixP(p) : p)); });
  L.homes.forEach((h) => { h.bed.pos = h.type === 'Bungalow' ? h.bed.pos : fixP(h.bed.pos); h.bed.approach = h.bed.approach.map((p) => (h.type === 'Bungalow' ? (p[1] === 0 ? fixP(p) : p) : fixP(p))); });
  // walking network: ring at Ro + spokes
  const paths = []; const clearPaths = [];
  const ringPt = (a, r = L.Ro) => [Math.cos(a) * r, Math.sin(a) * r];
  for (const z of Object.values(L.zones)) for (const I of z.instances) {
    if (z.key === 'plaza') continue;
    if (z.key === 'waiting') { const p = [[I.ux * (I.from - 0.7), I.uz * (I.from - 0.7)], ringPt(I.angle)]; paths.push(p); clearPaths.push(p); continue; }
    const a = Math.atan2(I.z, I.x); const p = [ringPt(a), [I.x, I.z]]; paths.push(p); clearPaths.push(p);
  }
  // free spokes to the plaza: middle of the biggest angular gaps between zone instances
  const angs = L.placed.slice(1).filter((I) => !I.block).map((I) => Math.atan2(I.z, I.x)).concat(L.zones.waiting.instances.map((d) => d.angle)).sort((a, b) => a - b);
  const gaps = angs.map((a, i) => { const b = i + 1 < angs.length ? angs[i + 1] : angs[0] + TAU; return [b - a, a + (b - a) / 2]; }).sort((p, q) => q[0] - p[0]);
  L.spokes = gaps.slice(0, Math.min(4, gaps.length)).map((g) => g[1]);
  if (!L.spokes.length) L.spokes = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  L.spokes.forEach((a) => { const p = [ringPt(a, L.plazaFoot - 0.6), ringPt(a)]; paths.push(p); clearPaths.push(p); });
  L.homes.forEach((h) => { const p = [ringPt(h.angle), h.walkFrom]; clearPaths.push(p); if (h.type !== 'Bungalow') paths.push(p); else paths.push([ringPt(h.angle), ringPt(h.angle, L.R + 0.9)]); });
  L.paths = paths; L.clearPaths = clearPaths; L.rings = [L.Ro];
  L.keepOut = [...L.placed.filter((I) => !I.block).map((I) => [I.x, I.z, I.foot + 0.9]), [0, 0, L.plazaFoot + 0.3]];
  L.hubR = L.plazaFoot; // plaza edge
  L.extent = Math.max(L.homesOuter, ...L.zones.waiting.instances.map((d) => d.to + 1.5), L.R + 2) + 1.5;
  L.camDist = L.extent * 1.85;
  L.n = n;
  return L;
}

function segDist(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
export { segDist };
export function isClear(layout, x, z, margin = 0) {
  for (const [cx, cz, r] of layout.keepOut) if (Math.hypot(x - cx, z - cz) < r + margin) return false;
  for (const p of layout.clearPaths) if (segDist(x, z, p[0], p[1]) < 1.1 + margin) return false;
  for (const r of layout.rings) if (Math.abs(Math.hypot(x, z) - r) < 1.0 + margin) return false;
  for (const h of layout.homes) if (Math.hypot(x - h.x, z - h.z) < h.foot + 0.9 + margin) return false;
  for (const d of layout.zones.waiting.instances) for (let r = d.from; r <= d.to + 1; r += 1) if (Math.hypot(x - d.ux * r, z - d.uz * r) < 2.8 + margin) return false;
  return true;
}

// Map bots -> slots. `since` = {botId: ms when current state began}.
// act (optional): an idle group activity { kind, zone, ids, pose, stroll, emojis } -> its idle bots go there instead.
export function assignTargets(bots, layout, theme, since = {}, now = Date.now(), act = null) {
  const used = {}; const out = {};
  const inAct0 = (b) => act && (b.state === 'idle' || b.state === 'stale') && act.ids.includes(b.id) && layout.zones[act.zone]?.slots.length;
  // pass 1: who goes where -> per-zone head count; growable zones get exactly that many evenly spaced seats
  const zoneOf = {}; let lounge = 0;
  // visiting: a bot that just messaged another (event `with`, or a mention) walks over to its house for a bit
  const homeIdx = Object.fromEntries(bots.map((b, i) => [b.id, i]));
  const visitTo = (b) => (b.visit && homeIdx[b.visit] !== undefined && layout.homes[homeIdx[b.visit]] && !['waiting_on_user', 'error', 'stale'].includes(b.state) ? homeIdx[b.visit] : null);
  bots.forEach((b) => { if (visitTo(b) !== null) { zoneOf[b.id] = 'visit'; return; } if (inAct0(b)) { zoneOf[b.id] = act.zone; return; } let zone = theme.stateZones[b.state] || 'home';
    if (b.state === 'idle' && layout.zones.lounge && now - (since[b.id] ?? 0) < theme.idleLoungeSeconds * 1000 && lounge < layout.zones.lounge.slots.length) { zone = 'lounge'; lounge++; }
    zoneOf[b.id] = zone; });
  const counts = {}; Object.values(zoneOf).forEach((z) => { counts[z] = (counts[z] || 0) + 1; });
  const dyn = {}; const gy = layout.groundY;
  const fix = (s) => ({ ...s, pos: [s.pos[0], s.pos[1] + gy(s.pos[0], s.pos[2]), s.pos[2]], approach: (s.approach || []).map((p) => (p[1] === 0 || p.rel ? [p[0], p[1] + gy(p[0], p[2]), p[2]] : p)) });
  for (const [key, k] of Object.entries(counts)) { const z = layout.zones[key]; if (!z) continue;
    if (key === 'plaza') dyn[key] = plazaRing(k).map(fix);
    else if (z.instances.length === 1) { const G = growOf(z.type, z.instances[0]); if (G) dyn[key] = G.slots(z.instances[0], k).map(fix); } }
  Object.defineProperty(out, '__counts', { value: counts }); // head count per zone (structures size to it)
  const take = (zoneKey) => {
    const z = layout.zones[zoneKey]; if (!z || !z.slots.length) return null; const S = dyn[zoneKey] || z.slots;
    const k = (used[zoneKey] = (used[zoneKey] ?? -1) + 1);
    const s = S[k % S.length]; if (k < S.length) return s; if (k < z.slots.length) return s;
    const j = Math.floor(k / z.slots.length); return { ...s, pos: [s.pos[0] + j * 0.6, s.pos[1], s.pos[2] + j * 0.6] };
  };
  const inAct = (b) => act && (b.state === 'idle' || b.state === 'stale') && act.ids.includes(b.id) && layout.zones[act.zone]?.slots.length;
  // a stroll walks a stretch of the ring road first, then heads out onto the dock
  let pre = [];
  if (act?.stroll) { const I = layout.zones[act.zone]?.instances?.[0]; const a0 = I ? (I.angle ?? Math.atan2(I.z, I.x)) : 0; const Ro = layout.Ro;
    for (let k = 0; k <= 4; k++) { const a = a0 - 1.7 + k * 0.38; const x = Math.cos(a) * Ro, z = Math.sin(a) * Ro; pre.push([x, layout.groundY(x, z), z]); } }
  const visitors = {};
  bots.forEach((b, i) => {
    const vj = visitTo(b);
    if (vj !== null) { const H = layout.homes[vj]; const k = (visitors[vj] = (visitors[vj] ?? -1) + 1); const [wx, wz] = H.walkFrom; const [bx, , bz] = H.bed.pos;
      const dx = wx - bx, dz = wz - bz, L = Math.hypot(dx, dz) || 1; const side = (k % 2 ? -1 : 1) * (0.55 + Math.floor(k / 2) * 0.6);
      const x = wx + (dx / L) * 0.4 + (-dz / L) * side, z = wz + (dz / L) * 0.4 + (dx / L) * side;
      out[b.id] = { pos: [x, layout.groundY(x, z), z], face: Math.atan2(bx - x, bz - z), pose: 'stand', zone: 'visit', visiting: b.visit, approach: [], emojis: ['👋', '💬', '📨', '🤝'], emojiTurn: k, lift: 0 }; return; }
    if (inAct(b)) { const s = take(act.zone); const k = act.ids.indexOf(b.id);
      out[b.id] = { ...s, zone: act.zone, activity: act.kind, pose: act.pose || 'stand', approach: [...pre, ...(s.approach || [])], emojis: act.emojis, emojiTurn: k, lift: act.pose === 'lie' ? 0 : s.lift }; return; }
    const zone = zoneOf[b.id];
    const slot = zone === 'home' ? layout.homes[i]?.bed : take(zone);
    out[b.id] = { ...(slot || layout.homes[0].bed), zone };
  });
  return out;
}
