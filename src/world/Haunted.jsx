// Haunted Graveyard pieces (Halloween): stone crypt homes with lit windows and iron gates, a mad-science lab
// with tesla coils and bubbling flasks, a candle-lit seance circle, a cauldron bar, hanging jack-o'-lantern
// lamps, a ferry landing with a lantern skiff, a pumpkin bonfire plaza, dead-tree hammock posts, bobbing for
// apples, a haunted hayride, a pumpkin-patch bonfire, a graveyard of tombstones / iron fences / dead trees /
// jack-o'-lanterns, a huge full moon, drifting ghosts, circling bats and rolling ground fog.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, FlickerLight } from './Structures.jsx';
import { scatter } from './Vegetation.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { BACK, camSide, backPts, sel, useNightGlow, hashStr, nightK } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const STONE = '#8a8794', STONE_D = '#6a6774', STONE_L = '#a6a3ae', MOSS = '#4a5a3a', IRON = '#2a2830', BARK = '#3e3430', BARK_L = '#5a4c44', WOOD = '#5e4630', HAY = '#d8b860';
const PUMPKIN = '#f07a1a', GLOWO = '#ffb040', GLOWG = '#8aff6a', GLOWP = '#c88aff';
const FLAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
function NightLight({ position, color, intensity = 4, distance = 9, min = 0.15 }) { const { env } = useWorld(); const l = useRef(); useFrame(() => { if (l.current) l.current.intensity = intensity * (min + (1 - min) * nightK(env)); }); return <pointLight ref={l} position={position} color={color} distance={distance} decay={1.6} intensity={0} />; }
// jack-o'-lantern: pumpkin body into P, glowing face into Gl
const jack = (P, Gl, x, y, z, s = 1, ry = 0) => { P.push([G.sph(0.32 * s, 10, 7), PUMPKIN, [x, y + 0.24 * s, z], [0, ry, 0], [1.15, 0.85, 1.15]], [G.cyl(0.04 * s, 0.05 * s, 0.14 * s, 5), '#4a6a2a', [x, y + 0.52 * s, z]]);
  const c = Math.cos(ry), sn = Math.sin(ry); const f = (lx, ly, sc) => [x + (lx * c + 0.3 * s * sn), y + ly, z + (-lx * sn + 0.3 * s * c)];
  Gl.push([G.cone(0.06 * s, 0.09 * s, 3), GLOWO, f(-0.1 * s, 0.32 * s), [Math.PI / 2, ry, 0, 'YXZ']], [G.cone(0.06 * s, 0.09 * s, 3), GLOWO, f(0.1 * s, 0.32 * s), [Math.PI / 2, ry, 0, 'YXZ']], [G.box(0.24 * s, 0.05 * s, 0.03), GLOWO, f(0, 0.17 * s), [0, ry, 0]]); };
const tomb = (P, x, y, z, ry, k, s = 1) => { const c = [STONE, STONE_D, STONE_L][k % 3];
  if (k % 4 === 0) P.push([G.box(0.5 * s, 0.6 * s, 0.12 * s), c, [x, y + 0.3 * s, z], [0, ry, (k % 3 - 1) * 0.08]], [G.cyl(0.25 * s, 0.25 * s, 0.12 * s, 10, false), c, [x, y + 0.6 * s, z], [Math.PI / 2, ry, 0, 'YXZ']]);
  else if (k % 4 === 1) P.push([G.box(0.12 * s, 0.85 * s, 0.12 * s), c, [x, y + 0.42 * s, z], [0, ry, 0]], [G.box(0.48 * s, 0.12 * s, 0.12 * s), c, [x, y + 0.6 * s, z], [0, ry, 0]]);
  else if (k % 4 === 2) P.push([G.box(0.45 * s, 0.5 * s, 0.14 * s), c, [x, y + 0.25 * s, z], [0.12, ry, 0]]);
  else P.push([G.cyl(0.12 * s, 0.18 * s, 1.0 * s, 4), c, [x, y + 0.5 * s, z], [0, ry + 0.785, 0]], [G.cone(0.13 * s, 0.25 * s, 4), c, [x, y + 1.12 * s, z], [0, ry + 0.785, 0]]);
  P.push([G.box(0.5 * s, 0.06, 0.9 * s), MOSS, [x, y + 0.02, z + 0.0], [0, ry, 0]]); };
const deadTree = (P, x, y, z, h, r) => { P.push([G.cyl(0.08 * h, 0.14 * h, h, 6), BARK, [x, y + h / 2, z], [0, 0, (r() - 0.5) * 0.15]]);
  for (let k = 0; k < 4; k++) { const a = r() * 6.28, by = y + h * (0.5 + r() * 0.4), L = h * (0.35 + r() * 0.3); P.push([G.cyl(0.02 * h, 0.05 * h, L, 4), BARK, [x + Math.cos(a) * L * 0.4, by + L * 0.3, z + Math.sin(a) * L * 0.4], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]]);
    P.push([G.cyl(0.01 * h, 0.02 * h, L * 0.5, 3), BARK_L, [x + Math.cos(a) * L * 0.8, by + L * 0.62, z + Math.sin(a) * L * 0.8], [Math.sin(a + 0.6) * 0.5, 0, -Math.cos(a + 0.6) * 0.5]]); } };
const fence = (P, x0, z0, x1, z1, h = 0.8) => { const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(2, Math.round(L / 0.22)); const ry = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const t = i / n; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; P.push([G.cyl(0.018, 0.018, h, 4), IRON, [x, h / 2, z]], [G.cone(0.04, 0.1, 4), IRON, [x, h + 0.04, z]]); }
  P.push([G.box(0.03, 0.03, L), IRON, [(x0 + x1) / 2, h * 0.8, (z0 + z1) / 2], [0, ry, 0]], [G.box(0.03, 0.03, L), IRON, [(x0 + x1) / 2, h * 0.25, (z0 + z1) / 2], [0, ry, 0]]); };

// ---------- crypt home ----------
const crBase = () => cached('crBase', () => { const f = 0.24; const P = [[G.box(3.4, 0.24, 3.4), STONE_D, [0, 0.12, 0]], [G.box(3.0, 0.04, 3.0), '#5a5660', [0, f, 0]]];
  for (let i = 0; i < 3; i++) P.push([G.box(1.2 - i * 0.1, 0.08, 0.35), STONE, [0, 0.04 + i * 0.08, 1.95 - i * 0.25]]); const Gl = []; jack(P, Gl, 1.25, 0.24, 1.9, 0.9, 0.3); tomb(P, -1.5, 0, 1.9, 0.2, 1, 0.7); return { p: mergeParts(P), g: mergeParts(Gl) }; });
const crShell = (tone) => cached(`crShell${tone}`, () => { const f = 0.24, H = 1.7; const c = [STONE, STONE_L, '#9a8f86'][tone % 3]; const P = [
  [G.box(0.25, H, 2.8), c, [-1.38, f + H / 2, 0]], [G.box(0.25, H, 2.8), c, [1.38, f + H / 2, 0]], [G.box(3.0, H, 0.25), c, [0, f + H / 2, -1.38]], [G.box(0.8, H, 0.25), c, [-1.0, f + H / 2, 1.38]], [G.box(0.8, H, 0.25), c, [1.0, f + H / 2, 1.38]], [G.box(1.3, 0.45, 0.25), c, [0, f + H - 0.22, 1.38]],
  [G.box(3.3, 0.2, 3.3), STONE_D, [0, f + H + 0.1, 0]]];
  const roof = new THREE.CylinderGeometry(0.01, 2.4, 1.2, 4, 1); roof.rotateY(Math.PI / 4); P.push([roof, '#4a4654', [0, f + H + 0.8, 0], [0, 0, 0], [1, 1, 1]]);
  for (const sx of [-0.62, 0.62]) P.push([G.cyl(0.11, 0.13, H, 8), STONE_L, [sx, f + H / 2, 1.6]]);
  P.push([G.box(0.08, 0.6, 0.08), STONE_L, [0, f + H + 1.55, 0]], [G.box(0.36, 0.08, 0.08), STONE_L, [0, f + H + 1.65, 0]]);
  return mergeParts(P); });
const crWin = () => cached('crWin', () => mergeParts([[G.box(0.05, 0.6, 0.35), GLOWG, [1.52, 1.2, 0]], [G.box(0.05, 0.6, 0.35), GLOWG, [-1.52, 1.2, 0]], [G.box(0.05, 0.6, 0.35), GLOWG, [1.52, 1.2, -0.8]], [G.box(0.05, 0.6, 0.35), GLOWG, [-1.52, 1.2, -0.8]]]));
export function Crypt({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % 3;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), []); const win = useNightGlow(0.5, 2.2, { flicker: 0.1 }); const jg = useNightGlow(0.6, 2.6, { flicker: 0.2 });
  useCutaway(home, selected, [shell, win], 0.1, 10); const lamp = useLantern(asleep, GLOWO); const y = layout.groundY(home.x, home.z); const b = crBase();
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={b.p} material={FLAT} castShadow receiveShadow /><mesh geometry={b.g} material={jg} />
    <mesh geometry={crShell(tone)} material={shell} castShadow receiveShadow />
    <mesh geometry={crWin()} material={win} />
    <group position={[0, f, 1.42]}>{[-0.45, -0.27, -0.09, 0.09, 0.27, 0.45].map((x) => <mesh key={x} position={[x, 0.5, 0]}><boxGeometry args={[0.03, 1.0, 0.03]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.5} /></mesh>)}
      <mesh position={[0, 0.96, 0]}><boxGeometry args={[1.0, 0.05, 0.04]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.5} /></mesh></group>
    <mesh position={[0.9, f + 0.15, -0.9]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial ref={lamp} toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, -0.4]} kind="futon" />
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.6]} />
  </group>);
}
// ---------- mad-science lab ----------
function WitchLab() {
  const g = cached('labWitch', () => { const P = [[G.cyl(3.1, 3.3, 0.3, 8), STONE_D, [0, 0.08, 0]], [G.cyl(2.95, 2.95, 0.04, 8), '#4a4654', [0, 0.24, 0]]], Gl = [];
    backPts(3, 2.8, 2.4).forEach(([x, z], i) => { P.push([G.cyl(0.25, 0.35, 0.4, 8), IRON, [x, 0.45, z]]); for (let k = 0; k < 6; k++) P.push([G.torus(0.22 - k * 0.025, 0.04, 4, 12), '#b87333', [x, 0.75 + k * 0.28, z], [Math.PI / 2, 0, 0]]); Gl.push([G.sph(0.22, 10, 8), GLOWP, [x, 2.55, z]]); });
    backPts(4, 3.2, 1.6).forEach(([x, z], i) => { P.push([G.box(0.9, 0.08, 0.5), WOOD, [x, 0.9, z]], [G.box(0.08, 0.7, 0.08), WOOD, [x - 0.35, 0.55, z]], [G.box(0.08, 0.7, 0.08), WOOD, [x + 0.35, 0.55, z]]);
      Gl.push([G.sph(0.12, 8, 6), [GLOWG, GLOWP, GLOWO, GLOWG][i], [x - 0.2, 1.06, z]], [G.cyl(0.07, 0.09, 0.28, 8), [GLOWP, GLOWG, GLOWG, GLOWO][i], [x + 0.2, 1.08, z]]); });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; tomb(P, Math.cos(a) * 3.35, 0.05, Math.sin(a) * 3.35, -a + Math.PI / 2, i, 0.6); }
    return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const m = useNightGlow(0.9, 2.6, { flicker: 0.25 });
  return <group><mesh geometry={g.p} material={FLAT} castShadow receiveShadow /><mesh geometry={g.g} material={m} /><NightLight position={[Math.cos(BACK) * 2.6, 2.6, Math.sin(BACK) * 2.6]} color="#c08aff" intensity={5} /></group>;
}
// ---------- seance circle (research) ----------
function SeanceRing() {
  const g = cached('ringSeance', () => { const P = [[G.cyl(2.5, 2.65, 0.12, 20), '#3a3640', [0, 0.05, 0]], [G.torus(2.1, 0.04, 4, 40), '#7a2a3a', [0, 0.12, 0], [Math.PI / 2, 0, 0]]], Gl = [];
    for (let i = 0; i < 7; i++) { const a = BACK + (i - 3) * 0.5; tomb(P, Math.cos(a) * 2.55, 0.05, Math.sin(a) * 2.55, -a - Math.PI / 2, i, 1.3); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const h = 0.18 + (i % 3) * 0.08; P.push([G.cyl(0.04, 0.045, h, 6), '#f2ead8', [Math.cos(a) * 2.25, 0.12 + h / 2, Math.sin(a) * 2.25]]); Gl.push([G.cone(0.035, 0.1, 5), GLOWO, [Math.cos(a) * 2.25, 0.2 + h, Math.sin(a) * 2.25]]); }
    return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const m = useNightGlow(1.0, 2.8, { flicker: 0.3 });
  return <group><mesh geometry={g.p} material={FLAT} castShadow receiveShadow /><mesh geometry={g.g} material={m} /></group>;
}
// ---------- cauldron bar ----------
function cauldronBar() { const P = [], SP = [];
  P.push([G.box(5.8, 0.1, 3.6), '#3e3a44', [0, 0.05, 0.15]], [G.box(4.8, 1.0, 0.7), '#4a3628', [0, 0.55, 0]], [G.box(5.0, 0.1, 0.85), '#2e2420', [0, 1.07, 0.05]]);
  for (let i = 0; i < 6; i++) P.push([G.box(0.06, 0.9, 0.02), '#3a2a1e', [-2.2 + i * 0.88, 0.55, 0.36]]);
  P.push([G.sph(1.0, 14, 10), IRON, [0, 1.0, -1.35], [0, 0, 0], [1, 0.85, 1]], [G.torus(0.88, 0.08, 6, 20), '#3a3840', [0, 1.62, -1.35], [Math.PI / 2, 0, 0]]);
  for (const a of [0, 2.1, 4.2]) P.push([G.cyl(0.07, 0.07, 0.5, 5), IRON, [Math.cos(a) * 0.6, 0.25, -1.35 + Math.sin(a) * 0.6]]);
  P.push([G.cyl(0.08, 0.1, 3.0, 6), BARK, [-2.6, 1.5, -1.0]], [G.cyl(0.08, 0.1, 3.0, 6), BARK, [2.6, 1.5, -1.0]], [G.cyl(0.08, 0.1, 3.0, 6), BARK, [-2.6, 1.5, 1.3]], [G.cyl(0.08, 0.1, 3.0, 6), BARK, [2.6, 1.5, 1.3]]);
  const roof = new THREE.CylinderGeometry(0.01, 3.9, 1.3, 4, 1, true); roof.rotateY(Math.PI / 4); P.push([roof, '#3a2e3a', [0, 3.6, 0.15], [0, 0, 0], [1, 1, 0.75]]);
  for (let i = 0; i < 6; i++) P.push([G.cyl(0.08, 0.1, 0.32, 6), ['#3a7a3a', '#6a3a8a', '#8a3a3a'][i % 3], [-2.1 + i * 0.3 + (i > 2 ? 2.4 : 0), 1.28, -0.0]]);
  SP.push([G.cyl(0.2, 0.22, 0.5, 8), '#4a3628', [0, 0.25, 1.05]], [G.cyl(0.24, 0.24, 0.06, 8), '#2e2420', [0, 0.52, 1.05]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function CauldronExtra({ primary }) {
  const brew = useNightGlow(1.1, 2.4); const jg = useNightGlow(0.7, 2.6, { flicker: 0.2 });
  const g = cached('cauldronBrew', () => mergeParts([[G.cyl(0.84, 0.84, 0.04, 20), GLOWG, [0, 1.6, -1.35]]]));
  const j = cached('cauldronJacks', () => { const P = [], Gl = []; [-1.8, -0.6, 0.6, 1.8].forEach((x, i) => { jack(P, Gl, x, 2.65, 1.4, 0.55, 0); P.push([G.cyl(0.008, 0.008, 0.45, 3), '#1a1a1a', [x, 3.1, 1.4]]); }); return { p: mergeParts(P), g: mergeParts(Gl) }; });
  return (<><mesh geometry={g} material={brew} /><mesh geometry={j.p} material={MAT.vc} /><mesh geometry={j.g} material={jg} />
    <group position={[0, 1.62, -1.35]}><Rising n={12} r={0.6} h={1.6} y0={0} color="#b8ff9a" size={0.16} speed={0.4} opacity={0.6} emissive="#5aff3a" drift={0.15} /></group>
    {primary && <NightLight position={[0, 2.4, -0.6]} color="#9aff6a" intensity={5} min={0.4} />}</>);
}
CauldronExtra.signY = 4.5; CauldronExtra.noTorch = true;
// ---------- hanging jack-o'-lantern lamp (theme torch) ----------
function JackLamp({ position, light, h = 1.8 }) {
  const m = useNightGlow(0.7, 2.6, { flicker: 0.2 });
  const g = cached(`jlamp${h}`, () => { const P = [[G.cyl(0.04, 0.06, h, 6), IRON, [0, h / 2, 0]], [G.box(0.5, 0.04, 0.04), IRON, [0.22, h - 0.04, 0]], [G.cyl(0.006, 0.006, 0.25, 3), '#111', [0.42, h - 0.17, 0]], [G.cone(0.08, 0.15, 4), IRON, [0, h + 0.05, 0]]], Gl = []; jack(P, Gl, 0.42, h - 0.62, 0, 0.6, 0.5); return { p: mergeParts(P), g: mergeParts(Gl) }; });
  return (<group position={position}><mesh geometry={g.p} material={MAT.vc} castShadow /><mesh geometry={g.g} material={m} />{light && <FlickerLight position={[0.42, h - 0.4, 0.2]} intensity={3} distance={7} color="#ff9a3c" />}</group>);
}
// ---------- ferry landing + lantern skiff ----------
function FerryDeco({ from, to }) {
  const geo = cached(`ferry_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = [], Gl = []; const r = seeded(17);
    for (let i = 0; i < 3; i++) { const s = from + 0.8 + i * ((to - from - 1.2) / 2); const x = (i % 2 ? 1 : -1) * 1.2; deadTree(P, x, -0.4, s, 2.0 + r(), r); }
    [[1.0, from + 0.3], [-1.0, to - 0.3]].forEach(([x, z]) => { P.push([G.cyl(0.05, 0.06, 1.6, 6), WOOD, [x, 0.8, z]], [G.box(0.18, 0.24, 0.18), IRON, [x, 1.7, z]]); Gl.push([G.box(0.12, 0.18, 0.12), GLOWG, [x, 1.7, z]]); });
    return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const m = useNightGlow(0.6, 2.4, { flicker: 0.15 });
  return <group><mesh geometry={geo.p} material={FLAT} castShadow /><mesh geometry={geo.g} material={m} /></group>;
}
function Skiff({ mid }) {
  const ref = useRef(); useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime; ref.current.position.y = -0.05 + Math.sin(t * 1.1) * 0.04; ref.current.rotation.z = Math.sin(t * 0.8) * 0.05; });
  const geo = cached('skiff', () => mergeParts([[G.dome(1.0, 10, 5), '#3a2e26', [0, 0.3, 0], [Math.PI, 0, 0], [0.75, 0.4, 2.0]], [G.box(1.3, 0.05, 0.25), WOOD, [0, 0.28, 0.5]], [G.cyl(0.03, 0.04, 2.0, 5), WOOD, [0.3, 1.2, -1.4]], [G.box(0.5, 0.03, 0.03), WOOD, [0.5, 2.15, -1.4]], [G.box(0.16, 0.22, 0.16), IRON, [0.72, 1.95, -1.4]]]));
  const m = useNightGlow(0.8, 2.6, { flicker: 0.2 }); const lg = cached('skiffLamp', () => mergeParts([[G.box(0.1, 0.16, 0.1), GLOWG, [0, 0, 0]]]));
  return <group ref={ref} position={[-2.0, 0, mid - 0.4]}><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={lg} material={m} position={[0.72, 1.95, -1.4]} /></group>;
}
// ---------- pumpkin bonfire plaza ----------
function BonfirePlaza({ gs }) {
  const seats = cached('plazaBonSeats', () => { const P = [], Gl = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.75; if (i % 2) P.push([G.box(0.7, 0.35, 0.35), STONE, [x, 0.17, z], [0, -a + Math.PI / 2, 0]]); else P.push([G.cyl(0.25, 0.28, 0.4, 7), BARK_L, [x, 0.2, z], [0, a, Math.PI / 2]]); } return mergeParts(P); });
  const pit = cached('plazaBonPit', () => { const P = [], Gl = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; P.push([G.dodec(0.2), STONE_D, [Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75]]); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; P.push([G.cyl(0.06, 0.07, 1.0, 5), BARK, [Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]]); }
    [0.8, 2.4, 4.0, 5.4].forEach((a, i) => jack(P, Gl, Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5, 0.7 + (i % 2) * 0.3, -a + Math.PI / 2)); return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const flame = useRef(); const jg = useNightGlow(0.7, 2.6, { flicker: 0.2 });
  useFrame(({ clock }) => { if (!flame.current) return; const t = clock.elapsedTime; flame.current.scale.set(1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 7.3) * 0.15, 1 + Math.cos(t * 8) * 0.08); });
  return (<group><group ref={gs}><mesh geometry={seats} material={FLAT} castShadow receiveShadow /></group><mesh geometry={pit.p} material={FLAT} castShadow receiveShadow /><mesh geometry={pit.g} material={jg} />
    <group ref={flame} position={[0, 0.3, 0]}><mesh position={[0, 0.45, 0]}><coneGeometry args={[0.45, 1.2, 7]} /><meshBasicMaterial color={new THREE.Color('#ff7a1a').multiplyScalar(2)} toneMapped={false} transparent opacity={0.85} /></mesh><mesh position={[0, 0.35, 0]}><coneGeometry args={[0.25, 0.8, 6]} /><meshBasicMaterial color={new THREE.Color('#ffd040').multiplyScalar(2.4)} toneMapped={false} /></mesh></group>
    <Rising n={10} r={0.3} h={2.2} y0={1.0} color="#ffb040" size={0.06} speed={0.6} opacity={0.9} emissive="#ff6a00" drift={0.2} /><FlickerLight position={[0, 1.4, 0]} intensity={10} distance={14} min={0.3} /></group>);
}
// ---------- dead-tree hammock posts ----------
function DeadPost({ x, y, z, seed }) { const geo = cached(`deadPost${seed % 3}`, () => { const P = []; deadTree(P, 0, 0, 0, 2.9, seeded(seed % 3 + 5)); return mergeParts(P); });
  return <mesh geometry={geo} material={FLAT} position={[x, y, z]} castShadow />; }
// ---------- bobbing for apples ----------
function AppleTub({ inst, occupied, count }) {
  const [g] = useSize('HotTub', inst, count); const on = busy(inst, occupied); const apples = useRef();
  const geo = useMemo(() => { const P = [[G.cyl(1.3, 1.2, 0.7, 20, true), '#7a5232', [0, 0.35, 0]], [G.cyl(1.18, 1.1, 0.7, 20, true), '#6a4628', [0, 0.35, 0]], [G.cyl(1.2, 1.2, 0.05, 20), '#5a3a20', [0, 0.03, 0]], [G.torus(1.26, 0.05, 5, 24), IRON, [0, 0.62, 0], [Math.PI / 2, 0, 0]], [G.torus(1.27, 0.04, 5, 24), IRON, [0, 0.15, 0], [Math.PI / 2, 0, 0]]];
    const Gl = []; jack(P, Gl, 1.6, 0, -0.9, 0.7, 0.8); for (let i = 0; i < 3; i++) P.push([G.box(0.5, 0.4, 0.5), HAY, [-1.6 + i * 0.1, 0.2 + (i === 2 ? 0.4 : 0), -0.9 + i * 0.5 * (i === 2 ? 0 : 1)]]); return { p: mergeParts(P), g: mergeParts(Gl) }; }, []);
  const jg = useNightGlow(0.7, 2.6, { flicker: 0.2 });
  useFrame(({ clock }) => { if (!apples.current) return; const t = clock.elapsedTime; apples.current.children.forEach((c, i) => { const a = i * 1.05 + t * (on ? 0.5 : 0.12); c.position.set(Math.cos(a) * (0.35 + (i % 3) * 0.22), 0.58 + Math.sin(t * 2 + i) * 0.03, Math.sin(a) * (0.35 + (i % 3) * 0.22)); }); });
  return (<Place inst={inst} g={g}><mesh geometry={geo.p} material={MAT.vc} castShadow receiveShadow /><mesh geometry={geo.g} material={jg} />
    <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.17, 24]} /><meshStandardMaterial color="#3a6a7a" roughness={0.2} transparent opacity={0.9} /></mesh>
    <group ref={apples}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} castShadow><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color={i % 3 === 2 ? '#7ac83a' : '#c8202a'} roughness={0.4} /></mesh>)}</group></Place>);
}
// ---------- haunted hayride (orbit shared with the seahorse ride) ----------
const wagonGeo = (c) => { const P = [[G.box(0.9, 0.08, 1.1), WOOD, [0, 0.2, 0]], [G.box(0.06, 0.25, 1.1), c, [0.45, 0.33, 0]], [G.box(0.06, 0.25, 1.1), c, [-0.45, 0.33, 0]], [G.box(0.9, 0.25, 0.06), c, [0, 0.33, -0.55]], [G.box(0.7, 0.2, 0.4), HAY, [0, 0.32, -0.3]]];
  for (const sx of [-0.48, 0.48]) for (const sz of [-0.35, 0.35]) P.push([G.cyl(0.16, 0.16, 0.05, 8), '#3a2a1e', [sx, 0.16, sz], [0, 0, Math.PI / 2]]); return mergeParts(P); };
EXT.ride.hayride = {
  riders: () => ['#7a4a2a', '#5e4630', '#6a3a2a', '#4e3a2a'].map(wagonGeo),
  pole: () => { const P = [[G.box(0.9, 0.5, 0.9), HAY, [0, 0.25, 0]], [G.cyl(0.06, 0.07, 2.6, 5), WOOD, [0, 1.3, 0]], [G.box(1.4, 0.07, 0.07), WOOD, [0, 1.9, 0]], [G.cyl(0.22, 0.3, 0.8, 8), '#6a5a8a', [0, 1.8, 0]], [G.cyl(0.07, 0.07, 1.0, 5), '#6a5a8a', [0, 1.9, 0], [0, 0, Math.PI / 2]]], Gl = [];
    jack(P, Gl, 0, 2.15, 0, 0.9, 0); P.push([G.cone(0.42, 0.5, 10), '#c8a050', [0, 2.75, 0]], [G.cyl(0.55, 0.55, 0.04, 12), '#c8a050', [0, 2.52, 0]]); P.push(...Gl); return mergeParts(P); },
  disc: () => { const P = [[G.cyl(1.95, 1.95, 0.05, 28), '#6a5a3a', [0, 0.02, 0]]]; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; P.push([G.sph(0.1, 5, 4), HAY, [Math.cos(a) * 1.85, 0.05, Math.sin(a) * 1.85], [0, 0, 0], [2, 0.6, 1]]); } return mergeParts(P); },
  rod: false,
};
// ---------- pumpkin patch bonfire (marshmallows) ----------
function PatchFire({ inst, count }) {
  const [g] = useSize('LavaPit', inst, count);
  const geo = useMemo(() => { const P = [], Gl = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; P.push([G.dodec(0.2), STONE_D, [Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6]]); }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3; const rr = 1.9 + (i % 2) * 0.35; if (i % 3 === 0) jack(P, Gl, Math.cos(a) * rr, 0, Math.sin(a) * rr, 0.75, -a + Math.PI / 2); else P.push([G.sph(0.3 + (i % 2) * 0.1, 10, 7), PUMPKIN, [Math.cos(a) * rr, 0.22, Math.sin(a) * rr], [0, a, 0], [1.2, 0.8, 1.2]], [G.cyl(0.03, 0.04, 0.12, 5), '#4a6a2a', [Math.cos(a) * rr, 0.48, Math.sin(a) * rr]]);
      P.push([G.torus(0.25, 0.025, 4, 10, 3), '#3a6a2a', [Math.cos(a + 0.3) * rr, 0.03, Math.sin(a + 0.3) * rr], [Math.PI / 2, 0, a]]); }
    P.push([G.cyl(0.06, 0.07, 0.6, 5), BARK, [0.15, 0.25, 0], [0, 0, 0.6]], [G.cyl(0.06, 0.07, 0.6, 5), BARK, [-0.15, 0.25, 0], [0, 0, -0.6]]); return { p: mergeParts(P), g: mergeParts(Gl) }; }, []);
  const jg = useNightGlow(0.7, 2.6, { flicker: 0.2 }); const fl = useRef(); useFrame(({ clock }) => { if (fl.current) fl.current.scale.y = 1 + Math.sin(clock.elapsedTime * 9) * 0.15; });
  return (<Place inst={inst} g={g}><mesh geometry={geo.p} material={FLAT} castShadow receiveShadow /><mesh geometry={geo.g} material={jg} />
    <mesh ref={fl} position={[0, 0.45, 0]}><coneGeometry args={[0.3, 0.8, 6]} /><meshBasicMaterial color={new THREE.Color('#ff8a2a').multiplyScalar(2)} toneMapped={false} /></mesh>
    <FlickerLight position={[0, 0.9, 0]} intensity={5} distance={6} min={0.3} /><Rising n={8} r={0.3} h={1.5} y0={0.4} color="#ffb040" size={0.06} speed={0.6} opacity={0.9} emissive="#ff6a00" drift={0.1} /></Place>);
}
// ---------- graveyard decor ----------
export function Graveyard() {
  const { layout } = useWorld(); const jg = useNightGlow(0.6, 2.6, { flicker: 0.2 });
  const geo = useMemo(() => { const r = seeded(811); const P = [], Gl = []; const R = layout.R;
    scatter(layout, r, Math.round(R * 0.6), R * 0.45, R + 1.0, 3.0, [], 0.6, (x, z, a, rr) => !camSide(a, rr > R * 0.8 ? 0.6 : 1.0)).forEach(([x, z]) => deadTree(P, x, layout.groundY(x, z) - 0.05, z, 2.2 + r() * 2.2, r));
    // little fenced plots of tombstones
    scatter(layout, r, Math.round(R * 0.45), layout.plazaFoot + 1.5, R + 0.6, 3.2, [], 0.8, (x, z, a) => !camSide(a, 0.5)).forEach(([x, z], i) => { const y = layout.groundY(x, z); const ry = Math.atan2(x, z) + Math.PI; const c = Math.cos(ry), s = Math.sin(ry);
      const W = 0.9, D = 0.7; const corner = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      const k = [corner(-W, -D), corner(W, -D), corner(W, D), corner(-W, D)]; const Pf = [];
      fence(Pf, k[0][0], k[0][1], k[1][0], k[1][1]); fence(Pf, k[1][0], k[1][1], k[2][0], k[2][1]); fence(Pf, k[3][0], k[3][1], k[0][0], k[0][1]);
      Pf.forEach((p) => { p[2] = [p[2][0], p[2][1] + y, p[2][2]]; P.push(p); });
      for (let t = 0; t < 2; t++) { const [tx, tz] = corner(-0.4 + t * 0.8, -0.2); tomb(P, tx, y, tz, ry, i * 2 + t); } });
    scatter(layout, r, Math.round(R * 1.5), layout.plazaFoot + 1.0, R + 1.0, 1.5, [], 0.3, (x, z, a) => !camSide(a, 0.35)).forEach(([x, z], i) => { const y = layout.groundY(x, z); if (i % 3 === 0) jack(P, Gl, x, y, z, 0.5 + r() * 0.3, Math.atan2(x, z) + Math.PI + (r() - 0.5));
      else tomb(P, x, y, z, Math.atan2(x, z) + Math.PI + (r() - 0.5) * 0.6, i, 0.7 + r() * 0.3); });
    return { p: mergeParts(P), g: Gl.length ? mergeParts(Gl) : null }; }, [layout]);
  return <group><mesh geometry={geo.p} material={FLAT} castShadow receiveShadow />{geo.g && <mesh geometry={geo.g} material={jg} />}</group>;
}
// ---------- full moon (always full here), ghosts, bats, ground fog ----------
// real 3D moon: NASA LRO/LROC colour map (public domain, NASA SVS CGI Moon Kit) on a lit sphere far out in the sky,
// like the Earth on the Moon map, so it reads as a solid body from any camera spin; soft additive halo behind it
const MOON_V = `varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ vN = normalize(mat3(modelMatrix)*normal); vUv = uv; vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const MOON_F = `uniform sampler2D uMap; uniform float uB; uniform vec3 uL; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
void main(){ vec3 n = normalize(vN); vec3 c = texture2D(uMap, vUv).rgb; c = pow(c, vec3(1.25)) * 1.5;
  float lit = clamp(dot(n, normalize(uL)) * 0.85 + 0.35, 0., 1.); vec3 V = normalize(cameraPosition - vP); float rim = pow(1. - max(dot(n, V), 0.), 2.5);
  gl_FragColor = vec4(c * vec3(1.0, 0.97, 0.9) * lit * uB + vec3(0.75, 0.85, 1.) * rim * 0.25 * uB, 1.); }`;
let moonTex = null;
const loadMoonTex = () => { if (moonTex) return moonTex; const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL || '/'}textures/moon_lroc_1024.jpg`); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return (moonTex = t); };
export function FullMoon() {
  const { layout, env } = useWorld(); const M = Math.max(220, layout.camDist * 3.4); const h = useRef();
  const el = 0.2; const pos = useMemo(() => new THREE.Vector3(Math.cos(BACK) * Math.cos(el) * M, Math.sin(el) * M, Math.sin(BACK) * Math.cos(el) * M), [M]);
  const R = M * 0.07;
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uMap: { value: loadMoonTex() }, uB: { value: 1 }, uL: { value: pos.clone().negate().normalize().add(new THREE.Vector3(0.35, 0.25, 0)) } }, vertexShader: MOON_V, fragmentShader: MOON_F, fog: false }), [pos]);
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 18, 64, 64, 64); g.addColorStop(0, 'rgba(255,246,220,0.9)'); g.addColorStop(0.35, 'rgba(200,215,255,0.25)'); g.addColorStop(1, 'rgba(200,215,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }, []);
  const hg = useRef(); useEffect(() => { hg.current?.lookAt(0, 0, 0); });
  useFrame(({ clock }) => { const n = nightK(env); const g = env.current?.gray ?? 0; mat.uniforms.uB.value = (0.55 + 0.6 * n) * (1 - g * 0.6); if (h.current) h.current.opacity = (0.12 + 0.3 * n) * (1 - g * 0.7); });
  return (<group position={pos}>
    <mesh material={mat} rotation={[0.15, clock0, 0]}><sphereGeometry args={[R, 64, 48]} /></mesh>
    <group ref={hg}><mesh scale={R * 6} position={[0, 0, -R * 1.2]}><planeGeometry args={[1, 1]} /><meshBasicMaterial ref={h} map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} /></mesh></group>
  </group>);
}
const clock0 = -Math.PI / 2;
const ghostGeo = () => cached('ghost', () => { const g = new THREE.LatheGeometry([[0, 1.0], [0.22, 0.95], [0.34, 0.75], [0.38, 0.45], [0.42, 0.15], [0.5, 0.0]].map(([x, y]) => new THREE.Vector2(x, y)), 14); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.05) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y + Math.sin(a * 6) * 0.06); } } g.computeVertexNormals(); return g; });
export function Ghosts() {
  const { layout, env } = useWorld(); const grp = useRef(); const n = dens(7, 0.6); const R = layout.R;
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => [R * (0.5 + (i % 3) * 0.25), i * 0.9, 0.12 + (i % 4) * 0.04, 1.2 + (i % 3) * 0.6, i % 2 ? 1 : -1]), [n, R]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#bcd8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.6, depthWrite: false }), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime; mat.opacity = 0.45 + 0.35 * nightK(env); mat.emissiveIntensity = 0.3 + 0.7 * nightK(env); const g = grp.current; if (!g) return;
    g.children.forEach((c, i) => { const [rr, ph, w, hy, dir] = seeds[i]; const a = ph + t * w * dir; c.position.set(Math.cos(a) * rr, hy + Math.sin(t * 1.3 + i) * 0.35, Math.sin(a) * rr); c.rotation.set(0, -a * dir + (dir > 0 ? Math.PI : 0), Math.sin(t * 2 + i) * 0.12); }); });
  return <group ref={grp}>{seeds.map((_, i) => <group key={i} scale={0.75 + (i % 3) * 0.2}><mesh geometry={ghostGeo()} material={mat} />
    <mesh position={[-0.11, 0.72, 0.3]}><sphereGeometry args={[0.055, 8, 6]} /><meshBasicMaterial color="#111" /></mesh><mesh position={[0.11, 0.72, 0.3]}><sphereGeometry args={[0.055, 8, 6]} /><meshBasicMaterial color="#111" /></mesh>
    <mesh position={[0, 0.55, 0.36]} scale={[1, 1.4, 1]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#222" /></mesh></group>)}</group>;
}
const batGeo = () => cached('batBody', () => mergeParts([[G.sph(0.09, 8, 6), '#1a1418', [0, 0, 0], [0, 0, 0], [1, 0.9, 1.3]], [G.cone(0.03, 0.08, 3), '#1a1418', [0.05, 0.09, 0.05]], [G.cone(0.03, 0.08, 3), '#1a1418', [-0.05, 0.09, 0.05]]]));
const wingGeo = () => cached('batWing', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.35, 0.12); s.lineTo(0.42, -0.02); s.lineTo(0.3, -0.06); s.lineTo(0.22, 0.0); s.lineTo(0.12, -0.06); s.lineTo(0, -0.04); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; });
export function Bats() {
  const { layout } = useWorld(); const grp = useRef(); const n = dens(14, 0.5); const R = layout.R;
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => [R * (0.3 + (i % 5) * 0.2), i * 0.45, 0.5 + (i % 4) * 0.15, 4 + (i % 4) * 1.2]), [n, R]);
  const wm = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1a1418', side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime; const g = grp.current; if (!g) return;
    g.children.forEach((c, i) => { const [rr, ph, w, hy] = seeds[i]; const a = ph + t * w; c.position.set(Math.cos(a) * rr + Math.sin(t * 1.7 + i) * 0.6, hy + Math.sin(t * 2.3 + i) * 0.5, Math.sin(a) * rr); c.rotation.y = -a; const f = Math.sin(t * 16 + i) * 0.9; c.children[1].rotation.z = f; c.children[2].rotation.z = -f; }); });
  return <group ref={grp}>{seeds.map((_, i) => <group key={i} scale={1.3}><mesh geometry={batGeo()} material={MAT.vc} /><mesh geometry={wingGeo()} material={wm} /><mesh geometry={wingGeo()} material={wm} scale={[-1, 1, 1]} /></group>)}</group>;
}
export function GroundFog() {
  const { layout, env } = useWorld(); const grp = useRef(); const n = dens(26, 0.5); const E = layout.extent;
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(220,230,240,0.9)'); g.addColorStop(1, 'rgba(220,230,240,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.3, color: '#c8d4e4' }), [tex]);
  const seeds = useMemo(() => { const r = seeded(51); return Array.from({ length: n }, () => [r() * 6.28, Math.sqrt(r()) * E * 0.62, 6 + r() * 5, 0.02 + r() * 0.04]); }, [n, E]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; const k = nightK(env); mat.opacity = 0.08 + 0.1 * k; mat.color.setScalar(0.45 + 0.4 * (env.current?.day ?? 1)); const g = grp.current; if (!g) return;
    g.children.forEach((c, i) => { const [a, rr, s, w] = seeds[i]; const aa = a + t * w; c.position.set(Math.cos(aa) * rr, 0.35 + (i % 3) * 0.12, Math.sin(aa) * rr); }); });
  return <group ref={grp}>{seeds.map(([, , s], i) => <mesh key={i} material={mat} rotation={[-Math.PI / 2, 0, i]} scale={s} renderOrder={3}><planeGeometry args={[1, 1]} /></mesh>)}</group>;
}

EXT.lab.witch = WitchLab; EXT.holo.witch = '#c08aff';
EXT.ring.seance = SeanceRing; EXT.holo.seance = '#9affc8';
EXT.bar.cauldron = cauldronBar; EXT.barExtra.cauldron = CauldronExtra;
EXT.torch.jack = JackLamp;
EXT.dock.ferry = FerryDeco; EXT.vessel.ferry = Skiff;
EXT.plaza.bonfire = BonfirePlaza;
EXT.post.deadtree = DeadPost; EXT.hamCol.deadtree = ['#f07a1a', '#2a2228', '#7a3aa8', '#2a2228'];
EXT.fun['HotTub:apples'] = AppleTub; EXT.fun['LavaPit:patch'] = PatchFire;

// ---------- misty swamp (Graveyard 'water' surround): murky water, dead reeds, drowned stumps, fog, will-o-wisps ----------
const fogTex = () => cached('swampFogTex', () => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(210,225,210,0.75)'); g.addColorStop(0.5, 'rgba(190,210,195,0.3)'); g.addColorStop(1, 'rgba(190,210,195,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); });
export function Swamp() {
  const { layout, theme, env } = useWorld(); const on = !!theme.surroundCfg?.swamp && !!theme.water && layout.surround !== 'land';
  const lv = theme.water?.level ?? -0.35; const S0 = layout.shoreR, E = layout.extent;
  const docks = layout.zones?.waiting?.instances || [];
  const clear = (x, z) => !docks.some((d) => { const s = x * d.ux + z * d.uz; return s > d.from - 1 && s < d.to + 6 && Math.abs(x * d.px + z * d.pz) < 5; });
  const geo = useMemo(() => { if (!on) return null; const r = seeded(613); const P = [];
    const N = dens(150, 0.5);
    for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2; const rr = S0 + 0.6 + Math.pow(r(), 1.6) * E * 1.6; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!clear(x, z)) continue; if (camSide(a, 0.5) && rr < S0 + 8) continue;
      const k = 3 + Math.floor(r() * 5); for (let j = 0; j < k; j++) { const h = 0.6 + r() * 1.1; const ox = (r() - 0.5) * 0.7, oz = (r() - 0.5) * 0.7;
        P.push([G.cone(0.035, h, 3), ['#6b5d3e', '#5a5034', '#7a6a48', '#4a4a30'][j % 4], [x + ox, lv + h / 2, z + oz], [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4]]);
        if (r() < 0.35) P.push([G.cyl(0.05, 0.05, 0.22, 5), '#3a2a1c', [x + ox, lv + h * 0.8, z + oz]]); } } // cattail heads
    for (let i = 0; i < dens(26, 0.5); i++) { const a = r() * Math.PI * 2; const rr = S0 + 3 + r() * E * 1.4; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!clear(x, z) || camSide(a, 0.7)) continue;
      const h = 0.6 + r() * 2.6; P.push([G.cyl(0.12, 0.25, h, 6), '#3a3228', [x, lv + h / 2 - 0.1, z]]);
      if (h > 1.6) for (let b = 0; b < 3; b++) { const ba = r() * 6.28; P.push([G.cyl(0.03, 0.06, 1.1, 4), '#3a3228', [x + Math.cos(ba) * 0.4, lv + h - 0.2, z + Math.sin(ba) * 0.4], [Math.cos(ba) * 0.9, 0, Math.sin(ba) * 0.9]]); } }
    for (let i = 0; i < dens(60, 0.5); i++) { const a = r() * Math.PI * 2; const rr = S0 + 0.8 + r() * E * 0.9; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!clear(x, z)) continue; P.push([G.cyl(0.25 + r() * 0.2, 0.25, 0.02, 9), '#3f5a2e', [x, lv + 0.02, z]]); } // lily pads
    return mergeParts(P); }, [on, layout]);
  const fogs = useMemo(() => { if (!on) return []; const r = seeded(617); return Array.from({ length: dens(16, 0.5) }, () => { const a = r() * Math.PI * 2; return { a, rr: S0 + 2 + r() * E * 1.3, s: 10 + r() * 14, w: (r() - 0.5) * 0.02, ph: r() * 6 }; }); }, [on, layout]);
  const wisps = useMemo(() => { if (!on) return []; const r = seeded(619); return Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, rr: S0 + 1.5 + r() * E * 0.8, ph: r() * 6, sp: 0.05 + r() * 0.08 })); }, [on, layout]);
  const fg = useRef(); const wg = useRef(); const fmat = useMemo(() => new THREE.MeshBasicMaterial({ map: fogTex(), transparent: true, depthWrite: false, opacity: 0.5, fog: true }), []);
  const wmat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffd8').multiplyScalar(2.2), toneMapped: false, transparent: true }), []);
  const hmat = useMemo(() => new THREE.MeshBasicMaterial({ map: fogTex(), color: '#7dffc8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }), []);
  useFrame(({ clock, camera }) => { const t = clock.elapsedTime; const n = nightK(env);
    fmat.opacity = 0.32 + 0.25 * n;
    fg.current?.children.forEach((m, i) => { const f = fogs[i]; const a = f.a + t * f.w; m.position.set(Math.cos(a) * f.rr, lv + 0.35 + Math.sin(t * 0.3 + f.ph) * 0.1, Math.sin(a) * f.rr); });
    wmat.opacity = 0.35 + 0.65 * n; hmat.opacity = (0.2 + 0.6 * n) * (0.7 + 0.3 * Math.sin(t * 3));
    wg.current?.children.forEach((g, i) => { const w = wisps[i]; const a = w.a + Math.sin(t * w.sp + w.ph) * 0.35; const rr = w.rr + Math.sin(t * 0.4 + w.ph) * 1.5;
      g.position.set(Math.cos(a) * rr, lv + 0.9 + Math.sin(t * 1.3 + w.ph) * 0.35, Math.sin(a) * rr); g.children[1].quaternion.copy(camera.quaternion); }); });
  if (!on) return null;
  return (<group>
    {geo && <mesh geometry={geo} material={MAT.vcFlat} />}
    <group ref={fg}>{fogs.map((f, i) => <mesh key={i} material={fmat} rotation={[-Math.PI / 2, 0, f.ph]} scale={f.s}><planeGeometry args={[1, 1]} /></mesh>)}</group>
    <group ref={wg}>{wisps.map((_, i) => <group key={i}><mesh material={wmat}><sphereGeometry args={[0.09, 8, 6]} /></mesh><mesh material={hmat} scale={1.1}><planeGeometry args={[1, 1]} /></mesh></group>)}</group>
  </group>);
}
