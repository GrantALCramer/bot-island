// Sakura (old-school Japan) pieces: minka homes with shoji + futon, cherry trees, maples, bamboo, a koi pond with a
// red arched bridge, a zen sand garden, a five-story pagoda, falling petals and Mt. Fuji on the horizon.
// Fixed sizes; counts and radii follow the layout like everything else.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, PaperLantern } from './Structures.jsx';
import { scatter } from './Vegetation.jsx';
import { Twinkles } from './Realms.jsx';
import { isClear, angDiff } from './layout.js';
import { seeded, botColor } from '../util.js';

const BACK = Math.PI * 1.25; const CAM_AZ = Math.PI / 4;
const camSide = (a, w) => Math.abs(angDiff(a, CAM_AZ)) < w;
const sel = (onSelect, bot) => (e) => { e.stopPropagation(); onSelect(bot.id); };
const WOOD = '#6e4a2c', WOOD_D = '#4a3020', PAPER = '#f6efdf', TILE = '#3d4552', TILE_D = '#2a3038';
const PINKS = ['#f7b6c8', '#f9c9d6', '#f29bb5', '#ffdbe5', '#f4a7bf'];
const MAPLES = ['#d9452b', '#e8692d', '#c0392b', '#f08a2a'];

// ---------- minka home ----------
// local frame: door/veranda at +z (towards the walk-in point), futon at the back-left like the other homes
const minkaBase = () => cached('minkaBase', () => {
  const f = 0.32; const P = [[G.box(3.7, 0.2, 3.3), '#8a857c', [0, 0.1, 0]], [G.box(3.5, 0.12, 3.1), '#a5774a', [0, f - 0.06, 0]],
    [G.box(3.5, 0.03, 0.55), '#8a5e38', [0, f + 0.0, 1.8]], [G.box(3.6, 0.12, 0.6), '#7a5232', [0, f - 0.06, 1.82]], [G.box(0.9, 0.16, 0.45), '#9a958c', [0, 0.08, 2.35]]];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) P.push([G.box(1.12, 0.022, 1.42), '#cdbf86', [-1.12 + i * 1.12, f + 0.012, -0.72 + k * 1.44]], [G.box(1.14, 0.024, 0.04), '#3f5a3a', [-1.12 + i * 1.12, f + 0.012, -0.72 + k * 1.44 - 0.7]]);
  P.push([G.box(1.9, 0.12, 1.25), '#b8875a', [0.05, f + 0.06, -0.55]]); // dais under the futon
  [[-1.65, -1.45], [1.65, -1.45], [-1.65, 1.45], [1.65, 1.45], [-1.65, 2.05], [1.65, 2.05]].forEach(([x, z]) => P.push([G.box(0.16, z > 1.6 ? 2.0 : 1.75, 0.16), WOOD_D, [x, f + (z > 1.6 ? 1.0 : 0.87), z]]));
  P.push([G.box(0.5, 0.16, 0.4), '#3a3a3a', [1.05, f + 0.08, 0.75]], [G.box(0.42, 0.04, 0.32), '#5a3a24', [1.05, f + 0.2, 0.75]]); // low table (chabudai)
  return mergeParts(P);
});
const minkaShell = () => cached('minkaShell', () => {
  const f = 0.32; const H = 1.62; const P = [];
  const wall = (cx, cz, w, rotY, door = false) => { // shoji: paper panel with dark lattice
    const segs = door ? [[-w / 2, -0.45], [0.45, w / 2]] : [[-w / 2, w / 2]];
    for (const [a, b] of segs) { const L = b - a, m = (a + b) / 2; const off = [Math.cos(rotY) * m, Math.sin(-rotY) * m];
      P.push([G.box(L, H, 0.06), PAPER, [cx + off[0], f + H / 2, cz + off[1]], [0, rotY, 0]]);
      for (let x = a; x <= b + 0.01; x += L / Math.max(1, Math.round(L / 0.42))) { const o = [Math.cos(rotY) * x, Math.sin(-rotY) * x]; P.push([G.box(0.035, H, 0.08), WOOD_D, [cx + o[0], f + H / 2, cz + o[1]], [0, rotY, 0]]); }
      for (let y = 0.3; y < H; y += 0.42) P.push([G.box(L, 0.03, 0.08), WOOD_D, [cx + off[0], f + y, cz + off[1]], [0, rotY, 0]]); }
    P.push([G.box(w + 0.1, 0.12, 0.12), WOOD_D, [cx, f + H + 0.06, cz], [0, rotY, 0]], [G.box(w + 0.1, 0.1, 0.1), WOOD_D, [cx, f + 0.05, cz], [0, rotY, 0]]); };
  wall(0, -1.5, 3.3, 0); wall(0, 1.5, 3.3, 0, true); wall(-1.65, 0, 3.0, Math.PI / 2); wall(1.65, 0, 3.0, Math.PI / 2);
  // irimoya-ish roof: two tiled slopes over the house + veranda, ridge with upturned ends, gable triangles
  const y0 = f + H + 0.1; const slope = 0.5, run = 2.25, L = 4.5;
  [-1, 1].forEach((s) => { P.push([G.box(L, 0.16, run / Math.cos(slope)), TILE, [0, y0 + Math.tan(slope) * run / 2, s * run / 2 + 0.25], [s * slope, 0, 0]]);
    for (let k = 1; k < 5; k++) { const d = (k / 5) * run; P.push([G.box(L + 0.02, 0.05, 0.08), TILE_D, [0, y0 + Math.tan(slope) * (run - d) + 0.1, s * d + 0.25], [s * slope, 0, 0]]); } });
  const top = y0 + Math.tan(slope) * run; P.push([G.box(L + 0.3, 0.24, 0.3), TILE_D, [0, top + 0.06, 0.25]]);
  [-1, 1].forEach((s) => P.push([G.box(0.36, 0.36, 0.34), TILE_D, [s * (L / 2 + 0.12), top + 0.18, 0.25], [0, 0, s * 0.5]]));
  const tri = new THREE.BufferGeometry(); const hw = run * 0.8; tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -hw, 0, 0, hw, 0, (top - y0) * 0.8, 0], 3)); tri.computeVertexNormals();
  [-1, 1].forEach((s) => { const t = tri.clone(); P.push([t, '#8a5e38', [s * 1.72, y0, 0.25]]); const t2 = tri.clone(); t2.scale(-1, 1, 1); P.push([t2, '#8a5e38', [s * 1.72, y0, 0.25]]); });
  return mergeParts(P);
});
export function Minka({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor;
  const shell = useMemo(() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }); return m; }, []);
  useCutaway(home, selected, [shell], 0.12, 10); const lantern = useLantern(asleep, '#ffcf8a');
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={minkaBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={minkaShell()} material={shell} castShadow />
    <Bed kind="futon" color={color} inBed={inBed} position={[0, f + 0.12, -0.55]} />
    <group position={[-1.15, f, 0.75]}>
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.3, 0.06, 0.3]} /><meshStandardMaterial color={WOOD_D} /></mesh>
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.24, 0.42, 0.24]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    </group>
    <PaperLantern position={[1.25, f + 1.55, 2.0]} color={color} r={0.13} h={0.26} seed={home.x} />
    <HomeSign bot={bot} color={color} position={[0, 0.45, 2.6]} />
  </group>);
}

// ---------- garden spots shared by the decor pieces (pond, zen garden, pagoda), cached per layout ----------
const SPOTS = new WeakMap();
export function gardenSpots(layout) {
  if (SPOTS.has(layout)) return SPOTS.get(layout);
  const r = seeded(808); const R = layout.R; const lo = layout.plazaFoot + 1.5, hi = R + 0.5;
  const pick = (foot, accept, taken) => { for (let i = 0; i < 400; i++) { const a = r() * Math.PI * 2; const rr = lo + foot + r() * Math.max(0.1, hi - lo - 2 * foot); const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (!isClear(layout, x, z, foot - 0.7) || !accept(a)) continue; if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < t.foot + foot + 1.0)) continue; return { x, z, a, foot }; } return null; };
  const out = []; const pagoda = pick(1.7, (a) => !camSide(a, 1.2), out); if (pagoda) out.push(pagoda);
  const pond = pick(2.0, () => true, out); if (pond) out.push(pond);
  const zen = pick(1.5, () => true, out); if (zen) out.push(zen);
  const res = { pagoda, pond, zen, all: out }; SPOTS.set(layout, res); return res;
}
const nearHome = (layout, x, z, pad) => layout.homes.some((h) => Math.hypot(h.x - x, h.z - z) < h.foot + pad);
// keep the yard in front of each house open (door, sign, close-up camera)
const inYard = (layout, x, z) => layout.homes.some((h) => Math.hypot(h.x + Math.sin(h.rot) * 3.6 - x, h.z + Math.cos(h.rot) * 3.6 - z) < 3.0);
const nearGarden = (layout, x, z, pad) => gardenSpots(layout).all.some((s) => Math.hypot(s.x - x, s.z - z) < s.foot + pad);

// ---------- cherry trees + fallen petals ----------
function blossomTree(P, x, y, z, h, r, seed, cols = PINKS) {
  const lean = (r() - 0.5) * 0.3; P.push([G.cyl(0.14, 0.22, h * 0.62, 7), '#4a3328', [x, y + h * 0.31, z], [lean, seed, lean * 0.5]]);
  P.push([G.cyl(0.07, 0.12, h * 0.4, 6), '#4a3328', [x + 0.35, y + h * 0.62, z + 0.1], [0, seed, -0.7]], [G.cyl(0.07, 0.12, h * 0.4, 6), '#4a3328', [x - 0.3, y + h * 0.66, z - 0.1], [0, seed, 0.7]]);
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r(); const d = 0.45 + r() * 0.6; const s = 0.5 + r() * 0.35;
    P.push([G.ico(s, 1), cols[Math.floor(r() * cols.length)], [x + Math.cos(a) * d, y + h * 0.78 + r() * 0.7, z + Math.sin(a) * d], [r(), r(), 0], [1.15, 0.8, 1.15]]); }
  P.push([G.ico(0.75, 1), cols[Math.floor(r() * cols.length)], [x, y + h + 0.15, z], [0, 0, 0], [1.2, 0.85, 1.2]]);
}
export function SakuraTrees() {
  const { layout } = useWorld(); const R = layout.R;
  const geo = useMemo(() => { const rand = seeded(88); const P = []; const fallen = [];
    const ok = (x, z) => !nearGarden(layout, x, z, 1.4) && !inYard(layout, x, z);
    const ring = scatter(layout, rand, Math.round(R * 0.8), R - 2.2, R + 0.9, 3.0, [], 1.0, (x, z, a, r) => ok(x, z) && !camSide(a, r > R - 0.8 ? 0.6 : 1.1));
    const inner = scatter(layout, rand, Math.round(R * 0.25), layout.plazaFoot + 1.2, R - 3.0, 3.4, ring, 1.0, (x, z, a) => ok(x, z) && !nearHome(layout, x, z, 4.5) && !camSide(a, 1.3));
    [...ring, ...inner].forEach(([x, z], i) => { const y = layout.groundY(x, z) - 0.05; blossomTree(P, x, y, z, 2.3 + rand() * 0.9, rand, i);
      for (let k = 0; k < 8; k++) { const a = rand() * 6.28, d = rand() * 1.8; fallen.push([G.cyl(0.08 + rand() * 0.05, 0.08, 0.01, 6), PINKS[k % 5], [x + Math.cos(a) * d, layout.groundY(x + Math.cos(a) * d, z + Math.sin(a) * d) + 0.02, z + Math.sin(a) * d]]); } });
    return { trees: P.length ? mergeParts(P) : null, fallen: fallen.length ? mergeParts(fallen) : null }; }, [layout]);
  return <group>{geo.trees && <mesh geometry={geo.trees} material={MAT.vcFlat} castShadow receiveShadow />}{geo.fallen && <mesh geometry={geo.fallen} material={MAT.vcFlat} receiveShadow />}</group>;
}
// red/orange maples and stone lanterns between the cherries, on the far side
export function Maples() {
  const { layout } = useWorld(); const R = layout.R;
  const geo = useMemo(() => { const rand = seeded(303); const P = [];
    scatter(layout, rand, Math.round(R * 0.25), layout.plazaFoot + 2, R - 1.2, 3.4, [], 1.0, (x, z, a) => !nearGarden(layout, x, z, 1.6) && !nearHome(layout, x, z, 4.0) && !camSide(a, 1.4))
      .forEach(([x, z], i) => blossomTree(P, x, layout.groundY(x, z) - 0.05, z, 2.0 + rand() * 0.6, rand, i + 50, MAPLES));
    scatter(layout, rand, Math.round(R * 0.45), layout.plazaFoot + 1, R - 0.8, 2.6, [], 0.2, (x, z) => !nearGarden(layout, x, z, 0.8)).forEach(([x, z]) => { const y = layout.groundY(x, z);
      P.push([G.cyl(0.18, 0.24, 0.12, 6), '#8f8b84', [x, y + 0.06, z]], [G.cyl(0.07, 0.09, 0.4, 6), '#9a968e', [x, y + 0.32, z]], [G.box(0.26, 0.2, 0.26), '#9a968e', [x, y + 0.62, z]], [G.cone(0.3, 0.2, 6), '#8f8b84', [x, y + 0.82, z]]); });
    return P.length ? mergeParts(P) : null; }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /> : null;
}
// bamboo groves on the far shore
export function Bamboo() {
  const { layout } = useWorld(); const R = layout.R;
  const geo = useMemo(() => { const rand = seeded(515); const P = [];
    scatter(layout, rand, Math.round(R * 0.5), R - 2.4, R + 0.4, 3.0, [], 0.3, (x, z, a) => !nearGarden(layout, x, z, 1.5) && !camSide(a, 1.9)).forEach(([cx, cz]) => {
      for (let k = 0; k < 7; k++) { const x = cx + (rand() - 0.5) * 1.3, z = cz + (rand() - 0.5) * 1.3; const h = 3.2 + rand() * 2.2; const y = layout.groundY(x, z) - 0.05; const tilt = (rand() - 0.5) * 0.12;
        P.push([G.cyl(0.06, 0.075, h, 6), rand() < 0.5 ? '#7fae52' : '#6a9a44', [x, y + h / 2, z], [tilt, 0, tilt]]);
        for (let yy = 0.7; yy < h - 0.2; yy += 0.7) P.push([G.cyl(0.08, 0.08, 0.04, 6), '#5a8a3a', [x + tilt * yy, y + yy, z - tilt * yy]]);
        for (let l = 0; l < 4; l++) { const a = rand() * 6.28; P.push([G.sph(0.4, 5, 3), rand() < 0.5 ? '#5f9a3e' : '#78b04a', [x + Math.cos(a) * 0.3 + tilt * h, y + h - 0.3 - l * 0.35, z + Math.sin(a) * 0.3 - tilt * h], [0, a, 0.8], [1, 0.22, 0.4]]); } } });
    return P.length ? mergeParts(P) : null; }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /> : null;
}

// ---------- koi pond with a red arched bridge ----------
const KOI = ['#ff7a2a', '#ffffff', '#e2483a', '#ffb02e', '#f4ead2'];
export function KoiPond() {
  const { layout } = useWorld(); const s = gardenSpots(layout).pond; const fish = useRef();
  const geo = useMemo(() => { if (!s) return null; const P = []; const r = seeded(31); const y = layout.groundY(s.x, s.z);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P.push([G.dodec(0.22 + r() * 0.12), r() < 0.5 ? '#8f8b84' : '#a5a199', [Math.cos(a) * 1.75, 0.06, Math.sin(a) * 1.55], [r(), r(), 0], [1.2, 0.6, 1]]); }
    for (let i = 0; i < 4; i++) { const a = 0.6 + i * 1.4; P.push([G.cyl(0.22, 0.22, 0.02, 10), '#4f9a3c', [Math.cos(a) * 1.0, 0.07, Math.sin(a) * 0.9]]); if (i % 2) P.push([G.sph(0.06, 6, 4), '#ff9ac0', [Math.cos(a) * 1.0, 0.1, Math.sin(a) * 0.9]]); }
    // arched bridge across the pond (local x axis)
    const V = '#d23a2c'; const N = 9;
    for (let i = 0; i < N; i++) { const u = (i / (N - 1)) * 2 - 1; const x = u * 2.0; const yy = 0.62 * (1 - u * u) + 0.1; const yn = 0.62 * (1 - (u + 0.22) ** 2) + 0.1; const slope = Math.atan2(-(yy - yn), 0.5);
      P.push([G.box(0.5, 0.06, 0.8), '#8a5e38', [x, yy, 0], [0, 0, i === N - 1 ? 0 : slope]]);
      [-0.42, 0.42].forEach((zz) => P.push([G.box(0.06, 0.42, 0.06), V, [x, yy + 0.2, zz]])); }
    for (let i = 0; i < N - 1; i++) { const u0 = (i / (N - 1)) * 2 - 1, u1 = ((i + 1) / (N - 1)) * 2 - 1; const x0 = u0 * 2, x1 = u1 * 2; const y0 = 0.62 * (1 - u0 * u0) + 0.5, y1 = 0.62 * (1 - u1 * u1) + 0.5;
      [-0.42, 0.42].forEach((zz) => P.push([G.box(Math.hypot(x1 - x0, y1 - y0) + 0.04, 0.06, 0.07), V, [(x0 + x1) / 2, (y0 + y1) / 2, zz], [0, 0, Math.atan2(y1 - y0, x1 - x0)]])); }
    return { mesh: mergeParts(P), y, rot: -s.a + Math.PI / 2 }; }, [layout, s]);
  useFrame(({ clock }) => { if (!fish.current) return; const t = clock.elapsedTime; fish.current.children.forEach((m, i) => { const k = t * (0.35 + i * 0.07) + i * 1.6; const rr = 0.45 + (i % 3) * 0.32;
    m.position.set(Math.cos(k) * rr * 1.1, 0.0, Math.sin(k) * rr); m.rotation.y = Math.atan2(-Math.cos(k) * rr, -Math.sin(k) * rr * 1.1); }); });
  if (!geo) return null;
  return (<group position={[s.x, geo.y, s.z]} rotation={[0, geo.rot, 0]}>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.75, 1.55, 1]} receiveShadow><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#2f7f96" roughness={0.15} metalness={0.25} /></mesh>
    <mesh geometry={geo.mesh} material={MAT.vcFlat} castShadow receiveShadow />
    <group ref={fish} position={[0, 0.05, 0]}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} scale={[0.22, 0.05, 0.08]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color={KOI[i % KOI.length]} roughness={0.4} /></mesh>)}</group>
  </group>);
}

// ---------- zen sand garden ----------
export function ZenGarden() {
  const { layout } = useWorld(); const s = gardenSpots(layout).zen;
  const geo = useMemo(() => { if (!s) return null; const P = [[G.box(2.7, 0.06, 1.9), '#ece5d3', [0, 0.03, 0]]];
    [[-1.4, 0, 0.1, 2.1], [1.4, 0, 0.1, 2.1], [0, -1.0, 2.9, 0.1], [0, 1.0, 2.9, 0.1]].forEach(([x, z, w, d]) => P.push([G.box(w, 0.14, d), '#5a3a24', [x, 0.07, z]]));
    for (let i = 0; i < 8; i++) P.push([G.box(2.6, 0.012, 0.035), '#cfc6b0', [0, 0.065, -0.84 + i * 0.24]]);
    const rocks = [[-0.6, -0.15, 0.36], [0.2, 0.3, 0.26], [0.8, -0.3, 0.2]];
    rocks.forEach(([x, z, r]) => { P.push([G.dodec(r), '#7a7670', [x, 0.12 + r * 0.3, z], [x, z, 0], [1.2, 0.8, 1]], [G.cyl(r + 0.08, r + 0.12, 0.02, 10), '#5f8a3a', [x, 0.07, z]]);
      for (let k = 0; k < 3; k++) P.push([G.torus(r + 0.18 + k * 0.12, 0.012, 3, 24), '#cfc6b0', [x, 0.066, z], [Math.PI / 2, 0, 0]]); });
    return { mesh: mergeParts(P), y: layout.groundY(s.x, s.z), rot: -s.a + Math.PI / 2 }; }, [layout, s]);
  if (!geo) return null;
  return <group position={[s.x, geo.y, s.z]} rotation={[0, geo.rot, 0]}><mesh geometry={geo.mesh} material={MAT.vcFlat} castShadow receiveShadow /></group>;
}

// ---------- five-story pagoda ----------
const pagodaGeo = () => cached('pagoda', () => { const P = [[G.box(2.6, 0.3, 2.6), '#9a968e', [0, 0.15, 0]]]; let y = 0.3;
  for (let i = 0; i < 5; i++) { const w = 1.7 - i * 0.2, h = 0.75 - i * 0.04; P.push([G.box(w, h, w), i % 2 ? '#c0392b' : '#b5322a', [0, y + h / 2, 0]], [G.box(w + 0.04, 0.08, w + 0.04), '#f4ead2', [0, y + h * 0.55, 0]]);
    y += h; const rw = w + 1.1; P.push([G.cyl(0.2, rw * 0.72, 0.28, 4), TILE, [0, y + 0.1, 0], [0, Math.PI / 4, 0]], [G.box(rw * 1.0, 0.06, rw * 1.0), TILE_D, [0, y - 0.02, 0]]); y += 0.26; }
  P.push([G.cyl(0.05, 0.06, 1.4, 6), '#c9a24a', [0, y + 0.7, 0]]); for (let k = 0; k < 5; k++) P.push([G.torus(0.13, 0.03, 4, 12), '#c9a24a', [0, y + 0.3 + k * 0.2, 0], [Math.PI / 2, 0, 0]]);
  P.push([G.sph(0.1, 8, 6), '#e9b949', [0, y + 1.45, 0]]); return mergeParts(P); });
export function Pagoda() {
  const { layout } = useWorld(); const s = gardenSpots(layout).pagoda; if (!s) return null;
  return (<group position={[s.x, layout.groundY(s.x, s.z) - 0.05, s.z]} rotation={[0, -s.a, 0]}>
    <mesh geometry={pagodaGeo()} material={MAT.vcFlat} castShadow receiveShadow />
    {[0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; return <PaperLantern key={k} position={[Math.cos(a) * 1.25, 0.72, Math.sin(a) * 1.25]} color="#e2483a" r={0.09} h={0.18} seed={k} />; })}
  </group>);
}

// ---------- ambient: falling petals + Mt. Fuji ----------
export const Petals = () => <Twinkles color="#ffb3cb" count={340} size={3.6} rise={-0.32} H={7} opacity={0.95} spread={0.9} additive={false} />;
export { Fuji } from './Fuji.jsx';
