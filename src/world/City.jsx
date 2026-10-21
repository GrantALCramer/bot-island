// City (modern metro) pieces: brick + glass townhouses with lit windows and rooftop gear, a glass office lab, a
// server-room research ring, a corner café, a harbor pier with a water taxi, a fountain plaza, rooftop pool,
// basketball court, mid-rise blocks with rooftops (water towers, AC units, antennas, gardens), street props
// (lamps, planter trees, benches, hydrants, parked cars) and a skyline across the harbor that lights up at night.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern } from './Structures.jsx';
import { Decor } from './Realms.jsx';
import { scatter } from './Vegetation.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { BACK, camSide, backPts, sel, useNightGlow, hashStr, Blink, nightK } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const BRICK = ['#9a4a3a', '#8a5a48', '#b0694e', '#6f6a66', '#c9b8a0', '#5a6470'];
const CONC = '#b9b6ae', CONC_D = '#8f8c86', STEEL = '#4a4f58', GLASS = '#9fc4d8', WIN = '#ffd89a';
const CARS = ['#e74c3c', '#2e86de', '#f1c40f', '#ecf0f1', '#2d3436', '#16a085', '#8e44ad'];

// ---------- townhouse ----------
const thBase = () => cached('thBase', () => { const f = 0.2; const P = [[G.box(3.5, 0.2, 3.3), CONC, [0, 0.1, 0]], [G.box(3.2, 0.04, 3.0), '#a87d55', [0, f - 0.0, 0]]];
  for (let i = 0; i < 3; i++) P.push([G.box(1.0, 0.1 + i * 0.07, 0.3), CONC_D, [0, 0.05 + i * 0.035, 2.05 - i * 0.3]]);
  P.push([G.box(0.9, 0.05, 0.55), STEEL, [1.05, f + 0.62, 0.9]], [G.box(0.05, 0.6, 0.05), STEEL, [1.05, f + 0.3, 0.9]], [G.box(0.5, 0.32, 0.04), '#1b1f26', [1.05, f + 0.85, 0.75]]); // desk + monitor
  return mergeParts(P); });
const thShell = (tone) => cached(`thShell${tone}`, () => { const f = 0.2, H = 1.8; const P = []; const W = BRICK[tone];
  P.push([G.box(3.3, H, 0.14), W, [0, f + H / 2, -1.5]], [G.box(0.14, H, 3.0), W, [-1.6, f + H / 2, 0]], [G.box(0.14, H, 3.0), W, [1.6, f + H / 2, 0]]);
  P.push([G.box(1.1, H, 0.14), W, [-1.1, f + H / 2, 1.5]], [G.box(1.1, H, 0.14), W, [1.1, f + H / 2, 1.5]], [G.box(1.1, 0.5, 0.14), W, [0, f + H - 0.25, 1.5]]);
  const y2 = f + H; P.push([G.box(3.4, 0.16, 3.2), CONC, [0, y2 + 0.08, 0]], [G.box(3.3, 1.4, 3.1), W, [0, y2 + 0.86, 0]], [G.box(3.5, 0.14, 3.3), CONC, [0, y2 + 1.63, 0]]);
  [[0, 1.66], [0, -1.66]].forEach(([x, z]) => P.push([G.box(3.5, 0.3, 0.1), CONC_D, [x, y2 + 1.85, z]])); [[-1.71, 0], [1.71, 0]].forEach(([x, z]) => P.push([G.box(0.1, 0.3, 3.3), CONC_D, [x, y2 + 1.85, z]]));
  P.push([G.box(0.9, 0.55, 0.7), '#c9ccd2', [-0.8, y2 + 1.98, -0.6]], [G.box(0.7, 0.05, 0.5), '#8f959e', [-0.8, y2 + 2.27, -0.6]]); // AC unit
  P.push([G.cyl(0.38, 0.38, 0.75, 10), '#8a6a48', [0.85, y2 + 2.4, -0.7]], [G.cone(0.42, 0.3, 10), '#5a4632', [0.85, y2 + 2.92, -0.7]]); [0, 1, 2, 3].forEach((i) => P.push([G.cyl(0.03, 0.03, 0.5, 4), STEEL, [0.85 + Math.cos(i * 1.57 + 0.78) * 0.3, y2 + 1.95, -0.7 + Math.sin(i * 1.57 + 0.78) * 0.3]])); // water tank
  for (let i = 0; i < 3; i++) P.push([G.box(0.75, 0.08, 0.12), CONC, [-1.05 + i * 1.05, y2 + 0.45, 1.6]]); // sills
  return mergeParts(P); });
const thWin = () => cached('thWin', () => { const f = 0.2, H = 1.8, y2 = f + H; const P = [[G.box(0.85, 0.9, 0.04), WIN, [-1.1, f + 1.0, 1.58]], [G.box(0.04, 0.7, 0.9), WIN, [-1.68, f + 1.1, 0.2]], [G.box(0.04, 0.7, 0.9), WIN, [1.68, f + 1.1, -0.3]]];
  for (let i = 0; i < 3; i++) P.push([G.box(0.65, 0.75, 0.04), WIN, [-1.05 + i * 1.05, y2 + 0.88, 1.57]], [G.box(0.65, 0.75, 0.04), WIN, [-1.05 + i * 1.05, y2 + 0.88, -1.57]]);
  [-0.7, 0.7].forEach((z) => P.push([G.box(0.04, 0.75, 0.65), WIN, [1.67, y2 + 0.88, z]], [G.box(0.04, 0.75, 0.65), WIN, [-1.67, y2 + 0.88, z]]));
  return mergeParts(P); });
export function Townhouse({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % BRICK.length;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []); const win = useNightGlow(0.55, 2.2); const awn = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), [color]);
  useCutaway(home, selected, [shell, win, awn], 0.1, 10); const lamp = useLantern(asleep, '#ffd89a'); const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={thBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={thShell(tone)} material={shell} castShadow receiveShadow />
    <mesh geometry={thWin()} material={win} />
    <mesh position={[0, f + 1.35, 1.95]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[1.2, 0.05, 0.75]} /><primitive object={awn} attach="material" /></mesh>
    <mesh position={[0, f + 0.02, 0.6]}><boxGeometry args={[1.6, 0.01, 1.0]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
    <mesh position={[1.05, f + 0.85, 0.77]}><planeGeometry args={[0.44, 0.26]} /><meshBasicMaterial ref={lamp} color="#9fd8ff" toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, -0.5]} />
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.55]} />
  </group>);
}

// ---------- office lab: concrete plinth, glass curtain wall at the back, steel frame, rooftop sign ----------
function OfficeLab({ hc }) {
  const geo = cached('labOffice', () => { const P = [[G.cyl(3.15, 3.25, 0.3, 8), CONC, [0, 0.08, 0], [0, Math.PI / 8, 0]], [G.cyl(2.95, 2.95, 0.03, 8), '#d9d6ce', [0, 0.245, 0], [0, Math.PI / 8, 0]]];
    const back = backPts(5, 3.0, 2.8); back.forEach(([x, z]) => P.push([G.box(0.16, 3.0, 0.16), STEEL, [x, 1.7, z]]));
    for (let i = 0; i < back.length - 1; i++) { const [x1, z1] = back[i], [x2, z2] = back[i + 1]; const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(z2 - z1, x2 - x1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      P.push([G.box(L, 0.12, 0.2), STEEL, [cx, 3.2, cz], [0, -a, 0]], [G.box(L, 0.08, 0.14), STEEL, [cx, 1.2, cz], [0, -a, 0]], [G.box(L + 0.5, 0.14, 1.4), '#d9d6ce', [cx * 0.86, 3.3, cz * 0.86], [0, -a, 0]]); }
    P.push([G.box(1.4, 0.5, 0.6), '#c9ccd2', [Math.cos(BACK) * 2.2, 0.5, Math.sin(BACK) * 2.2], [0, -BACK + Math.PI / 2, 0]]); // printer / credenza
    for (let i = 0; i < 3; i++) { const a = BACK + (i - 1) * 1.2; P.push([G.box(0.5, 0.5, 0.5), '#e9ecef', [Math.cos(a) * 3.35, 0.45, Math.sin(a) * 3.35]], [G.ico(0.42, 0), '#3f8a4a', [Math.cos(a) * 3.35, 0.95, Math.sin(a) * 3.35]]); } // planters
    return mergeParts(P); });
  const glass = cached('labOfficeGlass', () => { const back = backPts(5, 3.0, 2.8); const P = [];
    for (let i = 0; i < back.length - 1; i++) { const [x1, z1] = back[i], [x2, z2] = back[i + 1]; const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(z2 - z1, x2 - x1); P.push([G.box(L - 0.12, 2.9, 0.04), GLASS, [(x1 + x2) / 2, 1.7, (z1 + z2) / 2], [0, -a, 0]]); }
    return mergeParts(P); });
  const glassMat = cached('glassMat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.35, depthWrite: false }));
  const sign = useNightGlow(1.2, 2.6);
  const sg = cached('labOfficeSign', () => mergeParts([[G.box(2.2, 0.36, 0.06), hc, [Math.cos(BACK) * 2.6, 3.62, Math.sin(BACK) * 2.6], [0, -BACK - Math.PI / 2, 0]]]));
  return (<group><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={glass} material={glassMat} renderOrder={2} /><mesh geometry={sg} material={sign} /></group>);
}
// ---------- server room research ring: racks with blinking LEDs, cable tray ----------
function ServerRing({ hc }) {
  const geo = cached('ringServer', () => { const P = [[G.cyl(2.5, 2.65, 0.16, 24), '#3a3f48', [0, 0.06, 0]], [G.cyl(2.2, 2.2, 0.02, 24), '#4a505a', [0, 0.15, 0]]];
    for (let i = 0; i < 5; i++) { const a = BACK + (i - 2) * 0.5; const x = Math.cos(a) * 2.55, z = Math.sin(a) * 2.55; P.push([G.box(0.75, 2.0, 0.6), '#1d2128', [x, 1.0, z], [0, -a + Math.PI / 2, 0]], [G.box(0.68, 1.85, 0.02), '#2a3038', [x - Math.cos(a) * 0.31, 1.0, z - Math.sin(a) * 0.31], [0, -a + Math.PI / 2, 0]]); }
    const a0 = BACK - 1.0, a1 = BACK + 1.0; for (let k = 0; k < 10; k++) { const a = a0 + (k / 9) * (a1 - a0); P.push([G.box(0.55, 0.05, 0.25), '#8f959e', [Math.cos(a) * 2.55, 2.12, Math.sin(a) * 2.55], [0, -a + Math.PI / 2, 0]]); }
    return mergeParts(P); });
  const leds = cached('ringServerLeds', () => { const P = []; for (let i = 0; i < 5; i++) { const a = BACK + (i - 2) * 0.5; for (let k = 0; k < 7; k++) { const r = 2.23; P.push([G.box(0.4, 0.03, 0.02), k % 3 ? '#4cff9a' : hc, [Math.cos(a) * r, 0.3 + k * 0.24, Math.sin(a) * r], [0, -a + Math.PI / 2, 0]]); } } return mergeParts(P); });
  const m = useNightGlow(1.6, 2.8, { flicker: 0.35 });
  return <group><mesh geometry={geo} material={MAT.vcGloss} castShadow receiveShadow /><mesh geometry={leds} material={m} /></group>;
}
// ---------- corner café ----------
function cafeBar() { const P = [], SP = [];
  P.push([G.box(5.8, 0.08, 3.6), '#c9c3b5', [0, 0.04, 0.15]], [G.box(4.6, 0.95, 0.6), '#6b4a30', [0, 0.5, 0]], [G.box(4.9, 0.08, 0.85), '#f2efe9', [0, 1.0, 0.05]]);
  P.push([G.box(5.2, 2.7, 0.18), '#3d4450', [0, 1.38, -1.45]], [G.box(2.2, 0.9, 0.05), '#1b1f26', [-1.2, 2.05, -1.34]], [G.box(1.6, 0.06, 0.3), '#8a6a48', [1.4, 1.5, -1.3]], [G.box(1.6, 0.06, 0.3), '#8a6a48', [1.4, 2.0, -1.3]]);
  for (let i = 0; i < 6; i++) P.push([G.cyl(0.06, 0.05, 0.12, 8), ['#ffffff', '#e74c3c', '#ffffff', '#2e86de', '#ffffff', '#f1c40f'][i], [0.9 + (i % 3) * 0.45, 1.6 + Math.floor(i / 3) * 0.5, -1.3]]);
  P.push([G.box(0.7, 0.55, 0.45), '#c9ccd2', [1.6, 1.32, -0.05]], [G.box(0.5, 0.06, 0.2), '#8f959e', [1.6, 1.12, 0.2]]); // espresso machine
  [[-2.55, -1.4], [2.55, -1.4], [-2.55, 1.4], [2.55, 1.4]].forEach(([x, z]) => P.push([G.box(0.12, 2.75, 0.12), STEEL, [x, 1.4, z]]));
  for (let i = 0; i < 10; i++) P.push([G.box(0.56, 0.06, 3.2), i % 2 ? '#ffffff' : '#2f8a5a', [-2.52 + i * 0.56, 2.95, -0.05], [0.18, 0, 0]]); // striped awning
  for (let i = 0; i < 10; i++) P.push([G.cone(0.2, 0.25, 3), i % 2 ? '#ffffff' : '#2f8a5a', [-2.52 + i * 0.56, 2.58, 1.6], [Math.PI, 0, 0]]);
  for (let i = 0; i < 4; i++) P.push([G.cyl(0.08, 0.06, 0.1, 8), '#ffffff', [-1.6 + i * 0.7, 1.09, 0.2]]);
  SP.push([G.cyl(0.03, 0.03, 0.5, 5), STEEL, [0, 0.25, 1.05]], [G.cyl(0.24, 0.2, 0.04, 5), STEEL, [0, 0.02, 1.05]], [G.cyl(0.27, 0.27, 0.07, 14), '#2f8a5a', [0, 0.52, 1.05]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function CafeExtra({ X, primary }) {
  const board = cached('cafeBoard', () => mergeParts([[G.box(0.6, 0.85, 0.04), '#1b1f26', [0, 0.45, 0], [-0.2, 0, 0]], [G.box(0.6, 0.85, 0.04), '#1b1f26', [0, 0.45, -0.3], [0.2, 0, 0]], [G.box(0.5, 0.04, 0.02), '#f2efe9', [0, 0.6, 0.04], [-0.2, 0, 0]], [G.box(0.36, 0.04, 0.02), '#f1c40f', [0, 0.45, 0.06], [-0.2, 0, 0]]]));
  const tables = cached('cafeTables', () => mergeParts([-1, 1].flatMap((s) => [[G.cyl(0.04, 0.04, 0.7, 5), STEEL, [0, 0.35, 0]], [G.cyl(0.38, 0.38, 0.04, 14), '#f2efe9', [0, 0.72, 0]], [G.cyl(0.03, 0.03, 1.6, 5), '#ddd', [0, 1.4, 0]], [G.cone(0.9, 0.4, 8), s > 0 ? '#e74c3c' : '#2e86de', [0, 2.15, 0]]]).slice(0, 4)));
  const menu = useNightGlow(0.9, 2.2);
  const mg = cached('cafeMenu', () => mergeParts([[G.box(2.0, 0.08, 0.02), '#f2efe9', [-1.2, 2.3, -1.3]], [G.box(1.4, 0.06, 0.02), '#f1c40f', [-1.3, 2.1, -1.3]], [G.box(1.7, 0.06, 0.02), '#f2efe9', [-1.15, 1.9, -1.3]]]));
  return (<><group position={[X(-3.4), 0, 1.6]}><mesh geometry={board} material={MAT.vcFlat} castShadow /></group>
    {[-1, 1].map((s) => <group key={s} position={[X(s * 3.6), 0, 0.2]}><mesh geometry={tables} material={MAT.vcFlat} castShadow /></group>)}
    <mesh geometry={mg} material={menu} />
    <SteamPuff position={[1.6, 1.62, -0.05]} /></>);
}
CafeExtra.signY = 3.5;
function SteamPuff({ position }) { return <group position={position}><Rising n={6} r={0.08} h={0.8} color="#ffffff" size={0.09} speed={0.4} opacity={0.4} drift={0.1} /></group>; }
// ---------- street lamp (theme torch) ----------
function StreetLamp({ position, light, h = 1.7 }) {
  const H = Math.max(2.2, h + 0.5); const m = useNightGlow(0.6, 3.0);
  const geo = cached(`lamp${H}`, () => mergeParts([[G.cyl(0.05, 0.07, H, 6), '#2a2f36', [0, H / 2, 0]], [G.cyl(0.12, 0.14, 0.12, 8), '#2a2f36', [0, 0.06, 0]], [G.box(0.5, 0.05, 0.05), '#2a2f36', [0.22, H, 0]], [G.cyl(0.12, 0.16, 0.1, 8), '#2a2f36', [0.45, H - 0.02, 0]]]));
  const bulb = cached('lampBulb', () => mergeParts([[G.sph(0.09, 8, 6), '#ffe2a8', [0, 0, 0]]]));
  return (<group position={position}><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={bulb} material={m} position={[0.45, H - 0.1, 0]} />
    {light && <LampLight position={[0.45, H - 0.3, 0]} />}</group>);
}
function LampLight({ position, color = '#ffd89a', intensity = 4, distance = 8 }) { const { env } = useWorld(); const l = useRef();
  useFrame(() => { if (l.current) l.current.intensity = intensity * nightK(env); }); return <pointLight ref={l} position={position} color={color} distance={distance} decay={1.6} intensity={0} />; }
// ---------- harbor pier decor + water taxi ----------
function HarborDeco({ from, to }) {
  const geo = cached(`harbor_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = [];
    for (let s = from + 1.0; s < to - 0.8; s += 1.4) [-0.7, 0.7].forEach((x) => P.push([G.cyl(0.03, 0.03, 0.8, 5), '#c9ccd2', [x, 0.4, s]]));
    [-0.7, 0.7].forEach((x) => P.push([G.box(0.04, 0.04, to - from - 1.6), '#c9ccd2', [x, 0.8, (from + to) / 2 - 0.3]]));
    [[-2.3, to + 0.7], [2.3, to - 0.9], [-2.3, to - 0.9]].forEach(([x, z]) => P.push([G.cyl(0.13, 0.15, 0.35, 8), '#2a2f36', [x, 0.2, z]], [G.cyl(0.17, 0.17, 0.06, 8), '#2a2f36', [x, 0.38, z]]));
    P.push([G.torus(0.22, 0.06, 6, 14), '#ff6a2a', [0.78, 0.55, from + 2.0], [0, Math.PI / 2, 0]]);
    return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vcFlat} castShadow />;
}
function WaterTaxi({ mid }) {
  const { env } = useWorld(); const ref = useRef(); const win = useNightGlow(0.5, 2.2);
  useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime; ref.current.position.y = -0.05 + Math.sin(t * 1.2) * 0.05; ref.current.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 + (env.current?.wind ?? 0)); });
  const hull = cached('taxiHull', () => mergeParts([[G.box(1.5, 0.5, 4.0), '#f1c40f', [0, 0, 0]], [G.cone(0.75, 1.0, 4), '#f1c40f', [0, 0, 2.5], [Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.66]], [G.box(1.52, 0.1, 4.02), '#2d3436', [0, -0.2, 0]],
    [G.box(1.2, 0.75, 1.6), '#ecf0f1', [0, 0.6, -0.4]], [G.box(1.3, 0.08, 1.75), '#2d3436', [0, 1.0, -0.4]], [G.box(0.5, 0.18, 0.04), '#2d3436', [0, 1.15, 0.4]]]));
  const w = cached('taxiWin', () => mergeParts([[G.box(1.22, 0.3, 1.2), '#9fd8ff', [0, 0.72, -0.4]]]));
  return <group ref={ref} position={[-2.1, 0, mid - 0.4]}><mesh geometry={hull} material={MAT.vcFlat} castShadow /><mesh geometry={w} material={win} /></group>;
}
// ---------- fountain plaza ----------
function FountainPlaza({ gs }) {
  const geo = cached('plazaCity', () => { const P = [[G.cyl(1.25, 1.3, 0.45, 20, true), '#c9c3b5', [0, 0.22, 0]], [G.torus(1.27, 0.09, 5, 24), '#d9d4c8', [0, 0.46, 0], [Math.PI / 2, 0, 0]], [G.cyl(1.2, 1.2, 0.04, 20), '#8f8c86', [0, 0.04, 0]],
    [G.cyl(0.15, 0.2, 1.1, 10), '#d9d4c8', [0, 0.6, 0]], [G.cyl(0.55, 0.25, 0.15, 14), '#d9d4c8', [0, 1.15, 0]], [G.cyl(0.08, 0.1, 0.4, 8), '#d9d4c8', [0, 1.4, 0]]];
    return mergeParts(P); });
  const benches = cached('plazaCityBench', () => { const P = []; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; const x = Math.cos(a) * 1.45 * 1.25, z = Math.sin(a) * 1.45 * 1.25;
    P.push([G.box(1.1, 0.06, 0.4), '#8a6a48', [x, 0.42, z], [0, -a + Math.PI / 2, 0]], [G.box(1.1, 0.3, 0.05), '#8a6a48', [x + Math.cos(a) * 0.2, 0.62, z + Math.sin(a) * 0.2], [0, -a + Math.PI / 2, 0]],
      [G.box(0.06, 0.4, 0.36), '#2a2f36', [x + Math.cos(a + 1.57) * 0.45, 0.2, z + Math.sin(a + 1.57) * 0.45], [0, -a + Math.PI / 2, 0]], [G.box(0.06, 0.4, 0.36), '#2a2f36', [x - Math.cos(a + 1.57) * 0.45, 0.2, z - Math.sin(a + 1.57) * 0.45], [0, -a + Math.PI / 2, 0]]); } return mergeParts(P); });
  const jets = useRef(); const lit = useNightGlow(0.25, 1.6);
  useFrame(({ clock }) => { if (!jets.current) return; jets.current.children.forEach((m, i) => { const k = (clock.elapsedTime * 0.8 + i / 10) % 1; const a = (i / 10) * Math.PI * 2; m.position.set(Math.cos(a) * (0.3 + k * 0.75), 1.55 + Math.sin(k * Math.PI) * 0.5 - k * 1.1, Math.sin(a) * (0.3 + k * 0.75)); m.scale.setScalar(1 - k * 0.5); }); });
  const ring = cached('plazaCityLights', () => mergeParts(Array.from({ length: 8 }, (_, i) => [G.sph(0.05, 6, 4), '#9fd8ff', [Math.cos(i * 0.785) * 1.1, 0.12, Math.sin(i * 0.785) * 1.1]])));
  return (<group>
    <group ref={gs}><mesh geometry={benches} material={MAT.vcFlat} castShadow receiveShadow /></group>
    <mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.18, 24]} /><meshStandardMaterial color="#5ab8d8" roughness={0.1} metalness={0.2} emissive="#1a6a8a" emissiveIntensity={0.35} /></mesh>
    <mesh geometry={ring} material={lit} />
    <group ref={jets}>{Array.from({ length: 10 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.06, 6, 5]} /><meshStandardMaterial color="#cdefff" transparent opacity={0.8} /></mesh>)}</group>
    <LampLight position={[0, 1.8, 0]} color="#bfe6ff" intensity={6} distance={10} />
  </group>);
}
// ---------- hammock posts: cast-iron lampposts ----------
function LampPost({ x, y, z, h }) { const m = useNightGlow(0.6, 3.0);
  const geo = cached('hamLampPost', () => mergeParts([[G.cyl(0.07, 0.1, 2.5, 8), '#1f2a2a', [0, 1.25, 0]], [G.cyl(0.18, 0.22, 0.25, 8), '#1f2a2a', [0, 0.12, 0]], [G.cyl(0.12, 0.08, 0.15, 8), '#1f2a2a', [0, 2.55, 0]]]));
  const globe = cached('hamLampGlobe', () => mergeParts([[G.sph(0.17, 10, 8), '#fff1cc', [0, 0, 0]]]));
  return <group position={[x, y, z]}><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={globe} material={m} position={[0, 2.75, 0]} /></group>; }
// ---------- rooftop pool (grows) ----------
function RooftopPool({ inst, occupied, count }) {
  const [g] = useSize('HotTub', inst, count); const on = busy(inst, occupied);
  const geo = useMemo(() => mergeParts([[G.cyl(1.32, 1.32, 0.5, 8, true), '#e9ecef', [0, 0.25, 0], [0, Math.PI / 8, 0]], [G.cyl(1.2, 1.2, 0.5, 8, true), '#4a8ac8', [0, 0.25, 0], [0, Math.PI / 8, 0]], [G.cyl(1.2, 1.2, 0.05, 8), '#3a7ab8', [0, 0.03, 0], [0, Math.PI / 8, 0]],
    [G.torus(1.27, 0.08, 4, 8), '#d9d6ce', [0, 0.52, 0], [Math.PI / 2, 0, Math.PI / 8]], [G.box(1.6, 0.06, 2.2), '#a87d55', [0, 0.03, 0], [0, 0, 0], [2.0, 1, 1.4]], [G.box(0.5, 0.25, 0.4), '#e9ecef', [0, 0.12, 1.55]]]), []);
  const chairs = useMemo(() => mergeParts([-1, 1].flatMap((s) => [[G.box(0.5, 0.08, 1.1), '#ffffff', [s * 2.1, 0.25, -0.5], [-0.0, 0, 0]], [G.box(0.5, 0.06, 0.5), '#ffffff', [s * 2.1, 0.45, -1.05], [0.9, 0, 0]], [G.cyl(0.03, 0.03, 1.8, 5), '#ddd', [s * 2.1, 0.9, 0.6]], [G.cone(0.75, 0.35, 8), s > 0 ? '#ff6a6a' : '#ffd23f', [s * 2.1, 1.8, 0.6]]])), []);
  return (<Place inst={inst} g={g} fixed={<mesh geometry={chairs} material={MAT.vcFlat} castShadow />}>
    <mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}><circleGeometry args={[1.2, 8]} /><meshStandardMaterial color="#5ad0f0" roughness={0.05} metalness={0.1} transparent opacity={0.9} emissive="#1aa0d0" emissiveIntensity={0.45} /></mesh>
    <Rising n={on ? 12 : 6} r={0.9} h={1.0} y0={0.44} color="#ffffff" size={0.2} speed={0.25} opacity={0.18} />
  </Place>);
}
// ---------- basketball court (grows sideways like the volleyball court) ----------
function Hoops({ inst, occupied, count }) {
  const [g] = useSize('Volleyball', inst, count); const on = busy(inst, occupied); const ball = useRef();
  const court = useMemo(() => mergeParts([[G.box(3.1, 0.04, 4.6), '#3a5a8a', [0, 0.02, 0]], [G.box(2.5, 0.045, 4.0), '#c0703a', [0, 0.025, 0]], [G.box(2.5, 0.05, 0.05), '#ffffff', [0, 0.03, 0]], [G.torus(0.5, 0.025, 3, 20), '#ffffff', [0, 0.04, 0], [Math.PI / 2, 0, 0]],
    [G.box(0.05, 0.05, 4.0), '#ffffff', [1.25, 0.03, 0]], [G.box(0.05, 0.05, 4.0), '#ffffff', [-1.25, 0.03, 0]]]), []);
  const hoops = useMemo(() => mergeParts([-1, 1].flatMap((s) => [[G.cyl(0.06, 0.06, 2.6, 6), '#2a2f36', [0, 1.3, s * 2.35]], [G.box(0.9, 0.6, 0.05), '#ffffff', [0, 2.55, s * 2.25]], [G.box(0.35, 0.25, 0.06), '#e74c3c', [0, 2.45, s * 2.23]], [G.torus(0.2, 0.025, 4, 14), '#ff6a2a', [0, 2.25, s * 2.02], [Math.PI / 2, 0, 0]]])), []);
  useFrame(({ clock }) => { const b = ball.current; if (!b) return; b.visible = on; const t = clock.elapsedTime; const k = (t * 0.5) % 1; const side = Math.floor(t * 0.5) % 2 ? 1 : -1;
    b.position.set(Math.sin(t * 1.3) * 0.3, 0.2 + Math.abs(Math.sin(k * Math.PI * 5)) * 0.8 * (1 - k) + (k > 0.7 ? (k - 0.7) * 6 : 0), side * (0.4 + k * 1.6)); });
  return (<Place inst={inst} g={g} fixed={<mesh geometry={hoops} material={MAT.vcFlat} castShadow />}><mesh geometry={court} material={MAT.vcFlat} receiveShadow />
    <mesh ref={ball} castShadow><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#e8702a" /></mesh></Place>);
}
// ---------- mid-rise blocks with rooftops + street props ----------
function building(P, W, x, y, z, r, a) { const w = 1.9 + r() * 0.8, d = 1.9 + r() * 0.8, fl = 3 + Math.floor(r() * 4), h = fl * 0.85 + 0.4; const c = ['#c9b8a0', '#9a4a3a', '#7a8494', '#d9d4c8', '#5a6470', '#b0694e'][Math.floor(r() * 6)];
  const ry = -a; const rot = (lx, lz) => [x + lx * Math.cos(a) - lz * Math.sin(a), z + lx * Math.sin(a) + lz * Math.cos(a)];
  P.push([G.box(w, h, d), c, [x, y + h / 2, z], [0, ry, 0]], [G.box(w + 0.15, 0.18, d + 0.15), CONC_D, [x, y + h + 0.09, z], [0, ry, 0]]);
  for (let f = 0; f < fl; f++) for (let k = 0; k < 3; k++) { const lx = (k - 1) * (w / 3.2); for (const s of [-1, 1]) { const [wx, wz] = rot(s * (d / 2 + 0.02), lx); const [vx, vz] = rot(lx, s * (d / 2 + 0.02));
    if (r() < 0.75) W.push([G.box(0.04, 0.45, w / 5), r() < 0.25 ? '#9fd8ff' : WIN, [wx, y + 0.7 + f * 0.85, wz], [0, ry, 0]]); if (r() < 0.75) W.push([G.box(w / 5, 0.45, 0.04), r() < 0.25 ? '#9fd8ff' : WIN, [vx, y + 0.7 + f * 0.85, vz], [0, ry, 0]]); } }
  const top = y + h + 0.18; const kind = r();
  if (kind < 0.35) { const [tx, tz] = rot(w * 0.2, -d * 0.15); P.push([G.cyl(0.4, 0.4, 0.8, 10), '#7a5a3a', [tx, top + 0.8, tz]], [G.cone(0.45, 0.35, 10), '#4a3628', [tx, top + 1.37, tz]]); for (let i = 0; i < 4; i++) P.push([G.cyl(0.03, 0.03, 0.45, 4), STEEL, [tx + Math.cos(i * 1.57) * 0.3, top + 0.2, tz + Math.sin(i * 1.57) * 0.3]]); }
  else if (kind < 0.65) { const [gx, gz] = rot(0, 0); P.push([G.box(w * 0.8, 0.12, d * 0.8), '#6a4a30', [gx, top + 0.06, gz], [0, ry, 0]]); for (let i = 0; i < 5; i++) { const [px, pz] = rot((r() - 0.5) * w * 0.6, (r() - 0.5) * d * 0.6); P.push([G.ico(0.25 + r() * 0.15, 0), '#4f9a4a', [px, top + 0.3, pz]]); } }
  else { const [ax, az] = rot(-w * 0.2, d * 0.15); P.push([G.box(0.7, 0.45, 0.55), '#c9ccd2', [ax, top + 0.22, az], [0, ry, 0]], [G.cyl(0.03, 0.04, 1.6, 5), '#c9ccd2', [x, top + 0.8, z]]); }
  return top; }
export function CityBlocks() {
  const { layout } = useWorld(); const win = useNightGlow(0.35, 2.2);
  const geo = useMemo(() => { const r = seeded(311); const P = [], W = [], tips = []; const R = layout.R;
    scatter(layout, r, Math.round(2 + R * 0.35), R * 0.45, R + 0.2, 4.2, [], 1.7, (x, z, a, rr) => !camSide(a, rr > R * 0.8 ? 0.9 : 1.4) && !nearHome(layout, x, z, 3.2))
      .forEach(([x, z]) => { const y = layout.groundY(x, z); const a = Math.atan2(z, x); tips.push([x, building(P, W, x, y, z, r, a) + 1.6, z]); });
    return { b: P.length ? mergeParts(P) : null, w: W.length ? mergeParts(W) : null, tips: tips.slice(0, 4) }; }, [layout]);
  return (<group>{geo.b && <mesh geometry={geo.b} material={MAT.vcFlat} castShadow receiveShadow />}{geo.w && <mesh geometry={geo.w} material={win} />}
    {geo.tips.map((p, i) => <Blink key={i} position={p} phase={i * 0.3} r={0.07} />)}</group>);
}
const nearHome = (layout, x, z, pad) => layout.homes.some((h) => Math.hypot(h.x - x, h.z - z) < h.foot + pad);
export function StreetProps() {
  const { layout } = useWorld(); const glow = useNightGlow(0.6, 3.0);
  const lamps = useMemo(() => scatter(layout, seeded(317), Math.round(layout.R * 0.55), layout.plazaFoot + 1.0, layout.R + 0.6, 3.2, [], 0.15), [layout]);
  const lampGeo = useMemo(() => lamps.length ? mergeParts(lamps.flatMap(([x, z]) => { const y = layout.groundY(x, z); return [[G.cyl(0.04, 0.06, 2.3, 5), '#2a2f36', [x, y + 1.15, z]], [G.cyl(0.1, 0.12, 0.1, 6), '#2a2f36', [x, y + 0.05, z]]]; })) : null, [lamps]);
  const bulbs = useMemo(() => lamps.length ? mergeParts(lamps.map(([x, z]) => [G.sph(0.11, 8, 6), '#ffe2a8', [x, layout.groundY(x, z) + 2.35, z]])) : null, [lamps]);
  return (<group>
    {lampGeo && <mesh geometry={lampGeo} material={MAT.vcFlat} castShadow />}{bulbs && <mesh geometry={bulbs} material={glow} />}
    <Decor seed={321} n={(L) => L.R * 0.9} band={(L) => [L.plazaFoot + 1.2, L.R + 0.8]} minD={2.4} margin={0.4} accept={(x, z, a, rr, L) => !camSide(a, rr > L.R * 0.8 ? 0.5 : 1.0)}
      build={(P, x, y, z, r) => { P.push([G.box(0.8, 0.4, 0.8), '#a5a29a', [x, y + 0.2, z]], [G.box(0.7, 0.05, 0.7), '#5a4632', [x, y + 0.41, z]], [G.cyl(0.07, 0.1, 1.3, 5), '#5b4630', [x, y + 1.0, z]]);
        for (let k = 0; k < 3; k++) P.push([G.ico(0.45 + r() * 0.2, 1), ['#3f8a4a', '#4f9a4a', '#2f7a3a'][k], [x + (r() - 0.5) * 0.4, y + 1.8 + k * 0.2, z + (r() - 0.5) * 0.4], [0, r() * 6, 0], [1, 0.85, 1]]); }} material={MAT.vc} />
    <Decor seed={325} n={(L) => L.R * 0.5} band={(L) => [L.plazaFoot + 1.0, L.R + 0.5]} minD={2.0} margin={0.2} accept={(x, z, a) => !camSide(a, 0.5)}
      build={(P, x, y, z, r, a) => { const k = r(); if (k < 0.3) P.push([G.cyl(0.12, 0.14, 0.45, 8), '#e74c3c', [x, y + 0.22, z]], [G.sph(0.12, 8, 6), '#e74c3c', [x, y + 0.48, z]], [G.cyl(0.05, 0.05, 0.35, 6), '#e74c3c', [x, y + 0.3, z], [0, a, Math.PI / 2]]);
        else if (k < 0.55) P.push([G.box(0.45, 0.8, 0.4), '#2e5aa8', [x, y + 0.4, z], [0, -a, 0]], [G.cyl(0.2, 0.2, 0.4, 8, false), '#2e5aa8', [x, y + 0.8, z], [0, -a, Math.PI / 2]]);
        else if (k < 0.8) P.push([G.box(1.2, 0.06, 0.38), '#8a6a48', [x, y + 0.42, z], [0, -a, 0]], [G.box(1.2, 0.3, 0.05), '#8a6a48', [x, y + 0.62, z], [0, -a, 0]], [G.box(0.06, 0.42, 0.36), '#2a2f36', [x, y + 0.21, z], [0, -a, 0]]);
        else P.push([G.cyl(0.18, 0.15, 0.7, 8), '#4a5058', [x, y + 0.35, z]], [G.cyl(0.2, 0.2, 0.06, 8), '#3a3f48', [x, y + 0.72, z]]); }} />
    <Decor seed={329} n={(L) => 2 + L.R * 0.3} band={(L) => [L.R - 0.6, L.R + 1.4]} minD={3.2} margin={0.5} accept={(x, z, a) => !camSide(a, 0.7)}
      build={(P, x, y, z, r, a) => { const c = CARS[Math.floor(r() * CARS.length)]; const ry = -a; const rot = (lx, lz) => [x + lx * Math.cos(a) - lz * Math.sin(a), z + lx * Math.sin(a) + lz * Math.cos(a)];
        P.push([G.box(0.85, 0.38, 1.7), c, [x, y + 0.32, z], [0, ry, 0]], [G.box(0.78, 0.32, 0.95), c, [x, y + 0.66, z], [0, ry, 0]], [G.box(0.8, 0.22, 0.9), '#2a3a4a', [x, y + 0.66, z], [0, ry, 0], [1.02, 1, 0.9]]);
        [[-0.42, 0.55], [0.42, 0.55], [-0.42, -0.55], [0.42, -0.55]].forEach(([lx, lz]) => { const [wx, wz] = rot(lx, lz); P.push([G.cyl(0.16, 0.16, 0.12, 10), '#1b1f26', [wx, y + 0.16, wz], [0, ry, Math.PI / 2, 'YXZ']]); }); }} />
  </group>);
}
// skyline across the harbor (water mode) — towers with lit windows and aviation beacons
export function Skyline() {
  const { layout } = useWorld(); const win = useNightGlow(0.25, 2.0);
  const geo = useMemo(() => { if (layout.surround === 'land') return null; const r = seeded(331); const P = [], W = [], tips = []; const E = layout.extent;
    for (let i = 0; i < dens(46, 0.5); i++) { const a = BACK + (r() - 0.5) * 2.9; const rr = E * (3.4 + r() * 1.8); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const w = 5 + r() * 7, h = 8 + r() * r() * 34; const c = ['#7a8494', '#5a6470', '#9aa3ad', '#4a5260', '#8a96a8', '#b9bec6'][Math.floor(r() * 6)];
      let th = h; P.push([G.box(w, h, w), c, [x, -1 + h / 2, z], [0, -a, 0]]); if (r() < 0.4 && (th = h * 1.25)) P.push([G.box(w * 0.6, h * 0.25, w * 0.6), c, [x, -1 + h + h * 0.125, z], [0, -a, 0]]);
      const nf = Math.floor(h / 2.2); for (let f = 1; f < nf; f++) if (r() < 0.7) { const sx = -Math.sin(a), sz = Math.cos(a); const fx = x - Math.cos(a) * (w / 2 + 0.05), fz = z - Math.sin(a) * (w / 2 + 0.05); for (let k = -1; k <= 1; k++) if (r() < 0.6) W.push([G.box(0.1, 0.8, w / 4.5), r() < 0.2 ? '#9fd8ff' : WIN, [fx + sx * k * w * 0.3, -1 + f * 2.2, fz + sz * k * w * 0.3], [0, -a, 0]]); }
      if (h > 30) tips.push([x, th, z]); }
    return { b: mergeParts(P), w: W.length ? mergeParts(W) : null, tips: tips.slice(0, 8) }; }, [layout]);
  if (!geo) return null;
  return (<group><mesh geometry={geo.b} material={MAT.vcFlat} />{geo.w && <mesh geometry={geo.w} material={win} />}{geo.tips.map((p, i) => <Blink key={i} position={p} r={0.5} phase={i * 0.37} speed={0.8} />)}</group>);
}

EXT.lab.office = OfficeLab; EXT.holo.office = '#7fd0ff';
EXT.ring.servers = ServerRing; EXT.holo.servers = '#7dffb0';
EXT.bar.cafe = cafeBar; EXT.barExtra.cafe = CafeExtra;
EXT.torch.streetlamp = StreetLamp;
EXT.dock.harbor = HarborDeco; EXT.vessel.harbor = WaterTaxi;
EXT.plaza.fountain = FountainPlaza;
EXT.post.lamppost = LampPost; EXT.hamCol.lamppost = ['#2e86de', '#f2efe9', '#e74c3c', '#f2efe9'];
EXT.fun['HotTub:rooftop'] = RooftopPool; EXT.fun['Volleyball:hoops'] = Hoops;

// ---------- train stop (replaces the water-taxi pier: the city has no water) ----------
// Concrete platform with a yellow safety edge, a canopy, benches and a station sign; a track runs from the
// platform out across the city and a 3-car commuter train arrives, dwells and leaves on a loop.
const TRACK_X = -3.6, TRAIN_T = 36;
const platformGeo = (from, to) => cached(`trainPlat_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const L = to - from + 1.1, zc = (from + to + 0.9) / 2 - 0.1;
  return mergeParts([[G.box(5.0, 1.6, L), '#a9a6a0', [-0.1, -0.8, zc]], [G.box(5.04, 0.04, L), '#8f8c86', [-0.1, -0.005, zc]], [G.box(0.22, 0.02, L), '#f5c518', [-2.42, 0.02, zc]],
    [G.box(0.04, 0.03, L), '#5a5d64', [-2.58, 0.02, zc]]]); });
function TrainPlatformDeco({ from, to, y }) {
  const { layout } = useWorld(); const glow = useNightGlow(0.5, 2.4); const zc = (from + to) / 2; const ry = (layout.plainY ?? 0) - (y - 0.035);
  const geo = cached(`trainDeco_${from.toFixed(2)}_${to.toFixed(2)}_${ry.toFixed(2)}`, () => { const P = [];
    // canopy on 4 posts
    [[-1.7, from + 1.2], [1.8, from + 1.2], [-1.7, to - 1.2], [1.8, to - 1.2]].forEach(([x, z]) => P.push([G.cyl(0.06, 0.06, 2.4, 6), STEEL, [x, 1.2, z]]));
    P.push([G.box(4.3, 0.12, to - from - 1.4), '#d0d4da', [0.05, 2.45, zc]], [G.box(4.4, 0.06, to - from - 1.3), '#2e86de', [0.05, 2.36, zc]]);
    // benches + station sign + ticket machine
    [zc - 1.0, zc + 1.0].forEach((z) => P.push([G.box(0.4, 0.06, 1.2), '#8a6a48', [1.9, 0.42, z]], [G.box(0.06, 0.35, 1.2), '#8a6a48', [2.1, 0.62, z]], [G.box(0.36, 0.42, 0.06), STEEL, [1.9, 0.21, z - 0.5]], [G.box(0.36, 0.42, 0.06), STEEL, [1.9, 0.21, z + 0.5]]));
    P.push([G.box(0.08, 0.5, 1.8), '#1b4f9c', [0.05, 2.0, zc]], [G.box(0.09, 0.12, 1.2), '#ffffff', [0.05, 2.02, zc]], [G.box(0.5, 1.1, 0.4), '#c0392b', [1.9, 0.55, from + 0.6]]);
    // track: ballast, sleepers, rails, from a buffer stop at the island end out across the city
    const z0 = from - 0.6, z1 = to + 90, mid = (z0 + z1) / 2, len = z1 - z0;
    P.push([G.box(2.2, 0.12, len), '#6f6a62', [TRACK_X, ry + 0.06, mid]]);
    for (let z = z0 + 0.3; z < z1; z += 0.7) P.push([G.box(1.7, 0.06, 0.22), '#5a4632', [TRACK_X, ry + 0.15, z]]);
    [-0.5, 0.5].forEach((dx) => P.push([G.box(0.08, 0.1, len), '#9aa0a8', [TRACK_X + dx, ry + 0.23, mid]]));
    P.push([G.box(1.6, 0.5, 0.3), '#c0392b', [TRACK_X, ry + 0.45, z0 + 0.1]], [G.box(1.7, 0.12, 0.34), '#f5c518', [TRACK_X, ry + 0.6, z0 + 0.1]]);
    // track-side lamps
    for (let z = to + 6; z < to + 60; z += 12) P.push([G.cyl(0.05, 0.06, 2.6, 5), STEEL, [TRACK_X + 1.6, ry + 1.3, z]]);
    return mergeParts(P); });
  const bulbs = cached(`trainBulbs_${from.toFixed(2)}_${to.toFixed(2)}_${ry.toFixed(2)}`, () => { const P = [[G.box(3.6, 0.04, 0.12), '#fff2d0', [0.05, 2.38, zc - 1.2]], [G.box(3.6, 0.04, 0.12), '#fff2d0', [0.05, 2.38, zc + 1.2]]];
    for (let z = to + 6; z < to + 60; z += 12) P.push([G.sph(0.12, 8, 6), '#ffe2a8', [TRACK_X + 1.6, ry + 2.65, z]]); return mergeParts(P); });
  return <group><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={bulbs} material={glow} /></group>;
}
const trainGeo = () => cached('trainCars', () => { const P = [], W = [];
  for (let c = 0; c < 3; c++) { const z = c * 5.9 + 2.75;
    P.push([G.box(1.55, 1.75, 5.5), '#d9dde3', [0, 1.05, z]], [G.box(1.57, 0.22, 5.52), '#2e86de', [0, 0.55, z]], [G.box(1.4, 0.14, 5.3), '#9aa0a8', [0, 2.0, z]], [G.box(1.3, 0.3, 5.0), '#3a3f48', [0, 0.1, z]]);
    for (let k = -2; k <= 2; k++) [-1, 1].forEach((s) => W.push([G.box(0.03, 0.5, 0.75), '#bfe6ff', [s * 0.79, 1.35, z + k * 1.0]]));
    [-1, 1].forEach((s) => P.push([G.box(0.03, 1.2, 0.7), '#5a6470', [s * 0.79, 1.0, z - 2.0]]));
    if (c < 2) P.push([G.box(1.0, 1.3, 0.5), '#3a3f48', [0, 1.0, z + 2.95]]); }
  P.push([G.box(1.55, 0.9, 0.5), '#d9dde3', [0, 0.65, -0.2]], [G.box(1.2, 0.2, 0.06), '#f5c518', [0, 0.5, -0.46]]); W.push([G.box(1.3, 0.55, 0.06), '#bfe6ff', [0, 1.45, -0.02]]);
  [-0.5, 0.5].forEach((x) => W.push([G.sph(0.09, 8, 6), '#fff6d0', [x, 0.75, -0.46]]));
  return { b: mergeParts(P), w: mergeParts(W) }; });
function CommuterTrain({ from, to }) {
  const { layout } = useWorld(); const ref = useRef(); const win = useNightGlow(0.55, 2.4); const stop = from - 0.2; const T = trainGeo();
  useFrame(({ clock }) => { const g = ref.current; if (!g) return; const t = clock.elapsedTime % TRAIN_T; let z;
    if (t < 7) { const k = t / 7; z = stop + 80 * (1 - k) * (1 - k); } else if (t < 21) z = stop; else if (t < 29) { const k = (t - 21) / 8; z = stop + 80 * k * k; } else z = stop + 80;
    g.position.z = z; g.visible = z < stop + 79; });
  return <group ref={ref} position={[TRACK_X, (layout.plainY ?? 0) + 0.3, stop]}><mesh geometry={T.b} material={MAT.vcFlat} castShadow /><mesh geometry={T.w} material={win} /></group>;
}

// ---------- downtown street grid (the city's only surroundings: flat ground, no water) ----------
// Axis-aligned blocks separated by avenues; each block is a raised sidewalk slab carrying 1-4 buildings, towers
// clustering into a downtown behind the island and staying low on the camera side. Lane dashes everywhere,
// zebra crosswalks + streetlights near the island; the train corridor and the island itself stay clear.
export function CityGrid() {
  const { layout, theme } = useWorld(); const win = useNightGlow(0.3, 2.0); const glow = useNightGlow(0.6, 3.0);
  const geo = useMemo(() => { if (layout.surround !== 'land' || !theme.surroundCfg?.grid) return null;
    const r = seeded(909); const E = layout.extent, R = layout.R; const PITCH = 12, ROAD = 3.2, B = PITCH - ROAD; const lite = dens(10, 0.5) < 10; const LIM = E * (lite ? 3.6 : 4.6); const WINR = E * (lite ? 2.4 : 3.8);
    const y0 = layout.plainY ?? 0; const P = [], W = [], M = [], L = [], tips = [];
    const docks = layout.zones?.waiting?.instances || [];
    const inCorridor = (x, z, pad) => docks.some((d) => { const s = x * d.ux + z * d.uz; return s > 0 && Math.abs((x * d.px + z * d.pz) - 3.6) < pad; });
    const dc = [Math.cos(BACK) * E * 3.0, Math.sin(BACK) * E * 3.0];
    const N = Math.ceil(LIM / PITCH);
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const cx = i * PITCH, cz = j * PITCH; const rc = Math.hypot(cx, cz); if (rc > LIM) continue;
      const near = Math.max(0, rc - B * 0.72); if (near < R + 3.5) continue; // whole block clear of the island
      if (inCorridor(cx, cz, B * 0.5 + 3.0)) { if (rc < LIM) M.push([G.box(B, 0.1, B), '#6f9a5e', [cx, y0 + 0.05, cz]]); continue; } // park strip along the tracks
      const a = Math.atan2(cz, cx); const front = camSide(a, 1.25) && rc < E * 3.2;
      P.push([G.box(B, 0.14, B), '#a9a6a0', [cx, y0 + 0.07, cz]]);
      if (front && rc < E * 1.9) { // small park / plaza so the island stays visible
        M.push([G.box(B - 1.2, 0.04, B - 1.2), '#6f9a5e', [cx, y0 + 0.16, cz]]);
        for (let k = 0; k < 3; k++) { const tx = cx + (r() - 0.5) * (B - 3), tz = cz + (r() - 0.5) * (B - 3); P.push([G.cyl(0.08, 0.12, 0.9, 5), '#5b4630', [tx, y0 + 0.6, tz]], [G.ico(0.7 + r() * 0.3, 1), '#4f9a4a', [tx, y0 + 1.5, tz]]); }
        continue; }
      const dd = Math.hypot(cx - dc[0], cz - dc[1]) / E; const down = Math.exp(-dd * dd * 1.4);
      const split = r() < 0.55 ? 2 : 1; const cell = (B - 0.8) / split;
      for (let u = 0; u < split; u++) for (let v = 0; v < split; v++) {
        if (split === 2 && r() < 0.15) continue;
        const bx = cx - (B - 0.8) / 2 + cell * (u + 0.5), bz = cz - (B - 0.8) / 2 + cell * (v + 0.5); const w = cell * (0.78 + r() * 0.18), d = cell * (0.78 + r() * 0.18);
        let h = front ? 2.5 + r() * 3 : 4 + r() * 9 + down * (14 + r() * r() * 34) + (rc > E * 2.6 ? r() * 6 : 0);
        if (split === 2) h *= 0.8; const c = ['#7a8494', '#5a6470', '#9aa3ad', '#4a5260', '#8a96a8', '#b9bec6', '#a8826a', '#8a5a48'][Math.floor(r() * 8)];
        P.push([G.box(w, h, d), c, [bx, y0 + 0.14 + h / 2, bz]], [G.box(w + 0.12, 0.2, d + 0.12), '#6f6a66', [bx, y0 + 0.14 + h + 0.1, bz]]);
        let th = h; if (h > 22 && r() < 0.5) { th = h * 1.2; P.push([G.box(w * 0.6, h * 0.2, d * 0.6), c, [bx, y0 + 0.14 + h * 1.1, bz]]); }
        if (h > 30) tips.push([bx, y0 + th + 0.6, bz]);
        // lit floors: thin glass bands around the building every ~2.2 units (cheap 'windows')
        if (rc < WINR) for (let f = 1.4; f < h - 0.6; f += 2.2) if (r() < 0.8) W.push([G.box(w + 0.05, 0.55, d + 0.05), r() < 0.2 ? '#9fd8ff' : WIN, [bx, y0 + 0.14 + f, bz]]);
      }
      // streetlights at the four corners of nearer blocks
      if (rc < E * 3.0) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const lx = cx + sx * (B / 2 - 0.35), lz = cz + sz * (B / 2 - 0.35); M.push([G.cyl(0.06, 0.08, 2.8, 5), '#2a2f36', [lx, y0 + 1.5, lz]]); L.push([G.sph(0.16, 6, 5), '#ffe2a8', [lx, y0 + 2.95, lz]]); });
    }
    // lane dashes on every road + zebra crosswalks at nearer intersections
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const ix = (i + 0.5) * PITCH, iz = (j + 0.5) * PITCH; const ri = Math.hypot(ix, iz); if (ri > LIM || ri < R + 3.5) continue; if (inCorridor(ix, iz, 3.0)) continue;
      for (let k = 1; k < 4; k++) { const o = -PITCH / 2 + k * (PITCH / 4); if (Math.hypot(ix + o, iz) > R + 3.5) M.push([G.box(1.2, 0.02, 0.14), '#f5c518', [ix + o + PITCH / 2 - PITCH / 2, y0 + 0.012, iz]]); if (Math.hypot(ix, iz + o) > R + 3.5) M.push([G.box(0.14, 0.02, 1.2), '#f5c518', [ix, y0 + 0.012, iz + o]]); }
      if (ri < E * 2.8) for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cx = ix + sx * (ROAD / 2 + 0.6), cz = iz + sz * (ROAD / 2 + 0.6);
        for (let s = -3; s <= 3; s++) M.push(sx ? [G.box(0.9, 0.02, 0.24), '#f2f2f2', [cx, y0 + 0.014, cz + s * 0.44]] : [G.box(0.24, 0.02, 0.9), '#f2f2f2', [cx + s * 0.44, y0 + 0.014, cz]]); }
    }
    return { b: mergeParts(P), w: W.length ? mergeParts(W) : null, m: M.length ? mergeParts(M) : null, l: L.length ? mergeParts(L) : null, tips: tips.slice(0, 10) }; }, [layout, theme]);
  if (!geo) return null;
  return (<group><mesh geometry={geo.b} material={MAT.vcFlat} castShadow receiveShadow />{geo.w && <mesh geometry={geo.w} material={win} />}{geo.m && <mesh geometry={geo.m} material={MAT.vcFlat} receiveShadow />}
    {geo.l && <mesh geometry={geo.l} material={glow} />}{geo.tips.map((p, i) => <Blink key={i} position={p} r={0.45} phase={i * 0.37} speed={0.8} />)}</group>);
}
EXT.dockGeo.train = platformGeo; EXT.dock.train = TrainPlatformDeco; EXT.vessel.train = CommuterTrain;
