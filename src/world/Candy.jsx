// Candy Land pieces: gingerbread houses with icing + gumdrop roofs, a layer-cake lab with birthday candles, a
// lollipop research ring, an ice-cream parlor, a wafer pier with a rubber-duck boat, a giant cupcake plaza with
// donut benches, candy-cane posts + lamps, a jelly trampoline and hot-cocoa pool, lollipop / cotton-candy trees,
// gumdrops, sprinkles in the air and ice-cream mountains on the horizon.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, Flame, FlickerLight } from './Structures.jsx';
import { Decor, Twinkles } from './Realms.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { BACK, camSide, backPts, sel, useNightGlow, hashStr } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const GB = '#b8733a', GB_D = '#8a5226', ICING = '#fffaf2', PINK = '#ff8fc0', MINT = '#8ff0c8', LEMON = '#ffe36a', GRAPE = '#b88cff', SKY = '#8fd8ff';
const CANDY = ['#ff4f7a', '#ffb13d', '#7ad75a', '#9b6bff', '#4fc3ff', '#ff6fd8'];
const FROST = ['#ff9ec7', '#bfa2ff', '#9fe8ff', '#fff2a8', '#a8f0c0'];
// red/white striped cane (stack of short cylinders)
function cane(P, x, y, z, h, r = 0.07, hook = true, col = '#e8344a') { const n = Math.max(4, Math.round(h / 0.18));
  for (let i = 0; i < n; i++) P.push([G.cyl(r, r, h / n, 8), i % 2 ? ICING : col, [x, y + (i + 0.5) * (h / n), z]]);
  if (hook) for (let i = 0; i < 6; i++) { const a = (i / 5) * Math.PI; P.push([G.sph(r * 1.05, 8, 6), i % 2 ? ICING : col, [x + (1 - Math.cos(a)) * r * 3, y + h + Math.sin(a) * r * 3, z]]); } }

// ---------- gingerbread house ----------
const gbBase = () => cached('gbBase', () => { const f = 0.2; const P = [[G.cyl(2.0, 2.05, 0.2, 18), ICING, [0, 0.1, 0]], [G.box(3.1, 0.04, 2.9), '#f4d6a8', [0, f, 0]]];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; P.push([G.sph(0.14, 8, 6), CANDY[i % 6], [Math.cos(a) * 1.98, 0.22, Math.sin(a) * 1.98]]); }
  const C = []; cane(C, -0.62, f, 1.6, 1.2); cane(C, 0.62, f, 1.6, 1.2); P.push(...C);
  P.push([G.cyl(0.35, 0.35, 0.5, 12), '#f4d6a8', [1.0, f + 0.25, -0.9]], [G.cyl(0.38, 0.38, 0.05, 12), PINK, [1.0, f + 0.52, -0.9]]); // cookie nightstand
  return mergeParts(P); });
const gbShell = (tone) => cached(`gbShell${tone}`, () => { const f = 0.2, H = 1.55; const P = []; const R = FROST[tone];
  P.push([G.box(3.0, H, 0.16), GB, [0, f + H / 2, -1.4]], [G.box(0.16, H, 2.8), GB, [-1.5, f + H / 2, 0]], [G.box(0.16, H, 2.8), GB, [1.5, f + H / 2, 0]]);
  P.push([G.box(1.05, H, 0.16), GB, [-0.98, f + H / 2, 1.4]], [G.box(1.05, H, 0.16), GB, [0.98, f + H / 2, 1.4]], [G.box(0.95, 0.35, 0.16), GB, [0, f + H - 0.17, 1.4]]);
  for (const z of [1.49, -1.49]) for (let i = 0; i < 9; i++) P.push([G.sph(0.08, 6, 5), ICING, [-1.45 + i * 0.36, f + 0.08, z]]);
  const y0 = f + H; [-1, 1].forEach((s) => { P.push([G.box(1.85, 0.16, 3.4), R, [s * 0.78, y0 + 0.62, 0], [0, 0, -s * 0.72]]); for (let k = 0; k < 6; k++) P.push([G.sph(0.11, 6, 5), ICING, [s * (1.5 - 0.02), y0 - 0.05, -1.5 + k * 0.6], [0, 0, 0], [1, 1.6, 1]]); });
  const tri = new THREE.CylinderGeometry(1.0, 1.0, 0.16, 3); tri.rotateX(Math.PI / 2); tri.rotateZ(Math.PI / 2); tri.scale(1.5, 0.9, 1); P.push([tri, GB, [0, y0 + 0.42, 1.4]], [tri.clone(), GB, [0, y0 + 0.42, -1.4]]);
  for (let k = 0; k < 6; k++) P.push([G.dome(0.17, 10, 4), CANDY[k], [0, y0 + 1.25, -1.4 + k * 0.56]]);
  P.push([G.cyl(0.24, 0.24, 0.06, 14), ICING, [0, y0 + 0.5, 1.5], [Math.PI / 2, 0, 0]], [G.cyl(0.2, 0.2, 0.07, 14), '#e8344a', [0, y0 + 0.5, 1.5], [Math.PI / 2, 0, 0]]); // peppermint
  return mergeParts(P); });
const gbWin = () => cached('gbWin', () => mergeParts([[G.box(0.55, 0.5, 0.04), '#ffd27a', [-0.95, 1.1, 1.5]], [G.box(0.55, 0.5, 0.04), '#ffd27a', [0.95, 1.1, 1.5]], [G.box(0.04, 0.5, 0.6), '#ffd27a', [1.59, 1.1, 0]], [G.box(0.04, 0.5, 0.6), '#ffd27a', [-1.59, 1.1, 0]]]));
export function Gingerbread({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % FROST.length;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), []); const win = useNightGlow(0.45, 2.1);
  useCutaway(home, selected, [shell, win], 0.1, 10); const lamp = useLantern(asleep, '#ffd27a'); const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={gbBase()} material={MAT.vc} castShadow receiveShadow />
    <mesh geometry={gbShell(tone)} material={shell} castShadow receiveShadow />
    <mesh geometry={gbWin()} material={win} />
    <mesh position={[0, f + 0.6, 1.49]}><boxGeometry args={[0.75, 1.2, 0.04]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
    <mesh position={[1.0, f + 0.75, -0.9]}><sphereGeometry args={[0.12, 10, 8]} /><meshBasicMaterial ref={lamp} toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, -0.4]} />
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.55]} />
  </group>);
}
// ---------- layer-cake lab ----------
function CakeLab() {
  const geo = cached('labCake', () => { const P = [[G.cyl(3.1, 3.15, 0.18, 32), '#f4d6a8', [0, 0.05, 0]], [G.cyl(3.0, 3.0, 0.1, 32), PINK, [0, 0.17, 0]], [G.cyl(2.95, 2.95, 0.04, 32), ICING, [0, 0.24, 0]]];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; P.push([G.sph(0.11, 6, 5), ICING, [Math.cos(a) * 3.0, 0.2, Math.sin(a) * 3.0], [0, 0, 0], [1, 1.6 + (i % 3) * 0.4, 1]]); }
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = Math.sqrt((i + 0.5) / 40) * 2.7; P.push([G.box(0.12, 0.03, 0.04), CANDY[i % 6], [Math.cos(a) * r, 0.265, Math.sin(a) * r], [0, a, 0]]); }
    backPts(5, 3.0, 2.8).forEach(([x, z], i) => { const C = []; cane(C, x, 0.25, z, 2.4 + (i % 2) * 0.4, 0.09); P.push(...C); });
    return mergeParts(P); });
  return (<group><mesh geometry={geo} material={MAT.vc} castShadow receiveShadow />
    {backPts(4, 2.55, 2.0).map(([x, z], i) => <group key={i} position={[x, 0.25, z]}><mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.07, 0.07, 0.8, 8]} /><meshStandardMaterial color={CANDY[i]} /></mesh><group position={[0, 0.8, 0]}><Flame seed={i} /></group></group>)}
    <FlickerLight position={[Math.cos(BACK) * 2.5, 1.5, Math.sin(BACK) * 2.5]} intensity={4} distance={8} /></group>);
}
// ---------- lollipop ring ----------
function LollipopRing() {
  const geo = cached('ringLolly', () => { const P = [[G.cyl(2.5, 2.65, 0.16, 24), MINT, [0, 0.06, 0]], [G.cyl(2.2, 2.2, 0.02, 24), '#c8fae4', [0, 0.15, 0]]];
    for (let i = 0; i < 7; i++) { const a = BACK + (i - 3) * 0.45; const x = Math.cos(a) * 2.5, z = Math.sin(a) * 2.5; const h = 1.5 + (i % 3) * 0.5;
      P.push([G.cyl(0.05, 0.05, h, 6), ICING, [x, h / 2, z]]); for (let k = 0; k < 4; k++) P.push([G.torus(0.45 - k * 0.1, 0.06, 5, 18), k % 2 ? ICING : CANDY[i % 6], [x, h + 0.45, z], [0, -a + Math.PI / 2, 0]]); P.push([G.cyl(0.12, 0.12, 0.1, 10), CANDY[i % 6], [x, h + 0.45, z], [0, 0, Math.PI / 2], [1, 1, 1]]); }
    return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vcGloss} castShadow receiveShadow />;
}
// ---------- ice cream parlor ----------
function parlorBar() { const P = [], SP = [];
  P.push([G.box(5.8, 0.08, 3.6), '#fff0f6', [0, 0.04, 0.15]]); for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) P.push([G.box(0.96, 0.01, 0.88), (i + k) % 2 ? PINK : ICING, [-2.4 + i * 0.96, 0.085, -1.2 + k * 0.88]]);
  P.push([G.box(4.6, 0.95, 0.6), ICING, [0, 0.5, 0]], [G.box(4.9, 0.1, 0.85), PINK, [0, 1.02, 0.05]]); for (let i = 0; i < 6; i++) P.push([G.box(0.65, 0.06, 0.45), [PINK, '#7a4a2a', LEMON, MINT, GRAPE, '#fff6e0'][i], [-1.9 + i * 0.76, 1.08, -0.05]]);
  P.push([G.box(5.2, 2.6, 0.18), '#ffd6e8', [0, 1.35, -1.45]]); for (let i = 0; i < 9; i++) P.push([G.box(0.16, 2.6, 0.02), i % 2 ? '#ffb8d6' : '#ffd6e8', [-2.4 + i * 0.6, 1.35, -1.35]]);
  [[-2.55, -1.4], [2.55, -1.4], [-2.55, 1.4], [2.55, 1.4]].forEach(([x, z]) => { const C = []; cane(C, x, 0, z, 2.75, 0.08, false); P.push(...C); });
  for (let i = 0; i < 10; i++) P.push([G.box(0.56, 0.06, 3.2), i % 2 ? ICING : PINK, [-2.52 + i * 0.56, 2.95, -0.05], [0.18, 0, 0]]);
  for (let i = 0; i < 10; i++) P.push([G.sph(0.14, 8, 6), i % 2 ? ICING : PINK, [-2.52 + i * 0.56, 2.66, 1.6]]);
  P.push([G.cone(0.5, 1.4, 12), '#e0a85a', [0, 3.65, -1.3], [Math.PI, 0, 0]], [G.sph(0.55, 14, 10), PINK, [0, 4.5, -1.3]], [G.sph(0.45, 14, 10), MINT, [0, 5.0, -1.3]], [G.sph(0.14, 10, 8), '#e8344a', [0, 5.48, -1.3]]); // giant cone
  SP.push([G.cyl(0.04, 0.04, 0.5, 6), '#d8d8e0', [0, 0.25, 1.05]], [G.cyl(0.29, 0.29, 0.1, 14), PINK, [0, 0.53, 1.05]], [G.torus(0.27, 0.03, 4, 14), ICING, [0, 0.58, 1.05], [Math.PI / 2, 0, 0]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function ParlorExtra({ X, primary }) {
  const tables = cached('parlorTables', () => mergeParts([[G.cyl(0.04, 0.04, 0.7, 5), '#d8d8e0', [0, 0.35, 0]], [G.cyl(0.38, 0.38, 0.05, 14), ICING, [0, 0.72, 0]], [G.cone(0.08, 0.2, 8), '#e0a85a', [0.1, 0.85, 0], [Math.PI, 0, 0]], [G.sph(0.09, 8, 6), MINT, [0.1, 0.98, 0]]]));
  return (<>{[-1, 1].map((s) => <group key={s} position={[X(s * 3.5), 0, 0.4]}><mesh geometry={tables} material={MAT.vc} castShadow /></group>)}</>);
}
ParlorExtra.signY = 3.4;
// ---------- candy-cane lamp (theme torch) ----------
function CaneLamp({ position, light, h = 1.7, seed = 0 }) {
  const m = useNightGlow(0.8, 2.6); const geo = cached(`canelamp${h}`, () => { const P = []; cane(P, 0, 0, 0, h, 0.05); return mergeParts(P); });
  const drop = cached('caneDrop', () => mergeParts([[G.dome(0.13, 10, 4), '#ff6fd8', [0, 0, 0], [0, 0, 0], [1, 1.2, 1]]]));
  return (<group position={position}><mesh geometry={geo} material={MAT.vc} castShadow /><mesh geometry={drop} material={m} position={[0.3, h - 0.05, 0]} />
    {light && <FlickerLight position={[0.3, h, 0]} intensity={3} distance={7} seed={seed} color="#ff9ed8" min={0.2} />}</group>);
}
// ---------- wafer pier decor + rubber duck ----------
function WaferDeco({ from, to }) {
  const geo = cached(`wafer_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = []; for (let s = from + 0.9; s < to - 0.6; s += 1.2) [-0.72, 0.72].forEach((x) => cane(P, x, 0, s, 0.7, 0.045, false));
    [-0.72, 0.72].forEach((x) => P.push([G.cyl(0.04, 0.04, to - from - 1.4, 6), PINK, [x, 0.72, (from + to) / 2 - 0.1], [Math.PI / 2, 0, 0]]));
    for (let i = 0; i < 6; i++) P.push([G.sph(0.18, 8, 6), CANDY[i], [-2.2 + i * 0.88, 0.12, to + 0.8]]); return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vc} castShadow />;
}
function DuckBoat({ mid }) {
  const ref = useRef(); useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime; ref.current.position.y = -0.1 + Math.sin(t * 1.3) * 0.06; ref.current.rotation.z = Math.sin(t) * 0.05; ref.current.rotation.x = Math.sin(t * 0.7) * 0.03; });
  const geo = cached('duck', () => mergeParts([[G.sph(1.0, 16, 12), '#ffd23f', [0, 0.2, 0], [0, 0, 0], [1, 0.6, 1.5]], [G.sph(0.55, 14, 10), '#ffd23f', [0, 1.1, 0.9]], [G.cone(0.2, 0.45, 8), '#ff8a2a', [0, 1.05, 1.45], [Math.PI / 2, 0, 0], [1.3, 1, 0.6]],
    [G.sph(0.07, 6, 5), '#1b1f26', [0.25, 1.25, 1.35]], [G.sph(0.07, 6, 5), '#1b1f26', [-0.25, 1.25, 1.35]], [G.cone(0.3, 0.5, 6), '#ffd23f', [0, 0.7, -1.4], [-0.9, 0, 0]]]));
  return <group ref={ref} position={[-2.2, 0, mid - 0.4]}><mesh geometry={geo} material={MAT.vcGloss} castShadow /></group>;
}
// ---------- cupcake plaza ----------
function CupcakePlaza({ gs }) {
  const geo = cached('plazaCupcake', () => { const P = [[G.cyl(0.95, 0.75, 0.9, 16), '#ff9ec7', [0, 0.45, 0]]]; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P.push([G.box(0.06, 0.9, 0.08), '#ff7ab0', [Math.cos(a) * 0.86, 0.45, Math.sin(a) * 0.86], [0, -a, 0.2 * Math.cos(a) * 0]]); }
    for (let k = 0; k < 4; k++) P.push([G.torus(0.85 - k * 0.2, 0.22 - k * 0.03, 8, 20), ICING, [0, 0.95 + k * 0.2, 0], [Math.PI / 2, 0, 0]]); P.push([G.sph(0.22, 12, 10), '#e8344a', [0, 1.95, 0]]);
    for (let i = 0; i < 24; i++) { const a = i * 2.4, r = 0.3 + (i % 5) * 0.12; P.push([G.box(0.1, 0.03, 0.03), CANDY[i % 6], [Math.cos(a) * r, 1.05 + (1 - r) * 0.7, Math.sin(a) * r], [0, a, 0.5]]); }
    P.push([G.cyl(0.05, 0.05, 0.5, 8), LEMON, [0.25, 2.1, 0.1]]); return mergeParts(P); });
  const donuts = cached('plazaDonuts', () => { const P = []; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; const x = Math.cos(a) * 1.8, z = Math.sin(a) * 1.8;
    P.push([G.torus(0.42, 0.2, 8, 16), '#d8a05a', [x, 0.22, z], [Math.PI / 2, 0, 0]], [G.torus(0.42, 0.17, 8, 16), FROST[i], [x, 0.3, z], [Math.PI / 2, 0, 0], [1, 1, 0.8]]); } return mergeParts(P); });
  return (<group><group ref={gs}><mesh geometry={donuts} material={MAT.vc} castShadow receiveShadow /></group><mesh geometry={geo} material={MAT.vc} castShadow receiveShadow />
    <group position={[0.25, 2.35, 0.1]}><Flame scale={1.4} always /></group><FlickerLight position={[0, 2.6, 0]} intensity={8} distance={12} min={0.15} /></group>);
}
// ---------- candy cane hammock posts ----------
function CanePost({ x, y, z }) { const geo = cached('canePost', () => { const P = []; cane(P, 0, 0, 0, 2.4, 0.09); return mergeParts(P); }); return <mesh geometry={geo} material={MAT.vc} position={[x, y, z]} castShadow />; }
// ---------- jelly trampoline + hot cocoa pool (grow) ----------
function JellyTrampoline({ inst, occupied, count }) {
  const [g] = useSize('Trampoline', inst, count); const j = useRef(); const on = busy(inst, occupied) || (count || 0) > 0;
  useFrame(({ clock }) => { if (j.current) { const t = clock.elapsedTime; const w = on ? 0.06 : 0.015; j.current.scale.set(1 + Math.sin(t * 7) * w, 1 - Math.sin(t * 7) * w * 1.5, 1 + Math.cos(t * 7) * w); } });
  const plate = useMemo(() => mergeParts([[G.cyl(1.55, 1.6, 0.06, 24), ICING, [0, 0.03, 0]], ...Array.from({ length: 12 }, (_, i) => [G.sph(0.12, 6, 5), CANDY[i % 6], [Math.cos(i * 0.52) * 1.5, 0.08, Math.sin(i * 0.52) * 1.5]])]), []);
  return (<Place inst={inst} g={g}><mesh geometry={plate} material={MAT.vc} receiveShadow />
    <group ref={j}><mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[1.3, 1.4, 0.5, 24]} /><meshPhysicalMaterial color="#5fe08a" transparent opacity={0.75} roughness={0.15} transmission={0} clearcoat={1} /></mesh>
      <mesh position={[0, 0.51, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#e8344a" roughness={0.2} /></mesh></group></Place>);
}
function CocoaPool({ inst, occupied, count }) {
  const [g] = useSize('HotTub', inst, count); const on = busy(inst, occupied); const mm = useRef();
  const geo = useMemo(() => mergeParts([[G.cyl(1.3, 1.22, 0.62, 24, true), ICING, [0, 0.31, 0]], [G.cyl(1.18, 1.12, 0.62, 24, true), ICING, [0, 0.31, 0]], [G.torus(1.25, 0.08, 6, 28), '#e8344a', [0, 0.62, 0], [Math.PI / 2, 0, 0]], [G.cyl(1.2, 1.2, 0.06, 24), ICING, [0, 0.03, 0]], [G.box(0.9, 0.22, 0.45), PINK, [0, 0.11, 1.55]],
    ...Array.from({ length: 8 }, (_, i) => [G.sph(0.09, 6, 5), CANDY[i % 6], [Math.cos(i * 0.785) * 1.26, 0.7, Math.sin(i * 0.785) * 1.26]])]), []);
  useFrame(({ clock }) => { if (mm.current) mm.current.children.forEach((c, i) => { c.position.y = 0.48 + Math.sin(clock.elapsedTime * 1.4 + i) * 0.02; c.rotation.y = clock.elapsedTime * 0.2 + i; }); });
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vc} castShadow receiveShadow />
    <mesh position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.17, 28]} /><meshStandardMaterial color="#6a3a1e" roughness={0.3} /></mesh>
    <group ref={mm}>{[[0.4, 0.3], [-0.5, 0.2], [0.1, -0.55], [-0.2, 0.6], [0.65, -0.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.48, z]}><boxGeometry args={[0.2, 0.16, 0.2]} /><meshStandardMaterial color="#fffaf2" roughness={0.9} /></mesh>)}</group>
    <Rising n={on ? 16 : 9} r={0.9} h={1.5} y0={0.47} color="#fff6ee" size={0.24} speed={0.28} opacity={0.3} /></Place>);
}
// ---------- garden ----------
export function CandyGarden() {
  return (<>
    <Decor seed={511} n={(L) => L.R * 1.0} band={(L) => [L.R * 0.45, L.R + 1.2]} minD={2.3} margin={0.4} accept={(x, z, a, rr, L) => !camSide(a, rr > L.R * 0.8 ? 0.55 : 1.15)} material={MAT.vcGloss}
      build={(P, x, y, z, r) => { const h = 1.4 + r() * 1.4; P.push([G.cyl(0.06, 0.06, h, 6), ICING, [x, y + h / 2, z]]); const c = CANDY[Math.floor(r() * 6)]; const R = 0.45 + r() * 0.35; const ry = r() * 3;
        if (r() < 0.5) { for (let k = 0; k < 4; k++) P.push([G.torus(R - k * R * 0.24, R * 0.13, 5, 18), k % 2 ? ICING : c, [x, y + h + R, z], [0, ry, 0]]); P.push([G.cyl(R * 0.2, R * 0.2, 0.12, 10), c, [x, y + h + R, z], [0, ry, Math.PI / 2]]); }
        else P.push([G.sph(R * 1.4, 12, 10), FROST[Math.floor(r() * 5)], [x, y + h + R, z], [0, 0, 0], [1, 0.9, 1]], [G.sph(R, 10, 8), FROST[Math.floor(r() * 5)], [x + R * 0.7, y + h + R * 1.4, z]]); }} />
    <Decor seed={515} n={(L) => L.R * 1.4} band={(L) => [L.plazaFoot + 1.0, L.R + 1.4]} minD={1.3} margin={0.2} accept={(x, z, a) => !camSide(a, 0.5)} material={MAT.vcGloss}
      build={(P, x, y, z, r) => { const k = r(); if (k < 0.6) { const s = 0.25 + r() * 0.3; P.push([G.dome(s, 10, 5), CANDY[Math.floor(r() * 6)], [x, y, z], [0, 0, 0], [1, 1.15, 1]]); }
        else if (k < 0.85) cane(P, x, y, z, 0.9 + r() * 0.8, 0.06); else P.push([G.cyl(0.35, 0.35, 0.08, 14), ICING, [x, y + 0.2, z], [Math.PI / 2 - 0.3, r() * 6, 0, 'YXZ']], [G.cyl(0.3, 0.3, 0.09, 14), '#e8344a', [x, y + 0.2, z], [Math.PI / 2 - 0.3, r() * 6, 0, 'YXZ']]); }} />
  </>);
}
export const Sprinkles = () => (<><Twinkles color="#ff6fd8" count={140} size={2.6} rise={-0.25} H={8} opacity={0.9} additive={false} /><Twinkles color="#6fd8ff" count={140} size={2.6} rise={-0.2} H={8} opacity={0.9} additive={false} /><Twinkles color="#ffe36a" count={120} size={2.6} rise={-0.3} H={8} opacity={0.9} additive={false} /></>);
export function IceCreamHills() {
  const { layout } = useWorld();
  const geo = useMemo(() => { if (layout.surround === 'land') return null; const r = seeded(521); const P = []; const E = layout.extent;
    for (let i = 0; i < dens(18, 0.6); i++) { const a = BACK + (r() - 0.5) * 3.6; const rr = E * (4.4 + r() * 1.8); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const w = 4 + r() * 6;
      P.push([G.sph(w, 16, 10), FROST[Math.floor(r() * 5)], [x, -w * 0.35, z], [0, 0, 0], [1, 0.75, 1]], [G.sph(w * 0.6, 14, 8), FROST[Math.floor(r() * 5)], [x, w * 0.35, z]], [G.sph(w * 0.12, 8, 6), '#e8344a', [x, w * 0.95, z]]); }
    return mergeParts(P); }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vc} /> : null;
}

EXT.lab.cake = CakeLab; EXT.holo.cake = '#ff7ad9';
EXT.ring.lollipop = LollipopRing; EXT.holo.lollipop = '#ff9ae0';
EXT.bar.parlor = parlorBar; EXT.barExtra.parlor = ParlorExtra;
EXT.torch.candycane = CaneLamp;
EXT.dock.wafer = WaferDeco; EXT.vessel.wafer = DuckBoat;
EXT.plaza.cupcake = CupcakePlaza;
EXT.post.candycane = CanePost; EXT.hamCol.candycane = [PINK, ICING, MINT, ICING];
EXT.fun['Trampoline:jelly'] = JellyTrampoline; EXT.fun['HotTub:cocoa'] = CocoaPool;
