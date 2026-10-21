// Old West pieces: false-front shacks with porches, a telegraph-office lab, an assay office research ring, the
// saloon (bar, balcony, lanterns), a riverboat landing, ranch-post hammocks, oil-lantern posts, a shooting range
// hangout (cans + targets that pop), Main Street storefronts, cacti, water tower, windmill, wagons, hay, barrels,
// tumbleweeds rolling through town, buzzards and red mesas on the horizon.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, FlickerLight } from './Structures.jsx';
import { Decor } from './Realms.jsx';
import { scatter } from './Vegetation.jsx';
import { Rising, Place, useSize, busy } from './Fun.jsx';
import { EXT } from './ext.js';
import { SHOTS } from '../Blob.jsx';
import { BACK, camSide, backPts, sel, useNightGlow, hashStr, nightK } from './townkit.jsx';
import { seeded, botColor } from '../util.js';

const WD = '#8a5e3a', WD2 = '#a0724a', WD_D = '#5e3e26', WD_L = '#b8895a', TIN = '#8f959e', LAMP = '#ffb35a';
const PAINT = ['#b8895a', '#9a6a44', '#c9a27a', '#8a8f7a', '#a85a3a', '#c4b49a'];
const planks = (P, w, h, z, color, n, y0 = 0, x0 = 0, rotY = 0) => { for (let i = 0; i < n; i++) { const x = x0 - w / 2 + (i + 0.5) * (w / n); P.push([G.box(w / n - 0.02, h, 0.08), i % 2 ? color : WD2, rotY ? [z, y0 + h / 2, x] : [x, y0 + h / 2, z], [0, rotY, 0]]); } };

// ---------- shack home ----------
const shackBase = () => cached('shackBase', () => { const f = 0.35; const P = [[G.box(3.4, 0.35, 3.1), WD_D, [0, 0.17, -0.1]], [G.box(3.3, 0.04, 3.0), WD2, [0, f, -0.1]], [G.box(3.4, 0.08, 1.0), WD_L, [0, f - 0.02, 1.85]]];
  for (let i = 0; i < 2; i++) P.push([G.box(1.0, 0.12, 0.3), WD, [0, 0.06 + i * 0.12, 2.5 - i * 0.25]]);
  [-1.6, 1.6].forEach((x) => P.push([G.box(0.12, 1.9, 0.12), WD_D, [x, f + 0.95, 2.28]])); P.push([G.box(3.4, 0.08, 0.06), WD_D, [0, f + 0.55, 2.28]]);
  P.push([G.cyl(0.25, 0.25, 0.55, 10), '#7a5232', [1.35, f + 0.28, 1.85]], [G.torus(0.25, 0.02, 4, 12), '#3a3a3a', [1.35, f + 0.45, 1.85], [Math.PI / 2, 0, 0]]); // barrel
  P.push([G.box(0.5, 0.06, 0.5), WD, [-1.1, f + 0.4, 1.9]], [G.box(0.5, 0.6, 0.06), WD, [-1.1, f + 0.7, 1.65], [-0.15, 0, 0]], [G.torus(0.3, 0.025, 4, 10, Math.PI), WD_D, [-1.1, f + 0.02, 1.9], [0, Math.PI / 2, 0]]); // rocking chair
  P.push([G.box(0.6, 0.6, 0.5), WD_D, [1.15, f + 0.3, -0.95]], [G.cyl(0.08, 0.08, 0.2, 8), '#c9a24a', [1.15, f + 0.7, -0.95]]); // nightstand + lamp base
  return mergeParts(P); });
const shackShell = (tone) => cached(`shackShell${tone}`, () => { const f = 0.35, H = 1.7; const P = []; const C = PAINT[tone];
  planks(P, 3.2, H, -1.55, C, 10, f); planks(P, 3.0, H, -1.6, C, 9, f, -0.1, Math.PI / 2); planks(P, 3.0, H, 1.6, C, 9, f, -0.1, Math.PI / 2);
  P.push([G.box(1.15, H, 0.08), C, [-1.02, f + H / 2, 1.35]], [G.box(1.15, H, 0.08), C, [1.02, f + H / 2, 1.35]], [G.box(0.9, 0.35, 0.08), C, [0, f + H - 0.17, 1.35]]);
  P.push([G.box(3.5, 1.3, 0.1), C, [0, f + H + 0.6, 1.42]], [G.box(3.6, 0.12, 0.16), WD_D, [0, f + H + 1.28, 1.44]], [G.box(2.4, 0.36, 0.04), '#f4e6c8', [0, f + H + 0.7, 1.48]]); // false front + sign board
  const y0 = f + H; [-1, 1].forEach((s) => P.push([G.box(1.9, 0.06, 3.3), TIN, [s * 0.82, y0 + 0.45, -0.1], [0, 0, -s * 0.5]])); P.push([G.box(0.12, 0.1, 3.3), '#6f757e', [0, y0 + 0.9, -0.1]]);
  P.push([G.box(3.5, 0.06, 1.1), TIN, [0, f + 1.95, 1.85], [0.18, 0, 0]]); // porch roof
  P.push([G.box(0.3, 0.9, 0.3), '#7a6a5a', [0.9, y0 + 0.6, -0.9]]); // chimney
  return mergeParts(P); });
const shackWin = () => cached('shackWin', () => mergeParts([[G.box(0.6, 0.55, 0.04), LAMP, [-1.0, 1.35, 1.4]], [G.box(0.6, 0.55, 0.04), LAMP, [1.0, 1.35, 1.4]], [G.box(0.04, 0.55, 0.6), LAMP, [1.65, 1.35, -0.4]], [G.box(0.04, 0.55, 0.6), LAMP, [-1.65, 1.35, -0.4]]]));
export function Shack({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor; const tone = hashStr(bot.id) % PAINT.length;
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), []); const win = useNightGlow(0.35, 2.0, { flicker: 0.08 });
  useCutaway(home, selected, [shell, win], 0.1, 10); const lamp = useLantern(asleep, LAMP); const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={shackBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={shackShell(tone)} material={shell} castShadow receiveShadow />
    <mesh geometry={shackWin()} material={win} />
    <mesh position={[0, f + 1.7 + 0.7, 1.51]}><boxGeometry args={[2.2, 0.08, 0.02]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, f + 1.7 + 1.37, 1.44]}><boxGeometry args={[3.6, 0.06, 0.18]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[1.15, f + 0.9, -0.95]}><sphereGeometry args={[0.11, 10, 8]} /><meshBasicMaterial ref={lamp} toneMapped={false} /></mesh>
    <Bed color={color} inBed={inBed} position={[-0.1, f, -0.45]} />
    <HomeSign bot={bot} color={color} position={[0, 0.5, 2.8]} />
  </group>);
}
// ---------- oil lantern post (theme torch) ----------
function LanternPost({ position, light, h = 1.7, seed = 0 }) {
  const m = useNightGlow(0.5, 2.6, { flicker: 0.1 });
  const geo = cached(`lpost${h}`, () => mergeParts([[G.box(0.1, h, 0.1), WD_D, [0, h / 2, 0]], [G.box(0.4, 0.06, 0.06), WD_D, [0.17, h - 0.05, 0]], [G.box(0.16, 0.04, 0.16), '#2a2420', [0.32, h - 0.2, 0]], [G.box(0.16, 0.04, 0.16), '#2a2420', [0.32, h - 0.44, 0]], [G.cone(0.1, 0.1, 4), '#2a2420', [0.32, h - 0.13, 0], [0, Math.PI / 4, 0]]]));
  const glass = cached('lpostGlass', () => mergeParts([[G.box(0.12, 0.2, 0.12), LAMP, [0, 0, 0]]]));
  return (<group position={position}><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={glass} material={m} position={[0.32, h - 0.32, 0]} />
    {light && <FlickerLight position={[0.32, h - 0.3, 0]} intensity={3.5} distance={7} seed={seed} color={LAMP} />}</group>);
}
// ---------- telegraph office lab ----------
function TelegraphLab() {
  const geo = cached('labTelegraph', () => { const P = [[G.cyl(3.15, 3.25, 0.28, 8), WD_D, [0, 0.06, 0], [0, Math.PI / 8, 0]]];
    for (let i = 0; i < 12; i++) { const z = -2.8 + i * 0.51; const w = 2 * Math.sqrt(Math.max(0, 9 - z * z)) - 0.1; P.push([G.box(w, 0.04, 0.48), i % 2 ? WD2 : WD_L, [0, 0.22, z]]); }
    const back = backPts(4, 3.15, 2.6); back.forEach(([x, z, a]) => P.push([G.cyl(0.09, 0.12, 4.0, 7), WD_D, [x, 2.1, z]], [G.box(1.1, 0.08, 0.1), WD_D, [x, 3.8, z], [0, -a + Math.PI / 2, 0]], ...[-0.4, 0.4].map((o) => [G.cyl(0.04, 0.04, 0.1, 6), '#6fae8a', [x + Math.cos(a + Math.PI / 2) * o, 3.88, z + Math.sin(a + Math.PI / 2) * o]])));
    for (let i = 0; i < back.length - 1; i++) { const [x1, z1] = back[i], [x2, z2] = back[i + 1]; const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(z2 - z1, x2 - x1); [-0.4, 0.4].forEach((o) => { const ox = Math.cos(a) * 0, oz = 0; P.push([G.cyl(0.012, 0.012, L, 3), '#2a2420', [(x1 + x2) / 2 + Math.sin(-a) * 0 + ox, 3.75, (z1 + z2) / 2 + oz], [0, -a, Math.PI / 2]]); }); }
    P.push([G.box(1.3, 0.75, 0.6), WD, [Math.cos(BACK) * 2.0, 0.6, Math.sin(BACK) * 2.0], [0, -BACK + Math.PI / 2, 0]], [G.box(0.25, 0.08, 0.15), '#c9a24a', [Math.cos(BACK) * 2.0, 1.02, Math.sin(BACK) * 2.0], [0, -BACK, 0]]);
    [[0.5, 0], [0.9, 0.4]].forEach(([d, k]) => { const a = BACK + 1.1 + d; P.push([G.box(0.6, 0.5, 0.6), '#9a7a4a', [Math.cos(a) * 2.7, 0.47 + k * 0, Math.sin(a) * 2.7], [0, a, 0]]); });
    return mergeParts(P); });
  return <group><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    {[0.3, 2.0].map((a, i) => <LanternPost key={i} position={[Math.cos(a) * 2.85, 0.24, Math.sin(a) * 2.85]} seed={i} />)}</group>;
}
// ---------- assay office ring: fence, mine cart on rails, barrels, gold ----------
function AssayRing() {
  const geo = cached('ringAssay', () => { const P = [[G.cyl(2.5, 2.65, 0.14, 16), '#b89a6a', [0, 0.05, 0]]];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; if (Math.abs(((a - BACK + 9.42) % 6.283) - 3.14) < 0.5) continue; P.push([G.box(0.1, 0.8, 0.1), WD_D, [Math.cos(a) * 2.55, 0.4, Math.sin(a) * 2.55]], [G.box(1.3, 0.07, 0.05), WD, [Math.cos(a + 0.26) * 2.5, 0.65, Math.sin(a + 0.26) * 2.5], [0, -a - 0.26 + Math.PI / 2, 0]]); }
    const cx = Math.cos(BACK) * 2.6, cz = Math.sin(BACK) * 2.6, ra = -BACK + Math.PI / 2;
    [-0.3, 0.3].forEach((o) => P.push([G.box(2.6, 0.05, 0.05), '#5a5e66', [cx + Math.cos(BACK) * o, 0.15, cz + Math.sin(BACK) * o], [0, ra, 0]]));
    for (let k = -3; k <= 3; k++) P.push([G.box(0.12, 0.05, 0.8), WD_D, [cx + Math.cos(BACK + Math.PI / 2) * k * 0.4, 0.12, cz + Math.sin(BACK + Math.PI / 2) * k * 0.4], [0, ra, 0]]);
    P.push([G.box(0.9, 0.5, 0.6), '#6a6e76', [cx, 0.55, cz], [0, ra, 0]], ...[-0.3, 0.3].flatMap((o) => [-0.25, 0.25].map((q) => [G.cyl(0.12, 0.12, 0.06, 10), '#2a2a2a', [cx + Math.cos(BACK + Math.PI / 2) * o + Math.cos(BACK) * q, 0.3, cz + Math.sin(BACK + Math.PI / 2) * o + Math.sin(BACK) * q], [0, ra, Math.PI / 2, 'YXZ']])));
    for (let i = 0; i < 6; i++) P.push([G.dodec(0.1), '#ffd23f', [cx + (i % 3 - 1) * 0.18, 0.85 + Math.floor(i / 3) * 0.08, cz + (Math.floor(i / 3) - 0.5) * 0.15]]);
    [BACK + 0.8, BACK - 0.8].forEach((a) => P.push([G.cyl(0.28, 0.25, 0.7, 10), '#7a5232', [Math.cos(a) * 2.35, 0.4, Math.sin(a) * 2.35]], [G.torus(0.28, 0.02, 4, 12), '#3a3a3a', [Math.cos(a) * 2.35, 0.6, Math.sin(a) * 2.35], [Math.PI / 2, 0, 0]]));
    P.push([G.box(0.05, 0.9, 0.05), WD_D, [Math.cos(BACK - 1.3) * 2.3, 0.5, Math.sin(BACK - 1.3) * 2.3], [0, 0, 0.3]], [G.box(0.5, 0.06, 0.06), '#7a7e86', [Math.cos(BACK - 1.3) * 2.3 + 0.13, 0.95, Math.sin(BACK - 1.3) * 2.3], [0, 0, 0.3]]); // pickaxe
    return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />;
}
// ---------- saloon ----------
function saloonBar() { const P = [], SP = [];
  P.push([G.box(6.0, 0.2, 3.6), WD_D, [0, 0.1, 0.1]]); for (let i = 0; i < 12; i++) P.push([G.box(0.48, 0.03, 3.5), i % 2 ? WD2 : WD_L, [-2.75 + i * 0.5, 0.21, 0.1]]);
  P.push([G.box(4.6, 0.95, 0.6), '#6a4224', [0, 0.65, 0]], [G.box(4.9, 0.08, 0.85), '#8a5a34', [0, 1.15, 0.05]], [G.box(4.7, 0.06, 0.05), '#c9a24a', [0, 0.35, 0.32]]);
  P.push([G.box(5.6, 2.9, 0.16), '#9a6a44', [0, 1.6, -1.5]], [G.box(2.2, 1.0, 0.04), '#b8c8cc', [0, 2.0, -1.4]], [G.box(2.4, 1.15, 0.04), '#c9a24a', [0, 2.0, -1.42]]);
  [1.2, 1.6].forEach((y) => P.push([G.box(1.4, 0.05, 0.3), WD_D, [-1.95, y, -1.3]], [G.box(1.4, 0.05, 0.3), WD_D, [1.95, y, -1.3]]));
  for (let i = 0; i < 8; i++) P.push([G.cyl(0.05, 0.06, 0.28, 6), ['#6a3a1a', '#2e5a2a', '#8a6a2a', '#5a1a1a'][i % 4], [(i < 4 ? -2.4 : 1.5) + (i % 4) * 0.3, 1.38 + (i % 2) * 0.4, -1.3]]);
  P.push([G.box(6.2, 2.0, 0.16), '#a87a4e', [0, 3.6, -1.52]], [G.box(6.3, 0.14, 0.24), WD_D, [0, 4.62, -1.5]], [G.box(3.4, 0.6, 0.06), '#f4e6c8', [0, 3.9, -1.42]], [G.box(3.5, 0.06, 0.08), '#8a1a1a', [0, 3.58, -1.4]]); // tall false front + sign
  P.push([G.box(6.0, 0.12, 1.6), WD, [0, 2.95, 0.9]]); for (let i = 0; i <= 12; i++) P.push([G.box(0.05, 0.5, 0.05), WD_D, [-2.95 + i * 0.49, 3.25, 1.68]]); P.push([G.box(6.0, 0.06, 0.08), WD_D, [0, 3.5, 1.68]]); // balcony
  [[-2.9, 1.6], [2.9, 1.6], [-2.9, -1.4], [2.9, -1.4]].forEach(([x, z]) => P.push([G.box(0.16, 2.9, 0.16), WD_D, [x, 1.5, z]]));
  P.push([G.box(0.9, 0.9, 0.5), '#2a1a12', [2.3, 0.65, -1.15]], [G.box(0.9, 0.08, 0.3), '#f4efe6', [2.3, 0.85, -0.88]]); // piano
  SP.push([G.cyl(0.05, 0.07, 0.55, 6), WD_D, [0, 0.47, 1.05]], [G.cyl(0.27, 0.25, 0.08, 12), '#8a1a1a', [0, 0.76, 1.05]]);
  return { bar: mergeParts(P), stool: mergeParts(SP) }; }
function SaloonExtra({ X, primary }) {
  const m = useNightGlow(0.5, 2.6, { flicker: 0.1 }); const lan = cached('saloonLanterns', () => mergeParts([-2, -0.7, 0.7, 2].map((x) => [G.box(0.16, 0.24, 0.16), LAMP, [x, 2.6, 1.55]])));
  const doors = cached('saloonDoors', () => mergeParts([-0.32, 0.32].map((x) => [G.box(0.55, 0.65, 0.05), '#7a4a2a', [x, 1.0, 1.75]])));
  return (<><mesh geometry={lan} material={m} /><mesh geometry={doors} material={MAT.vcFlat} castShadow />
    <group position={[X(3.5), 0, 0.8]}><mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.3, 0.27, 0.8, 10]} /><meshStandardMaterial color="#7a5232" /></mesh><mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.3, 0.02, 4, 12]} /><meshStandardMaterial color="#3a3a3a" /></mesh></group>
    {primary && <FlickerLight position={[0, 2.4, 1.2]} intensity={5} distance={9} min={0.15} color={LAMP} />}</>);
}
SaloonExtra.signY = 5.1;
// ---------- riverboat landing ----------
function LandingDeco({ from, to }) {
  const geo = cached(`landing_${from.toFixed(2)}_${to.toFixed(2)}`, () => { const P = [];
    [[1.8, to - 0.6], [-1.9, to + 0.6]].forEach(([x, z], i) => { P.push([G.cyl(0.26, 0.24, 0.65, 10), '#7a5232', [x, 0.36, z]], [G.box(0.55, 0.55, 0.55), '#9a7a4a', [x + 0.65, 0.31, z + 0.1], [0, i, 0]]); });
    for (let s = from + 0.8; s < to - 0.8; s += 1.3) [-0.7, 0.7].forEach((x) => P.push([G.cyl(0.08, 0.09, 0.6, 6), WD_D, [x, 0.3, s]]));
    [-0.7, 0.7].forEach((x) => P.push([G.cyl(0.025, 0.025, to - from - 1.6, 4), '#c9b896', [x, 0.5, (from + to) / 2], [Math.PI / 2, 0, 0]]));
    return mergeParts(P); });
  return <mesh geometry={geo} material={MAT.vcFlat} castShadow />;
}
function Riverboat({ mid }) {
  const { env } = useWorld(); const ref = useRef(); const wheel = useRef(); const win = useNightGlow(0.4, 2.2);
  useFrame(({ clock }, dt) => { const t = clock.elapsedTime; if (ref.current) { ref.current.position.y = -0.05 + Math.sin(t * 1.0) * 0.04; ref.current.rotation.z = Math.sin(t * 0.8) * 0.02 * (1 + (env.current?.wind ?? 0)); } if (wheel.current) wheel.current.rotation.x -= dt * 0.8; });
  const hull = cached('steamerHull', () => mergeParts([[G.box(1.9, 0.5, 4.6), '#f4efe6', [0, 0.05, 0]], [G.cone(0.95, 1.1, 4), '#f4efe6', [0, 0.05, 2.85], [Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.5]], [G.box(1.92, 0.12, 4.62), '#8a1a1a', [0, -0.12, 0]],
    [G.box(1.7, 0.7, 2.6), '#f4efe6', [0, 0.65, -0.4]], [G.box(2.0, 0.08, 3.0), '#5a3a24', [0, 1.02, -0.4]], [G.box(1.2, 0.5, 1.2), '#f4efe6', [0, 1.3, -0.2]], [G.box(1.4, 0.06, 1.4), '#5a3a24', [0, 1.58, -0.2]],
    ...[-0.35, 0.35].flatMap((x) => [[G.cyl(0.11, 0.13, 1.6, 8), '#2a2420', [x, 2.2, 0.6]], [G.cyl(0.18, 0.11, 0.2, 8), '#2a2420', [x, 3.05, 0.6]]])]));
  const w = cached('steamerWin', () => mergeParts([-1.1, -0.4, 0.3].flatMap((z) => [-0.86, 0.86].map((x) => [G.box(0.04, 0.3, 0.35), LAMP, [x, 0.7, z - 0.4]]))));
  const wh = cached('steamerWheel', () => mergeParts([[G.torus(0.75, 0.05, 4, 16), '#8a1a1a', [0, 0, 0], [0, Math.PI / 2, 0]], ...Array.from({ length: 8 }, (_, i) => [G.box(0.5, 0.06, 1.4), '#8a1a1a', [0, 0, 0], [i * 0.39, 0, 0]])]));
  return (<group ref={ref} position={[-2.2, 0, mid - 0.4]}><mesh geometry={hull} material={MAT.vcFlat} castShadow /><mesh geometry={w} material={win} />
    <group ref={wheel} position={[0, 0.35, -2.75]}><mesh geometry={wh} material={MAT.vcFlat} castShadow /></group>
    {[-0.35, 0.35].map((x) => <group key={x} position={[x, 3.1, 0.6]}><Rising n={6} r={0.1} h={1.4} color="#d8d4ce" size={0.18} speed={0.25} opacity={0.35} drift={0.4} /></group>)}</group>);
}
// ---------- ranch posts (hammocks) ----------
function RanchPost({ x, y, z }) {
  const geo = cached('ranchPost', () => mergeParts([[G.cyl(0.11, 0.14, 2.5, 7), WD_D, [0, 1.25, 0]], [G.box(0.5, 0.1, 0.1), WD_D, [0, 2.3, 0]], [G.sph(0.12, 6, 5), '#efe6d2', [0, 2.6, 0], [0, 0, 0], [1.3, 0.8, 0.8]], [G.cone(0.05, 0.25, 5), '#efe6d2', [0.18, 2.68, 0], [0, 0, -1.1]], [G.cone(0.05, 0.25, 5), '#efe6d2', [-0.18, 2.68, 0], [0, 0, 1.1]]]));
  return <mesh geometry={geo} material={MAT.vcFlat} position={[x, y, z]} castShadow />;
}
// ---------- shooting range (grows sideways with the shooters) ----------
function ShootingRange({ inst, occupied, count }) {
  const [g, cur] = useSize('Range', inst, count); const cans = useRef();
  const fence = useMemo(() => { const P = [[G.box(3.4, 0.08, 0.14), WD, [0, 0.9, -1.8]], [G.box(3.4, 0.08, 0.14), WD, [0, 0.5, -1.8]], [G.box(3.6, 0.04, 2.0), '#c9a87a', [0, 0.02, 0.6]]];
    for (let i = 0; i < 5; i++) P.push([G.box(0.12, 1.05, 0.12), WD_D, [-1.6 + i * 0.8, 0.52, -1.8]]);
    P.push([G.box(3.4, 0.06, 0.06), '#f4efe6', [0, 0.03, 1.6]]); return mergeParts(P); }, []);
  const fixed = useMemo(() => mergeParts([[G.box(1.0, 0.55, 0.6), '#d8b45a', [0, 0.28, 0]], [G.box(1.02, 0.04, 0.62), '#b8943a', [0, 0.38, 0]], [G.box(1.02, 0.04, 0.62), '#b8943a', [0, 0.18, 0]],
    [G.cyl(0.05, 0.05, 1.2, 6), WD_D, [0, 0.6, -0.9]], [G.cyl(0.45, 0.45, 0.06, 18), '#f4efe6', [0, 1.2, -0.88], [Math.PI / 2, 0, 0]], [G.cyl(0.32, 0.32, 0.07, 18), '#c0392b', [0, 1.2, -0.87], [Math.PI / 2, 0, 0]], [G.cyl(0.18, 0.18, 0.08, 18), '#f4efe6', [0, 1.2, -0.86], [Math.PI / 2, 0, 0]], [G.cyl(0.07, 0.07, 0.09, 12), '#c0392b', [0, 1.2, -0.85], [Math.PI / 2, 0, 0]]]), []);
  // cans react to the blobs' real shots (SHOTS from Blob.jsx): the can nearest each shooter's line of fire flies off the
  // fence, tumbles, lies in the dirt, then pops back up; with nobody shooting they just stand there
  const hits = useRef([]); const seen = useRef(performance.now()); const tmpV = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => { const c = cans.current; if (!c) return; const sx = cur.current?.[0] ?? 1; const now = performance.now(); const n = c.children.length; const H = hits.current;
    for (const sh of SHOTS) if (sh.t > seen.current) { seen.current = sh.t; tmpV.copy(sh.p); c.worldToLocal(tmpV); if (Math.abs(tmpV.z) > 6 || Math.abs(tmpV.x) > 3 * sx + 2) continue;
      let best = -1, bd = 1e9; for (let i = 0; i < n; i++) { if (H[i] && now - H[i] < 2600) continue; const d = Math.abs((-1.5 + (i / (n - 1)) * 3.0) * sx - tmpV.x); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) H[best] = now + 120; } // lands a beat after the flash
    c.children.forEach((m, i) => { m.position.x = (-1.5 + (i / (n - 1)) * 3.0) * sx; const k = H[i] ? (now - H[i]) / 1000 : 9;
      if (k < 0 || k >= 2.6) { m.position.y = 0.99; m.position.z = -1.8; m.rotation.set(0, 0, 0); m.scale.setScalar(1); }
      else if (k < 0.6) { const u = k / 0.6; m.position.y = 0.99 + Math.sin(u * Math.PI) * 0.55 - u * 0.9; m.position.z = -1.8 - u * 1.0; m.rotation.x = -u * 14; m.rotation.z = u * 3; }
      else if (k < 2.2) { m.position.y = 0.08; m.position.z = -2.8; m.rotation.set(Math.PI / 2, 0, 0.6); }
      else { const u = (k - 2.2) / 0.4; m.position.y = 0.99; m.position.z = -1.8; m.rotation.set(0, 0, 0); m.scale.setScalar(Math.min(1, u * 1.2)); } }); });
  const ends = (s) => <group key={s} ref={null}><SideBale s={s} cur={cur} geo={fixed} /></group>;
  return (<Place inst={inst} g={g} fixed={<>{[-1, 1].map(ends)}<group ref={cans}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} castShadow><cylinderGeometry args={[0.07, 0.07, 0.16, 8]} /><meshStandardMaterial color={['#c0392b', '#bdc3c7', '#27ae60', '#f1c40f'][i % 4]} metalness={0.5} roughness={0.4} /></mesh>)}</group></>}>
    <mesh geometry={fence} material={MAT.vcFlat} castShadow receiveShadow /></Place>);
}
function SideBale({ s, cur, geo }) { const r = useRef(); useFrame(() => { if (r.current) r.current.position.x = s * (1.75 * (cur.current?.[0] ?? 1) + 0.6); }); return <group ref={r} position={[s * 2.35, 0, -0.6]}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /></group>; }
// ---------- Main Street storefronts + props ----------
const SHOPS = [['#c9a27a', '#2e5a8a'], ['#a85a3a', '#f4e6c8'], ['#8a8f7a', '#8a1a1a'], ['#c4b49a', '#2e6a3a'], ['#9a6a44', '#c9a24a']];
export function MainStreet() {
  const { layout } = useWorld(); const win = useNightGlow(0.3, 2.0, { flicker: 0.06 });
  const geo = useMemo(() => { const r = seeded(411); const P = [], W = []; const R = layout.R;
    scatter(layout, r, Math.round(2 + R * 0.35), R * 0.45, R + 0.3, 3.8, [], 1.6, (x, z, a, rr) => !camSide(a, rr > R * 0.8 ? 0.9 : 1.4) && !layout.homes.some((h) => Math.hypot(h.x - x, h.z - z) < h.foot + 3))
      .forEach(([x, z]) => { const y = layout.groundY(x, z); const a = Math.atan2(-z, -x); const [wall, trim] = SHOPS[Math.floor(r() * SHOPS.length)]; const w = 2.2 + r() * 0.8, d = 2.0, h = 1.8 + r() * 0.8;
        const L = (lx, lz) => [x + lx * Math.cos(a) - lz * Math.sin(a), z + lx * Math.sin(a) + lz * Math.cos(a)]; const ry = -a + Math.PI / 2;
        const at = (lx, ly, lz) => { const [px, pz] = L(lz, lx); return [px, y + ly, pz]; };
        P.push([G.box(w, h, d), wall, at(0, h / 2, 0), [0, ry, 0]], [G.box(w + 0.2, h * 0.55, 0.1), wall, at(0, h + h * 0.27, d / 2), [0, ry, 0]], [G.box(w + 0.3, 0.1, 0.16), trim, at(0, h + h * 0.55, d / 2), [0, ry, 0]],
          [G.box(w * 0.7, 0.32, 0.04), '#f4e6c8', at(0, h + 0.3, d / 2 + 0.06), [0, ry, 0]], [G.box(w + 0.2, 0.05, 0.9), trim, at(0, h - 0.15, d / 2 + 0.45), [0, ry, 0], [1, 1, 1]], [G.box(w + 0.2, 0.08, 1.0), WD2, at(0, 0.05, d / 2 + 0.5), [0, ry, 0]]);
        [-1, 1].forEach((k) => P.push([G.box(0.08, h - 0.15, 0.08), WD_D, at(k * (w / 2), (h - 0.15) / 2, d / 2 + 0.9), [0, ry, 0]]));
        P.push([G.box(0.5, 0.95, 0.04), '#3a2418', at(0, 0.5, d / 2 + 0.01), [0, ry, 0]]); [-1, 1].forEach((k) => W.push([G.box(0.5, 0.5, 0.04), LAMP, at(k * w * 0.3, 0.95, d / 2 + 0.02), [0, ry, 0]])); });
    return { b: P.length ? mergeParts(P) : null, w: W.length ? mergeParts(W) : null }; }, [layout]);
  return <group>{geo.b && <mesh geometry={geo.b} material={MAT.vcFlat} castShadow receiveShadow />}{geo.w && <mesh geometry={geo.w} material={win} />}</group>;
}
export function WestProps() {
  return (<>
    <Decor seed={421} n={(L) => L.R * 0.9} band={(L) => [L.plazaFoot + 1.2, L.R + 1.6]} minD={2.2} margin={0.4} accept={(x, z, a, rr, L) => !camSide(a, rr > L.R * 0.8 ? 0.55 : 1.1)}
      build={(P, x, y, z, r) => { const h = 1.3 + r() * 1.4; const c = r() < 0.5 ? '#4f7a3a' : '#5a8a42'; P.push([G.cyl(0.17, 0.2, h, 8), c, [x, y + h / 2, z]], [G.sph(0.17, 8, 5), c, [x, y + h, z]]);
        for (const k of [-1, 1]) if (r() < 0.75) { const ay = y + h * (0.35 + r() * 0.25); const L = 0.3 + r() * 0.15, up = 0.35 + r() * 0.4; P.push([G.cyl(0.1, 0.1, L, 6), c, [x + k * L / 2, ay, z], [0, 0, Math.PI / 2]], [G.cyl(0.1, 0.1, up, 6), c, [x + k * L, ay + up / 2, z]], [G.sph(0.1, 6, 4), c, [x + k * L, ay + up, z]]); }
        if (r() < 0.3) P.push([G.sph(0.06, 6, 4), '#ff6fa8', [x, y + h + 0.17, z]]); }} />
    <Decor seed={425} n={(L) => L.R * 0.6} band={(L) => [L.plazaFoot + 1.0, L.R + 0.4]} minD={2.0} margin={0.3} accept={(x, z, a) => !camSide(a, 0.6)}
      build={(P, x, y, z, r, a) => { const k = r(); if (k < 0.35) { P.push([G.cyl(0.26, 0.24, 0.7, 10), '#7a5232', [x, y + 0.35, z]], [G.torus(0.26, 0.02, 4, 12), '#3a3a3a', [x, y + 0.55, z], [Math.PI / 2, 0, 0]], [G.torus(0.26, 0.02, 4, 12), '#3a3a3a', [x, y + 0.15, z], [Math.PI / 2, 0, 0]]); }
        else if (k < 0.6) P.push([G.box(1.0, 0.5, 0.6), '#d8b45a', [x, y + 0.25, z], [0, -a, 0]], [G.box(0.9, 0.45, 0.55), '#d8b45a', [x + 0.1, y + 0.7, z], [0, -a + 0.3, 0]]);
        else if (k < 0.8) P.push([G.torus(0.42, 0.05, 4, 12), WD_D, [x, y + 0.42, z], [0, -a, 0.15]], ...Array.from({ length: 6 }, (_, i) => [G.box(0.04, 0.8, 0.04), WD_D, [x, y + 0.42, z], [i * 0.52, -a + Math.PI / 2, 0, 'YXZ']]));
        else P.push([G.box(0.65, 0.6, 0.65), '#9a7a4a', [x, y + 0.3, z], [0, r(), 0]], [G.box(0.5, 0.45, 0.5), '#a8865a', [x + 0.15, y + 0.82, z], [0, r(), 0]]); }} />
    <Decor seed={429} n={() => 1} band={(L) => [L.R * 0.6, L.R]} minD={5} margin={1.4} accept={(x, z, a) => !camSide(a, 1.5)}
      build={(P, x, y, z) => { for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; P.push([G.cyl(0.07, 0.09, 3.2, 6), WD_D, [x + Math.cos(a) * 0.65, y + 1.6, z + Math.sin(a) * 0.65], [Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]]); }
        P.push([G.cyl(0.95, 0.95, 1.4, 14), '#8a5e3a', [x, y + 3.8, z]], [G.cone(1.05, 0.7, 14), '#5e3e26', [x, y + 4.85, z]], [G.torus(0.96, 0.04, 4, 18), '#3a3a3a', [x, y + 3.4, z], [Math.PI / 2, 0, 0]], [G.torus(0.96, 0.04, 4, 18), '#3a3a3a', [x, y + 4.2, z], [Math.PI / 2, 0, 0]], [G.cyl(1.05, 1.05, 0.08, 14), WD_D, [x, y + 3.1, z]]); }} />
    <Windmill /><Wagon />
  </>);
}
function useSpot(seed, foot, lo = 0.55) { const { layout } = useWorld(); return useMemo(() => scatter(layout, seeded(seed), 1, layout.R * lo, layout.R + 0.2, 4, [], foot, (x, z, a) => !camSide(a, 1.4))[0] || null, [layout]); }
function Windmill() {
  const { layout } = useWorld(); const p = useSpot(433, 1.0); const blades = useRef(); useFrame((_, dt) => { if (blades.current) blades.current.rotation.z += dt * 1.2; });
  const tower = cached('windmill', () => { const P = []; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; P.push([G.cyl(0.04, 0.06, 4.6, 5), '#7a7e86', [Math.cos(a) * 0.45, 2.3, Math.sin(a) * 0.45], [Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09]]); } P.push([G.box(0.3, 0.3, 0.6), '#7a7e86', [0, 4.7, 0]], [G.box(0.04, 0.6, 0.9), '#8a1a1a', [0, 4.8, -0.7]]); return mergeParts(P); });
  const bl = cached('windmillBlades', () => mergeParts(Array.from({ length: 12 }, (_, i) => [G.box(0.12, 0.8, 0.02), '#c9ccd2', [Math.cos(i * 0.5236) * 0.5, Math.sin(i * 0.5236) * 0.5, 0], [0, 0, i * 0.5236 - Math.PI / 2]])));
  if (!p) return null; const y = layout.groundY(p[0], p[1]); const ry = Math.atan2(p[0], p[1]);
  return <group position={[p[0], y, p[1]]} rotation={[0, ry, 0]}><mesh geometry={tower} material={MAT.vcFlat} castShadow /><group ref={blades} position={[0, 4.75, 0.4]}><mesh geometry={bl} material={MAT.vcFlat} castShadow /></group></group>;
}
function Wagon() {
  const { layout } = useWorld(); const p = useSpot(437, 1.3, 0.5);
  const geo = cached('wagon', () => { const P = [[G.box(1.2, 0.3, 2.2), WD, [0, 0.75, 0]], [G.box(0.06, 1.4, 1.6), '#7a5232', [0, 0.8, 1.6], [1.2, 0, 0]]]; const cover = new THREE.CylinderGeometry(0.75, 0.75, 2.0, 12, 1, true, -Math.PI / 2, Math.PI); cover.rotateX(Math.PI / 2);
    P.push([cover, '#f4efe6', [0, 0.9, 0]]); for (const [x, z] of [[-0.65, 0.7], [0.65, 0.7], [-0.65, -0.7], [0.65, -0.7]]) P.push([G.torus(0.42, 0.05, 4, 14), WD_D, [x, 0.45, z], [0, Math.PI / 2, 0]], [G.cyl(0.03, 0.03, 0.84, 4), WD_D, [x, 0.45, z]], [G.cyl(0.03, 0.03, 0.84, 4), WD_D, [x, 0.45, z], [Math.PI / 2, 0, 0]]);
    return mergeParts(P); });
  if (!p) return null; return <mesh geometry={geo} material={MAT.vcFlat} position={[p[0], layout.groundY(p[0], p[1]), p[1]]} rotation={[0, Math.atan2(p[0], p[1]) + 1.3, 0]} castShadow receiveShadow />;
}
// tumbleweeds rolling across town + buzzards circling high up + mesas on the horizon (water mode)
export function Tumbleweeds() {
  const { layout, env } = useWorld(); const g = useRef(); const n = dens(34, 0.5); const base = 5; const E = layout.R + 4;
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => [i < base ? Math.random() * 6.28 : 0.5 + (Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.6, i < base ? (i - base / 2) * 2.2 : (Math.random() - 0.5) * E * 1.6, i < base ? 0.25 + Math.random() * 0.15 : 0.4 + Math.random() * 0.3, Math.random()]), [n]);
  const geo = cached('tumble', () => { const P = []; for (let i = 0; i < 9; i++) P.push([G.torus(0.25, 0.015, 3, 10), i % 2 ? '#a88a5a' : '#8a6a3a', [0, 0, 0], [i * 0.7, i * 1.3, 0]]); return mergeParts(P); });
  useFrame(({ clock }, dt) => { const gr = g.current; if (!gr) return; const tb = env.current?.tumble ?? 0; const w = 0.6 + (env.current?.wind ?? 0.5); gr.children.forEach((c, i) => { if (i >= base && tb < 0.3) { c.visible = false; return; } const [a, sp, off, r] = seeds[i]; const k = ((clock.elapsedTime * sp * w * (i >= base ? 0.09 : 0.12) + (i < base ? i / base : seeds[i][4])) % 1) * 2 - 1;
    const ux = Math.cos(a), uz = Math.sin(a); const x = ux * k * E - uz * off, z = uz * k * E + ux * off; c.position.set(x, layout.groundY(x, z) + r + Math.abs(Math.sin(clock.elapsedTime * (3 + (i % 3)) + i)) * (i >= base ? 0.6 : 0.25), z); c.rotation.x += dt * sp * w * 4; c.rotation.z = a; c.visible = Math.abs(k) < 0.95; }); });
  return <group ref={g}>{seeds.map((s, i) => <mesh key={i} geometry={geo} material={MAT.vcFlat} scale={s[3] / 0.25} castShadow />)}</group>;
}
export function Buzzards() {
  const g = useRef(); const { layout } = useWorld(); const R = layout.R * 0.7;
  useFrame(({ clock }) => { if (!g.current) return; g.current.children.forEach((c, i) => { const t = clock.elapsedTime * 0.25 + i * 2.1; c.position.set(Math.cos(t) * (R + i * 2), 14 + i * 1.5, Math.sin(t) * (R + i * 2)); c.rotation.y = -t; c.rotation.z = Math.sin(clock.elapsedTime * 2 + i) * 0.15; }); });
  const geo = cached('buzzard', () => mergeParts([[G.box(1.6, 0.04, 0.35), '#2a2420', [0, 0, 0], [0, 0, 0]], [G.sph(0.14, 6, 4), '#2a2420', [0, 0, 0.15], [0, 0, 0], [1, 0.8, 2]]]));
  return <group ref={g}>{[0, 1, 2].map((i) => <mesh key={i} geometry={geo} material={MAT.vcFlat} />)}</group>;
}
export function Mesas() {
  const { layout } = useWorld();
  const geo = useMemo(() => { if (layout.surround === 'land') return null; const r = seeded(441); const P = []; const E = layout.extent;
    for (let i = 0; i < dens(16, 0.6); i++) { const a = BACK + (r() - 0.5) * 3.6; const rr = E * (4.2 + r() * 1.8); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const w = 5 + r() * 9, h = 3 + r() * 6; const c = ['#b8643a', '#c47a48', '#a85a34'][Math.floor(r() * 3)];
      P.push([G.cyl(w * 0.72, w, h, 7), c, [x, -2 + h / 2, z], [0, r() * 3, 0]], [G.cyl(w * 0.745, w * 0.73, h * 0.08, 7), '#d89a64', [x, -2 + h * 0.62, z], [0, r() * 3, 0]], [G.cyl(w * 0.86, w * 0.88, h * 0.06, 7), '#9a4a2a', [x, -2 + h * 0.3, z], [0, r() * 3, 0]]); }
    return mergeParts(P); }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vcFlat} /> : null;
}

EXT.lab.telegraph = TelegraphLab; EXT.holo.telegraph = '#ffc46b';
EXT.ring.assay = AssayRing; EXT.holo.assay = '#ffd36a';
EXT.bar.saloon = saloonBar; EXT.barExtra.saloon = SaloonExtra;
EXT.torch.lantern = LanternPost;
EXT.dock.landing = LandingDeco; EXT.vessel.landing = Riverboat;
EXT.post.ranch = RanchPost; EXT.hamCol.ranch = ['#c0392b', '#f4e6c8', '#2e5a8a', '#f4e6c8'];
EXT.fun['Range:'] = ShootingRange; EXT.fun['Range:range'] = ShootingRange;
