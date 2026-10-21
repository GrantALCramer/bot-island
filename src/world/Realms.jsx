// Moon / Heaven / Hell pieces: homes (moon-base pod, marble gazebo cloud cottage, obsidian cabin), island decor
// and ambient effects. Fixed sizes; counts and radii follow the layout like everything else.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { Bed, HomeSign, useCutaway, useLantern, Flame, FlickerLight } from './Structures.jsx';
import { scatter } from './Vegetation.jsx';
import { isClear, angDiff } from './layout.js';
import { seeded, botColor } from '../util.js';

const night = (env) => 1 - (env.current?.day ?? 1);
const BACK = Math.PI * 1.25; const CAM_AZ = Math.PI / 4;
const camSide = (a, w) => Math.abs(angDiff(a, CAM_AZ)) < w;
const fadeMat = (opts) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, ...opts }); return m; };
const sel = (onSelect, bot) => (e) => { e.stopPropagation(); onSelect(bot.id); };

// ---------- Moon: moon-base pod ----------
const podBase = () => cached('podBase', () => mergeParts([
  ...[0, 1, 2, 3].flatMap((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return [[G.cyl(0.07, 0.07, 0.4, 6), '#9aa0a8', [Math.cos(a) * 1.35, 0.15, Math.sin(a) * 1.35], [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]], [G.cyl(0.2, 0.22, 0.05, 8), '#7a808a', [Math.cos(a) * 1.5, 0.02, Math.sin(a) * 1.5]]]; }),
  [G.cyl(1.62, 1.62, 0.1, 24), '#9aa0a8', [0, 0.25, 0]], [G.cyl(1.55, 1.55, 0.02, 24), '#c9ccd2', [0, 0.31, 0]],
  [G.cyl(1.62, 1.62, 0.5, 24, true), '#eef0f3', [0, 0.55, 0]], [G.cyl(1.635, 1.635, 0.1, 24, true), '#ff8a3d', [0, 0.72, 0]],
  [G.box(1.0, 1.3, 0.7), '#e2e5ea', [0, 0.95, 1.55]], [G.box(0.62, 1.0, 0.05), '#5a6270', [0, 0.85, 1.91]], [G.box(0.7, 0.06, 0.06), '#ff8a3d', [0, 1.45, 1.92]],
  [G.cyl(0.04, 0.04, 2.6, 6), '#c9ccd2', [-1.95, 1.3, -0.6]], [G.box(1.4, 0.04, 0.8), '#2a4a8a', [-1.95, 2.55, -0.6], [0.6, 0.3, 0]], [G.box(1.42, 0.02, 0.06), '#c9ccd2', [-1.95, 2.57, -0.6], [0.6, 0.3, 0]],
  [G.box(0.5, 0.7, 0.4), '#c9ccd2', [1.0, 0.65, -0.9]],
]));
const podShell = () => cached('podShell', () => mergeParts([
  [G.cyl(1.62, 1.62, 0.75, 24, true), '#eef0f3', [0, 1.17, 0]], [G.dome(1.62, 24, 7), '#e2e5ea', [0, 1.54, 0], [0, 0, 0], [1, 0.5, 1]],
  ...[0.5, 2.6, 4.2].map((a) => [G.cyl(0.24, 0.24, 0.05, 14), '#5fb7ff', [Math.cos(a) * 1.63, 1.15, Math.sin(a) * 1.63], [Math.PI / 2, 0, -a + Math.PI / 2, 'YXZ']]),
  [G.cyl(0.03, 0.03, 0.8, 5), '#c9ccd2', [0.5, 2.6, -0.4]], [G.sph(0.07, 6, 5), '#ff4a4a', [0.5, 3.0, -0.4]],
]));
export function MoonPod({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor;
  const shell = useMemo(() => fadeMat({ roughness: 0.35, metalness: 0.2 }), []);
  useCutaway(home, selected, [shell], 0.16, 10); const lantern = useLantern(asleep, '#bfe3ff');
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={podBase()} material={MAT.vcGloss} castShadow receiveShadow />
    <mesh geometry={podShell()} material={shell} castShadow />
    <Bed kind="metal" color={color} inBed={inBed} position={[0, f, -0.15]} />
    <mesh position={[0, 0.73, 0]}><cylinderGeometry args={[1.64, 1.64, 0.04, 24, 1, true]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} /></mesh>
    <mesh position={[1.0, 1.08, -0.9]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.5]} />
  </group>);
}

// ---------- Heaven: marble gazebo (cloud cottage) ----------
const gazeboBase = () => cached('gazeboBase', () => mergeParts([
  [G.cyl(1.85, 1.95, 0.16, 28), '#efe9df', [0, 0.08, 0]], [G.cyl(1.65, 1.7, 0.14, 28), '#fbf8f2', [0, 0.22, 0]], [G.torus(1.66, 0.035, 5, 36), '#e9c46a', [0, 0.29, 0], [Math.PI / 2, 0, 0]],
  ...[0, 1, 2, 3, 4, 5].filter((i) => i !== 1 && i !== 2).map((i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6 + Math.PI / 2 - Math.PI / 3; return [G.cyl(0.11, 0.13, 2.1, 10), '#fbf8f2', [Math.cos(a) * 1.45, 1.33, Math.sin(a) * 1.45]]; }),
  ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [G.sph(0.42 + (i % 3) * 0.1, 10, 7), ['#ffffff', '#fdf6ff', '#fff8ec'][i % 3], [Math.cos(a) * 1.95, 0.12, Math.sin(a) * 1.95], [0, 0, 0], [1, 0.6, 1]]; }),
  [G.cyl(0.18, 0.2, 0.55, 10), '#fbf8f2', [1.0, 0.55, -0.85]],
]));
const gazeboRoof = () => cached('gazeboRoof', () => mergeParts([
  [G.cyl(1.7, 1.7, 0.16, 28), '#fbf8f2', [0, 2.45, 0]], [G.torus(1.7, 0.05, 5, 36), '#e9c46a', [0, 2.53, 0], [Math.PI / 2, 0, 0]],
  [G.dome(1.6, 24, 7), '#f2d27a', [0, 2.53, 0], [0, 0, 0], [1, 0.55, 1]], [G.sph(0.14, 10, 8), '#e9c46a', [0, 3.45, 0]],
  ...[0, 1, 2, 3, 4, 5].filter((i) => i === 1 || i === 2).map((i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6 + Math.PI / 2 - Math.PI / 3; return [G.cyl(0.11, 0.13, 2.1, 10), '#fbf8f2', [Math.cos(a) * 1.45, 1.33, Math.sin(a) * 1.45]]; }),
]));
export function Gazebo({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor;
  const roof = useMemo(() => fadeMat({ roughness: 0.3, metalness: 0.25 }), []);
  useCutaway(home, selected, [roof], 0.15, 10); const lantern = useLantern(asleep, '#ffd36a');
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={gazeboBase()} material={MAT.vcGloss} castShadow receiveShadow />
    <mesh geometry={gazeboRoof()} material={roof} castShadow />
    <Bed kind="cloud" color={color} inBed={inBed} position={[0, f, -0.1]} />
    <mesh position={[1.0, 0.92, -0.85]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.45, 2.4]} />
  </group>);
}

// ---------- Hell: obsidian cabin ----------
const cabinBase = () => cached('cabinBase', () => mergeParts([
  [G.box(3.5, 0.2, 3.2), '#2a2224', [0, 0.1, 0]], [G.box(3.3, 0.02, 3.0), '#3a2c2a', [0, 0.21, 0]],
  [G.box(3.4, 0.55, 0.22), '#1f1a1c', [0, 0.47, -1.5]], [G.box(0.22, 0.55, 3.1), '#1f1a1c', [-1.6, 0.47, 0]], [G.box(0.22, 0.55, 3.1), '#1f1a1c', [1.6, 0.47, 0]],
  [G.box(1.1, 0.55, 0.22), '#1f1a1c', [-1.15, 0.47, 1.5]], [G.box(1.1, 0.55, 0.22), '#1f1a1c', [1.15, 0.47, 1.5]],
  [G.box(0.5, 2.4, 0.5), '#2a2224', [1.3, 1.6, -1.3]], [G.box(0.6, 0.15, 0.6), '#1a1416', [1.3, 2.85, -1.3]],
  [G.cyl(0.2, 0.24, 0.45, 8), '#2a2224', [1.0, 0.45, -0.85]],
]));
const cabinShell = () => cached('cabinShell', () => {
  const P = [[G.box(3.4, 1.35, 0.2), '#4a3b40', [0, 1.42, -1.5]], [G.box(0.2, 1.35, 3.1), '#4a3b40', [-1.6, 1.42, 0]], [G.box(0.2, 1.35, 3.1), '#4a3b40', [1.6, 1.42, 0]],
    [G.box(1.1, 1.35, 0.2), '#4a3b40', [-1.15, 1.42, 1.5]], [G.box(1.1, 1.35, 0.2), '#4a3b40', [1.15, 1.42, 1.5]], [G.box(3.4, 0.4, 0.2), '#4a3b40', [0, 2.3, 1.5]],
    [G.box(2.15, 0.14, 3.8), '#8a2c22', [-0.95, 2.95, 0], [0, 0, 0.62]], [G.box(2.15, 0.14, 3.8), '#8a2c22', [0.95, 2.95, 0], [0, 0, -0.62]]];
  const tri = new THREE.CylinderGeometry(1.0, 1.0, 0.18, 3); tri.rotateX(Math.PI / 2); tri.rotateZ(Math.PI / 2); tri.scale(1.75, 0.68, 1);
  P.push([tri, '#4a3b40', [0, 2.73, -1.5]], [tri.clone(), '#4a3b40', [0, 2.73, 1.5]]);
  return mergeParts(P);
});
export function Cabin({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor;
  const shell = useMemo(() => fadeMat({ roughness: 0.25, metalness: 0.3, flatShading: true }), []);
  const win = useMemo(() => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(1.6), toneMapped: false, side: THREE.DoubleSide, transparent: true }); m.userData.baseOpacity = 0.9; return m; }, []);
  useCutaway(home, selected, [shell, win], 0.12, 10); const lantern = useLantern(asleep, '#ff8a3d');
  const y = layout.groundY(home.x, home.z); const glow = new THREE.Color('#ff5a1a').multiplyScalar(1.8);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={sel(onSelect, bot)}>
    <mesh geometry={cabinBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={cabinShell()} material={shell} castShadow />
    {[[0, 0.215, 1.62, 3.5, 0.04], [0, 0.215, -1.62, 3.5, 0.04]].map(([x, yy, z, w, h], i) => <mesh key={i} position={[x, yy, z]}><boxGeometry args={[w, h, 0.04]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>)}
    {[-1.72, 1.72].map((x) => <mesh key={x} position={[x, 1.45, 0.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.7, 0.5]} /><primitive object={win} attach="material" /></mesh>)}
    <group position={[1.3, 2.95, -1.3]}><Flame kind="hell" always scale={1.2} /></group>
    <Bed kind="ember" color={color} inBed={inBed} position={[0, f, -0.2]} />
    <mesh position={[1.0, 0.75, -0.85]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.4]} />
  </group>);
}

// ---------- island decor ----------
export function Decor({ seed, n, band, minD, margin = 0.3, accept, build, material = MAT.vcFlat }) {
  const { layout, theme } = useWorld();
  const geo = useMemo(() => { const r = seeded(seed); const P = []; const [r0, r1] = band(layout);
    scatter(layout, r, Math.round(n(layout)), r0, r1, minD, [], margin, accept ? (x, z, a, rr) => accept(x, z, a, rr, layout) : undefined).forEach(([x, z, a, rr]) => build(P, x, layout.groundY(x, z), z, r, a, rr, layout, theme));
    return P.length ? mergeParts(P) : null; }, [layout, theme]);
  return geo ? <mesh geometry={geo} material={material} castShadow receiveShadow /> : null;
}
export const MoonRocks = () => (<>
  <Decor seed={41} n={(L) => L.R * 1.6} band={(L) => [L.plazaFoot + 1, L.R + 2.5]} minD={1.4} build={(P, x, y, z, r) => { const k = 0.25 + r() * r() * 1.0; P.push([G.dodec(k), r() < 0.5 ? '#8a8986' : '#a3a19c', [x, y + k * 0.2, z], [r(), r() * 6, r()], [1.2, 0.7, 1]]); }} />
  <Decor seed={43} n={(L) => L.R * 0.7} band={(L) => [L.plazaFoot + 1.5, L.R - 0.6]} minD={2.6} margin={0.9} build={(P, x, y, z, r) => { const k = 0.6 + r() * 0.8; P.push([G.torus(k, k * 0.2, 4, 14), '#b2b0aa', [x, y + 0.02, z], [Math.PI / 2, 0, 0], [1, 1, 0.45]], [G.cyl(k * 0.9, k * 0.9, 0.02, 14), '#8a8884', [x, y + 0.012, z]]); }} />
  <Decor seed={47} n={(L) => 2 + L.R / 5} band={(L) => [L.R * 0.55, L.R - 0.8]} minD={4} margin={1.2} accept={(x, z, a) => !camSide(a, 1.4)} material={MAT.vcGloss}
    build={(P, x, y, z, r, a) => { P.push([G.cyl(0.05, 0.05, 1.1, 6), '#c9ccd2', [x, y + 0.55, z]], [G.box(1.6, 0.04, 0.9), '#2a4a8a', [x, y + 1.15, z], [0.55, -a, 0]], [G.box(1.62, 0.02, 0.05), '#c9ccd2', [x, y + 1.16, z], [0.55, -a, 0]]); }} />
</>);
export const CloudRim = () => (<>
  <Decor seed={51} n={(L) => L.R * 3.2} band={(L) => [L.R - 0.2, L.R + 2.4]} minD={0.9} margin={0.2} material={MAT.vc}
    build={(P, x, y, z, r) => { const k = 0.5 + r() * 0.8; P.push([G.sph(k, 12, 8), ['#ffffff', '#fdf6ff', '#fff8ec'][Math.floor(r() * 3)], [x, Math.max(y, -0.3) + k * 0.25, z], [0, 0, 0], [1, 0.7, 1]]); }} />
  <Decor seed={53} n={(L) => L.R * 0.8} band={(L) => [L.plazaFoot + 0.8, L.R - 0.8]} minD={1.6} margin={0.2} material={MAT.vc}
    build={(P, x, y, z, r) => { const c = ['#ffc2d9', '#ffe9a8', '#d9c2ff', '#c2f0ff'][Math.floor(r() * 4)]; for (let k = 0; k < 3; k++) P.push([G.sph(0.09, 8, 6), c, [x + (r() - 0.5) * 0.5, y + 0.12, z + (r() - 0.5) * 0.5]], [G.cone(0.03, 0.18, 4), '#9fd8a0', [x + (r() - 0.5) * 0.5, y + 0.05, z + (r() - 0.5) * 0.5]]); }} />
</>);
export const GoldTrees = () => <Decor seed={57} n={(L) => L.R * 0.9} band={(L) => [L.R * 0.5, L.R + 0.4]} minD={2.6} margin={0.4} accept={(x, z, a, r, L) => !camSide(a, r > L.R * 0.8 ? 0.8 : 1.3)} material={MAT.vc}
  build={(P, x, y, z, r) => { const h = 2.2 + r() * 1.4; P.push([G.cyl(0.09, 0.15, h, 6), '#efe6d6', [x, y + h / 2, z]]);
    for (let k = 0; k < 4; k++) P.push([G.ico(0.65 + r() * 0.45, 1), ['#ffd76a', '#ffc2d9', '#fff0b3', '#ffe2ef'][k], [x + (r() - 0.5) * 1.1, y + h + (r() - 0.3) * 0.6, z + (r() - 0.5) * 1.1], [0, r() * 6, 0], [1, 0.8, 1]]); }} />;
export const HellRocks = () => (<>
  <Decor seed={61} n={(L) => L.R * 1.3} band={(L) => [L.R * 0.5, L.R + 2.2]} minD={1.8} margin={0.3} accept={(x, z, a, r, L) => !camSide(a, r > L.R * 0.8 ? 0.7 : 1.2)}
    build={(P, x, y, z, r) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const h = 0.8 + r() * 2.2; P.push([G.cyl(0.22, 0.3, h, 6), r() < 0.5 ? '#4a3b40' : '#1f1b1d', [x + (r() - 0.5) * 0.8, y + h / 2 - 0.1, z + (r() - 0.5) * 0.8], [0, r(), (r() - 0.5) * 0.15]]); } }} />
  <Decor seed={63} n={(L) => L.R * 0.7} band={(L) => [L.plazaFoot + 1, L.R + 0.5]} minD={2.4} margin={0.4} accept={(x, z, a) => !camSide(a, 1.2)}
    build={(P, x, y, z, r) => { const h = 1.6 + r() * 1.6; P.push([G.cyl(0.07, 0.15, h, 5), '#2b211d', [x, y + h / 2, z], [0, 0, (r() - 0.5) * 0.2]]);
      for (let k = 0; k < 3; k++) { const a = r() * 6; P.push([G.cyl(0.025, 0.06, h * 0.45, 4), '#2b211d', [x + Math.cos(a) * 0.3, y + h * (0.6 + k * 0.12), z + Math.sin(a) * 0.3], [Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9]]); } }} />
  <LavaVents />
</>);
function LavaVents() {
  const { layout } = useWorld();
  const spots = useMemo(() => scatter(layout, seeded(67), Math.round(layout.R * 0.45), layout.plazaFoot + 1.2, layout.R - 0.4, 3, [], 0.8), [layout]);
  const geo = useMemo(() => spots.length ? mergeParts(spots.map(([x, z]) => [G.cone(0.45, 0.5, 7), '#2a2224', [x, layout.groundY(x, z) + 0.2, z]])) : null, [spots]);
  const glow = useMemo(() => spots.length ? mergeParts(spots.map(([x, z]) => [G.cyl(0.13, 0.13, 0.03, 8), '#ffffff', [x, layout.groundY(x, z) + 0.43, z]])) : null, [spots]);
  if (!geo) return null;
  return (<group><mesh geometry={geo} material={MAT.vcFlat} castShadow /><mesh geometry={glow}><meshBasicMaterial color={new THREE.Color('#ff6a1a').multiplyScalar(2.2)} toneMapped={false} /></mesh>
    {spots.slice(0, 6).map(([x, z], i) => <group key={i} position={[x, layout.groundY(x, z) + 0.45, z]}><Flame kind="hell" always scale={0.7} seed={i} /></group>)}</group>);
}

// ---------- ambient ----------
const TW_V = `attribute float aSeed; uniform float uTime, uSize, uRise, uH; varying float vA;
void main(){ vec3 p = position; float t = uTime*0.35 + aSeed*10.;
  p += vec3(sin(t*1.3+aSeed)*0.6, 0., cos(t*1.1+aSeed*5.)*0.6); p.y = mod(p.y + uTime*uRise*(0.5+aSeed), uH);
  vA = smoothstep(0.1, 1.0, sin(uTime*(1.5+aSeed*2.)+aSeed*20.)*0.5+0.5) * smoothstep(uH, uH*0.7, p.y);
  vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(0.6+vA)*(30./-mv.z); }`;
const TW_F = `uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a*vA*uOpacity); }`;
export function Twinkles({ color, count, size = 4, rise = 0, H = 4, opacity = 1, spread = 1, additive = true, dayFade = 0 }) {
  const { layout, env } = useWorld(); const E = layout.extent * spread; const N = dens(Math.round(Math.min(900, count * Math.max(1, E / 24))), 0.35);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3); const s = new Float32Array(N); const r = seeded(N);
    for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2; const rr = Math.sqrt(r()) * E; p.set([Math.cos(a) * rr, r() * H, Math.sin(a) * rr], i * 3); s[i] = r(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); return g; }, [N, E, H]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: size }, uRise: { value: rise }, uH: { value: H }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color).multiplyScalar(additive ? 2.5 : 1) } }, vertexShader: TW_V, fragmentShader: TW_F, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }), [color, size, rise, H, opacity, additive]);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; if (dayFade) mat.uniforms.uOpacity.value = opacity * (1 - dayFade * (env.current?.day ?? 1)); });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
export const MoonDust = () => <Twinkles color="#c9c4b8" count={260} size={2.2} rise={0.05} H={1.6} opacity={0.5} spread={1.1} additive={false} />;
export const Sparkles = () => <Twinkles color="#ffe39a" count={320} size={3.2} rise={0.25} H={6} opacity={0.85} />;
export const HellEmbers = () => <Twinkles color="#ff7a2a" count={360} size={2.8} rise={0.7} H={9} opacity={0.9} />;

const RAY_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RAY_F = `uniform float uOp, uTime, uSeed; varying vec2 vUv; void main(){ float a = smoothstep(0., 0.7, vUv.y) * (0.6 + 0.4*sin(vUv.x*12.566 + uTime*0.25 + uSeed)); gl_FragColor = vec4(vec3(1.,0.93,0.7), a*uOp); }`;
export function HeavenRays() {
  const { layout, env } = useWorld(); const E = layout.extent;
  const rays = useMemo(() => { const r = seeded(19); return Array.from({ length: 7 }, (_, i) => ({ x: Math.cos(BACK + (i - 3) * 0.35) * E * (0.5 + r() * 0.6), z: Math.sin(BACK + (i - 3) * 0.35) * E * (0.5 + r() * 0.6), w: 1.5 + r() * 3, ph: r() * 6 })); }, [E]);
  const mats = useMemo(() => rays.map((q) => new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uSeed: { value: q.ph } }, vertexShader: RAY_V, fragmentShader: RAY_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), [rays]);
  useFrame(({ clock }) => { const d = env.current?.day ?? 1; const g = env.current?.gray ?? 0; mats.forEach((m, i) => { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uOp.value = (0.07 + 0.06 * (env.current?.warm ?? 0)) * (0.3 + 0.7 * d) * (1 - g * 0.7) * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.3 + rays[i].ph)); }); });
  return <group>{rays.map((q, i) => <mesh key={i} material={mats[i]} position={[q.x, 16, q.z]} rotation={[0.12, 0, -0.18]}><cylinderGeometry args={[q.w * 0.5, q.w, 34, 16, 1, true]} /></mesh>)}</group>;
}

// Volcanoes on the horizon; they smoke all the time and erupt (lava bombs, glow, flashes) in the Eruption weather.
const volcGeo = () => cached('volcano', () => { const P = []; const r = seeded(71);
  P.push([G.cyl(2.2, 13, 11, 14), '#2a2224', [0, 5.5, 0]], [G.cyl(2.6, 2.2, 0.8, 14), '#1f1a1c', [0, 11.2, 0]]);
  for (let i = 0; i < 10; i++) { const a = r() * 6.28; P.push([G.dodec(1.6 + r() * 2), '#332a2c', [Math.cos(a) * (8 + r() * 4), 1 + r(), Math.sin(a) * (8 + r() * 4)], [r(), r(), r()], [1.3, 0.7, 1]]); }
  return mergeParts(P); });
export function Volcano() {
  const { layout, env } = useWorld(); const E = layout.extent;
  const spots = useMemo(() => [[BACK + 0.32, E * 1.9, 1.15], [BACK - 0.55, E * 2.3, 0.8]].map(([a, d, s]) => ({ x: Math.cos(a) * d, z: Math.sin(a) * d, s })), [E]);
  const bombs = useRef(); const smoke = useRef(); const glowM = useRef(); const light = useRef();
  const N = 40; const seeds = useMemo(() => Array.from({ length: N }, () => [Math.random(), Math.random() * 6.28, 0.6 + Math.random() * 0.8]), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); return g; }, []);
  useFrame(({ clock }) => { const t = clock.elapsedTime; const er = env.current?.eruption ?? 0; const v = spots[0];
    const a = geo.attributes.position.array; seeds.forEach(([p, ang, sp], i) => { const k = (t * 0.35 * sp + p) % 1; const H = 11.5 * v.s; a.set([v.x + Math.cos(ang) * k * 9 * v.s, H + (Math.sin(k * Math.PI) * 9 - k * 6) * v.s * (0.3 + er), v.z + Math.sin(ang) * k * 9 * v.s], i * 3); });
    geo.attributes.position.needsUpdate = true; if (bombs.current) bombs.current.material.opacity = er;
    if (smoke.current) smoke.current.children.forEach((m, i) => { const k = (t * 0.06 + i / 8) % 1; m.position.set(Math.sin(i * 1.7 + t * 0.1) * k * 3, 12 + k * 14 * (1 + er * 0.6), Math.cos(i) * k * 2); m.scale.setScalar(1.5 + k * 5); m.material.opacity = (0.5 + er * 0.25) * (1 - k); m.material.emissiveIntensity = (0.25 + er * 1.4) * (1 - k) * (1 - k); });
    if (glowM.current) glowM.current.color.setRGB(1, 0.35, 0.08).multiplyScalar(1.6 + er * 1.6 + Math.sin(t * 3) * 0.3);
    if (light.current) light.current.intensity = (8 + er * 30) * (0.8 + Math.sin(t * 5) * 0.2); });
  return (<group>
    {spots.map((v, i) => <group key={i} position={[v.x, layout.groundY(v.x, v.z) - 0.5, v.z]} scale={v.s}>
      <mesh geometry={volcGeo()} material={MAT.vcFlat} castShadow receiveShadow />
      <mesh position={[0, 11.62, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.0, 16]} />{i === 0 ? <meshBasicMaterial ref={glowM} toneMapped={false} /> : <meshBasicMaterial color={new THREE.Color('#ff5a1a').multiplyScalar(1.8)} toneMapped={false} />}</mesh>
      {[0, 1, 2].map((k) => { const a = k * 2.1 + i; return <mesh key={k} position={[Math.cos(a) * 4.2, 6.6, Math.sin(a) * 4.2]} rotation={[0, -a, 0.43]}><boxGeometry args={[9.5, 0.12, 0.7]} /><meshBasicMaterial color={new THREE.Color('#ff5a1a').multiplyScalar(1.5)} toneMapped={false} /></mesh>; })}
    </group>)}
    <group ref={smoke} position={[spots[0].x, layout.groundY(spots[0].x, spots[0].z), spots[0].z]} scale={spots[0].s}>{Array.from({ length: 8 }, (_, i) => <mesh key={i}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#5a4440" emissive="#ff4a1a" emissiveIntensity={0.3} transparent depthWrite={false} roughness={1} /></mesh>)}</group>
    <points ref={bombs} geometry={geo} frustumCulled={false}><pointsMaterial color={new THREE.Color('#ff7a2a').multiplyScalar(3)} size={1.8} transparent opacity={0} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
    <pointLight ref={light} position={[spots[0].x * 0.86, layout.groundY(spots[0].x, spots[0].z) + 15 * spots[0].s, spots[0].z * 0.86]} color="#ff5a1a" distance={E * 4} decay={1} />
  </group>);
}
