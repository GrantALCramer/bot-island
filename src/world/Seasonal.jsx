// Seasonal decorations, picked by date (or forced in settings):
//   halloween (Oct): pumpkins + jack-o-lanterns by every home and along the ring road, bats, low ground mist
//   winter (Dec):    falling snow + string lights on poles around the ring road and the homes
//   spring (Mar-May): drifting cherry petals
// Themes with no air (moon) or underwater (atlantis) skip falling particles / bats.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';

export function seasonFor(mode, d = new Date()) {
  if (mode === 'off') return null; if (mode && mode !== 'auto') return mode;
  const m = d.getMonth(); return m === 9 ? 'halloween' : m === 11 ? 'winter' : m >= 2 && m <= 4 ? 'spring' : null;
}
export const SEASON_LABEL = { halloween: '🎃 Halloween', winter: '❄️ Winter holidays', spring: '🌸 Spring' };
const NO_AIR = new Set(['moon', 'atlantis']);

function useSpots(n0 = 10) { // porch spots by each home + evenly spaced points just outside the ring road
  const { layout } = useWorld();
  return useMemo(() => { const g = layout.groundY; const out = [];
    layout.homes.forEach((h, i) => { const [x, z] = h.walkFrom; const a = Math.atan2(z, x) + 0.35; const px = x + Math.cos(a) * 0.9, pz = z + Math.sin(a) * 0.9; out.push([px, g(px, pz), pz, i]); });
    const Ro = layout.Ro + 1.1; for (let k = 0; k < n0; k++) { const a = (k / n0) * Math.PI * 2 + 0.2; const x = Math.cos(a) * Ro, z = Math.sin(a) * Ro; out.push([x, g(x, z), z, k + 50]); }
    return out; }, [layout]);
}

function Pumpkin({ p, lit }) {
  const s = 0.42 + ((p[3] * 37) % 10) / 50; const face = useMemo(() => Math.atan2(-p[0], -p[2]), [p]);
  return (<group position={[p[0], p[1] + s * 0.75, p[2]]} rotation={[0, face, 0]}>
    {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} rotation={[0, (i / 6) * Math.PI, 0]} scale={[1, 0.82, 0.62]} castShadow><sphereGeometry args={[s, 14, 10]} /><meshStandardMaterial color="#e8731c" roughness={0.6} emissive="#ff7a00" emissiveIntensity={lit ? 0.18 : 0} /></mesh>)}
    <mesh position={[0, s * 0.85, 0]}><cylinderGeometry args={[0.035, 0.05, 0.16, 6]} /><meshStandardMaterial color="#4a6b2a" /></mesh>
    {lit && <group position={[0, 0, s * 0.63]}>
      {[-1, 1].map((k) => <mesh key={k} position={[k * s * 0.33, s * 0.18, 0]} rotation={[0, 0, Math.PI]}><circleGeometry args={[s * 0.16, 3]} /><meshBasicMaterial color="#ffd23f" toneMapped={false} /></mesh>)}
      <mesh position={[0, -s * 0.22, 0]} scale={[1, 0.45, 1]}><circleGeometry args={[s * 0.36, 7, 0, Math.PI]} /><meshBasicMaterial color="#ffd23f" toneMapped={false} side={2} /></mesh>
      <pointLight color="#ff9a2e" intensity={0.8} distance={3} decay={2} position={[0, 0, 0.2]} />
    </group>}
  </group>);
}

function Bats({ R }) {
  const g = useRef(); const N = 9; const st = useMemo(() => Array.from({ length: N }, (_, i) => ({ r: R * (0.35 + Math.random() * 0.5), h: 5 + Math.random() * 4, sp: 0.25 + Math.random() * 0.3, ph: (i / N) * Math.PI * 2 })), [R]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; g.current?.children.forEach((b, i) => { const s = st[i]; const a = s.ph + t * s.sp;
    b.position.set(Math.cos(a) * s.r, s.h + Math.sin(t * 1.7 + i) * 0.6, Math.sin(a) * s.r); b.rotation.y = -a; const f = Math.sin(t * 18 + i) * 0.7; b.children[0].rotation.z = f; b.children[1].rotation.z = -f; }); });
  return (<group ref={g}>{st.map((_, i) => <group key={i} scale={1.1}>
    {[-1, 1].map((k) => <mesh key={k}><bufferGeometry onUpdate={(geo) => geo.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, k * 0.5), new THREE.Vector3(-0.15, 0.08, k * 0.32)])} /><meshBasicMaterial color="#141018" side={2} /></mesh>)}
    <mesh><sphereGeometry args={[0.07, 6, 5]} /><meshBasicMaterial color="#141018" /></mesh></group>)}</group>);
}

function GroundMist({ R }) {
  const g = useRef(); const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }, []);
  const st = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: R * (0.3 + Math.random() * 0.6), s: 4 + Math.random() * 4 })), [R]);
  useFrame(({ clock }) => { g.current?.children.forEach((m, i) => { const s = st[i]; const a = s.a + clock.elapsedTime * 0.01; m.position.set(Math.cos(a) * s.r, 0.25 + (i % 3) * 0.15, Math.sin(a) * s.r); }); });
  return <group ref={g}>{st.map((s, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={s.s}><planeGeometry /><meshBasicMaterial map={tex} color="#d9d2ff" transparent opacity={0.09} depthWrite={false} /></mesh>)}</group>;
}

const dot = () => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); };
function Falling({ R, kind }) { // snow or petals
  const N = kind === 'snow' ? 1400 : 380; const ref = useRef(); const tex = useMemo(dot, []);
  const [pos, vel] = useMemo(() => { const p = new Float32Array(N * 3), v = new Float32Array(N); for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 1.3; p.set([Math.cos(a) * r, Math.random() * 22, Math.sin(a) * r], i * 3); v[i] = 0.6 + Math.random() * 0.8; } return [p, v]; }, [N, R]);
  useFrame(({ clock }, dt) => { const g = ref.current?.geometry; if (!g) return; const a = g.attributes.position.array; const t = clock.elapsedTime; const d = Math.min(dt, 0.05);
    for (let i = 0; i < N; i++) { a[i * 3 + 1] -= vel[i] * d * (kind === 'snow' ? 1.3 : 0.9); a[i * 3] += Math.sin(t * 0.8 + i) * d * (kind === 'snow' ? 0.3 : 0.9); a[i * 3 + 2] += Math.cos(t * 0.6 + i * 1.3) * d * 0.3; if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 22; }
    g.attributes.position.needsUpdate = true; });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
    <pointsMaterial map={tex} alphaTest={0.05} color={kind === 'snow' ? '#ffffff' : '#ffb7d5'} size={kind === 'snow' ? 0.2 : 0.26} sizeAttenuation transparent opacity={0.9} depthWrite={false} /></points>;
}

const BULBS = ['#ff3b3b', '#ffd23f', '#3bd16f', '#3b8bff', '#ff7bd8'];
function StringLights({ R }) { // poles around the ring road, sagging strands of colored bulbs between them
  const { layout } = useWorld(); const n = Math.max(10, Math.round(R * 0.8)); const H = 2.3; const ref = useRef();
  const { poles, bulbs } = useMemo(() => { const g = layout.groundY; const r = layout.Ro + 0.9; const poles = []; const bulbs = [];
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; const x = Math.cos(a) * r, z = Math.sin(a) * r; poles.push([x, g(x, z), z]); }
    poles.forEach((p, k) => { const q = poles[(k + 1) % n]; for (let j = 1; j < 8; j++) { const u = j / 8; bulbs.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u + H - Math.sin(u * Math.PI) * 0.45, p[2] + (q[2] - p[2]) * u, (k * 7 + j) % BULBS.length]); } });
    return { poles, bulbs }; }, [layout, n]);
  const mats = useMemo(() => BULBS.map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false })), []);
  useFrame(({ clock }) => { mats.forEach((m, i) => { const on = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 2 + i * 1.3); m.color.set(BULBS[i]).multiplyScalar(0.6 + on * 1.6); }); });
  return (<group ref={ref}>
    {poles.map((p, i) => <mesh key={i} position={[p[0], p[1] + H / 2, p[2]]} castShadow><cylinderGeometry args={[0.05, 0.06, H, 6]} /><meshStandardMaterial color="#5b4636" /></mesh>)}
    {bulbs.map((b, i) => <mesh key={i} position={[b[0], b[1], b[2]]} material={mats[b[3]]}><sphereGeometry args={[0.11, 8, 6]} /></mesh>)}
  </group>);
}

export default function Seasonal({ season, night }) {
  const { theme, layout } = useWorld(); const spots = useSpots(12); const R = layout.R || 14; const air = !NO_AIR.has(theme.id);
  if (!season) return null;
  if (season === 'halloween') return (<group>
    {spots.map((p, i) => <Pumpkin key={i} p={p} lit={i % 2 === 0 || night} />)}
    {air && <Bats R={R} />}
    {theme.id !== 'atlantis' && <GroundMist R={R} />}
  </group>);
  if (season === 'winter') return (<group>{air && <Falling R={R} kind="snow" />}<StringLights R={R} /></group>);
  if (season === 'spring') return air ? <Falling R={R} kind="petals" /> : null;
  return null;
}
