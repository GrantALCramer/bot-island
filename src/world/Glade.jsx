// Fairy Glade pieces: an enchanted forest island that glows at night. Toadstool cottages with spotted caps and
// round lit windows, a tree-stump lab ringed by glowing mushrooms, a standing-stone fairy ring, an acorn tavern
// under giant leaves with firefly jars, a lily-pad landing with a leaf boat, a wisp pool plaza with mushroom
// stools, glow-mushroom lamps, a bouncy mushroom-cap trampoline, a mossy dew pool, giant mushrooms, glow flowers,
// drifting spores and fireflies.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, FlickerLight } from './Structures.jsx';
import { Twinkles } from './Realms.jsx';
import { scatter } from './Vegetation.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { BACK, camSide, backPts, sel, useNightGlow, hashStr, nightK } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const STALK = '#efe4cc', STALK_D = '#d8cbb0', MOSS = '#4f8a3a', MOSS_D = '#3a6e2c', BARK = '#5e4630', BARK_L = '#8a6a48';
const CAPS = ['#d8433a', '#e8823a', '#b04ad8', '#3a9ad8', '#d84a8a'];
const GLOW = ['#7dffb0', '#7de8ff', '#d89dff', '#fff07d', '#ff9dd8'];

// ---------- toadstool cottage ----------
const shBase = () => cached('shBase', () => { const f = 0.18; const P = [[G.cyl(1.9, 2.0, 0.18, 16), MOSS_D, [0, 0.09, 0]], [G.cyl(1.6, 1.6, 0.04, 16), '#a8875a', [0, f, 0]]];
  for (let i = 0; i < 5; i++) P.push([G.cyl(0.24, 0.26, 0.06, 7), '#9a968e', [0, 0.04, 2.0 + i * 0.4 - 0.2]]);
  P.push([G.cyl(0.3, 0.32, 0.5, 10), BARK_L, [0.9, f + 0.25, -0.75]]); return mergeParts(P); });
const shShell = (tone) => cached(`shShell${tone}`, () => { const f = 0.18, H = 1.6; const P = []; const cap = CAPS[tone];
  const wall = new THREE.CylinderGeometry(1.55, 1.7, H, 20, 1, true, Math.PI / 2 + 0.33, Math.PI * 2 - 0.66); P.push([wall, STALK, [0, f + H / 2, 0]]);
  P.push([G.box(0.75, 0.3, 0.12), STALK, [0, f + H - 0.15, 1.6]]);
  P.push([G.dome(2.4, 20, 10), cap, [0, f + H - 0.1, 0], [0, 0, 0], [1, 0.62, 1]], [G.cyl(2.38, 2.0, 0.22, 20, true), STALK_D, [0, f + H - 0.2, 0]]);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, el = 0.35 + (i % 3) * 0.3; const r = 2.4 * Math.cos(el); P.push([G.sph(0.22 - (i % 3) * 0.04, 8, 6), '#fffaf0', [Math.cos(a) * r, f + H - 0.1 + Math.sin(el) * 2.4 * 0.62, Math.sin(a) * r], [0, 0, 0], [1, 0.5, 1]]); }
  return mergeParts(P); });
const shWin = () => cached('shWin', () => mergeParts([1.3, -1.3, 2.4].map((a) => [G.cyl(0.24, 0.24, 0.05, 12), '#ffd27a', [Math.cos(a + 1.57) * 1.62, 1.15, Math.sin(a + 1.57) * 1.62], [Math.PI / 2, 0, -(a + 1.57) + Math.PI / 2, 'YXZ']])));
export function Shroom({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % CAPS.length;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), []); const win = useNightGlow(0.4, 2.2);
  useCutaway(home, selected, [shell, win], 0.1, 10); const lamp = useLantern(asleep, '#ffd27a'); const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={shBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={shShell(tone)} material={shell} castShadow receiveShadow />
    <mesh geometry={shWin()} material={win} />
    <mesh position={[0, f + 0.65, 1.66]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.06, 16, 1, false, 0, Math.PI]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0.9, f + 0.6, -0.75]}><sphereGeometry args={[0.11, 10, 8]} /><meshBasicMaterial ref={lamp} toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, -0.35]} kind="futon" />
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.6]} />
  </group>);
}
// glowing mushroom cluster helper (stalks into P, glowing caps into Gl)
function glowShroom(P, Gl, x, y, z, h, r, c) { P.push([G.cyl(r * 0.25, r * 0.32, h, 7), STALK, [x, y + h / 2, z]]); Gl.push([G.dome(r, 10, 6), c, [x, y + h - 0.05, z], [0, 0, 0], [1, 0.6, 1]]); }
// ---------- stump lab ----------
function StumpLab() {
  const g = cached('labStump', () => { const P = [[G.cyl(3.1, 3.3, 0.32, 18), BARK, [0, 0.08, 0]], [G.cyl(3.0, 3.0, 0.04, 18), BARK_L, [0, 0.25, 0]]], Gl = [];
    for (let k = 1; k < 6; k++) P.push([G.torus(k * 0.52, 0.015, 3, 30), '#6e5238', [0, 0.272, 0], [Math.PI / 2, 0, 0]]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; P.push([G.cyl(0.25, 0.4, 0.6, 5), BARK, [Math.cos(a) * 3.3, 0.15, Math.sin(a) * 3.3], [0, a, Math.sin(a) * 0.3]]); }
    backPts(5, 3.05, 2.8).forEach(([x, z], i) => glowShroom(P, Gl, x, 0.25, z, 1.6 + (i % 2) * 0.9, 0.55 + (i % 3) * 0.15, GLOW[i % 5]));
    backPts(6, 3.4, 3.4).forEach(([x, z], i) => glowShroom(P, Gl, x, 0.05, z, 0.5, 0.22, GLOW[(i + 2) % 5]));
    return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const m = useNightGlow(0.7, 2.4);
  return <group><mesh geometry={g.p} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={g.g} material={m} /><NightLight position={[Math.cos(BACK) * 2.4, 2.0, Math.sin(BACK) * 2.4]} color="#9dffcf" /></group>;
}
function NightLight({ position, color, intensity = 4, distance = 9 }) { const { env } = useWorld(); const l = useRef(); useFrame(() => { if (l.current) l.current.intensity = intensity * (0.15 + 0.85 * nightK(env)); }); return <pointLight ref={l} position={position} color={color} distance={distance} decay={1.6} intensity={0} />; }
// ---------- fairy ring (research): standing stones with moss, glowing toadstools ----------
function FairyRing() {
  const g = cached('ringFairy', () => { const P = [[G.cyl(2.5, 2.65, 0.14, 20), MOSS, [0, 0.05, 0]]], Gl = [];
    for (let i = 0; i < 7; i++) { const a = BACK + (i - 3) * 0.5; const x = Math.cos(a) * 2.5, z = Math.sin(a) * 2.5; const h = 1.2 + (i % 3) * 0.5; P.push([G.box(0.5, h, 0.35), '#8a8f86', [x, h / 2, z], [0, -a, (i % 2 - 0.5) * 0.1]], [G.box(0.52, 0.12, 0.37), MOSS, [x, h, z], [0, -a, 0]]); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; glowShroom(P, Gl, Math.cos(a) * 2.2, 0.1, Math.sin(a) * 2.2, 0.3, 0.14, GLOW[i % 5]); }
    return { p: mergeParts(P), g: mergeParts(Gl) }; });
  const m = useNightGlow(0.7, 2.6);
  return <group><mesh geometry={g.p} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={g.g} material={m} /></group>;
}
// ---------- acorn tavern ----------
function tavernBar() { const P = [], SP = [];
  P.push([G.box(5.8, 0.1, 3.6), '#8a6a48', [0, 0.05, 0.15]]); const log = new THREE.CylinderGeometry(0.5, 0.5, 4.8, 12); log.rotateZ(Math.PI / 2); P.push([log, BARK, [0, 0.55, 0]], [G.box(4.9, 0.1, 0.8), BARK_L, [0, 1.05, 0.05]]);
  for (let i = 0; i < 5; i++) P.push([G.cyl(0.11, 0.1, 0.14, 8), '#a8743a', [-1.6 + i * 0.8, 1.17, 0.15]], [G.dome(0.12, 8, 4), '#6e4a28', [-1.6 + i * 0.8, 1.24, 0.15]]);
  const back = new THREE.CylinderGeometry(0.7, 0.8, 2.6, 12); P.push([back, BARK, [-2.3, 1.3, -1.2]], [back.clone(), BARK, [2.3, 1.3, -1.2]], [G.box(4.0, 0.12, 0.5), BARK_L, [0, 1.6, -1.35]], [G.box(4.0, 0.12, 0.5), BARK_L, [0, 2.1, -1.35]]);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; P.push([G.sph(1.3, 8, 4), i % 2 ? '#5aa03a' : '#4a8a30', [Math.cos(a) * 1.9, 3.0 + (i % 2) * 0.15, -0.2 + Math.sin(a) * 1.2], [0.2, a, 0], [1.3, 0.12, 0.7]]); }
  P.push([G.cyl(0.08, 0.1, 3.0, 6), BARK, [-2.6, 1.5, 1.3]], [G.cyl(0.08, 0.1, 3.0, 6), BARK, [2.6, 1.5, 1.3]]);
  SP.push([G.cyl(0.12, 0.16, 0.45, 8), STALK, [0, 0.22, 1.05]], [G.dome(0.3, 10, 6), CAPS[0], [0, 0.43, 1.05], [0, 0, 0], [1, 0.45, 1]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function TavernExtra({ primary }) {
  const m = useNightGlow(0.8, 2.6, { flicker: 0.15 }); const jars = cached('fireflyJars', () => mergeParts([-1.8, -0.6, 0.6, 1.8].map((x, i) => [G.sph(0.13, 8, 6), GLOW[i], [x, 2.55, 1.4], [0, 0, 0], [1, 1.3, 1]])));
  const strings = cached('fireflyStrings', () => mergeParts([-1.8, -0.6, 0.6, 1.8].map((x) => [G.cyl(0.008, 0.008, 0.35, 3), '#3a2a1a', [x, 2.82, 1.4]])));
  return (<><mesh geometry={jars} material={m} /><mesh geometry={strings} material={MAT.vcFlat} />{primary && <NightLight position={[0, 2.3, 1.2]} color="#c8ffb0" intensity={4} />}</>);
}
TavernExtra.signY = 3.8;
// ---------- glow mushroom lamp (theme torch) ----------
function ShroomLamp({ position, light, h = 1.7 }) {
  const m = useNightGlow(0.6, 2.8); const k = Math.round(position[0] * 7 + position[2] * 3) % 5; const c = GLOW[(k + 5) % 5];
  const stalk = cached(`slamp${h}`, () => mergeParts([[G.cyl(0.06, 0.1, h, 7), STALK, [0, h / 2, 0]], [G.cyl(0.14, 0.18, 0.08, 8), MOSS, [0, 0.04, 0]]]));
  const cap = cached(`slampCap${c}`, () => mergeParts([[G.dome(0.32, 12, 6), c, [0, 0, 0], [0, 0, 0], [1, 0.55, 1]]]));
  return (<group position={position}><mesh geometry={stalk} material={MAT.vc} castShadow /><mesh geometry={cap} material={m} position={[0, h - 0.04, 0]} />
    {light && <NightLight position={[0, h + 0.1, 0]} color={c} intensity={3} distance={7} />}</group>);
}
// ---------- lily landing + leaf boat ----------
function LilyDeco({ from, to }) {
  const geo = cached(`lily_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = [];
    for (let i = 0; i < 7; i++) { const s = from + 0.5 + i * ((to - from) / 6); const x = (i % 2 ? 1 : -1) * (1.3 + (i % 3) * 0.4); P.push([G.cyl(0.4 + (i % 3) * 0.15, 0.4 + (i % 3) * 0.15, 0.03, 14, false), '#4f9a3a', [x, -0.02, s]]); if (i % 3 === 0) P.push([G.sph(0.12, 8, 6), '#ffb8e0', [x, 0.06, s], [0, 0, 0], [1, 0.6, 1]]); }
    [[-0.9, from + 0.4], [0.95, from + 0.9], [-1.0, to - 0.4]].forEach(([x, z]) => { for (let k = 0; k < 4; k++) P.push([G.cyl(0.02, 0.02, 1.2 + k * 0.15, 4), '#5a8a3a', [x + k * 0.08, 0.5, z + k * 0.05], [0, 0, (k - 1.5) * 0.08]], [G.cyl(0.05, 0.05, 0.25, 6), '#6e4a28', [x + k * 0.08, 1.15 + k * 0.08, z + k * 0.05]]); });
    return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vcFlat} castShadow />;
}
function LeafBoat({ mid }) {
  const ref = useRef(); useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime; ref.current.position.y = -0.05 + Math.sin(t * 1.1) * 0.05; ref.current.rotation.z = Math.sin(t * 0.8) * 0.05; });
  const geo = cached('leafboat', () => mergeParts([[G.dome(1.0, 14, 8), '#5aa03a', [0, 0.25, 0], [Math.PI, 0, 0], [0.9, 0.45, 2.2]], [G.box(0.04, 0.02, 4.0), '#3a7a2a', [0, 0.26, 0]],
    [G.cyl(0.04, 0.05, 1.8, 6), STALK, [0, 1.1, 0.2]], [G.dome(0.7, 12, 6), CAPS[0], [0, 1.95, 0.2], [0, 0, 0], [1, 0.5, 1]], [G.sph(0.1, 6, 4), '#fffaf0', [0.3, 2.2, 0.3], [0, 0, 0], [1, 0.5, 1]], [G.sph(0.08, 6, 4), '#fffaf0', [-0.25, 2.18, 0.0], [0, 0, 0], [1, 0.5, 1]]]));
  return <group ref={ref} position={[-2.0, 0, mid - 0.4]}><mesh geometry={geo} material={MAT.vc} castShadow /></group>;
}
// ---------- wisp pool plaza ----------
function WispPlaza({ gs }) {
  const ring = cached('plazaWispRing', () => mergeParts([[G.torus(1.0, 0.22, 6, 16), '#8a8f86', [0, 0.1, 0], [Math.PI / 2, 0, 0]], ...Array.from({ length: 12 }, (_, i) => [G.dodec(0.18), MOSS, [Math.cos(i * 0.52) * 1.0, 0.25, Math.sin(i * 0.52) * 1.0]])]));
  const stools = cached('plazaWispStools', () => { const P = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.75; P.push([G.cyl(0.12, 0.16, 0.35, 8), STALK, [x, 0.17, z]], [G.dome(0.32, 10, 6), CAPS[i % 5], [x, 0.33, z], [0, 0, 0], [1, 0.4, 1]]); } return mergeParts(P); });
  const wisps = useRef(); const water = useNightGlow(0.5, 1.8);
  useFrame(({ clock }) => { if (!wisps.current) return; const t = clock.elapsedTime; wisps.current.children.forEach((c, i) => { const a = t * 0.5 + i * 1.26; c.position.set(Math.cos(a) * 0.5, 1.0 + Math.sin(t * 1.3 + i) * 0.35 + i * 0.12, Math.sin(a) * 0.5); }); });
  const wg = cached('plazaWispWater', () => mergeParts([[G.cyl(0.9, 0.9, 0.04, 20), '#5ae0c8', [0, 0.12, 0]]]));
  return (<group><group ref={gs}><mesh geometry={stools} material={MAT.vc} castShadow receiveShadow /></group><mesh geometry={ring} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={wg} material={water} />
    <group ref={wisps}>{GLOW.map((c, i) => <mesh key={i}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color={new THREE.Color(c).multiplyScalar(2.5)} toneMapped={false} /></mesh>)}</group>
    <NightLight position={[0, 1.4, 0]} color="#9dffe0" intensity={8} distance={12} /></group>);
}
// ---------- tall mushroom hammock posts ----------
function ShroomPost({ x, y, z, seed }) { const c = CAPS[seed % 5]; const geo = cached(`shroomPost${c}`, () => mergeParts([[G.cyl(0.12, 0.18, 2.6, 8), STALK, [0, 1.3, 0]], [G.dome(0.75, 12, 6), c, [0, 2.55, 0], [0, 0, 0], [1, 0.5, 1]], [G.sph(0.12, 6, 4), '#fffaf0', [0.35, 2.75, 0.2], [0, 0, 0], [1, 0.5, 1]], [G.sph(0.1, 6, 4), '#fffaf0', [-0.3, 2.72, -0.25], [0, 0, 0], [1, 0.5, 1]]]));
  return <mesh geometry={geo} material={MAT.vc} position={[x, y, z]} castShadow />; }
// ---------- bouncy mushroom trampoline + dew pool (grow) ----------
function ShroomTrampoline({ inst, occupied, count }) {
  const [g] = useSize('Trampoline', inst, count); const cap = useRef(); const on = busy(inst, occupied) || (count || 0) > 0;
  useFrame(({ clock }) => { if (cap.current) { const t = clock.elapsedTime; const w = on ? 0.07 : 0.01; cap.current.scale.set(1 + Math.sin(t * 6) * w, 1 - Math.sin(t * 6) * w * 2, 1 + Math.sin(t * 6) * w); } });
  const stalk = useMemo(() => mergeParts([[G.cyl(0.5, 0.7, 0.4, 12), STALK, [0, 0.2, 0]], [G.cyl(1.6, 1.6, 0.04, 20), MOSS, [0, 0.02, 0]]]), []);
  const top = useMemo(() => mergeParts([[G.dome(1.45, 18, 8), CAPS[2], [0, 0, 0], [0, 0, 0], [1, 0.22, 1]], ...Array.from({ length: 7 }, (_, i) => [G.sph(0.16, 8, 4), '#fffaf0', [Math.cos(i * 0.9) * (0.4 + (i % 3) * 0.3), 0.28, Math.sin(i * 0.9) * (0.4 + (i % 3) * 0.3)], [0, 0, 0], [1, 0.35, 1]])]), []);
  return <Place inst={inst} g={g}><mesh geometry={stalk} material={MAT.vc} castShadow receiveShadow /><group ref={cap} position={[0, 0.38, 0]}><mesh geometry={top} material={MAT.vc} castShadow receiveShadow /></group></Place>;
}
function DewPool({ inst, occupied, count }) {
  const [g] = useSize('HotTub', inst, count); const on = busy(inst, occupied); const water = useNightGlow(0.6, 1.6, { opacity: 0.9 });
  const geo = useMemo(() => { const P = [[G.cyl(1.2, 1.2, 0.1, 20), '#3a4a40', [0, 0.02, 0]]]; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P.push([G.dodec(0.32), i % 2 ? '#8a8f86' : '#7a7f76', [Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3], [i, i * 2, 0], [1, 1.2, 1]], [G.sph(0.2, 6, 4), MOSS, [Math.cos(a) * 1.3, 0.55, Math.sin(a) * 1.3], [0, 0, 0], [1.2, 0.4, 1]]); } return mergeParts(P); }, []);
  const wg = useMemo(() => mergeParts([[G.cyl(1.17, 1.17, 0.02, 24), '#5ad8c8', [0, 0, 0]]]), []);
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /><mesh geometry={wg} material={water} position={[0, 0.36, 0]} />
    <Rising n={on ? 14 : 8} r={0.9} h={1.3} y0={0.36} color="#dfffee" size={0.22} speed={0.25} opacity={0.3} /></Place>);
}
// ---------- forest decor ----------
export function GiantShrooms() {
  const { layout } = useWorld(); const m = useNightGlow(0.85, 2.0); const fl = useNightGlow(0.7, 2.4);
  const geo = useMemo(() => { const r = seeded(611); const P = [], Gl = [], F = []; const R = layout.R;
    scatter(layout, r, Math.round(R * 0.9), R * 0.45, R + 1.2, 2.6, [], 0.5, (x, z, a, rr) => !camSide(a, rr > R * 0.8 ? 0.6 : 1.2)).forEach(([x, z], i) => { const y = layout.groundY(x, z) - 0.05; const h = 1.6 + r() * 2.2; const cr = 0.7 + r() * 0.8;
      P.push([G.cyl(cr * 0.22, cr * 0.32, h, 8), STALK, [x, y + h / 2, z], [0, 0, (r() - 0.5) * 0.12]], [G.cyl(cr * 0.5, cr * 0.5, 0.04, 10), '#e8dcc0', [x, y + h - 0.2, z]]);
      Gl.push([G.dome(cr, 14, 7), i % 3 ? CAPS[i % 5] : GLOW[i % 5], [x, y + h - 0.1, z], [0, 0, 0], [1, 0.55, 1]]);
      for (let k = 0; k < 5; k++) { const a = r() * 6.28, el = 0.3 + r() * 0.8; Gl.push([G.sph(cr * 0.13, 6, 4), '#fffaf0', [x + Math.cos(a) * cr * Math.cos(el), y + h - 0.1 + Math.sin(el) * cr * 0.55, z + Math.sin(a) * cr * Math.cos(el)], [0, 0, 0], [1, 0.5, 1]]); }
      for (let k = 0; k < 3; k++) { const a = r() * 6.28, d = 0.5 + r() * 0.6; glowShroom(P, Gl, x + Math.cos(a) * d, y, z + Math.sin(a) * d, 0.25 + r() * 0.3, 0.12 + r() * 0.1, GLOW[(i + k) % 5]); } });
    scatter(layout, r, Math.round(R * 1.6), layout.plazaFoot + 1.0, R + 1.0, 1.2, [], 0.2, (x, z, a) => !camSide(a, 0.45)).forEach(([x, z], i) => { const y = layout.groundY(x, z); const c = GLOW[i % 5];
      for (let k = 0; k < 3; k++) { const ox = (r() - 0.5) * 0.5, oz = (r() - 0.5) * 0.5, h = 0.25 + r() * 0.35; P.push([G.cyl(0.015, 0.015, h, 3), '#4a8a3a', [x + ox, y + h / 2, z + oz]]); F.push([G.ico(0.07, 0), c, [x + ox, y + h, z + oz]]); } });
    return { p: mergeParts(P), g: mergeParts(Gl), f: F.length ? mergeParts(F) : null }; }, [layout]);
  return <group><mesh geometry={geo.p} material={MAT.vc} castShadow receiveShadow /><mesh geometry={geo.g} material={m} castShadow /><mesh geometry={geo.f} material={fl} /></group>;
}
export const Spores = () => <Twinkles color="#b8ffc8" count={300} size={2.4} rise={0.18} H={6} opacity={0.8} dayFade={0.6} />;
export function ForestRim() {
  const { layout } = useWorld();
  const geo = useMemo(() => { if (layout.surround === 'land') return null; const r = seeded(621); const P = []; const E = layout.extent;
    for (let i = 0; i < dens(70, 0.5); i++) { const a = BACK + (r() - 0.5) * 3.8; const rr = E * (2.3 + r() * 1.2); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const h = 10 + r() * 18;
      P.push([G.cyl(0.6, 1.0, h * 0.5, 6), '#3a2a1e', [x, -2 + h * 0.25, z]], [G.cone(h * 0.25, h * 0.7, 7), ['#1f4a2a', '#2a5a30', '#183e24'][Math.floor(r() * 3)], [x, -2 + h * 0.55, z]]);
      if (r() < 0.3) P.push([G.dome(4 + r() * 4, 12, 6), CAPS[Math.floor(r() * 5)], [x + 6, -2 + 6 + r() * 4, z], [0, 0, 0], [1, 0.5, 1]], [G.cyl(0.8, 1.2, 8, 7), STALK, [x + 6, 1, z]]); }
    return mergeParts(P); }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vcFlat} /> : null;
}

EXT.lab.stump = StumpLab; EXT.holo.stump = '#9dffb0';
EXT.ring.fairy = FairyRing; EXT.holo.fairy = '#d8a8ff';
EXT.bar.tavern = tavernBar; EXT.barExtra.tavern = TavernExtra;
EXT.torch.glowshroom = ShroomLamp;
EXT.dock.lily = LilyDeco; EXT.vessel.lily = LeafBoat;
EXT.plaza.wisp = WispPlaza;
EXT.post.shroom = ShroomPost; EXT.hamCol.shroom = ['#5aa03a', '#efe4cc', '#4a8a30', '#d8433a'];
EXT.fun['Trampoline:shroom'] = ShroomTrampoline; EXT.fun['HotTub:dew'] = DewPool;
