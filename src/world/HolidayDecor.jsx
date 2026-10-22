// Holiday map decorations (same overlay pattern as Halloween / winter in Seasonal.jsx): porch decor by every home and
// along the ring road, a garland strung on poles around the ring road, one centerpiece just outside the ring, plus
// sky / particle effects. Kept cheap: shared materials, no extra shadow casters beyond a few props, at most 3 point lights.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';

const TAU = Math.PI * 2;
const rnd = (i, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const glowTex = () => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); };
const lit = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

// ---------- shared pieces ----------
function useRing(nMin = 10) { // poles around the ring road
  const { layout } = useWorld(); const R = layout.R || 14; const n = Math.max(nMin, Math.round(R * 0.8));
  return useMemo(() => { const g = layout.groundY; const r = layout.Ro + 0.9; return Array.from({ length: n }, (_, k) => { const a = (k / n) * TAU; const x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, g(x, z), z]; }); }, [layout, n]);
}
function useCenterpiece(angle = 0.2) { // a clear spot just outside the ring road
  const { layout } = useWorld();
  return useMemo(() => { const r = layout.Ro + 2.4; const x = Math.cos(angle) * r, z = Math.sin(angle) * r; return [x, layout.groundY(x, z), z, Math.atan2(-x, -z)]; }, [layout, angle]);
}

// Garland between poles: kind 'flag' (bunting), 'lantern' (paper lanterns), 'heart', 'bulb'
function Garland({ colors, kind = 'bulb', pole = '#5b4636', H = 2.3, per = 7, twinkle = true }) {
  const poles = useRing();
  const items = useMemo(() => { const out = []; poles.forEach((p, k) => { const q = poles[(k + 1) % poles.length]; for (let j = 1; j < per + 1; j++) { const u = j / (per + 1);
    out.push({ pos: [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u + H - Math.sin(u * Math.PI) * 0.45, p[2] + (q[2] - p[2]) * u], rot: Math.atan2(q[0] - p[0], q[2] - p[2]) + Math.PI / 2, c: (k * per + j) % colors.length }); } }); return out; }, [poles, colors.length, per, H]);
  const mats = useMemo(() => colors.map((c) => (kind === 'flag' ? new THREE.MeshStandardMaterial({ color: c, side: 2, roughness: 0.8 }) : lit(c))), [colors, kind]);
  useFrame(({ clock }) => { if (!twinkle || kind === 'flag') return; mats.forEach((m, i) => { const on = 0.6 + 0.4 * Math.sin(clock.elapsedTime * 1.6 + i * 1.7); m.color.set(colors[i]).multiplyScalar(0.7 + on * 0.8); }); });
  const heart = useMemo(() => heartGeo(0.16, 0.06), []);
  return (<group>
    {poles.map((p, i) => <mesh key={i} position={[p[0], p[1] + H / 2, p[2]]}><cylinderGeometry args={[0.05, 0.06, H, 6]} /><meshStandardMaterial color={pole} /></mesh>)}
    {items.map((b, i) => kind === 'flag'
      ? <mesh key={i} position={[b.pos[0], b.pos[1] - 0.16, b.pos[2]]} rotation={[0, b.rot, 0]} material={mats[b.c]} geometry={PENNANT}></mesh>
      : kind === 'lantern'
        ? <group key={i} position={[b.pos[0], b.pos[1] - 0.22, b.pos[2]]}><mesh material={mats[b.c]} scale={[1, 0.85, 1]}><sphereGeometry args={[0.2, 10, 8]} /></mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.08, 0.08, 0.05, 8]} /><meshStandardMaterial color="#3a2a10" /></mesh><mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.012, 0.012, 0.16, 4]} /><meshBasicMaterial color="#ffd23f" /></mesh></group>
        : kind === 'heart'
          ? <mesh key={i} position={[b.pos[0], b.pos[1] - 0.15, b.pos[2]]} rotation={[0, b.rot, Math.PI]} geometry={heart} material={mats[b.c]} />
          : <mesh key={i} position={b.pos} material={mats[b.c]}><sphereGeometry args={[0.1, 8, 6]} /></mesh>)}
  </group>);
}

const PENNANT = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.2, 0.18, 0, 0.2, 0.18, 0, 0, -0.24, 0], 3)); g.computeVertexNormals(); return g; })();
function heartGeo(s = 0.3, depth = 0.1) {
  const sh = new THREE.Shape(); sh.moveTo(0, -s); sh.bezierCurveTo(s * 1.4, -s * 0.1, s * 0.9, s * 1.1, 0, s * 0.45); sh.bezierCurveTo(-s * 0.9, s * 1.1, -s * 1.4, -s * 0.1, 0, -s);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: depth * 0.3, bevelThickness: depth * 0.3, bevelSegments: 2, curveSegments: 8 }); g.center(); return g;
}

// colored drifting particles (confetti, leaves, petals, sparks). dir: -1 falls, +1 rises
function Drift({ R, n = 400, colors, size = 0.22, speed = 0.9, dir = -1, top = 20, sway = 0.8 }) {
  const ref = useRef(); const tex = useMemo(glowTex, []);
  const [pos, col, vel] = useMemo(() => { const p = new Float32Array(n * 3), c = new Float32Array(n * 3), v = new Float32Array(n); const cc = colors.map((x) => new THREE.Color(x));
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R * 1.3; p.set([Math.cos(a) * r, Math.random() * top, Math.sin(a) * r], i * 3); const k = cc[i % cc.length]; c.set([k.r, k.g, k.b], i * 3); v[i] = 0.5 + Math.random() * 0.8; } return [p, c, v]; }, [n, R, colors, top]);
  useFrame(({ clock }, dt) => { const g = ref.current?.geometry; if (!g) return; const a = g.attributes.position.array; const t = clock.elapsedTime; const d = Math.min(dt, 0.05);
    for (let i = 0; i < n; i++) { a[i * 3 + 1] += dir * vel[i] * d * speed; a[i * 3] += Math.sin(t * 0.8 + i) * d * sway; a[i * 3 + 2] += Math.cos(t * 0.6 + i * 1.3) * d * sway * 0.5;
      if (dir < 0 && a[i * 3 + 1] < 0) a[i * 3 + 1] = top; if (dir > 0 && a[i * 3 + 1] > top) a[i * 3 + 1] = 0.3; }
    g.attributes.position.needsUpdate = true; });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /><bufferAttribute attach="attributes-color" args={[col, 3]} /></bufferGeometry>
    <pointsMaterial map={tex} vertexColors alphaTest={0.05} size={size} sizeAttenuation transparent opacity={0.95} depthWrite={false} toneMapped={false} /></points>;
}

// Fireworks: a few shells cycling; each is a burst of points that expands, falls and fades. One draw call.
function Fireworks({ R, colors, shells = 6, per = 70 }) {
  const ref = useRef(); const tex = useMemo(glowTex, []); const N = shells * per;
  const st = useMemo(() => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3), dirs: Array.from({ length: N }, () => { const u = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; }),
    sh: Array.from({ length: shells }, (_, i) => ({ t0: -i * 0.9, c: [] })) }), [N, shells]);
  const cc = useMemo(() => colors.map((x) => new THREE.Color(x)), [colors]);
  useFrame(({ clock }) => { const g = ref.current?.geometry; if (!g) return; const t = clock.elapsedTime; const P = g.attributes.position.array, C = g.attributes.color.array; const life = 2.6, cycle = shells * 0.9;
    st.sh.forEach((s, k) => { let age = (t - s.t0) % cycle; if (age < 0) age += cycle; const n = Math.floor((t - s.t0) / cycle);
      const a = rnd(k, n) * TAU, r = R * (0.15 + rnd(k, n + 7) * 0.55); const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 6 + rnd(k, n + 3) * 4; const col = cc[Math.floor(rnd(k, n + 5) * cc.length)], col2 = cc[Math.floor(rnd(k, n + 9) * cc.length)];
      const u = Math.min(age / life, 1); const sp = 2.6 * (1 - Math.pow(1 - Math.min(age, 1.2) / 1.2, 3)); const fade = age < life ? Math.pow(1 - u, 1.5) * 1.6 : 0;
      for (let j = 0; j < per; j++) { const i = k * per + j, d = st.dirs[i]; P[i * 3] = cx + d[0] * sp; P[i * 3 + 1] = cy + d[1] * sp - age * age * 0.35; P[i * 3 + 2] = cz + d[2] * sp; const c = j % 3 ? col : col2; C[i * 3] = c.r * fade; C[i * 3 + 1] = c.g * fade; C[i * 3 + 2] = c.b * fade; } });
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[st.pos, 3]} /><bufferAttribute attach="attributes-color" args={[st.col, 3]} /></bufferGeometry>
    <pointsMaterial map={tex} vertexColors size={0.85} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

// darkening dome for a "midnight" sky during New Year's (only blends in when it's daytime, subtly)
function NightDome({ color = '#0a0f2e', opacity = 0.35 }) {
  return <mesh scale={400}><sphereGeometry args={[1, 24, 12]} /><meshBasicMaterial color={color} side={THREE.BackSide} transparent opacity={opacity} depthWrite={false} fog={false} /></mesh>;
}

// ---------- props ----------
function Spots({ spots, render }) { return <group>{spots.map((p, i) => <group key={i} position={[p[0], p[1], p[2]]} rotation={[0, Math.atan2(-p[0], -p[2]), 0]} scale={1.45}>{render(i, p)}</group>)}</group>; }

const PartyHat = ({ c }) => <group><mesh position={[0, 0.3, 0]}><coneGeometry args={[0.18, 0.6, 12]} /><meshStandardMaterial color={c} /></mesh><mesh position={[0, 0.62, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color="#ffd23f" /></mesh></group>;
function Champagne() { return <group><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.09, 0.09, 0.6, 10]} /><meshStandardMaterial color="#1f4d2a" roughness={0.2} metalness={0.3} /></mesh><mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.035, 0.07, 0.2, 8]} /><meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} /></mesh></group>; }

const GiftBox = ({ c, r }) => <group><mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={c} /></mesh><mesh position={[0, 0.15, 0]}><boxGeometry args={[0.31, 0.31, 0.06]} /><meshStandardMaterial color={r} /></mesh></group>;
function Rose() { return <group><mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.015, 0.015, 0.5, 4]} /><meshStandardMaterial color="#2f6b2a" /></mesh><mesh position={[0, 0.52, 0]} scale={[1, 0.9, 1]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#c8102e" /></mesh></group>; }

function Clover({ s = 0.35 }) { const leaf = useMemo(() => heartGeo(s * 0.5, 0.03), [s]); return <group>
  <mesh position={[0, s * 0.6, 0]}><cylinderGeometry args={[0.02, 0.025, s * 1.2, 5]} /><meshStandardMaterial color="#2e7d32" /></mesh>
  {[0, 1, 2].map((k) => <mesh key={k} geometry={leaf} position={[Math.sin((k / 3) * TAU) * s * 0.32, s * 1.25 + Math.cos((k / 3) * TAU) * s * 0.32, 0]} rotation={[0, 0, -(k / 3) * TAU + Math.PI]}><meshStandardMaterial color="#2fa84f" roughness={0.6} /></mesh>)}</group>; }
function PotOfGold() { return <group>
  <mesh position={[0, 0.35, 0]} scale={[1, 0.85, 1]} castShadow><sphereGeometry args={[0.45, 16, 12]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.4} /></mesh>
  <mesh position={[0, 0.68, 0]}><torusGeometry args={[0.36, 0.05, 6, 16]} /><meshStandardMaterial color="#222" /></mesh>
  {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 0.22 * rnd(i), 0.72 + rnd(i, 2) * 0.12, Math.sin(i * 2.4) * 0.22 * rnd(i)]} rotation={[rnd(i, 3), 0, rnd(i, 4)]}><cylinderGeometry args={[0.07, 0.07, 0.02, 10]} /><meshStandardMaterial color="#ffc93c" metalness={0.9} roughness={0.25} emissive="#ffb000" emissiveIntensity={0.25} /></mesh>)}</group>; }
function Rainbow({ r = 6 }) { const C = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#5856d6', '#af52de'];
  return <group>{C.map((c, i) => <mesh key={i}><torusGeometry args={[r - i * 0.16, 0.08, 6, 48, Math.PI]} /><meshBasicMaterial color={c} transparent opacity={0.7} toneMapped={false} /></mesh>)}</group>; }

const PASTEL = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
function Egg({ i, s = 0.22 }) { const c = PASTEL[i % PASTEL.length], b = PASTEL[(i + 3) % PASTEL.length];
  return <group position={[0, s * 1.3, 0]} rotation={[rnd(i) * 0.4 - 0.2, rnd(i, 2) * TAU, rnd(i, 3) * 0.4 - 0.2]}><mesh scale={[1, 1.35, 1]} castShadow><sphereGeometry args={[s, 14, 10]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
    <mesh scale={[1.02, 0.25, 1.02]}><sphereGeometry args={[s, 14, 6]} /><meshStandardMaterial color={b} roughness={0.5} /></mesh></group>; }
function FlowerPatch({ i }) { return <group>{[0, 1, 2, 3, 4].map((k) => { const a = k * 1.3 + i, r = 0.25 + rnd(i, k) * 0.25; return <group key={k} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
  <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.012, 0.012, 0.28, 4]} /><meshStandardMaterial color="#4caf50" /></mesh>
  <mesh position={[0, 0.3, 0]} scale={[1, 1.2, 1]}><coneGeometry args={[0.07, 0.14, 6, 1, true]} /><meshStandardMaterial color={PASTEL[(i + k) % PASTEL.length]} side={2} /></mesh></group>; })}</group>; }
function EggBasket() { return <group><mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.6, 0.45, 0.5, 14, 1, true]} /><meshStandardMaterial color="#b07a3c" roughness={0.9} side={2} /></mesh>
  <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.6, 0.04, 6, 20, Math.PI]} /><meshStandardMaterial color="#8a5a2a" /></mesh>
  {Array.from({ length: 7 }, (_, i) => <group key={i} position={[Math.cos(i * 0.9) * 0.3 * (i ? 1 : 0), 0.28, Math.sin(i * 0.9) * 0.3 * (i ? 1 : 0)]}><Egg i={i} s={0.17} /></group>)}</group>; }

function MiniPumpkin({ s = 0.3, c = '#e8731c' }) { return <group position={[0, s * 0.75, 0]}>{[0, 1, 2].map((i) => <mesh key={i} rotation={[0, (i / 3) * Math.PI, 0]} scale={[1, 0.8, 0.6]}><sphereGeometry args={[s, 12, 8]} /><meshStandardMaterial color={c} roughness={0.6} /></mesh>)}
  <mesh position={[0, s * 0.8, 0]}><cylinderGeometry args={[0.03, 0.04, 0.14, 5]} /><meshStandardMaterial color="#5a4a2a" /></mesh></group>; }
const HayBale = () => <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.8, 0.5, 0.5]} /><meshStandardMaterial color="#d8b25a" roughness={1} /></mesh>;
function CornStalks() { return <group>{[-0.12, 0, 0.12].map((x, i) => <group key={i} position={[x, 0, (i % 2) * 0.08]} rotation={[0, 0, x]}><mesh position={[0, 0.55, 0]}><coneGeometry args={[0.1, 1.1, 5]} /><meshStandardMaterial color="#c9a45a" roughness={1} /></mesh></group>)}</group>; }
function HarvestTable() { const foods = ['#e8731c', '#c0392b', '#f4d03f', '#8e5a2b', '#7d3c98', '#e8731c'];
  return <group>
    <mesh position={[0, 0.7, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.08, 1]} /><meshStandardMaterial color="#8a5a34" /></mesh>
    <mesh position={[0, 0.745, 0]}><boxGeometry args={[2.0, 0.01, 0.5]} /><meshStandardMaterial color="#c2632a" /></mesh>
    {[[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]].map(([x, z], i) => <mesh key={i} position={[x, 0.35, z]}><boxGeometry args={[0.08, 0.7, 0.08]} /><meshStandardMaterial color="#6b4423" /></mesh>)}
    {[-1.4, 1.4].map((x) => <mesh key={x} position={[0, 0.42, x * 0.5]}><boxGeometry args={[2.2, 0.06, 0.25]} /><meshStandardMaterial color="#7a4e2c" /></mesh>)}
    <mesh position={[0, 0.86, 0]} scale={[1.2, 0.75, 0.9]}><sphereGeometry args={[0.18, 12, 8]} /><meshStandardMaterial color="#b5651d" roughness={0.4} /></mesh>
    {foods.map((c, i) => <mesh key={i} position={[-0.9 + i * 0.36, 0.8, (i % 2 ? 0.18 : -0.18)]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color={c} /></mesh>)}
    <mesh position={[0.55, 0.78, 0]}><cylinderGeometry args={[0.16, 0.16, 0.05, 14]} /><meshStandardMaterial color="#d9a066" /></mesh>
  </group>; }

// Hanukkah menorah (hanukkiah): 8 candles in a row + the raised shamash, flames lit
function Menorah() { const ref = useRef();
  useFrame(({ clock }) => { ref.current?.children.forEach((f, i) => { const s = 1 + Math.sin(clock.elapsedTime * 9 + i * 2.1) * 0.12; f.scale.set(s, s * 1.15, s); }); });
  const xs = [-1.4, -1.05, -0.7, -0.35, 0.35, 0.7, 1.05, 1.4];
  return <group scale={0.9}>
    <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.45, 0.6, 0.12, 16]} /><meshStandardMaterial color="#c0c8d6" metalness={0.85} roughness={0.25} /></mesh>
    <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.06, 0.08, 1.3, 10]} /><meshStandardMaterial color="#c0c8d6" metalness={0.85} roughness={0.25} /></mesh>
    {[0.35, 0.7, 1.05, 1.4].map((r, i) => <mesh key={i} position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.035, 6, 24, Math.PI]} /><meshStandardMaterial color="#c0c8d6" metalness={0.85} roughness={0.25} /></mesh>)}
    {[...xs.map((x) => [x, 1.35]), [0, 1.65]].map(([x, y], i) => <group key={i} position={[x, y, 0]}>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.07, 0.06, 0.06, 8]} /><meshStandardMaterial color="#c0c8d6" metalness={0.85} roughness={0.25} /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.3, 8]} /><meshStandardMaterial color={i === 8 ? '#ffffff' : '#4a7fd6'} /></mesh></group>)}
    <group ref={ref}>{[...xs.map((x) => [x, 1.35]), [0, 1.65]].map(([x, y], i) => <mesh key={i} position={[x, y + 0.42, 0]}><coneGeometry args={[0.04, 0.13, 8]} /><meshBasicMaterial color="#ffcf5a" toneMapped={false} /></mesh>)}</group>
    <pointLight color="#ffd27a" intensity={1.4} distance={6} decay={2} position={[0, 2, 0.4]} />
  </group>;
}
function Dreidel({ c = '#4a7fd6' }) { return <group position={[0, 0.2, 0]} rotation={[0, 0, 0.15]}><mesh><boxGeometry args={[0.22, 0.22, 0.22]} /><meshStandardMaterial color={c} metalness={0.5} roughness={0.3} /></mesh>
  <mesh position={[0, -0.17, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.15, 0.14, 4]} /><meshStandardMaterial color={c} metalness={0.5} roughness={0.3} /></mesh>
  <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1, 5]} /><meshStandardMaterial color="#e0e6f0" /></mesh></group>; }

// Lunar New Year: floating dragon (segments following a sine path), lanterns on stands
function Dragon({ R }) { const g = useRef(); const N = 16;
  useFrame(({ clock }) => { const t = clock.elapsedTime * 0.35; g.current?.children.forEach((s, i) => { const a = t - i * 0.07; const r = R * 0.55; s.position.set(Math.cos(a) * r, 7 + Math.sin(a * 3 + i * 0.4) * 0.7, Math.sin(a) * r); s.rotation.y = -a; }); });
  return <group ref={g}>{Array.from({ length: N }, (_, i) => { const s = i === 0 ? 0.55 : 0.42 * (1 - i / N * 0.6); return <group key={i}>
    <mesh scale={[1, 0.9, 1.2]}><sphereGeometry args={[s, 12, 10]} /><meshStandardMaterial color={i % 2 ? '#d62828' : '#e63946'} emissive="#8a0000" emissiveIntensity={0.25} roughness={0.5} /></mesh>
    <mesh position={[0, s * 0.85, 0]}><coneGeometry args={[s * 0.25, s * 0.5, 4]} /><meshStandardMaterial color="#f5c542" metalness={0.6} roughness={0.3} /></mesh>
    {i === 0 && <>{[-1, 1].map((k) => <mesh key={k} position={[s * 0.4 * k, s * 0.3, s * 0.85]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color="#ffe066" /></mesh>)}
      {[-1, 1].map((k) => <mesh key={'h' + k} position={[s * 0.35 * k, s * 0.9, -s * 0.2]} rotation={[-0.6, 0, k * 0.3]}><coneGeometry args={[0.06, 0.5, 5]} /><meshStandardMaterial color="#f5c542" /></mesh>)}</>}
  </group>; })}</group>; }
function LanternStand({ c = '#d62828', h = 1.5 }) { return <group><mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.03, 0.04, h, 6]} /><meshStandardMaterial color="#3a2a10" /></mesh>
  <mesh position={[0, h + 0.05, 0.18]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.36, 4]} /><meshStandardMaterial color="#3a2a10" /></mesh>
  <group position={[0, h - 0.25, 0.36]}><mesh scale={[1, 0.8, 1]} material={lit(c, 1.1)}><sphereGeometry args={[0.24, 12, 10]} /></mesh>
    {[1, -1].map((k) => <mesh key={k} position={[0, k * 0.2, 0]}><cylinderGeometry args={[0.12, 0.12, 0.05, 10]} /><meshStandardMaterial color="#f5c542" metalness={0.5} /></mesh>)}
    <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.02, 0.04, 0.2, 6]} /><meshBasicMaterial color="#f5c542" /></mesh></group></group>; }

// Diwali: diyas (small clay oil lamps with flames), a rangoli on the ground, floating sky lanterns
function Diya() { return <group><mesh position={[0, 0.05, 0]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.13, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#b5542a" side={2} roughness={0.8} /></mesh>
  <mesh position={[0.08, 0.12, 0]}><coneGeometry args={[0.03, 0.1, 6]} /><meshBasicMaterial color="#ffc94a" toneMapped={false} /></mesh></group>; }
function Rangoli({ r = 1.4 }) { const tex = useMemo(() => { const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.translate(S / 2, S / 2);
  const ring = (n, rad, pr, col) => { x.fillStyle = col; for (let i = 0; i < n; i++) { x.save(); x.rotate((i / n) * TAU); x.beginPath(); x.ellipse(0, -rad, pr * 0.5, pr, 0, 0, TAU); x.fill(); x.restore(); } };
  x.fillStyle = '#ffb703'; x.beginPath(); x.arc(0, 0, 250, 0, TAU); x.fill(); x.fillStyle = '#d62868'; x.beginPath(); x.arc(0, 0, 236, 0, TAU); x.fill();
  ring(16, 196, 40, '#ff7a00'); ring(12, 140, 42, '#2a9d8f'); ring(10, 92, 36, '#ffd23f'); ring(8, 50, 26, '#7b2cbf');
  x.fillStyle = '#ffffff'; for (let i = 0; i < 32; i++) { x.save(); x.rotate((i / 32) * TAU); x.beginPath(); x.arc(0, -228, 6, 0, TAU); x.fill(); x.restore(); }
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  return <group><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow><circleGeometry args={[r, 48]} /><meshStandardMaterial map={tex} transparent roughness={0.95} polygonOffset polygonOffsetFactor={-2} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={[Math.cos((i / 12) * TAU) * (r + 0.15), 0, Math.sin((i / 12) * TAU) * (r + 0.15)]}><Diya /></group>)}
    <pointLight color="#ffb347" intensity={1.2} distance={5} decay={2} position={[0, 0.8, 0]} /></group>; }

function Centre({ cp, children, s = 1 }) { return <group position={[cp[0], cp[1], cp[2]]} rotation={[0, cp[3], 0]} scale={s}>{children}</group>; }
// ---------- per-holiday scenes ----------
export const HOLIDAY_SEASONS = ['newyear', 'valentines', 'stpatricks', 'easter', 'july4', 'thanksgiving', 'hanukkah', 'lunarny', 'diwali'];

export default function HolidayDecor({ season, spots, R, air, night }) {
  const cp = useCenterpiece(0.2);
  switch (season) {
    case 'newyear': return <group>
      {!night && <NightDome color="#0a0f2e" opacity={0.28} />}
      <Fireworks R={R} colors={['#ffd700', '#ffffff', '#c0c0ff', '#ff5ab4', '#5ad1ff']} />
      {air && <Drift R={R} n={260} colors={['#ffd700', '#c0c0c0', '#ffffff']} size={0.16} speed={0.7} />}
      <Garland colors={['#ffd700', '#ffffff', '#c0c0c0']} kind="bulb" />
      <Spots spots={spots} render={(i) => (i % 2 ? <PartyHat c={['#c9a227', '#3a3a8a', '#c0c0c0'][i % 3]} /> : <Champagne />)} />
    </group>;
    case 'valentines': return <group>
      <Garland colors={['#ff4d6d', '#ff8fab', '#ffccd5', '#c9184a']} kind="heart" per={6} />
      {air && <Drift R={R} n={240} colors={['#ff8fab', '#ffb3c6', '#ff4d6d']} size={0.24} speed={0.6} />}
      <Spots spots={spots} render={(i) => (i % 2 ? <Rose /> : <GiftBox c={i % 4 ? '#ff8fab' : '#c9184a'} r="#ffffff" />)} />
      <Centre cp={cp}><mesh position={[0, 1.6, 0]} rotation={[0, 0, Math.PI]} geometry={useMemoHeart()}><meshStandardMaterial color="#e5383b" emissive="#ff4d6d" emissiveIntensity={0.35} roughness={0.35} /></mesh>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.06, 0.1, 0.6, 8]} /><meshStandardMaterial color="#f5f5f5" /></mesh></Centre>
    </group>;
    case 'stpatricks': return <group>
      <Garland colors={['#169b62', '#ffffff', '#ff883e']} kind="flag" />
      <Spots spots={spots} render={(i) => <Clover s={0.3 + (i % 3) * 0.06} />} />
      <Centre cp={cp}><PotOfGold /><group position={[0, 0, -0.2]} rotation={[0, Math.PI / 2, 0]}><group position={[2.6, 0, 0]}><Rainbow r={2.6} /></group></group></Centre>
      {air && <Drift R={R} n={120} colors={['#ffd23f', '#fff3a0']} size={0.14} speed={0.4} />}
    </group>;
    case 'easter': return <group>
      <Garland colors={PASTEL} kind="flag" />
      <Spots spots={spots} render={(i) => <group><Egg i={i} /><FlowerPatch i={i} /></group>} />
      <Centre cp={cp}><EggBasket /></Centre>
      {air && <Drift R={R} n={200} colors={['#ffc6ff', '#fdffb6', '#caffbf', '#ffffff']} size={0.2} speed={0.5} />}
    </group>;
    case 'july4': return <group>
      <Garland colors={['#b22234', '#ffffff', '#3c3b6e']} kind="flag" />
      <Fireworks R={R} colors={['#ff2a3d', '#ffffff', '#3d6bff', '#ff2a3d', '#6aa0ff']} />
      <Spots spots={spots} render={(i) => <group><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.015, 0.015, 1, 4]} /><meshStandardMaterial color="#ddd" /></mesh>
        <mesh position={[0.17, 0.85, 0]}><planeGeometry args={[0.34, 0.22]} /><meshStandardMaterial map={useFlagTex()} side={2} /></mesh></group>} />
    </group>;
    case 'thanksgiving': return <group>
      <Garland colors={['#c2410c', '#ea580c', '#facc15', '#a16207', '#7c2d12']} kind="flag" />
      {air && <Drift R={R} n={320} colors={['#c2410c', '#ea580c', '#facc15', '#a16207', '#b91c1c']} size={0.26} speed={0.6} sway={1.4} />}
      <Spots spots={spots} render={(i) => (i % 3 === 0 ? <HayBale /> : i % 3 === 1 ? <group><MiniPumpkin s={0.28} c={i % 2 ? '#e8731c' : '#f2e8cf'} /><group position={[0.4, 0, 0.1]}><MiniPumpkin s={0.18} /></group></group> : <CornStalks />)} />
      <Centre cp={cp}><HarvestTable /></Centre>
    </group>;
    case 'hanukkah': return <group>
      <Garland colors={['#3b6fd6', '#ffffff', '#a8c4ff', '#d0d8e8']} kind="bulb" />
      <Spots spots={spots} render={(i) => (i % 2 ? <Dreidel c={i % 4 === 1 ? '#3b6fd6' : '#c0c8d6'} /> : <GiftBox c="#3b6fd6" r="#e0e6f0" />)} />
      <Centre cp={cp} s={1.1}><Menorah /></Centre>
    </group>;
    case 'lunarny': return <group>
      <Garland colors={['#d62828', '#e63946', '#f5c542']} kind="lantern" per={5} />
      {air && <Dragon R={R} />}
      <Spots spots={spots} render={(i) => (i % 2 ? <LanternStand c={i % 4 === 1 ? '#d62828' : '#f5a623'} /> : <group position={[0, 0.25, 0]}><mesh><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#ff9500" /></mesh><mesh position={[0.28, 0, 0.05]}><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#ff9500" /></mesh></group>)} />
      {air && <Drift R={R} n={160} colors={['#ff3b30', '#ffd23f']} size={0.16} speed={0.5} />}
    </group>;
    case 'diwali': return <group>
      <Garland colors={['#ffb703', '#fb8500', '#d62868', '#ffd23f']} kind="lantern" per={5} />
      <Spots spots={spots} render={(i) => <group>{[-0.25, 0, 0.25].map((x) => <group key={x} position={[x, 0, 0]}><Diya /></group>)}</group>} />
      <Centre cp={cp}><Rangoli /></Centre>
      {air && <Drift R={R} n={40} colors={['#ffb347', '#ffd27a']} size={0.6} speed={0.35} dir={1} top={22} sway={0.3} />}
      {air && <Drift R={R} n={160} colors={['#ffd23f', '#ff8a00']} size={0.12} speed={0.4} />}
    </group>;
    default: return null;
  }
}
let _heart; function useMemoHeart() { return (_heart ||= heartGeo(1.0, 0.3)); }
let _flag; function useFlagTex() { if (_flag) return _flag; const c = document.createElement('canvas'); c.width = 76; c.height = 40; const x = c.getContext('2d');
  for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#b22234'; x.fillRect(0, (i * 40) / 13, 76, 40 / 13 + 0.5); } x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, 30, 21.5);
  x.fillStyle = '#fff'; for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) x.fillRect(3 + k * 5.5 + (r % 2) * 2.5, 2.5 + r * 5, 1.5, 1.5); _flag = new THREE.CanvasTexture(c); _flag.colorSpace = THREE.SRGBColorSpace; return _flag; }
