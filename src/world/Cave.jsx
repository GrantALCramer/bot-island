// Crystal Cave pieces: the island sits inside a vast cavern. Geode homes crowned with crystals, a crystal-pillar
// lab, a geode research ring, a crystal bar under a rock arch, a hot spring, a mine-cart ride, crystal lamps on
// stalagmites, a crystal hearth plaza, a raft landing with a lantern gondola, a glowing bioluminescent river
// (with plank bridges where paths cross it), crystal fields, a rock dome with stalactites, glowworms on the
// ceiling, a light shaft through a ceiling crack by day, and drifting crystal motes.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern } from './Structures.jsx';
import { Twinkles } from './Realms.jsx';
import { scatter } from './Vegetation.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { BACK, camSide, backPts, sel, hashStr, nightK } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const ROCK = '#504670', ROCK_D = '#3a3250', ROCK_L = '#76689a', STONE = '#7a7290', WOOD = '#6a4a30', WOOD_L = '#8a6a48', IRON = '#5a5a62';
export const CRY = ['#7dfcff', '#c08cff', '#ff7ad8', '#7dff9a', '#ffd27d', '#7d9dff'];
const FLAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });

// crystal glow: brighter at "night" (cave night = lamps low), pulses in the Glow pulse weather, flickers in Shimmer
export function useCaveGlow(day = 1.0, night = 2.4, phase = 0, { opacity = 1 } = {}) {
  const { env } = useWorld();
  const m = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: opacity < 1, opacity }), [opacity]);
  useFrame(({ clock }) => { const e = env.current; const t = clock.elapsedTime; const n = nightK(env);
    const p = 1 + (e?.pulse ?? 0) * 0.55 * Math.sin(t * 1.4 + phase) + (e?.shimmer ?? 0) * 0.3 * Math.sin(t * 9 + phase * 3) * Math.sin(t * 2.3 + phase);
    m.color.setScalar((day + (night - day) * n) * p); });
  return m;
}
// elongated octahedron crystal (center buried a little so it sprouts from the ground)
const cry = (L, x, y, z, h, r, c, tx = 0, tz = 0) => L.push([G.oct(1), c, [x, y + h * 0.38, z], [tx, (x * 7 + z * 3) % 6, tz], [r, h / 2, r]]);
const cluster = (L, x, y, z, s, c, r) => { cry(L, x, y, z, 1.4 * s, 0.28 * s, c); for (let k = 0; k < 4; k++) { const a = k * 1.57 + r() * 0.8; cry(L, x + Math.cos(a) * 0.22 * s, y, z + Math.sin(a) * 0.22 * s, (0.6 + r() * 0.6) * s, 0.16 * s, c, Math.sin(a) * 0.5, -Math.cos(a) * 0.5); } };
function CaveLight({ position, color, intensity = 4, distance = 9 }) { const { env } = useWorld(); const l = useRef(); useFrame(() => { if (l.current) l.current.intensity = intensity * (0.45 + 0.55 * nightK(env)); }); return <pointLight ref={l} position={position} color={color} distance={distance} decay={1.6} intensity={0} />; }

// ---------- geode home ----------
const gdBase = () => cached('gdBase', () => { const f = 0.18; const P = [[G.cyl(1.9, 2.05, 0.2, 9), ROCK_D, [0, 0.1, 0]], [G.cyl(1.6, 1.6, 0.04, 16), '#5a5270', [0, f, 0]]];
  for (let i = 0; i < 5; i++) P.push([G.cyl(0.26, 0.28, 0.06, 6), STONE, [(i % 2 - 0.5) * 0.15, 0.04, 2.0 + i * 0.4 - 0.2]]); return mergeParts(P); });
const gdShell = () => cached('gdShell', () => { const f = 0.18, H = 1.5; const P = [];
  const wall = new THREE.CylinderGeometry(1.6, 1.8, H, 11, 1, true, Math.PI / 2 + 0.36, Math.PI * 2 - 0.72); P.push([wall, ROCK, [0, f + H / 2, 0]]);
  P.push([G.box(0.8, 0.32, 0.14), ROCK, [0, f + H - 0.16, 1.62]], [G.dome(2.05, 11, 5), ROCK_L, [0, f + H - 0.08, 0], [0, 0.3, 0], [1, 0.62, 1]], [G.cyl(2.05, 1.85, 0.24, 11, true), ROCK_D, [0, f + H - 0.18, 0]]);
  return mergeParts(P); });
const gdCrown = (tone) => cached(`gdCrown${tone}`, () => { const r = seeded(31 + tone); const L = []; const c = CRY[tone], c2 = CRY[(tone + 2) % 6];
  cluster(L, -0.3, 2.55, -0.3, 1.0, c, r); cluster(L, 0.9, 2.15, 0.2, 0.6, c2, r); cluster(L, -1.2, 2.0, 0.5, 0.5, c, r);
  [1.25, -1.25, 2.5].forEach((a) => L.push([G.cyl(0.24, 0.24, 0.05, 6), c, [Math.cos(a + 1.57) * 1.72, 1.05, Math.sin(a + 1.57) * 1.72], [Math.PI / 2, 0, -(a + 1.57) + Math.PI / 2, 'YXZ']]));
  return mergeParts(L); });
export function Geode({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % CRY.length;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }), []); const glow = useCaveGlow(1.0, 2.2, tone);
  useCutaway(home, selected, [shell, glow], 0.1, 10); const lamp = useLantern(asleep, CRY[tone]); const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={gdBase()} material={FLAT} castShadow receiveShadow />
    <mesh geometry={gdShell()} material={shell} castShadow receiveShadow />
    <mesh geometry={gdCrown(tone)} material={glow} />
    <mesh position={[0, f + 0.65, 1.7]}><cylinderGeometry args={[0.42, 0.42, 0.06, 16, 1, false, 0, Math.PI]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0.95, f + 0.5, -0.7]}><octahedronGeometry args={[0.13, 0]} /><meshBasicMaterial ref={lamp} toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, -0.35]} kind="futon" />
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.6]} />
  </group>);
}
// ---------- crystal lab ----------
function CrystalLab() {
  const g = cached('labCrystal', () => { const r = seeded(5); const P = [[G.cyl(3.1, 3.3, 0.3, 10), ROCK_D, [0, 0.08, 0]], [G.cyl(2.95, 2.95, 0.04, 20), '#5a5270', [0, 0.24, 0]]], L = [];
    for (let k = 1; k < 4; k++) L.push([G.torus(k * 0.8, 0.02, 3, 30), CRY[k], [0, 0.265, 0], [Math.PI / 2, 0, 0]]);
    backPts(5, 3.0, 2.8).forEach(([x, z], i) => { P.push([G.cyl(0.35, 0.5, 0.5, 6), ROCK, [x, 0.4, z]]); cluster(L, x, 0.6, z, 1.2 + (i % 2) * 0.6, CRY[i % 6], r); });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; P.push([G.dodec(0.35), ROCK, [Math.cos(a) * 3.25, 0.15, Math.sin(a) * 3.25], [i, i * 2, 0], [1, 0.6, 1]]); }
    return { p: mergeParts(P), g: mergeParts(L) }; });
  const m = useCaveGlow(1.0, 2.4, 1);
  return <group><mesh geometry={g.p} material={FLAT} castShadow receiveShadow /><mesh geometry={g.g} material={m} /><CaveLight position={[Math.cos(BACK) * 2.4, 2.2, Math.sin(BACK) * 2.4]} color="#9ddfff" /></group>;
}
// ---------- geode ring (research) ----------
function GeodeRing() {
  const g = cached('ringGeode', () => { const r = seeded(9); const P = [[G.cyl(2.5, 2.65, 0.14, 12), ROCK_D, [0, 0.05, 0]]], L = [[G.torus(2.2, 0.05, 4, 36), CRY[1], [0, 0.13, 0], [Math.PI / 2, 0, 0]]];
    for (let i = 0; i < 7; i++) { const a = BACK + (i - 3) * 0.5; const x = Math.cos(a) * 2.5, z = Math.sin(a) * 2.5; const h = 1.4 + (i % 3) * 0.6; cry(L, x, 0.05, z, h, 0.32, CRY[(i + 1) % 6], -Math.sin(a) * 0.15, Math.cos(a) * 0.15); P.push([G.dodec(0.4), ROCK, [x, 0.1, z]]); }
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; cry(L, Math.cos(a) * 2.35, 0.05, Math.sin(a) * 2.35, 0.35, 0.08, CRY[i % 6]); }
    void r; return { p: mergeParts(P), g: mergeParts(L) }; });
  const m = useCaveGlow(1.0, 2.6, 2);
  return <group><mesh geometry={g.p} material={FLAT} castShadow receiveShadow /><mesh geometry={g.g} material={m} /></group>;
}
// ---------- crystal bar under a rock arch ----------
function crystalBar() { const P = [], SP = [];
  P.push([G.box(5.8, 0.1, 3.6), '#5a5270', [0, 0.05, 0.15]], [G.box(4.8, 1.0, 0.7), ROCK, [0, 0.55, 0]], [G.box(5.0, 0.1, 0.85), STONE, [0, 1.07, 0.05]]);
  P.push([G.cyl(0.5, 0.8, 3.2, 7), ROCK, [-2.5, 1.6, -1.2]], [G.cyl(0.5, 0.8, 3.2, 7), ROCK, [2.5, 1.6, -1.2]], [G.box(4.2, 0.12, 0.5), STONE, [0, 1.6, -1.35]], [G.box(4.2, 0.12, 0.5), STONE, [0, 2.1, -1.35]]);
  for (let i = 0; i < 7; i++) { const x = -3 + i; P.push([G.dodec(0.75), i % 2 ? ROCK_L : ROCK, [x, 3.15 + Math.abs(x) * -0.08, -0.4], [i, i * 2, 0], [1, 0.5, 1.6]]); }
  for (let i = 0; i < 5; i++) P.push([G.cone(0.12, 0.5, 5), ROCK_L, [-2 + i, 2.75, 0.4], [Math.PI, 0, 0]]);
  SP.push([G.cyl(0.18, 0.3, 0.5, 6), ROCK_L, [0, 0.25, 1.05]], [G.cyl(0.25, 0.22, 0.06, 6), STONE, [0, 0.52, 1.05]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function CrystalBarExtra({ primary }) {
  const m = useCaveGlow(1.1, 2.6, 3);
  const g = cached('crystalBarGlow', () => { const L = [[G.box(4.9, 0.03, 0.15), CRY[0], [0, 1.13, 0.42]]]; const r = seeded(77);
    for (let i = 0; i < 7; i++) L.push([G.cyl(0.08, 0.09, 0.3, 6), CRY[i % 6], [-1.6 + i * 0.55, 1.82, -1.35]], [G.cyl(0.07, 0.08, 0.26, 6), CRY[(i + 3) % 6], [-1.5 + i * 0.5, 2.3, -1.35]]);
    [-1.8, -0.6, 0.6, 1.8].forEach((x, i) => { L.push([G.oct(1), CRY[(i * 2) % 6], [x, 2.4, 1.0], [0, i, 0], [0.16, 0.38, 0.16]]); });
    cluster(L, -2.5, 3.1, -1.2, 0.8, CRY[1], r); cluster(L, 2.5, 3.1, -1.2, 0.8, CRY[2], r);
    return mergeParts(L); });
  const strings = cached('crystalBarStr', () => mergeParts([-1.8, -0.6, 0.6, 1.8].map((x) => [G.cyl(0.008, 0.008, 0.5, 3), '#2a2436', [x, 2.9, 1.0]])));
  return (<><mesh geometry={g} material={m} /><mesh geometry={strings} material={MAT.vcFlat} />{primary && <CaveLight position={[0, 2.2, 1.2]} color="#b8a8ff" intensity={5} />}</>);
}
CrystalBarExtra.signY = 3.9; CrystalBarExtra.noTorch = true;
// ---------- stalagmite crystal lamp (theme torch) ----------
function CrystalLamp({ position, light, h = 1.5 }) {
  const k = Math.abs(Math.round(position[0] * 7 + position[2] * 3)) % 6; const c = CRY[k]; const m = useCaveGlow(1.2, 2.8, k);
  const stem = cached(`clamp${h}`, () => mergeParts([[G.cone(0.22, h, 6), ROCK_L, [0, h / 2, 0]], [G.dodec(0.25), ROCK, [0, 0.08, 0], [0, 0, 0], [1, 0.5, 1]]]));
  const top = cached(`clampTop${c}`, () => { const L = []; cry(L, 0, 0, 0, 0.6, 0.13, c); cry(L, 0.1, -0.05, 0.05, 0.35, 0.08, c, 0.5, 0.3); return mergeParts(L); });
  return (<group position={position}><mesh geometry={stem} material={FLAT} castShadow /><mesh geometry={top} material={m} position={[0, h - 0.15, 0]} />
    {light && <CaveLight position={[0, h + 0.3, 0]} color={c} intensity={3} distance={7} />}</group>);
}
// ---------- raft landing + lantern gondola ----------
function RaftDeco({ from, to }) {
  const geo = cached(`raftd_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = [], L = []; const r = seeded(13);
    for (let i = 0; i < 4; i++) { const s = from + 0.6 + i * ((to - from - 1) / 3); const x = (i % 2 ? 1 : -1) * 1.25; P.push([G.cone(0.3, 1.6, 6), ROCK, [x, 0.3, s]]); cry(L, x, 1.0, s, 0.5, 0.12, CRY[i % 6]); }
    for (let i = 0; i < 6; i++) { const s = from + r() * (to - from); const x = (r() < 0.5 ? -1 : 1) * (1.8 + r() * 0.8); L.push([G.cyl(0.25 + r() * 0.2, 0.25, 0.02, 7), CRY[(i + 3) % 6], [x, -0.03, s]]); }
    return { p: mergeParts(P), g: mergeParts(L) }; });
  const m = useCaveGlow(1.0, 2.4, 4);
  return <group><mesh geometry={geo.p} material={FLAT} castShadow /><mesh geometry={geo.g} material={m} /></group>;
}
function Gondola({ mid }) {
  const ref = useRef(); useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime; ref.current.position.y = -0.05 + Math.sin(t * 1.1) * 0.04; ref.current.rotation.z = Math.sin(t * 0.8) * 0.04; });
  const geo = cached('gondola', () => mergeParts([[G.box(1.3, 0.18, 3.4), WOOD, [0, 0.1, 0]], [G.box(1.4, 0.24, 0.12), WOOD_L, [0, 0.25, 1.65]], [G.box(1.4, 0.24, 0.12), WOOD_L, [0, 0.25, -1.65]],
    [G.box(0.12, 0.24, 3.3), WOOD_L, [0.66, 0.25, 0]], [G.box(0.12, 0.24, 3.3), WOOD_L, [-0.66, 0.25, 0]], [G.cyl(0.04, 0.05, 1.8, 6), WOOD, [0, 1.0, 1.3]], [G.box(0.5, 0.04, 0.04), WOOD, [0.2, 1.85, 1.3]]]));
  const lamp = useCaveGlow(1.4, 3, 5); const lg = cached('gondolaLamp', () => { const L = []; cry(L, 0, 0, 0, 0.4, 0.12, CRY[0]); return mergeParts(L); });
  return <group ref={ref} position={[-2.0, 0, mid - 0.4]}><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={lg} material={lamp} position={[0.42, 1.55, 1.3]} /></group>;
}
// ---------- crystal hearth plaza ----------
function HearthPlaza({ gs }) {
  const stones = cached('plazaHearthStones', () => { const P = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; P.push([G.dodec(0.36), i % 2 ? ROCK_L : STONE, [Math.cos(a) * 1.75, 0.18, Math.sin(a) * 1.75], [i, i, 0], [1.1, 0.6, 1.1]]); } return mergeParts(P); });
  const core = cached('plazaHearth', () => { const r = seeded(21); const P = [[G.cyl(1.0, 1.15, 0.25, 8), ROCK_D, [0, 0.12, 0]]], L = []; cluster(L, 0, 0.2, 0, 1.6, CRY[0], r); cluster(L, 0.45, 0.2, 0.3, 0.8, CRY[1], r); cluster(L, -0.4, 0.2, -0.35, 0.7, CRY[2], r); cluster(L, -0.35, 0.2, 0.45, 0.6, CRY[3], r); return { p: mergeParts(P), g: mergeParts(L) }; });
  const motes = useRef(); const m = useCaveGlow(1.3, 2.8, 6);
  useFrame(({ clock }) => { if (!motes.current) return; const t = clock.elapsedTime; motes.current.children.forEach((c, i) => { const a = t * 0.4 + i * 1.05; c.position.set(Math.cos(a) * 0.9, 1.2 + Math.sin(t * 1.1 + i) * 0.4 + i * 0.08, Math.sin(a) * 0.9); }); });
  return (<group><group ref={gs}><mesh geometry={stones} material={FLAT} castShadow receiveShadow /></group><mesh geometry={core.p} material={FLAT} castShadow receiveShadow /><mesh geometry={core.g} material={m} />
    <group ref={motes}>{CRY.map((c, i) => <mesh key={i}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color={new THREE.Color(c).multiplyScalar(2.5)} toneMapped={false} /></mesh>)}</group>
    <CaveLight position={[0, 1.6, 0]} color="#a8f0ff" intensity={9} distance={13} /></group>);
}
// ---------- stalagmite hammock posts ----------
function StalagPost({ x, y, z, seed }) { const c = CRY[seed % 6]; const geo = cached(`stalagPost${c}`, () => { const L = [[G.cone(0.32, 3.0, 6), ROCK_L, [0, 1.5, 0]], [G.dodec(0.4), ROCK, [0, 0.15, 0], [0, 0, 0], [1, 0.5, 1]]]; cry(L, 0.2, 0.3, 0.15, 0.6, 0.12, c); return mergeParts(L); });
  return <mesh geometry={geo} material={FLAT} position={[x, y, z]} castShadow />; }
// ---------- hot spring ----------
function HotSpring({ inst, occupied, count }) {
  const [g] = useSize('HotTub', inst, count); const on = busy(inst, occupied); const m = useCaveGlow(1.0, 2.2, 7);
  const geo = useMemo(() => { const P = [[G.cyl(1.2, 1.2, 0.1, 16), ROCK_D, [0, 0.02, 0]]]; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; P.push([G.dodec(0.34), i % 2 ? ROCK_L : ROCK, [Math.cos(a) * 1.32, 0.28, Math.sin(a) * 1.32], [i, i * 2, 0], [1, 1.1, 1]]); } return mergeParts(P); }, []);
  const gl = useMemo(() => { const r = seeded(41); const L = [[G.cyl(1.17, 1.17, 0.02, 24), '#3ae8d8', [0, 0.34, 0]]]; for (let i = 0; i < 5; i++) { const a = BACK + (i - 2) * 0.5; cry(L, Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5, 0.5 + r() * 0.5, 0.12, CRY[i % 6]); } return mergeParts(L); }, []);
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={FLAT} castShadow receiveShadow /><mesh geometry={gl} material={m} />
    <Rising n={on ? 16 : 10} r={0.9} h={1.8} y0={0.36} color="#e8fff8" size={0.26} speed={0.25} opacity={0.32} /><CaveLight position={[0, 1.0, 0]} color="#5af0e0" intensity={3} distance={5} /></Place>);
}
// ---------- mine-cart ride (orbit shared with the seahorse ride) ----------
const cartGeo = (c, ore) => { const P = [[G.box(0.8, 0.08, 1.0), IRON, [0, 0.12, 0]], [G.box(0.08, 0.4, 1.0), c, [0.4, 0.3, 0]], [G.box(0.08, 0.4, 1.0), c, [-0.4, 0.3, 0]], [G.box(0.8, 0.4, 0.08), c, [0, 0.3, 0.5]], [G.box(0.8, 0.4, 0.08), c, [0, 0.3, -0.5]]];
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.32, 0.32]) P.push([G.cyl(0.11, 0.11, 0.06, 8), '#2a2a30', [sx, 0.1, sz], [0, 0, Math.PI / 2]]);
  P.push([G.oct(0.12), ore, [0.25, 0.5, -0.32]], [G.oct(0.1), ore, [-0.25, 0.48, -0.35]]); return mergeParts(P); };
EXT.ride.minecart = {
  riders: () => [['#8a5a3a', CRY[0]], ['#6a6a72', CRY[1]], ['#7a4a2a', CRY[4]], ['#5a5a62', CRY[2]]].map(([c, o]) => cartGeo(c, o)),
  pole: () => { const L = [[G.cyl(0.6, 0.8, 0.5, 7), ROCK, [0, 0.25, 0]]]; for (const [x, z] of [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]) L.push([G.box(0.12, 2.6, 0.12), WOOD, [x * 0.8, 1.5, z * 0.8], [z * 0.15, 0, -x * 0.15]]);
    L.push([G.torus(0.4, 0.05, 5, 16), IRON, [0, 2.75, 0]], [G.box(0.9, 0.1, 0.9), WOOD_L, [0, 2.6, 0]], [G.oct(1), CRY[1], [0, 0.95, 0], [0, 0, 0], [0.3, 0.6, 0.3]]); return mergeParts(L); },
  disc: () => { const P = [[G.cyl(1.95, 1.95, 0.05, 28), '#3e3650', [0, 0.02, 0]], [G.torus(1.2, 0.03, 4, 40), '#9a9aa2', [0, 0.08, 0], [Math.PI / 2, 0, 0]], [G.torus(1.7, 0.03, 4, 44), '#9a9aa2', [0, 0.08, 0], [Math.PI / 2, 0, 0]]];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; P.push([G.box(0.12, 0.05, 0.7), WOOD, [Math.cos(a) * 1.45, 0.05, Math.sin(a) * 1.45], [0, -a, 0]]); } return mergeParts(P); },
  rod: false,
};
// ---------- crystal fields + glowing pebbles ----------
export function CrystalFields() {
  const { layout } = useWorld(); const m = useCaveGlow(1.0, 2.3, 8); const pm = useCaveGlow(0.9, 2.0, 9);
  const geo = useMemo(() => { const r = seeded(711); const P = [], L = [], Pb = []; const R = layout.R;
    scatter(layout, r, Math.round(R * 1.1), R * 0.45, R + 1.2, 2.2, [], 0.5, (x, z, a, rr) => !camSide(a, rr > R * 0.8 ? 0.6 : 1.2)).forEach(([x, z], i) => { const y = layout.groundY(x, z) - 0.05; const s = 0.7 + r() * 1.1;
      P.push([G.dodec(0.5 * s), i % 2 ? ROCK : ROCK_L, [x, y + 0.1, z], [i, i, 0], [1.2, 0.6, 1.2]]); cluster(L, x, y + 0.1, z, s, CRY[i % 6], r);
      if (i % 3 === 0) P.push([G.cone(0.35 * s, 2.2 * s, 6), ROCK_L, [x + 0.6, y + 1.1 * s, z - 0.4]]); });
    scatter(layout, r, Math.round(R * 1.8), layout.plazaFoot + 1.0, R + 1.0, 1.0, [], 0.2, (x, z, a) => !camSide(a, 0.4)).forEach(([x, z], i) => { const y = layout.groundY(x, z);
      for (let k = 0; k < 3; k++) { const ox = (r() - 0.5) * 0.6, oz = (r() - 0.5) * 0.6; Pb.push([G.oct(0.06 + r() * 0.06), CRY[(i + k) % 6], [x + ox, y + 0.05, z + oz], [r(), r(), 0], [1, 0.6, 1]]); } });
    return { p: mergeParts(P), g: mergeParts(L), b: Pb.length ? mergeParts(Pb) : null }; }, [layout]);
  return <group><mesh geometry={geo.p} material={FLAT} castShadow receiveShadow /><mesh geometry={geo.g} material={m} />{geo.b && <mesh geometry={geo.b} material={pm} />}</group>;
}
// ---------- bioluminescent river ----------
const RIVER_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const RIVER_F = `uniform float uT; uniform float uK; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  void main(){ float e = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 3.0); vec2 q = vec2(vUv.x * 6.0, vUv.y * 1.2 - uT * 0.35);
    float w = 0.5 + 0.5 * sin(vUv.y * 0.9 - uT * 1.6 + sin(vUv.x * 6.0 + uT) * 1.5); vec2 qq = q * vec2(2.0, 6.0); vec2 c = floor(qq); float dd = length(fract(qq) - 0.5); float s = step(0.9, h(c)) * smoothstep(0.35, 0.1, dd) * (0.5 + 0.5 * sin(uT * 3.0 + h(c) * 40.0));
    vec3 col = mix(vec3(0.03, 0.25, 0.32), vec3(0.15, 0.95, 0.85), 0.35 + 0.4 * w) + vec3(0.6, 1.0, 0.95) * s;
    gl_FragColor = vec4(col * uK, 0.92 * e + 0.05); }`;
function riverPath(layout) {
  const W = layout.zones.waiting?.instances?.[0]; const a0 = (W ? W.angle : 1.2) - 0.22; const a1 = a0 - 2.1; const R = layout.shoreR ?? layout.R + 1.6;
  const rMid = (layout.plazaFoot + layout.Ro) / 2; const N = 90; const pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N; const a = a0 + (a1 - a0) * t; const env = Math.sin(t * Math.PI); let r = R + 1.2 - (R + 1.2 - rMid) * Math.pow(env, 0.7) + Math.sin(t * 13) * 0.7 * env; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const obs = [...(layout.keepOut || []).map(([x, z, f]) => [x, z, f + 0.5]), ...layout.homes.map((h) => [h.x, h.z, 2.6])];
  for (let it = 0; it < 4; it++) { for (const p of pts) for (const [x, z, f] of obs) { const dx = p[0] - x, dz = p[1] - z, d = Math.hypot(dx, dz); if (d < f && d > 1e-3) { p[0] = x + (dx / d) * f; p[1] = z + (dz / d) * f; } }
    for (let i = 1; i < pts.length - 1; i++) { pts[i] = [(pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4]; } }
  return pts;
}
const segX = (p, q, a, b) => { const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0]); if (Math.abs(d) < 1e-6) return null; const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d, u = ((a[0] - p[0]) * (q[1] - p[1]) - (a[1] - p[1]) * (q[0] - p[0])) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] : null; };
export function GlowRiver() {
  const { layout, env } = useWorld();
  const data = useMemo(() => { const pts = riverPath(layout); const Wd = 0.62; const pos = [], uv = [], idx = []; let s = 0; const bank = [], br = [], r = seeded(81);
    pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; let tx = q[0] - o[0], tz = q[1] - o[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; const nx = -tz, nz = tx;
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      for (const k of [-1, 1]) { const x = p[0] + nx * Wd * k, z = p[1] + nz * Wd * k; pos.push(x, Math.max(layout.groundY(x, z), -0.32) + 0.05, z); uv.push(k < 0 ? 0 : 1, s); }
      if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      if (i % 3 === 0) for (const k of [-1, 1]) { const x = p[0] + nx * (Wd + 0.15 + r() * 0.2) * k, z = p[1] + nz * (Wd + 0.15 + r() * 0.2) * k; const y = layout.groundY(x, z); if (y > -0.3) (r() < 0.5 ? bank : br).push([G.oct(0.07 + r() * 0.05), CRY[(i + (k > 0 ? 1 : 0)) % 6], [x, y + 0.05, z], [r(), r(), 0]]); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    // plank bridges where paths / the ring road cross the river
    const B = []; const segs = [...(layout.paths || [])]; const ring = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, b = ((i + 1) / 64) * Math.PI * 2; ring.push([[Math.cos(a) * layout.Ro, Math.sin(a) * layout.Ro], [Math.cos(b) * layout.Ro, Math.sin(b) * layout.Ro]]); }
    const hits = []; for (let i = 1; i < pts.length; i++) for (const [a, b] of [...segs, ...ring]) { if (!Array.isArray(a) || a.length < 2) continue; const a2 = [a[0], a[a.length - 1] === undefined ? a[1] : a[a.length - 1]]; void a2; const P0 = [a[0], a.length === 3 ? a[2] : a[1]], P1 = [b[0], b.length === 3 ? b[2] : b[1]]; const X = segX(pts[i - 1], pts[i], P0, P1); if (X && !hits.some((h) => Math.hypot(h[0] - X[0], h[1] - X[1]) < 2)) hits.push([X[0], X[1], Math.atan2(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])]); }
    hits.forEach(([x, z, ang]) => { const y = Math.max(layout.groundY(x, z), -0.3) + 0.12; const c = Math.cos(ang), sn = Math.sin(ang);
      for (let k = -3; k <= 3; k++) B.push([G.box(1.9, 0.07, 0.24), k % 2 ? WOOD : WOOD_L, [x + sn * k * 0.27, y + 0.05 * Math.cos(k * 0.4), z + c * k * 0.27], [0, ang + Math.PI / 2, 0]]);
      for (const sd of [-1, 1]) B.push([G.box(0.07, 0.3, 2.0), WOOD, [x + c * sd * 0.95, y + 0.18, z - sn * sd * 0.95], [0, ang, 0]]); });
    return { g, bank: bank.length ? mergeParts(bank) : null, br: br.length ? mergeParts(br) : null, bridges: B.length ? mergeParts(B) : null }; }, [layout]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uK: { value: 1 } }, vertexShader: RIVER_V, fragmentShader: RIVER_F, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  const m = useCaveGlow(1.0, 2.4, 10);
  useFrame(({ clock }) => { const e = env.current; mat.uniforms.uT.value = clock.elapsedTime; mat.uniforms.uK.value = (1.1 + 1.0 * nightK(env)) * (1 + (e?.pulse ?? 0) * 0.4 * Math.sin(clock.elapsedTime * 1.4)); });
  return (<group><mesh geometry={data.g} material={mat} renderOrder={2} />{data.bank && <mesh geometry={data.bank} material={m} />}{data.br && <mesh geometry={data.br} material={m} />}
    {data.bridges && <mesh geometry={data.bridges} material={MAT.vcFlat} castShadow receiveShadow />}</group>);
}
// ---------- the cavern: rock dome, stalactites, wall crystals, glowworms, light shaft ----------
export function CaveDome() {
  const { layout, env } = useWorld(); const E = layout.extent; const Rd = E * 3.6, Hy = 0.8;
  const geo = useMemo(() => { const r = seeded(901); const g = new THREE.SphereGeometry(Rd, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position; const col = []; const c = new THREE.Color(), n = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { n.fromBufferAttribute(p, i); const el = n.y / Rd; const az = Math.atan2(n.z, n.x); const k = 1 + 0.05 * Math.sin(az * 7 + el * 9) + 0.04 * Math.sin(az * 17 - el * 13) + (r() - 0.5) * 0.04;
      p.setXYZ(i, n.x * k, n.y * k * Hy, n.z * k); const v = 0.6 + 0.4 * r(); c.set(el > 0.6 ? '#2a2438' : el > 0.25 ? '#3a3250' : '#4a405e').multiplyScalar(v); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const skirt = new THREE.CylinderGeometry(Rd * 1.02, Rd * 1.05, 12, 56, 1, true); const sc = []; for (let i = 0; i < skirt.attributes.position.count; i++) sc.push(0.2, 0.17, 0.27); skirt.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3)); skirt.translate(0, -6, 0);
    const P = [], L = [], W = [];
    for (let i = 0; i < dens(110, 0.5); i++) { const az = r() * Math.PI * 2, el = 0.35 + r() * 1.1; const cx = Math.cos(el) * Rd * 0.97, y = Math.sin(el) * Rd * Hy * 0.97; const x = Math.cos(az) * cx, z = Math.sin(az) * cx; const h = (2 + r() * 6) * (E / 20);
      P.push([G.cone(h * 0.18, h, 6), r() < 0.5 ? '#4a4060' : '#3a3250', [x, y - h / 2, z], [Math.PI, 0, 0]]); if (r() < 0.25) L.push([G.oct(1), CRY[i % 6], [x, y - h * 0.9, z], [0, 0, 0], [h * 0.05, h * 0.15, h * 0.05]]); }
    for (let i = 0; i < dens(60, 0.5); i++) { const az = r() * Math.PI * 2; const rr = Rd * (0.86 + r() * 0.1); const x = Math.cos(az) * rr, z = Math.sin(az) * rr; const s = (1.2 + r() * 2.8) * (E / 20); const cc = CRY[i % 6];
      P.push([G.dodec(s * 0.9), '#3a3250', [x, -0.5, z], [i, i, 0], [1.2, 0.7, 1.2]]); cry(L, x, 0, z, s * 2.2, s * 0.35, cc, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4); cry(L, x + s * 0.5, -0.2, z + s * 0.3, s * 1.3, s * 0.22, CRY[(i + 2) % 6], 0.4, 0.2); cry(L, x - s * 0.5, -0.2, z - s * 0.2, s, s * 0.2, cc, -0.3, -0.4); }
    for (let i = 0; i < dens(1600, 0.5); i++) { const az = r() * Math.PI * 2, el = 0.3 + Math.acos(1 - r()) * 0.85; const cx = Math.cos(el) * Rd * 0.95; W.push(Math.cos(az) * cx, Math.sin(el) * Rd * Hy * 0.95, Math.sin(az) * cx); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(W, 3));
    return { dome: g, skirt, p: mergeParts(P), g: mergeParts(L), w: wg }; }, [layout]); // eslint-disable-line
  const dm = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.BackSide }), []);
  const wm = useMemo(() => new THREE.PointsMaterial({ color: new THREE.Color('#7affe8').multiplyScalar(2), size: 0.35 * (E / 20), sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }), [E]);
  const shaft = useMemo(() => new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }), []);
  const m = useCaveGlow(0.9, 2.0, 11);
  useFrame(({ clock }) => { const e = env.current; const day = e?.day ?? 1; wm.opacity = (0.55 + 0.45 * nightK(env)) * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 0.7)) * (1 + (e?.pulse ?? 0) * 0.3 * Math.sin(clock.elapsedTime * 1.4)); shaft.opacity = 0.05 * day * (e?.dim ?? 1); });
  const top = Rd * Hy * 0.92; const shaftH = top + 2;
  return (<group>
    <mesh geometry={geo.dome} material={dm} receiveShadow={false} /><mesh geometry={geo.skirt} material={dm} />
    <mesh geometry={geo.p} material={FLAT} /><mesh geometry={geo.g} material={m} /><points geometry={geo.w} material={wm} frustumCulled={false} />
    <mesh position={[Math.cos(BACK) * E * 0.75, top - shaftH / 2, Math.sin(BACK) * E * 0.75]} rotation={[0.1, 0, -0.08]} material={shaft}><cylinderGeometry args={[E * 0.08, E * 0.32, shaftH, 18, 1, true]} /></mesh>
  </group>);
}
export const CaveMotes = () => (<><Twinkles color="#c8a8ff" count={160} size={2.2} rise={0.12} H={6} opacity={0.75} /><Twinkles color="#7dfcff" count={160} size={2.0} rise={0.08} H={5} opacity={0.75} /></>);

EXT.lab.crystal = CrystalLab; EXT.holo.crystal = '#9ddfff';
EXT.ring.geode = GeodeRing; EXT.holo.geode = '#d8a8ff';
EXT.bar.crystal = crystalBar; EXT.barExtra.crystal = CrystalBarExtra;
EXT.torch.crystal = CrystalLamp;
EXT.dock.raft = RaftDeco; EXT.vessel.raft = Gondola;
EXT.plaza.hearth = HearthPlaza;
EXT.post.stalagmite = StalagPost; EXT.hamCol.stalagmite = ['#7d5aa8', '#3ad8c8', '#5a4a78', '#c08cff'];
EXT.fun['HotTub:spring'] = HotSpring;
