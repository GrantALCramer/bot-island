import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { holoMaterial, useWorld } from './env.js';
import { Palm } from './Vegetation.jsx';
import { botColor, mix } from '../util.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { useGrow } from './Fun.jsx';
import { growOf, plazaGrow } from './layout.js';
import { EXT } from './ext.js';

const WOOD = '#a0703f', WOOD_D = '#7a5230', THATCH = '#d4ab62', THATCH_D = '#b08640', BAMBOO = '#cdb46e';
const night = (env) => 1 - (env.current?.day ?? 1);

export function Sign({ text, position, color = '#fff7e0', post = true, df = 14 }) {
  return (<group position={position}>
    {post && <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color={WOOD_D} /></mesh>}
    <Html position={[0, post ? 1.05 : 0, 0]} center distanceFactor={df} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="sign" style={{ background: color }}>{text}</div></Html>
  </group>);
}

// Thatched cone roof (jittered straw + fringe). Opacity lets bungalows cut away when selected.
export function Thatch({ r = 2, h = 1.3, sides = 12, y = 2.2, opacityRef, color = THATCH, dark = THATCH_D }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(r, h, sides, 4, true); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); if (yy < h / 2 - 0.01) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 + Math.sin(a * 37.0 + yy * 11.0) * 0.035; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } // position-based jitter keeps seams closed
    g.computeVertexNormals(); return g;
  }, [r, h, sides]);
  const mat = useRef(); const fr = useRef();
  useFrame(() => { if (!opacityRef) return; const o = opacityRef.current; for (const m of [mat.current, fr.current]) if (m) { m.opacity = o; if (m.transparent !== o < 0.99) { m.transparent = o < 0.99; m.needsUpdate = true; } m.depthWrite = o > 0.99; } });
  return (<group position={[0, y + h / 2, 0]}>
    <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial ref={mat} color={color} roughness={1} flatShading side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -h / 2 - 0.08, 0]}><cylinderGeometry args={[r * 1.01, r * 1.04, 0.2, sides, 1, true]} /><meshStandardMaterial ref={fr} color={dark} roughness={1} side={THREE.DoubleSide} flatShading /></mesh>
  </group>);
}

// Flame that lights up at night (bright enough to bloom)
const FLAMES = { fire: ['#ffae42', '#fff2b0'], ice: ['#8fd8ff', '#f0fbff'], orb: ['#4dffd8', '#e0fff8'], gold: ['#ffd76a', '#fff6d0'], white: ['#cfe8ff', '#ffffff'], hell: ['#ff5a1a', '#ffd27a'] };
export function Flame({ scale = 1, seed = 0, always = false, kind = 'fire' }) {
  const { env } = useWorld(); const g = useRef();
  const [flameCol, flameCore] = useMemo(() => FLAMES[kind].map((c, i) => new THREE.Color(c).multiplyScalar(i ? 3 : 3.2)), [kind]);
  useFrame(({ clock }) => {
    if (!g.current) return; const lit = always ? 1 : THREE.MathUtils.smoothstep(night(env), 0.25, 0.55); const t = clock.elapsedTime * 9 + seed;
    g.current.visible = lit > 0.02; g.current.scale.set(scale * lit, scale * lit * (1 + Math.sin(t) * 0.15 + Math.sin(t * 2.3) * 0.08), scale * lit);
  });
  return (<group ref={g}>
    <mesh position={[0, 0.16, 0]}><coneGeometry args={[0.11, 0.38, 8]} /><meshBasicMaterial color={flameCol} toneMapped={false} transparent opacity={0.9} /></mesh>
    <mesh position={[0, 0.09, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={flameCore} toneMapped={false} /></mesh>
  </group>);
}
export function FlickerLight({ position, intensity = 6, distance = 9, color = '#ff9a3c', seed = 0, min = 0 }) {
  const { env } = useWorld(); const l = useRef();
  useFrame(({ clock }) => { if (!l.current) return; const lit = Math.max(min, THREE.MathUtils.smoothstep(night(env), 0.25, 0.55)); const t = clock.elapsedTime + seed; l.current.intensity = intensity * lit * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07); });
  return <pointLight ref={l} position={position} color={color} distance={distance} decay={1.6} intensity={0} />;
}

// Paper lantern (chōchin): paper body that glows warm at night. Exported for the sakura theme pieces.
const PAPER_GLOW = new THREE.Color('#ffb35a');
export function PaperLantern({ position, color = '#e2483a', r = 0.16, h = 0.34, seed = 0, light = false }) {
  const { env } = useWorld(); const m = useRef(); const base = useMemo(() => new THREE.Color(color), [color]);
  useFrame(({ clock }) => { if (!m.current) return; const n = THREE.MathUtils.smoothstep(night(env), 0.25, 0.6);
    m.current.color.copy(base).lerp(PAPER_GLOW, n * 0.55).multiplyScalar(0.85 + n * (1.5 + Math.sin(clock.elapsedTime * 2.3 + seed) * 0.12)); });
  return (<group position={position}>
    <mesh scale={[1, h / (2 * r), 1]}><sphereGeometry args={[r, 14, 10]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[r * 0.55, r * 0.55, 0.05, 10]} /><meshStandardMaterial color="#2a2020" /></mesh>
    <mesh position={[0, -h / 2, 0]}><cylinderGeometry args={[r * 0.55, r * 0.55, 0.05, 10]} /><meshStandardMaterial color="#2a2020" /></mesh>
    {light && <FlickerLight position={[0, 0, 0]} intensity={3.2} distance={7} seed={seed} color="#ffb35a" />}
  </group>);
}
export function Torch({ position, light = false, h = 1.7, seed = 0, style }) {
  const { theme } = useWorld(); const st = style || theme.lights?.torch || 'tiki';
  const XT = EXT.torch[st]; if (XT) return <XT position={position} light={light} h={h} seed={seed} />;
  if (st === 'ice') return (<group position={position}>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.13, 0.17, h, 6]} /><meshStandardMaterial color="#cfeaf7" roughness={0.15} transparent opacity={0.85} /></mesh>
    <group position={[0, h + 0.02, 0]}><Flame seed={seed} kind="ice" /></group>
    {light && <FlickerLight position={[0, h + 0.4, 0]} intensity={4} distance={7} seed={seed} color="#9fdcff" />}
  </group>);
  if (st === 'orb') return (<group position={position}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.04, 0.09, h, 6]} /><meshStandardMaterial color="#c86a8a" roughness={0.7} /></mesh>
    <group position={[0, h - 0.05, 0]}><Flame seed={seed} kind="orb" always scale={0.9} /></group>
    {light && <FlickerLight position={[0, h + 0.4, 0]} intensity={3} distance={7} seed={seed} color="#4dffd8" />}
  </group>);
  if (st === 'lamp') return (<group position={position}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.035, 0.05, h, 6]} /><meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, h, 0]}><boxGeometry args={[0.22, 0.08, 0.22]} /><meshStandardMaterial color="#4a4f58" metalness={0.5} /></mesh>
    <group position={[0, h - 0.12, 0]}><Flame seed={seed} kind="white" always scale={0.55} /></group>
    {light && <FlickerLight position={[0, h + 0.2, 0]} intensity={3.5} distance={8} seed={seed} color="#dfefff" min={0.35} />}
  </group>);
  if (st === 'gold') return (<group position={position}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.06, 0.08, h, 10]} /><meshStandardMaterial color="#f7f2e8" roughness={0.4} /></mesh>
    <mesh position={[0, h, 0]}><torusGeometry args={[0.13, 0.025, 6, 18]} /><meshStandardMaterial color="#e9b949" metalness={0.8} roughness={0.25} /></mesh>
    <group position={[0, h - 0.05, 0]}><Flame seed={seed} kind="gold" always scale={0.8} /></group>
    {light && <FlickerLight position={[0, h + 0.3, 0]} intensity={3} distance={8} seed={seed} color="#ffd76a" min={0.3} />}
  </group>);
  if (st === 'paper') return (<group position={position}>
    <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[0.08, h, 0.08]} /><meshStandardMaterial color="#5a3a24" roughness={0.8} /></mesh>
    <mesh position={[0.12, h - 0.02, 0]}><boxGeometry args={[0.34, 0.05, 0.05]} /><meshStandardMaterial color="#5a3a24" /></mesh>
    <PaperLantern position={[0.24, h - 0.27, 0]} color={seed % 2 ? '#f4ead2' : '#e2483a'} seed={seed} light={light} />
  </group>);
  if (st === 'brazier') return (<group position={position}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.05, 0.07, h, 6]} /><meshStandardMaterial color="#2a2426" metalness={0.5} roughness={0.5} /></mesh>
    <mesh position={[0, h + 0.05, 0]}><cylinderGeometry args={[0.2, 0.1, 0.2, 8, 1, true]} /><meshStandardMaterial color="#3a3032" metalness={0.5} side={THREE.DoubleSide} /></mesh>
    <group position={[0, h + 0.08, 0]}><Flame seed={seed} kind="hell" always scale={1.2} /></group>
    {light && <FlickerLight position={[0, h + 0.4, 0]} intensity={4} distance={8} seed={seed} color="#ff6a2a" min={0.4} />}
  </group>);
  return (<group position={position}>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.045, 0.06, h, 6]} /><meshStandardMaterial color={BAMBOO} roughness={0.8} /></mesh>
    <mesh position={[0, h + 0.05, 0]}><cylinderGeometry args={[0.12, 0.07, 0.2, 8]} /><meshStandardMaterial color={WOOD_D} /></mesh>
    <group position={[0, h + 0.13, 0]}><Flame seed={seed} /></group>
    {light && <FlickerLight position={[0, h + 0.4, 0]} intensity={4} distance={7} seed={seed} />}
  </group>);
}

const HOLO_COL = { beach: '#5ff6ff', holo: '#5ff6ff', ice: '#a8f0ff', crystal: '#a8f0ff', temple: '#7dffc0', stone: '#7dffc0', biolum: '#6dffd8', pillars: '#6dffd8', hab: '#7fd0ff', dish: '#7fd0ff', marble: '#ffd36a', books: '#ffd36a', forge: '#ff6a3d', runes: '#ff6a3d', dojo: '#ffb86b', scrolls: '#ffb86b' };
const BACK = Math.PI * 1.25; // world angle pointing away from the default camera
const backPts = (n, r, spread = 2.4) => Array.from({ length: n }, (_, i) => { const a = BACK + (i / (n - 1) - 0.5) * spread; return [Math.cos(a) * r, Math.sin(a) * r, a]; });
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h / 97; };

// ---------- holo lab: platform with floating screens around a core (fixed size; one instance = 6 stations) ----------
function HoloScreen({ position, rot, seed, active, color, station }) {
  const mats = useMemo(() => [holoMaterial(seed, 0, color), holoMaterial(seed + 3.1, 1, color), holoMaterial(seed + 7.7, 2, color)], [seed, color]);
  const g = useRef(); const level = useRef(0);
  useFrame(({ clock }, dt) => {
    level.current += ((active ? 1 : 0) - level.current) * Math.min(1, dt * 2);
    mats.forEach((m) => { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uActive.value = level.current; });
    if (g.current) g.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.3 + seed) * 0.04;
  });
  // clicking a lit screen opens that bot's task screen (App listens for this event)
  const open = (e) => { if (!active) return; e.stopPropagation(); window.dispatchEvent(new CustomEvent('botsim:screen', { detail: station })); };
  return (<group ref={g} position={position} rotation={[0, rot, 0]} onClick={open} onPointerOver={(e) => { if (active) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }} onPointerOut={() => { document.body.style.cursor = ''; }}>
    <mesh material={mats[0]} rotation={[-0.12, 0, 0]}><planeGeometry args={[1.15, 0.72]} /></mesh>
    <mesh material={mats[1]} position={[0.78, -0.08, 0.16]} rotation={[-0.1, -0.5, 0]}><planeGeometry args={[0.46, 0.4]} /></mesh>
    <mesh material={mats[2]} position={[-0.74, 0.08, 0.14]} rotation={[-0.1, 0.5, 0]}><planeGeometry args={[0.38, 0.38]} /></mesh>
  </group>);
}
function Projector({ position, color }) {
  return <mesh position={position}><cylinderGeometry args={[0.16, 0.2, 0.06, 16]} /><meshStandardMaterial color="#1b2b3a" emissive={color} emissiveIntensity={0.6} metalness={0.6} roughness={0.3} /></mesh>;
}
function HoloCore({ y = 0, active, color = '#5ff6ff', base = true }) {
  const ring = useRef(); const ring2 = useRef();
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (ring.current) { ring.current.rotation.z = t * 0.6; ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.2; } if (ring2.current) ring2.current.rotation.y = -t * 0.9; });
  const glow = new THREE.Color(color).multiplyScalar(active ? 2.6 : 1.2);
  return (<group position={[0, y, 0]}>
    {base && <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.35, 0.45, 0.5, 16]} /><meshStandardMaterial color="#223344" metalness={0.7} roughness={0.25} /></mesh>}
    <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.25, 0.25, 0.04, 20]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
    <mesh ref={ring} position={[0, 1.4, 0]}><torusGeometry args={[0.45, 0.02, 8, 40]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
    <mesh ref={ring2} position={[0, 1.4, 0]}><icosahedronGeometry args={[0.28, 1]} /><meshBasicMaterial color={glow} wireframe toneMapped={false} /></mesh>
    <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.04, 0.2, 0.85, 12, 1, true]} /><meshBasicMaterial color={glow} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
  </group>);
}
const deckGeo = (r = 3, h = 0.26) => cached(`deck${r}`, () => {
  const parts = [[G.cyl(r, r + 0.05, h + 0.1, 16), WOOD, [0, h / 2 - 0.05, 0]]];
  for (let i = 0; i < 9; i++) { const z = -r + 0.3 + (i * (2 * r - 0.6)) / 8; const w = 2 * Math.sqrt(Math.max(0, r * r - z * z)) - 0.2; parts.push([G.box(w, 0.012, 0.03), '#6e4a28', [0, h + 0.003, z]]); }
  return mergeParts(parts);
});
const habGlass = new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
const crystalMat = new THREE.MeshStandardMaterial({ color: '#bfe6f7', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true });
function LabBase({ style, hc }) {
  const XL = EXT.lab[style]; if (XL) return <XL hc={hc} />;
  if (style === 'ice') {
    const geo = cached('labIce', () => mergeParts([[G.cyl(3.0, 3.15, 0.36, 9), '#d8ecf6', [0, 0.08, 0]], [G.cyl(2.2, 2.3, 0.04, 9), '#bcdcec', [0, 0.27, 0]]]));
    const shards = cached('labIceShards', () => mergeParts(backPts(7, 3.05, 2.6).flatMap(([x, z, a], i) => [[G.oct(0.6), '#a8d8f0', [x, 1.1 + (i % 2) * 0.5, z], [0.2 * i, a, 0.15], [0.7, 2.2 + (i % 3) * 0.5, 0.6]]])));
    return (<group><mesh geometry={geo} material={MAT.vcFlat} receiveShadow castShadow /><mesh geometry={shards} material={crystalMat} castShadow />
      <Torch position={[Math.cos(0.3) * 2.8, 0.26, Math.sin(0.3) * 2.8]} seed={1} /><Torch position={[Math.cos(2.0) * 2.8, 0.26, Math.sin(2.0) * 2.8]} seed={2} /></group>);
  }
  if (style === 'temple') {
    const geo = cached('labTemple', () => mergeParts([
      [G.cyl(3.15, 3.25, 0.18, 8), '#7d8270', [0, 0.0, 0]], [G.cyl(2.9, 3.0, 0.2, 8), '#959a84', [0, 0.16, 0]],
      ...backPts(2, 3.0, 1.6).flatMap(([x, z, a]) => [[G.box(0.6, 2.8, 0.6), '#8d927c', [x, 1.5, z], [0, -a, 0]], [G.box(0.75, 0.25, 0.75), '#7a7f6a', [x, 2.95, z], [0, -a, 0]]]),
      [G.box(2.6, 0.4, 0.55), '#858a74', [Math.cos(BACK) * 3.0, 3.25, Math.sin(BACK) * 3.0], [0, -BACK + Math.PI / 2, 0.06]],
      [G.box(0.9, 1.2, 0.7), '#9aa08a', [Math.cos(BACK) * 3.3, 3.95, Math.sin(BACK) * 3.3], [0, -BACK + Math.PI / 2, 0]],
      ...backPts(5, 3.1, 3.4).map(([x, z], i) => [G.dodec(0.3 + (i % 2) * 0.12), '#4f8f3c', [x, 0.3, z]]),
    ]));
    return (<group><mesh geometry={geo} material={MAT.vcFlat} receiveShadow castShadow />
      <mesh position={[Math.cos(BACK) * 3.3 + Math.cos(BACK + Math.PI / 2) * 0.2, 4.05, Math.sin(BACK) * 3.3 + Math.sin(BACK + Math.PI / 2) * 0.2]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color={new THREE.Color(hc).multiplyScalar(3)} toneMapped={false} /></mesh>
      <mesh position={[Math.cos(BACK) * 3.3 - Math.cos(BACK + Math.PI / 2) * 0.2, 4.05, Math.sin(BACK) * 3.3 - Math.sin(BACK + Math.PI / 2) * 0.2]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color={new THREE.Color(hc).multiplyScalar(3)} toneMapped={false} /></mesh>
      <Torch position={[Math.cos(0.3) * 2.8, 0.26, Math.sin(0.3) * 2.8]} seed={1} /><Torch position={[Math.cos(2.0) * 2.8, 0.26, Math.sin(2.0) * 2.8]} seed={2} /></group>);
  }
  if (style === 'biolum') {
    const geo = cached('labBio', () => mergeParts([[G.cyl(3.0, 3.2, 0.36, 12), '#2e4152', [0, 0.08, 0]],
      ...backPts(6, 3.1, 3.0).map(([x, z], i) => [G.dodec(0.45 + (i % 3) * 0.15), '#3b4d5e', [x, 0.3, z], [i, i * 2, 0]])]));
    const glow = new THREE.Color(hc).multiplyScalar(2.2);
    return (<group><mesh geometry={geo} material={MAT.vcFlat} receiveShadow />
      <mesh position={[0, 0.265, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.75, 2.85, 48]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
      {backPts(5, 3.4, 2.6).map(([x, z], i) => <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 0.5 + (i % 2) * 0.3, 0]}><cylinderGeometry args={[0.04, 0.07, 1 + (i % 2) * 0.6, 5]} /><meshStandardMaterial color="#b9ffe9" emissive="#3cffc8" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 1.05 + (i % 2) * 0.6, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.32, 12, 8]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
      </group>)}</group>);
  }
  if (style === 'hab') { // pressurized hab: metal deck under a glass dome with ribs and an airlock
    const geo = cached('labHab', () => mergeParts([[G.cyl(3.15, 3.3, 0.36, 24), '#b9bec6', [0, 0.08, 0]], [G.cyl(2.95, 2.95, 0.03, 24), '#8f959e', [0, 0.27, 0]],
      ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [G.box(0.25, 0.3, 0.5), '#e8eaee', [Math.cos(a) * 3.1, 0.3, Math.sin(a) * 3.1], [0, -a, 0]]; }),
      ...backPts(3, 3.35, 1.4).map(([x, z, a]) => [G.box(0.9, 0.9, 0.9), '#dfe3e8', [x, 0.6, z], [0, -a, 0]]),
      [G.cyl(0.08, 0.08, 1.6, 6), '#c9ccd2', [Math.cos(BACK) * 3.4, 1.8, Math.sin(BACK) * 3.4]], [G.box(1.3, 0.05, 0.6), '#2a4a8a', [Math.cos(BACK) * 3.4, 2.6, Math.sin(BACK) * 3.4], [0.5, -BACK, 0]]]));
    const ribs = cached('labHabRibs', () => mergeParts(Array.from({ length: 4 }, (_, i) => [G.torus(3.05, 0.04, 5, 32, Math.PI), '#d5d9df', [0, 0.26, 0], [0, (i / 4) * Math.PI, 0]])));
    return (<group><mesh geometry={geo} material={MAT.vcGloss} receiveShadow castShadow /><mesh geometry={ribs} material={MAT.vcGloss} />
      <mesh position={[0, 0.26, 0]} material={habGlass} renderOrder={2}><sphereGeometry args={[3.05, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh></group>);
  }
  if (style === 'marble') { // marble temple: stepped round base, columns with gold capitals at the back
    const geo = cached('labMarble', () => mergeParts([[G.cyl(3.3, 3.4, 0.14, 28), '#ede6da', [0, 0.0, 0]], [G.cyl(3.05, 3.15, 0.14, 28), '#f7f2e9', [0, 0.13, 0]], [G.cyl(2.55, 2.55, 0.02, 28), '#e9c46a', [0, 0.27, 0]],
      ...backPts(5, 3.0, 3.0).flatMap(([x, z]) => [[G.cyl(0.2, 0.24, 2.7, 12), '#fbf8f2', [x, 1.55, z]], [G.box(0.55, 0.16, 0.55), '#e9c46a', [x, 2.95, z]], [G.box(0.55, 0.14, 0.55), '#ede6da', [x, 0.27, z]]]),
      [G.torus(3.0, 0.12, 6, 40, 3.0), '#e9c46a', [0, 3.1, 0], [Math.PI / 2, 0, BACK - 1.5]]]));
    return (<group><mesh geometry={geo} material={MAT.vcGloss} receiveShadow castShadow />
      <Torch position={[Math.cos(0.3) * 2.9, 0.26, Math.sin(0.3) * 2.9]} seed={1} /><Torch position={[Math.cos(2.0) * 2.9, 0.26, Math.sin(2.0) * 2.9]} seed={2} /></group>);
  }
  if (style === 'dojo') { // wooden dojo pavilion: raised deck, tatami, back posts + beams with paper lanterns
    const geo = cached('labDojo', () => { const P = [[G.cyl(3.15, 3.25, 0.3, 8), '#6e4a2c', [0, 0.06, 0], [0, Math.PI / 8, 0]], [G.cyl(3.0, 3.0, 0.04, 8), '#b8875a', [0, 0.22, 0], [0, Math.PI / 8, 0]],
        [G.cyl(2.05, 2.05, 0.03, 8), '#cdbf86', [0, 0.25, 0], [0, Math.PI / 8, 0]], [G.cyl(1.98, 1.98, 0.035, 8), '#3f5a3a', [0, 0.245, 0], [0, Math.PI / 8, 0]]];
      const back = backPts(4, 3.0, 2.6);
      back.forEach(([x, z]) => P.push([G.box(0.22, 2.9, 0.22), '#5a3a24', [x, 1.6, z]], [G.box(0.36, 0.14, 0.36), '#3a2618', [x, 0.25, z]]));
      for (let i = 0; i < back.length - 1; i++) { const [x1, z1] = back[i], [x2, z2] = back[i + 1]; const L = Math.hypot(x2 - x1, z2 - z1); const a = Math.atan2(z2 - z1, x2 - x1);
        P.push([G.box(L + 0.6, 0.2, 0.24), '#c0392b', [(x1 + x2) / 2, 3.0, (z1 + z2) / 2], [0, -a, 0]], [G.box(L + 1.0, 0.14, 0.4), '#2e2a2a', [(x1 + x2) / 2, 3.17, (z1 + z2) / 2], [0, -a, 0]]); }
      return mergeParts(P); });
    return (<group><mesh geometry={geo} material={MAT.vcFlat} receiveShadow castShadow />
      {backPts(4, 3.0, 2.6).map(([x, z], i) => <PaperLantern key={i} position={[x * 0.93, 2.45, z * 0.93]} color={i % 2 ? '#f4ead2' : '#e2483a'} seed={i} light={i === 1} />)}</group>);
  }
  if (style === 'forge') { // forge: basalt platform, anvil, glowing lava trough and chimneys
    const geo = cached('labForge', () => mergeParts([[G.cyl(3.1, 3.3, 0.36, 9), '#2e2629', [0, 0.08, 0]], [G.cyl(2.8, 2.9, 0.04, 9), '#3a3134', [0, 0.27, 0]],
      ...backPts(2, 3.0, 1.9).flatMap(([x, z, a]) => [[G.cyl(0.42, 0.55, 3.4, 6), '#3a3134', [x, 1.7, z]], [G.cyl(0.5, 0.42, 0.3, 6), '#241d20', [x, 3.45, z]]]),
      [G.box(1.0, 0.45, 0.45), '#4a4448', [Math.cos(BACK) * 3.15, 0.5, Math.sin(BACK) * 3.15], [0, -BACK, 0]], [G.box(0.6, 0.35, 0.3), '#2a2426', [Math.cos(BACK) * 3.15, 0.2, Math.sin(BACK) * 3.15], [0, -BACK, 0]]]));
    const lava = new THREE.Color('#ff5a1a').multiplyScalar(2.2);
    return (<group><mesh geometry={geo} material={MAT.vcFlat} receiveShadow castShadow />
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.62, 2.78, 9]} /><meshBasicMaterial color={lava} toneMapped={false} /></mesh>
      {backPts(2, 3.0, 1.9).map(([x, z], i) => <group key={i} position={[x, 3.6, z]}><Flame kind="hell" always scale={1.6} seed={i} /></group>)}
      <FlickerLight position={[Math.cos(BACK) * 2.6, 1.4, Math.sin(BACK) * 2.6]} intensity={5} distance={8} min={0.5} color="#ff6a2a" /></group>);
  }
  return (<group><mesh geometry={deckGeo()} material={MAT.vc} receiveShadow castShadow />
    <Torch position={[Math.cos(2.4) * 2.8, 0.26, Math.sin(2.4) * 2.8]} seed={1} /><Torch position={[Math.cos(5.6) * 2.8, 0.26, Math.sin(5.6) * 2.8]} seed={2} /></group>);
}
export function HoloLab({ inst, cfg, occupied, primary, count = 0 }) {
  const { layout } = useWorld(); const y0 = layout.groundY(inst.x, inst.z); const style = cfg.style || 'beach'; const hc = HOLO_COL[style] || EXT.holo[style] || '#5ff6ff';
  // one lab for every working bot: max(6, count) screen bays around the core, deck grows to fit (see GROW.HoloLab)
  const Gr = growOf('HoloLab', inst); const [g] = useGrow(Gr.scale(count)); const F = Gr.scale(count)[0];
  const bays = useMemo(() => Gr.slots(inst, count).map((s) => ({ ...s, pos: [s.pos[0], s.pos[1] + layout.groundY(s.pos[0], s.pos[2]), s.pos[2]] })).sort((a, b) => +a.station.split(':')[1] - +b.station.split(':')[1]), [inst, count, layout]); // eslint-disable-line
  const busy = bays.some((s) => occupied.has(s.station));
  return (<group>
    <group position={[inst.x, y0, inst.z]}>
      <group ref={g}><LabBase style={style} hc={hc} /></group>
      <HoloCore y={0.26} active={busy} color={hc} />
    </group>
    {bays.map((s, i) => { const ux = Math.sin(s.face), uz = Math.cos(s.face);
      return (<group key={s.station}>
        <Projector position={[s.pos[0] + ux * 0.95, s.pos[1] + 0.03, s.pos[2] + uz * 0.95]} color={hc} />
        <HoloScreen position={[s.pos[0] + ux * 0.95, s.pos[1] + 1.15, s.pos[2] + uz * 0.95]} rot={s.face + Math.PI} seed={inst.index * 6 + i * 1.7 + 0.3} active={occupied.has(s.station)} color={hc} station={s.station} />
      </group>); })}
    {primary && <Sign text={cfg.label} position={[inst.x + 3.1 * F, y0, inst.z + 1.0 * F]} />}
  </group>);
}

// ---------- research ring ----------
export function HoloRing({ inst, cfg, occupied, primary }) {
  const { layout } = useWorld(); const y0 = layout.groundY(inst.x, inst.z); const style = cfg.style || 'holo'; const hc = HOLO_COL[style] || EXT.holo[style] || '#5ff6ff'; const XR = EXT.ring[style];
  const ring = useRef(); const active = inst.slots.some((s) => occupied.has(s.station));
  const nP = style === 'holo' ? 8 : 6; const pr = style === 'holo' ? 2.05 : 1.8;
  const mats = useMemo(() => Array.from({ length: nP }, (_, i) => holoMaterial(i * 2.3 + 1 + inst.index, [1, 2, 0][i % 3], i % 2 ? mix(hc, '#ffffff', 0.25) : hc)), [nP, hc, inst.index]);
  const level = useRef(0);
  useFrame(({ clock }, dt) => {
    level.current += ((active ? 1 : 0.15) - level.current) * Math.min(1, dt * 2);
    mats.forEach((m) => { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uActive.value = level.current; });
    if (ring.current) ring.current.rotation.y = clock.elapsedTime * (0.12 + 0.2 * level.current) + inst.index;
  });
  const rim = new THREE.Color(hc).multiplyScalar(2);
  const deco = useMemo(() => {
    if (style === 'stone') return cached('ringStone', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 10), '#8f9480', [0, 0.06, 0]],
      ...Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 + 0.2; const h = i % 3 === 1 ? 1.1 : 2.0; return [G.box(0.5, h, 0.36), i % 2 ? '#8a8f7b' : '#7c816e', [Math.cos(a) * 2.45, h / 2, Math.sin(a) * 2.45], [0, -a, i % 3 === 1 ? 0.15 : 0]]; }),
      [G.box(1.6, 0.3, 0.4), '#7c816e', [Math.cos(0.2 + 0.9) * 2.47, 2.12, Math.sin(0.2 + 0.9) * 2.47], [0, -(0.2 + 0.9) - Math.PI / 2, 0]],
      ...Array.from({ length: 6 }, (_, i) => [G.dodec(0.22), '#4d8a3a', [Math.cos(i * 1.1) * 2.6, 0.18, Math.sin(i * 1.1) * 2.6]])]));
    if (style === 'pillars') return cached('ringPillars', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 24), '#c9c2a8', [0, 0.06, 0]],
      ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const h = [2.4, 2.4, 1.3, 2.4, 0.9, 2.4, 2.4, 1.7][i]; const x = Math.cos(a) * 2.45, z = Math.sin(a) * 2.45;
        return [[G.cyl(0.2, 0.24, h, 10), '#e0d8bc', [x, h / 2, z], [0, 0, h < 2 ? 0.08 : 0]], [G.box(0.55, 0.16, 0.55), '#cfc6a6', [x, 0.08, z]], ...(h > 2 ? [[G.box(0.55, 0.16, 0.55), '#cfc6a6', [x, h + 0.08, z]]] : [])]; }).flat()]));
    if (style === 'crystal') return cached('ringCrystal', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 12), '#d3e8f3', [0, 0.06, 0]]]));
    if (style === 'dish') return cached('ringDish', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 20), '#b9bec6', [0, 0.06, 0]],
      ...[0, 1, 2].flatMap((i) => { const a = BACK + (i - 1) * 0.95; const x = Math.cos(a) * 3.0, z = Math.sin(a) * 3.0; const big = i === 1; const k = big ? 1.35 : 0.85;
        return [[G.cyl(0.07, 0.1, 1.6 * k, 6), '#c9ccd2', [x, 0.8 * k, z]], [G.dome(1.0 * k, 16, 5), '#eef0f3', [x, 1.75 * k, z], [-(Math.PI / 2 - 0.55), -a + Math.PI / 2, 0, 'YXZ'], [1, 0.38, 1]],
          [G.cyl(0.03, 0.03, 0.9 * k, 4), '#9aa0a8', [x - Math.cos(a) * 0.25 * k, 2.05 * k, z - Math.sin(a) * 0.25 * k], [0, 0, 0]], [G.sph(0.08 * k, 8, 6), '#ff4a4a', [x - Math.cos(a) * 0.25 * k, 2.5 * k, z - Math.sin(a) * 0.25 * k]]]; })]));
    if (style === 'books') return cached('ringBooks', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 28), '#f7f2e9', [0, 0.06, 0]], [G.cyl(2.2, 2.2, 0.02, 28), '#ede6da', [0, 0.15, 0]],
      ...[0, 1].flatMap((i) => { const a = BACK + (i ? 0.6 : -0.6); const x = Math.cos(a) * 2.45, z = Math.sin(a) * 2.45; return [[G.cyl(0.18, 0.22, 1.1, 10), '#fbf8f2', [x, 0.6, z]], [G.box(0.6, 0.06, 0.45), '#e9c46a', [x, 1.18, z], [0.3, -a, 0]], [G.cyl(0.07, 0.07, 0.55, 8), '#f4e9cf', [x, 1.25, z], [0, -a, Math.PI / 2]]]; })]));
    if (style === 'scrolls') return cached('ringScrolls', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 8), '#7a5232', [0, 0.06, 0], [0, Math.PI / 8, 0]], [G.cyl(2.25, 2.25, 0.02, 8), '#b8875a', [0, 0.15, 0], [0, Math.PI / 8, 0]],
      ...[0, 1].flatMap((i) => { const a = BACK + (i ? 0.62 : -0.62); const x = Math.cos(a) * 2.5, z = Math.sin(a) * 2.5; const P = [[G.box(1.1, 1.5, 0.4), '#6e4a2c', [x, 0.9, z], [0, -a + Math.PI / 2, 0]]];
        const fx = Math.cos(a) * 2.24, fz = Math.sin(a) * 2.24; for (let k = 0; k < 3; k++) P.push([G.cyl(0.07, 0.07, 0.9, 8), ['#f4ead2', '#e9dcb8', '#f7efe0'][k], [fx, 0.45 + k * 0.45, fz], [0, -a + Math.PI / 2, Math.PI / 2, 'YXZ']]); return P; })]));
    if (style === 'runes') return cached('ringRunes', () => mergeParts([[G.cyl(2.5, 2.65, 0.16, 9), '#2a2426', [0, 0.06, 0]],
      ...Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return [G.cyl(0.14, 0.2, 0.7, 6), '#3a3134', [Math.cos(a) * 2.5, 0.35, Math.sin(a) * 2.5]]; })]));
    return null;
  }, [style]);
  const crystals = style === 'crystal';
  return (<group position={[inst.x, y0, inst.z]}>
    {XR ? <XR hc={hc} primary={primary} /> : deco ? <mesh geometry={deco} material={MAT.vcFlat} receiveShadow castShadow /> : <mesh position={[0, 0.06, 0]} receiveShadow castShadow><cylinderGeometry args={[2.5, 2.6, 0.14, 40]} /><meshStandardMaterial color="#2a3542" metalness={0.5} roughness={0.35} /></mesh>}
    <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.25, 2.33, 64]} /><meshBasicMaterial color={rim} toneMapped={false} /></mesh>
    <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.45, 0.52, 48]} /><meshBasicMaterial color={rim} toneMapped={false} /></mesh>
    <group ref={ring}>
      {mats.map((m, i) => { const a = (i / nP) * Math.PI * 2; return <mesh key={i} material={m} position={[Math.cos(a) * pr, 1.55 + (i % 2) * 0.35, Math.sin(a) * pr]} rotation={[0, -a - Math.PI / 2, 0]}><planeGeometry args={[0.9, 0.62]} /></mesh>; })}
      {crystals && Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return <mesh key={i} material={crystalMat} position={[Math.cos(a) * 2.35, 0.9 + (i % 2) * 0.5, Math.sin(a) * 2.35]} rotation={[0.2, a, 0.1]} scale={[0.45, 1.3, 0.45]} castShadow><octahedronGeometry args={[0.6, 0]} /></mesh>; })}
    </group>
    {style === 'runes' && Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return <group key={i} position={[Math.cos(a) * 2.5, 0.7, Math.sin(a) * 2.5]}><Flame kind="hell" always scale={1.3} seed={i} /></group>; })}
    {style === 'runes' && primary && <FlickerLight position={[0, 1.2, 0]} intensity={5} distance={9} min={0.5} color="#ff6a2a" />}
    {style === 'books' && <FloatingBooks n={9} r={1.85} y={2.3} />}
    {style === 'scrolls' && <FloatingScrolls n={8} r={1.85} y={2.25} />}
    {style === 'scrolls' && <PaperLantern position={[0, 2.9, 0]} color="#f4ead2" r={0.22} h={0.42} light={primary} />}
    <HoloCore y={0.14} active={active} color={hc} base={style !== 'crystal'} />
    {crystals && <mesh position={[0, 0.5, 0]} material={crystalMat} scale={[0.5, 0.9, 0.5]}><octahedronGeometry args={[0.6, 0]} /></mesh>}
    {primary && <Sign text={cfg.label} position={[2.9, 0, -1.6]} />}
  </group>);
}

// hanging scrolls (kakemono) slowly orbiting: paper sheet + wooden rods
function FloatingScrolls({ n, r, y }) {
  const g = useRef();
  useFrame(({ clock }) => { if (!g.current) return; const t = clock.elapsedTime; g.current.rotation.y = -t * 0.18; g.current.children.forEach((c, i) => { c.position.y = y + Math.sin(t * 1.1 + i) * 0.12; }); });
  return (<group ref={g}>{Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return (<group key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[0, -a - Math.PI / 2, 0]}>
    <mesh><planeGeometry args={[0.36, 0.8]} /><meshStandardMaterial color={i % 3 === 0 ? '#f7efe0' : i % 3 === 1 ? '#efe2c4' : '#f4ead2'} side={THREE.DoubleSide} roughness={0.9} /></mesh>
    <mesh position={[0, 0.08, 0.005]}><planeGeometry args={[0.07, 0.42]} /><meshBasicMaterial color="#2a2020" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0.1, -0.05, 0.005]}><planeGeometry args={[0.05, 0.28]} /><meshBasicMaterial color="#c0392b" side={THREE.DoubleSide} /></mesh>
    {[0.42, -0.42].map((yy) => <mesh key={yy} position={[0, yy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.46, 6]} /><meshStandardMaterial color="#5a3a24" /></mesh>)}
  </group>); })}</group>);
}
const BOOKC = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#d35400', '#2c3e50', '#e84393'];
function FloatingBooks({ n, r, y }) {
  const g = useRef();
  const geo = useMemo(() => cached(`books${n}`, () => mergeParts(Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [[G.box(0.34, 0.44, 0.1), BOOKC[i % BOOKC.length], [Math.cos(a) * r, (i % 3) * 0.18, Math.sin(a) * r], [0.2, -a, 0.15 * (i % 2 ? 1 : -1)]], [G.box(0.3, 0.4, 0.11), '#fff8e7', [Math.cos(a) * (r + 0.02), (i % 3) * 0.18, Math.sin(a) * (r + 0.02)], [0.2, -a, 0.15 * (i % 2 ? 1 : -1)]]]; }).flat())), [n, r]);
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = -clock.elapsedTime * 0.25; g.current.position.y = y + Math.sin(clock.elapsedTime * 0.8) * 0.12; } });
  return <group ref={g} position={[0, y, 0]}><mesh geometry={geo} material={MAT.vc} castShadow /></group>;
}

// ---------- social bar (tiki / cocoa hut / jungle hut / moon mess module) ----------
const BOTTLES = ['#2ecc71', '#e67e22', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6'];
// bar body and ONE stool (stools are placed per seat so the counter can grow without stretching them)
const barGeo = (style) => cached(`bar2_${style}`, () => {
  if (EXT.bar[style]) return EXT.bar[style]();
  const P = []; const SP = [];
  if (style === 'cocoa') {
    P.push([G.box(5.6, 0.12, 3.4), '#9a7a5a', [0, 0.04, 0.2]], [G.box(4.6, 0.95, 0.6), '#7a4a2a', [0, 0.5, 0]], [G.box(4.9, 0.08, 0.85), '#a8744a', [0, 1.0, 0.05]]);
    P.push([G.box(4.8, 2.6, 0.2), '#8a5a34', [0, 1.3, -1.45]], [G.box(0.2, 2.6, 1.9), '#7a4e2c', [-2.4, 1.3, -0.55]], [G.box(0.2, 2.6, 1.9), '#7a4e2c', [2.4, 1.3, -0.55]]);
    for (let i = 0; i < 6; i++) P.push([G.box(4.82, 0.05, 0.22), '#6a4224', [0, 0.25 + i * 0.42, -1.45]]);
    P.push([G.box(5.6, 0.14, 2.3), '#6b4a30', [0, 3.05, -1.25], [0.55, 0, 0]], [G.box(5.6, 0.14, 2.3), '#6b4a30', [0, 3.05, 0.55], [-0.55, 0, 0]]);
    P.push([G.box(5.7, 0.2, 2.3), '#f6fbff', [0, 3.17, -1.2], [0.55, 0, 0]], [G.box(5.7, 0.2, 2.3), '#f6fbff', [0, 3.17, 0.5], [-0.55, 0, 0]]);
    P.push([G.box(0.4, 1.2, 0.4), '#8a8f98', [1.7, 3.6, -1.0]]);
    [[-2.4, 0.45], [2.4, 0.45]].forEach(([x, z]) => P.push([G.box(0.18, 2.7, 0.18), '#6a4224', [x, 1.35, z]]));
    P.push([G.box(1.0, 0.7, 0.05), '#ffd27a', [-1.0, 1.75, -1.33]]);
    [0].forEach((x, i) => { SP.push([G.cyl(0.07, 0.09, 0.5, 6), '#6a4224', [x, 0.25, 1.05]], [G.cyl(0.3, 0.28, 0.1, 12), ['#f4efe6', '#d9c7a8', '#efe4d0', '#cdb79a'][i], [x, 0.52, 1.05]]); });
    for (let i = 0; i < 5; i++) P.push([G.cyl(0.08, 0.07, 0.16, 8), ['#e74c3c', '#f4efe6', '#3498db', '#f1c40f', '#f4efe6'][i], [-1.6 + i * 0.8, 1.12, 0.15]]);
  } else if (style === 'mess') { // moon mess module: half-cylinder hab with windows, counter and stools
    const hull = new THREE.CylinderGeometry(1.7, 1.7, 5.4, 16, 1, false, Math.PI / 2, Math.PI); hull.rotateZ(Math.PI / 2);
    P.push([G.box(5.8, 0.14, 3.4), '#9aa0a8', [0, 0.07, 0.2]], [hull, '#e8eaee', [0, 0.1, -1.15], [0, 0, 0], [1, 1, 0.55]]);
    for (let i = 0; i < 5; i++) P.push([G.box(0.06, 1.75, 0.05), '#c4c8cf', [-2.2 + i * 1.1, 0.95, -0.25], [0, 0, 0]]);
    [-1.6, 0, 1.6].forEach((x) => P.push([G.cyl(0.3, 0.3, 0.05, 14), '#3a4a6a', [x, 1.2, -0.27], [Math.PI / 2, 0, 0]]));
    P.push([G.box(4.6, 0.95, 0.6), '#d5d9df', [0, 0.5, 0]], [G.box(4.9, 0.08, 0.85), '#7a8494', [0, 1.0, 0.05]], [G.box(4.6, 0.06, 0.06), '#ff8a3d', [0, 0.85, 0.31]]);
    for (let i = 0; i < 5; i++) P.push([G.cyl(0.07, 0.07, 0.2, 8), ['#ff8a3d', '#e8eaee', '#7fd0ff', '#f1c40f', '#e8eaee'][i], [-1.6 + i * 0.8, 1.14, 0.15]]);
    [0].forEach((x) => SP.push([G.cyl(0.05, 0.07, 0.5, 6), '#9aa0a8', [x, 0.25, 1.05]], [G.cyl(0.28, 0.28, 0.08, 14), '#ff8a3d', [x, 0.52, 1.05]]));
    P.push([G.cyl(0.05, 0.05, 1.4, 6), '#c9ccd2', [2.2, 2.4, -1.4]], [G.dome(0.45, 12, 4), '#eef0f3', [2.2, 3.1, -1.4], [-1.0, 0.6, 0, 'YXZ'], [1, 0.4, 1]]);
  } else if (style === 'teahouse') { // chaya: raised tatami platform, low counter, cushions, back wall with shoji, tiled roof
    P.push([G.box(5.8, 0.3, 3.6), '#6e4a2c', [0, 0.15, 0.1]], [G.box(5.5, 0.04, 3.3), '#cdbf86', [0, 0.32, 0.1]]);
    for (let i = 0; i < 4; i++) P.push([G.box(0.03, 0.045, 3.3), '#3f5a3a', [-2.06 + i * 1.375, 0.33, 0.1]]);
    P.push([G.box(4.6, 0.42, 0.62), '#7a5232', [0, 0.55, 0]], [G.box(4.8, 0.06, 0.8), '#a5774a', [0, 0.79, 0.02]]);
    P.push([G.box(5.0, 2.2, 0.12), '#f4ead2', [0, 1.42, -1.45]]);
    for (let i = 0; i <= 8; i++) P.push([G.box(0.05, 2.2, 0.14), '#5a3a24', [-2.5 + i * 0.625, 1.42, -1.45]]);
    for (let k = 0; k < 4; k++) P.push([G.box(5.0, 0.04, 0.14), '#5a3a24', [0, 0.55 + k * 0.6, -1.45]]);
    [[-2.6, -1.45], [2.6, -1.45], [-2.6, 1.55], [2.6, 1.55]].forEach(([x, z]) => P.push([G.box(0.2, 2.75, 0.2), '#5a3a24', [x, 1.65, z]]));
    P.push([G.box(6.6, 0.12, 2.5), '#3d4552', [0, 3.28, -0.95], [0.42, 0, 0]], [G.box(6.6, 0.12, 2.5), '#3d4552', [0, 3.28, 1.05], [-0.42, 0, 0]], [G.box(6.8, 0.22, 0.28), '#2a3038', [0, 3.78, 0.05]]);
    [-1, 1].forEach((k) => P.push([G.box(0.3, 0.3, 0.3), '#2a3038', [k * 3.3, 3.85, 0.05], [0, 0, 0.6 * k]]));
    P.push([G.box(4.6, 0.55, 0.03), '#2d3e6a', [0, 2.62, 1.6]]);
    for (let i = 1; i < 5; i++) P.push([G.box(0.03, 0.55, 0.035), '#f4ead2', [-2.3 + i * 0.92, 2.62, 1.6]]);
    for (let i = 0; i < 4; i++) P.push([G.cyl(0.08, 0.06, 0.09, 10), ['#7aa36a', '#efe6d2', '#7aa36a', '#efe6d2'][i], [-1.65 + i * 1.1, 0.86, 0.22]]);
    P.push([G.sph(0.22, 12, 8), '#2a2a2a', [-2.0, 1.02, -0.05], [0, 0, 0], [1, 0.8, 1]], [G.cyl(0.03, 0.03, 0.3, 6), '#2a2a2a', [-1.8, 1.08, -0.05], [0, 0, 1.0]]);
    [0].forEach((x, i) => SP.push([G.box(0.62, 0.14, 0.62), ['#b23a48', '#3d5a8a', '#c58b2a', '#4a7a52'][i], [x, 0.41, 1.05]]));
  } else if (style === 'jungle') {
    P.push([G.box(5.6, 0.08, 3.4), '#6b5236', [0, 0.04, 0.2]], [G.box(4.6, 0.95, 0.6), '#8a6a3a', [0, 0.5, 0]], [G.box(4.9, 0.1, 0.85), '#a8844e', [0, 1.0, 0.05]]);
    for (let i = 0; i < 16; i++) P.push([G.cyl(0.075, 0.075, 0.92, 6), i % 2 ? '#9db45a' : '#7f9a44', [-2.2 + i * 0.293, 0.48, 0.31]]);
    [[-2.4, -1.3], [2.4, -1.3], [-2.4, 0.45], [2.4, 0.45]].forEach(([x, z]) => P.push([G.cyl(0.1, 0.13, 2.7, 7), '#6a4a2a', [x, 1.35, z]]));
    P.push([G.box(4.0, 0.08, 0.4), '#6a4a2a', [0, 1.0, -1.15]]);
    for (let i = 0; i < 6; i++) P.push([G.sph(0.14, 8, 6), ['#f1c40f', '#e67e22', '#c0392b', '#f1c40f', '#8e44ad', '#27ae60'][i], [-1.5 + i * 0.6, 1.16, -1.15]]);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; P.push([G.box(1.9, 0.05, 0.9), i % 2 ? '#3f8a34' : '#4f9a3c', [Math.cos(a) * 1.3, 2.95 - 0.1 * (i % 2), -0.35 + Math.sin(a) * 0.9], [0, -a, 0.38]]); }
    P.push([G.cone(2.0, 1.1, 9), '#3a7a30', [0, 3.35, -0.35], [0, 0, 0], [1.4, 1, 0.9]]);
    [0].forEach((x, i) => { SP.push([G.cyl(0.25, 0.28, 0.5, 8), '#7a5634', [x, 0.25, 1.05]]); });
  } else {
    P.push([G.box(5.6, 0.06, 3.4), '#c79a62', [0, 0.03, 0.2]], [G.box(4.6, 0.95, 0.6), WOOD, [0, 0.5, 0]], [G.box(4.9, 0.08, 0.85), '#c58b4e', [0, 1.0, 0.05]]);
    for (let i = 0; i < 16; i++) P.push([G.cyl(0.07, 0.07, 0.92, 6), i % 2 ? BAMBOO : '#bfa25c', [-2.2 + i * 0.293, 0.48, 0.31]]);
    P.push([G.box(4.0, 0.06, 0.4), WOOD_D, [0, 1.0, -1.15]]);
    BOTTLES.forEach((c, i) => P.push([G.cyl(0.06, 0.08, 0.32, 8), c, [-1.5 + i * 0.6, 1.2, -1.15]]));
    [[-2.4, -1.3], [2.4, -1.3], [-2.4, 0.45], [2.4, 0.45]].forEach(([x, z]) => P.push([G.cyl(0.08, 0.1, 2.6, 7), BAMBOO, [x, 1.3, z]]));
    [0].forEach((x, i) => { SP.push([G.cyl(0.05, 0.07, 0.5, 6), WOOD_D, [x, 0.25, 1.05]], [G.cyl(0.3, 0.28, 0.07, 14), ['#e74c3c', '#f39c12', '#16a085', '#8e44ad'][i], [x, 0.5, 1.05]]); });
  }
  return { bar: mergeParts(P), stool: SP.length ? mergeParts(SP) : null };
});
function Steam({ position }) {
  const g = useRef();
  useFrame(({ clock }) => { if (!g.current) return; g.current.children.forEach((m, i) => { const k = (clock.elapsedTime * 0.35 + i / 3) % 1; m.position.set(Math.sin(k * 6 + i) * 0.06, k * 0.9, 0); m.material.opacity = 0.35 * (1 - k); m.scale.setScalar(0.6 + k); }); });
  return <group ref={g} position={position}>{[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[0.09, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent depthWrite={false} /></mesh>)}</group>;
}
export function TikiBar({ inst, cfg, primary, count = 0 }) {
  const { layout } = useWorld(); const style = cfg.style || 'tiki'; const y0 = layout.groundY(inst.x, inst.z);
  const Gr = growOf('TikiBar', inst); const sxT = Gr.scale(count)[0]; const [g] = useGrow([sxT, 1]); const B = barGeo(style); const mat = style === 'tiki' ? MAT.vc : style === 'mess' ? MAT.vcGloss : MAT.vcFlat;
  const X = (x) => x * sxT; // props at the ends move out as the counter grows (they never scale)
  return (<group position={[inst.x, y0, inst.z]} rotation={[0, inst.rot, 0]}>
    <group ref={g}><mesh geometry={B.bar} material={mat} castShadow receiveShadow />
    {style === 'tiki' && <group position={[0, 0, -0.35]} rotation={[0, Math.PI / 4, 0]} scale={[1.25, 1, 0.62]}><Thatch r={2.9} h={1.1} sides={4} y={2.45} /></group>}</group>
    {B.stool && Gr.stools(count).map((x, i) => <mesh key={i} geometry={B.stool} material={mat} position={[x, 0, 0]} castShadow receiveShadow />)}
    {style === 'cocoa' && <>
      <group position={[X(2.95), 0, 0.9]}><mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.32, 0.28, 0.8, 10]} /><meshStandardMaterial color="#555b66" metalness={0.6} roughness={0.4} /></mesh><group position={[0, 0.8, 0]}><Flame scale={1.6} always /></group></group>
      <Steam position={[-1.6, 1.2, 0.15]} /><Steam position={[0.8, 1.2, 0.15]} />
      {primary && <FlickerLight position={[X(2.95), 1.6, 0.9]} intensity={5} distance={9} min={0.4} />}
    </>}
    {style === 'jungle' && <group position={[X(2.95), 0, 1.0]}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i) * 0.38, 0.08, Math.sin(i) * 0.38]}><dodecahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#7d8075" flatShading /></mesh>)}
      <Flame scale={1.5} />
    </group>}
    {style === 'mess' && <Steam position={[-1.6, 1.2, 0.15]} />}
    {style === 'teahouse' && <><Steam position={[-2.0, 1.25, -0.05]} />{[-1.6, 0, 1.6].map((x, i) => <PaperLantern key={i} position={[x, 2.95, 1.75]} color={i === 1 ? '#f4ead2' : '#e2483a'} seed={i + 3} light={primary && i === 1} />)}</>}
    {EXT.barExtra[style] && (() => { const XB = EXT.barExtra[style]; return <XB X={X} primary={primary} />; })()}
    {style !== 'cocoa' && !EXT.barExtra[style]?.noTorch && <><Torch position={[X(-2.9), 0, 1.5]} light={primary} seed={3} /><Torch position={[X(2.9), 0, 1.5]} seed={4} /></>}
    {primary && <Html position={[0, EXT.barExtra[style]?.signY || (style === 'cocoa' ? 3.9 : style === 'mess' ? 3.0 : style === 'teahouse' ? 4.3 : 2.75), 1.0]} center distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className={`sign ${style === 'tiki' ? 'tiki' : ''}`}>{cfg.label}</div></Html>}
  </group>);
}

// ---------- coral café with clam seats (Atlantis social) ----------
function FountainCenter({ style }) {
  const spout = useRef();
  useFrame(({ clock }) => { if (spout.current) spout.current.children.forEach((m, i) => { const k = (clock.elapsedTime * 0.7 + i / 6) % 1; const a = (i / 6) * Math.PI * 2; m.position.set(Math.cos(a) * k * 0.7, 1.75 + Math.sin(k * Math.PI) * 0.45 - k * 0.5, Math.sin(a) * k * 0.7); m.scale.setScalar(1 - k * 0.5); }); });
  if (style === 'spring') { const lava = new THREE.Color('#ff6a1a').multiplyScalar(1.8);
    return (<group>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.15, 24]} /><meshBasicMaterial color={lava} toneMapped={false} /></mesh>
      <group ref={spout}>{Array.from({ length: 6 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={lava} toneMapped={false} /></mesh>)}</group>
      <Steam position={[0.3, 0.3, 0]} /><Steam position={[-0.4, 0.3, 0.3]} />
    </group>); }
  const gold = new THREE.Color('#ffd36a').multiplyScalar(1.6);
  return (<group>
    <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.08, 28]} /><meshStandardMaterial color="#ffcf5a" emissive="#ffb32a" emissiveIntensity={0.5} roughness={0.2} /></mesh>
    <mesh position={[0, 1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.5, 20]} /><meshStandardMaterial color="#ffcf5a" emissive="#ffb32a" emissiveIntensity={0.6} /></mesh>
    <group ref={spout}>{Array.from({ length: 6 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color={gold} toneMapped={false} /></mesh>)}</group>
  </group>);
}
const loungeGeo = (style) => cached(`lounge_${style}`, () => {
  const P = [];
  if (style === 'fountain') { // marble fountain of golden nectar, cloud cushions around it
    P.push([G.cyl(2.45, 2.55, 0.08, 28), '#f7f2e9', [0, 0.02, 0]], [G.cyl(1.2, 1.3, 0.5, 24, true), '#fbf8f2', [0, 0.27, 0]], [G.torus(1.22, 0.07, 6, 30), '#e9c46a', [0, 0.52, 0], [Math.PI / 2, 0, 0]],
      [G.cyl(0.18, 0.25, 1.0, 12), '#fbf8f2', [0, 0.8, 0]], [G.cyl(0.55, 0.3, 0.2, 18), '#fbf8f2', [0, 1.3, 0]], [G.torus(0.55, 0.04, 6, 24), '#e9c46a', [0, 1.4, 0], [Math.PI / 2, 0, 0]], [G.sph(0.14, 10, 8), '#e9c46a', [0, 1.62, 0]]);
    for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2 + 0.5; const x = Math.cos(b) * 1.65, z = Math.sin(b) * 1.65;
      for (let k = 0; k < 3; k++) P.push([G.sph(0.24, 10, 7), ['#ffffff', '#fdf3ff', '#fff6e8'][k], [x + Math.cos(b + k * 2.1) * 0.15, 0.2, z + Math.sin(b + k * 2.1) * 0.15], [0, 0, 0], [1, 0.75, 1]]); }
  } else { // hell hot spring: obsidian rim, ember stools
    P.push([G.cyl(2.45, 2.55, 0.08, 9), '#2e2629', [0, 0.02, 0]], [G.cyl(1.3, 1.4, 0.25, 9, true), '#241d20', [0, 0.12, 0]], [G.torus(1.3, 0.12, 5, 9), '#3a3134', [0, 0.25, 0], [Math.PI / 2, 0, 0]]);
    for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2 + 0.5; const x = Math.cos(b) * 1.65, z = Math.sin(b) * 1.65; P.push([G.cyl(0.26, 0.3, 0.3, 6), '#3a3134', [x, 0.15, z]], [G.cyl(0.24, 0.24, 0.04, 6), '#8a2a1a', [x, 0.31, z]]); }
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.3; P.push([G.cone(0.2, 0.7 + (i % 2) * 0.4, 5), '#2a2224', [Math.cos(a) * 2.35, 0.35, Math.sin(a) * 2.35]]); }
  }
  return mergeParts(P);
});
export function ClamLounge({ inst, cfg, primary, count = 0 }) {
  const { layout } = useWorld(); const y0 = layout.groundY(inst.x, inst.z); const style = cfg.style || 'coral'; const [g] = useGrow(growOf('ClamLounge', inst).scale(count));
  if (style === 'fountain' || style === 'spring') return (<group position={[inst.x, y0, inst.z]}>
    <group ref={g}><mesh geometry={loungeGeo(style)} material={style === 'fountain' ? MAT.vcGloss : MAT.vcFlat} castShadow receiveShadow /></group>
    <FountainCenter style={style} />
    {primary && <FlickerLight position={[0, 1.6, 0]} intensity={4} distance={8} min={0.5} color={style === 'spring' ? '#ff6a2a' : '#ffd36a'} />}
    {primary && <Sign text={cfg.label} position={[2.6, 0, 0.8]} />}
  </group>);
  const geo = cached('clam', () => {
    const P = [[G.cyl(0.25, 0.45, 0.75, 8), '#e5739a', [0, 0.37, 0]], [G.cyl(0.85, 0.8, 0.1, 18), '#f5a3bd', [0, 0.78, 0]], [G.cyl(2.45, 2.55, 0.08, 24), '#d9cba3', [0, 0.02, 0]]];
    for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2 + 0.5; const x = Math.cos(b) * 1.65, z = Math.sin(b) * 1.65; const rot = Math.atan2(x, z);
      P.push([G.dome(0.5, 12, 4), ['#c9a5d8', '#f2b5c8', '#a5c8e8'][i % 3], [x, 0.3, z], [Math.PI, 0, 0], [1, 0.55, 1]]);
      P.push([G.dome(0.5, 12, 4), ['#d8bce4', '#f7c9d7', '#bcd8f0'][i % 3], [x + Math.sin(rot) * 0.35, 0.55, z + Math.cos(rot) * 0.35], [-1.25, rot, 0, 'YXZ'], [1, 0.4, 1]]); }
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2; P.push([G.cyl(0.03, 0.06, 0.5 + (i % 3) * 0.2, 5), '#ff8a65', [Math.cos(a) * 2.4, 0.3, Math.sin(a) * 2.4], [0.2 * (i % 2), 0, 0.25]]); }
    return mergeParts(P);
  });
  const pearl = new THREE.Color('#fff3ff').multiplyScalar(1.8);
  return (<group position={[inst.x, y0, inst.z]}>
    <group ref={g}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    {Array.from({ length: 6 }, (_, i) => { const b = (i / 6) * Math.PI * 2 + 0.5; return <mesh key={i} position={[Math.cos(b) * 2.1, 0.45, Math.sin(b) * 2.1]}><sphereGeometry args={[0.08, 10, 8]} /><meshBasicMaterial color={pearl} toneMapped={false} /></mesh>; })}
    </group>
    <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.18, 12, 10]} /><meshBasicMaterial color={new THREE.Color('#7dfff0').multiplyScalar(2)} toneMapped={false} /></mesh>
    {primary && <FlickerLight position={[0, 1.6, 0]} intensity={4} distance={8} min={0.5} color="#7dfff0" />}
    {primary && <Sign text={cfg.label} position={[2.6, 0, 0.8]} />}
  </group>);
}

// ---------- docks (wood / ice + icebreaker / river + canoe / submarine pier) ----------
const dockGeo = (from, to, style) => cached(`dock_${style}_${from.toFixed(2)}_${to.toFixed(2)}`, () => {
  const len = to - from + 0.9; const P = [];
  const plank = { wood: ['#a77a4b', '#b08452'], ice: ['#8c99a6', '#9aa7b3'], river: ['#7a5636', '#86603d'], sub: ['#5d6d7a', '#687988'], pad: ['#9aa0a8', '#b9bec6'], gates: ['#fbf8f2', '#f2ece0'], styx: ['#3a2c26', '#46352c'], torii: ['#9a6a42', '#a8784c'] }[style] || ['#a77a4b', '#b08452'];
  if (style === 'pad') { P.push([G.box(1.5, 0.12, len), plank[0], [0, 0, from - 0.3 + len / 2]], [G.cyl(3.0, 3.1, 0.16, 8), plank[1], [0, 0, to - 0.1], [0, Math.PI / 8, 0]], [G.cyl(2.6, 2.6, 0.02, 8), '#e8b23a', [0, 0.085, to - 0.1], [0, Math.PI / 8, 0]], [G.cyl(2.35, 2.35, 0.03, 8), plank[1], [0, 0.09, to - 0.1], [0, Math.PI / 8, 0]],
      [G.box(0.25, 0.02, 1.4), '#e8b23a', [-0.45, 0.11, to - 0.1]], [G.box(0.25, 0.02, 1.4), '#e8b23a', [0.45, 0.11, to - 0.1]], [G.box(0.65, 0.02, 0.22), '#e8b23a', [0, 0.11, to - 0.1]]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P.push([G.sph(0.08, 6, 5), '#ff4a4a', [Math.cos(a) * 2.85, 0.12, to - 0.1 + Math.sin(a) * 2.85]]); } }
  else if (style === 'gates') { P.push([G.box(1.5, 0.12, len), plank[0], [0, 0, from - 0.3 + len / 2]], [G.box(5.0, 0.12, 2.0), plank[1], [0, 0, to - 0.1]], [G.box(1.4, 0.02, len), '#e9c46a', [0, 0.07, from - 0.3 + len / 2], [0, 0, 0], [0.25, 1, 1]]);
    for (let s = from + 0.3; s < to + 0.5; s += 0.9) [-1, 1].forEach((k) => P.push([G.sph(0.32, 8, 6), '#ffffff', [k * 0.95, -0.05, s], [0, 0, 0], [1, 0.6, 1]])); }
  else if (style === 'sub') { P.push([G.box(1.5, 0.12, len), plank[0], [0, 0, from - 0.3 + len / 2]], [G.box(5.0, 0.12, 2.0), plank[1], [0, 0, to - 0.1]]); }
  else {
    for (let s = 0; s < len; s += 0.34) P.push([G.box(1.4, 0.07, 0.3), plank[(Math.round(s / 0.34)) % 2], [((s * 7.1) % 1) * 0.04, 0, from - 0.3 + s]]);
    for (let s = -2.4; s <= 2.4; s += 0.34) P.push([G.box(0.3, 0.07, 2.0), plank[(Math.round(s / 0.34) + 9) % 2], [s, 0, to - 0.1]]);
  }
  const post = style === 'torii' ? '#5a3a24' : style === 'sub' || style === 'pad' ? '#3e4a55' : style === 'ice' ? '#6b5a48' : style === 'gates' ? '#fbf8f2' : style === 'styx' ? '#241a16' : WOOD_D;
  for (let s = from + 0.8; s < to - 0.6; s += 1.7) P.push([G.cyl(0.09, 0.1, 2.6, 7), post, [-0.72, -1.25, s]], [G.cyl(0.09, 0.1, 2.6, 7), post, [0.72, -1.25, s]]);
  [[-2.5, to - 1.05], [2.5, to - 1.05], [-2.5, to + 0.85], [2.5, to + 0.85], [0, to + 0.85]].forEach(([x, z]) => P.push([G.cyl(0.09, 0.1, 2.6, 7), post, [x, -1.25, z]]));
  if (style === 'gates') { // pearly gates at the end of the pier
    [-2.3, 2.3].forEach((x) => P.push([G.cyl(0.32, 0.38, 3.6, 14), '#fbf8f2', [x, 1.8, to + 1.1]], [G.sph(0.42, 14, 10), '#f4efe6', [x, 3.8, to + 1.1]], [G.box(0.9, 0.2, 0.9), '#e9c46a', [x, 0.1, to + 1.1]]));
    for (let i = 0; i < 9; i++) { const x = -1.8 + i * 0.45; const h = 2.4 + Math.cos((x / 2.3) * Math.PI / 2) * 0.9; P.push([G.cyl(0.035, 0.035, h, 6), '#e9c46a', [x, h / 2, to + 1.1]]); }
    P.push([G.torus(2.0, 0.07, 6, 30, Math.PI), '#e9c46a', [0, 2.5, to + 1.1]], [G.torus(1.4, 0.05, 6, 26, Math.PI), '#e9c46a', [0, 2.5, to + 1.1]], [G.box(4.0, 0.08, 0.08), '#e9c46a', [0, 1.0, to + 1.1]]); }
  if (style === 'torii') { // vermilion railings along the pier and a torii gate where it leaves the shore
    const V = '#d23a2c'; const rail = (x, z0, z1) => { P.push([G.box(0.07, 0.07, z1 - z0), V, [x, 0.62, (z0 + z1) / 2]]); for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 1.1))) P.push([G.box(0.09, 0.62, 0.09), V, [x, 0.31, z]], [G.box(0.12, 0.08, 0.12), '#e9b949', [x, 0.66, z]]); };
    rail(-0.72, from + 0.9, to - 1.1); rail(0.72, from + 0.9, to - 1.1);
    const tz = from + 0.35; [-1.05, 1.05].forEach((x) => P.push([G.cyl(0.11, 0.13, 2.9, 10), V, [x, 1.45, tz]], [G.cyl(0.16, 0.16, 0.22, 10), '#2a2020', [x, 0.11, tz]]));
    P.push([G.box(2.9, 0.2, 0.26), V, [0, 2.45, tz]], [G.box(3.4, 0.16, 0.34), '#2a2020', [0, 2.92, tz]], [G.box(3.1, 0.16, 0.3), V, [0, 2.8, tz]], [G.box(0.16, 0.4, 0.14), V, [0, 2.65, tz]]); }
  if (style === 'ice') P.push([G.box(1.5, 0.08, len), '#eef6fb', [0, 0.07, from - 0.3 + len / 2], [0, 0, 0], [0.5, 1, 1]]);
  return mergeParts(P);
});
function Vessel({ style, mid, to, env }) {
  const ref = useRef();
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (!ref.current) return;
    if (style === 'sub') { ref.current.position.y = 0.9 + Math.sin(t * 0.8) * 0.12; ref.current.rotation.z = Math.sin(t * 0.6) * 0.03; return; }
    const big = style === 'ice'; ref.current.position.y = (big ? -0.15 : -0.02) + Math.sin(t * 1.2) * (big ? 0.03 : 0.05); ref.current.rotation.z = Math.sin(t * 0.9) * (big ? 0.015 : 0.05) * (1 + (env.current?.wind ?? 0)); });
  if (style === 'ice') return (<group ref={ref} position={[-3.2, 0, mid - 0.4]}>
    <mesh geometry={cached('icebreaker', () => mergeParts([
      [G.box(1.9, 1.0, 5.2), '#c0392b', [0, 0.2, 0]], [G.cone(0.95, 1.5, 4), '#c0392b', [0, 0.2, 3.3], [Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.75]],
      [G.box(1.92, 0.12, 5.22), '#f4f4f4', [0, 0.72, 0]], [G.box(1.4, 0.9, 1.6), '#f4f4f4', [0, 1.2, -0.9]], [G.box(1.45, 0.25, 1.65), '#2c3e50', [0, 1.45, -0.9]],
      [G.cyl(0.22, 0.25, 0.9, 10), '#f39c12', [0, 2.0, -1.2]], [G.cyl(0.24, 0.24, 0.12, 10), '#222', [0, 2.45, -1.2]], [G.box(1.92, 0.1, 5.22), '#2c3e50', [0, -0.25, 0]]]))} material={MAT.vcFlat} castShadow />
  </group>);
  if (style === 'river') return (<group ref={ref} position={[-1.9, 0, mid - 0.8]}>
    <mesh scale={[0.5, 0.3, 1.8]} rotation={[Math.PI, 0, 0]} castShadow><sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#8a5a32" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.44, 1.7, 1]}><circleGeometry args={[1, 20]} /><meshStandardMaterial color="#5a3a20" /></mesh>
    <mesh position={[0.3, 0.05, 0.3]} rotation={[0.2, 0, 0.9]}><cylinderGeometry args={[0.03, 0.03, 1.5, 5]} /><meshStandardMaterial color="#c8925a" /></mesh>
  </group>);
  if (style === 'gates') return null;
  if (style === 'torii') return (<group ref={ref} position={[-1.9, 0, mid - 0.4]}>
    <mesh position={[0, -0.02, 0]} scale={[0.62, 0.32, 1.9]} castShadow><sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#8a5a34" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.58, 1.8, 1]}><circleGeometry args={[1, 20]} /><meshStandardMaterial color="#6e4a2c" /></mesh>
    <mesh position={[0, 0.42, -0.2]}><boxGeometry args={[0.95, 0.5, 0.9]} /><meshStandardMaterial color="#c9a46a" /></mesh>
    <mesh position={[0, 0.72, -0.2]} rotation={[0, 0, 0]}><boxGeometry args={[1.15, 0.08, 1.15]} /><meshStandardMaterial color="#6e4a2c" /></mesh>
    <mesh position={[0, 0.5, 1.4]} rotation={[0.25, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 1.6, 5]} /><meshStandardMaterial color="#5a3a24" /></mesh>
    <PaperLantern position={[0, 0.98, 0.95]} color="#e2483a" r={0.11} h={0.22} seed={7} />
  </group>);
  if (style === 'pad') return (<group position={[-3.6, -0.02, to - 1.4]}>
    <mesh geometry={cached('lander', () => mergeParts([
      [G.cyl(1.2, 1.2, 0.12, 8), '#9aa0a8', [0, 0.06, 0]], [G.cyl(0.55, 0.7, 2.6, 16), '#f4f4f4', [0, 1.6, 0]], [G.cone(0.55, 1.1, 16), '#e74c3c', [0, 3.45, 0]], [G.cyl(0.71, 0.71, 0.25, 16), '#e74c3c', [0, 0.85, 0]],
      [G.cyl(0.18, 0.18, 0.05, 12), '#5fb7ff', [0, 2.3, 0.56], [Math.PI / 2, 0, 0]],
      ...[0, 1, 2].flatMap((i) => { const a = (i / 3) * Math.PI * 2 + 0.5; return [[G.box(0.08, 1.1, 0.7), '#e74c3c', [Math.cos(a) * 0.72, 0.55, Math.sin(a) * 0.72], [0, -a, 0]], [G.cyl(0.12, 0.18, 0.12, 8), '#555', [Math.cos(a) * 0.95, 0.06, Math.sin(a) * 0.95]]]; }),
      [G.cyl(0.35, 0.5, 0.35, 12), '#4a4f58', [0, 0.2, 0]]]))} material={MAT.vcFlat} castShadow />
  </group>);
  if (style === 'styx') return (<group ref={ref} position={[-2.1, 0, mid - 0.6]}>
    <mesh scale={[0.7, 0.36, 2.0]} rotation={[Math.PI, 0, 0]} castShadow><sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3a2a40" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.64, 1.9, 1]}><circleGeometry args={[1, 20]} /><meshStandardMaterial color="#2a1e22" /></mesh>
    <mesh position={[0, 0.0, 1.85]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.04, 0.06, 0.9, 6]} /><meshStandardMaterial color="#3a2a40" /></mesh>
    <group position={[0, 0.5, -1.0]}>
      <mesh position={[0, 0.35, 0]}><coneGeometry args={[0.38, 1.1, 10]} /><meshStandardMaterial color="#5a3a7a" roughness={0.9} /></mesh>
      <mesh position={[0, 0.82, 0]}><sphereGeometry args={[0.22, 12, 10]} /><meshStandardMaterial color="#4a2e66" /></mesh>
      {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0.84, 0.18]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color={new THREE.Color('#ffd27a').multiplyScalar(2.5)} toneMapped={false} /></mesh>)}
      <mesh position={[0.32, 0.45, 0.1]} rotation={[0, 0, -0.15]}><cylinderGeometry args={[0.025, 0.025, 1.9, 5]} /><meshStandardMaterial color="#6a4a2e" /></mesh>
      <group position={[0.36, 1.45, 0.1]}><mesh><boxGeometry args={[0.16, 0.2, 0.16]} /><meshStandardMaterial color="#2a2426" /></mesh><group position={[0, -0.08, 0]}><Flame kind="orb" always scale={0.6} /></group></group>
    </group>
  </group>);
  if (style === 'sub') return (<group ref={ref} position={[-2.9, 0.9, mid - 0.2]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><capsuleGeometry args={[0.75, 2.6, 6, 16]} /><meshStandardMaterial color="#f5c518" roughness={0.4} metalness={0.3} /></mesh>
    <mesh position={[0, 0.85, -0.3]} castShadow><boxGeometry args={[0.6, 0.6, 1.1]} /><meshStandardMaterial color="#f5c518" roughness={0.4} /></mesh>
    <mesh position={[0, 1.35, -0.6]}><cylinderGeometry args={[0.05, 0.05, 0.6, 6]} /><meshStandardMaterial color="#666" /></mesh>
    {[-0.6, 0.2, 1.0].map((z) => <mesh key={z} position={[0.72, 0.1, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.08, 14]} /><meshBasicMaterial color={new THREE.Color('#9ff8ff').multiplyScalar(1.6)} toneMapped={false} /></mesh>)}
    <mesh position={[0, 0, -2.1]} rotation={[0, 0, 0]}><boxGeometry args={[0.08, 0.9, 0.5]} /><meshStandardMaterial color="#d4a500" /></mesh>
  </group>);
  return (<group ref={ref} position={[-2.0, 0.0, mid - 0.8]}>
    <mesh scale={[0.75, 0.38, 1.9]} rotation={[Math.PI, 0, 0]} castShadow><sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f6f1e6" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.76, 1.91, 1]}><torusGeometry args={[1, 0.035, 6, 30]} /><meshStandardMaterial color="#e2574c" /></mesh>
    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.68, 1.8, 1]}><circleGeometry args={[1, 24]} /><meshStandardMaterial color="#9c6b3d" /></mesh>
    <mesh position={[0, -0.02, 0.2]}><boxGeometry args={[1.3, 0.06, 0.3]} /><meshStandardMaterial color="#c8925a" /></mesh>
  </group>);
}
const FLAG = { sub: '#f5c518', pad: '#ff8a3d', gates: '#ffd36a', styx: '#a45ae0', torii: '#e2483a' };
export function Dock({ inst, cfg, waiting, primary }) {
  const { env } = useWorld(); const d = inst; const flag = useRef(); const style = cfg.style || 'wood';
  const rot = Math.atan2(d.ux, d.uz); const mid = (d.from + d.to) / 2 - 0.1;
  useFrame(({ clock }, dt) => {
    if (flag.current) { flag.current.position.y += ((waiting ? 2.05 : 0.95) - flag.current.position.y) * Math.min(1, dt * 2); flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25; }
  });
  const sub = style === 'sub' || style === 'pad';
  return (<group rotation={[0, rot, 0]}>
    <mesh geometry={EXT.dockGeo[style] ? EXT.dockGeo[style](d.from, d.to) : dockGeo(d.from, d.to, style)} material={MAT.vc} position={[0, d.y - 0.035, 0]} castShadow receiveShadow />
    {sub && <mesh position={[0, d.y + 0.03, d.from - 0.3 + (d.to - d.from + 0.9) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.1, d.to - d.from + 0.9]} /><meshBasicMaterial color={new THREE.Color('#5ff6ff').multiplyScalar(2)} toneMapped={false} /></mesh>}
    <group position={[2.3, d.y - 0.1, d.to + 0.85]}>
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.04, 0.05, 2.5, 6]} /><meshStandardMaterial color="#e8e2d4" /></mesh>
      <group ref={flag} position={[0, 0.95, 0]}><mesh position={[0.32, 0, 0]}><planeGeometry args={[0.6, 0.38]} /><meshStandardMaterial color={FLAG[style] || '#ef4444'} side={THREE.DoubleSide} emissive={FLAG[style] || '#ef4444'} emissiveIntensity={waiting ? 0.5 : 0.05} /></mesh></group>
    </group>
    <group position={[-2.7, d.y - 0.1, d.to - 1.0]}>
      <Torch position={[0, 0, 0]} light={primary} seed={5} h={1.4} />
    </group>
    {EXT.dock[style] && (() => { const XD = EXT.dock[style]; return <group position={[0, d.y - 0.035, 0]}><XD from={d.from} to={d.to} y={d.y} /></group>; })()}
    {EXT.vessel[style] ? (() => { const XV = EXT.vessel[style]; return <XV mid={mid} to={d.to} from={d.from} y={d.y} />; })() : <Vessel style={style} mid={mid} to={d.to} env={env} />}
    {primary && <group position={[1.1, d.y - 0.1, d.from + 0.3]}><Sign text={cfg.label} position={[0, 0, 0]} /></group>}
  </group>);
}

// ---------- plaza (campfire / warming fire / glowing vent) ----------
function Embers({ count = 40, color = '#ff8a2a', always = false }) {
  const { env } = useWorld();
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); return g; }, [count]);
  const seeds = useMemo(() => Array.from({ length: count }, () => [Math.random(), Math.random() * 6.28, 0.2 + Math.random() * 0.5]), [count]);
  const mat = useRef();
  useFrame(({ clock }) => {
    const a = geo.attributes.position.array; const t = clock.elapsedTime;
    seeds.forEach(([p, ang, sp], i) => { const k = (t * sp + p) % 1; a.set([Math.cos(ang + t) * 0.25 * k + Math.sin(t * 2 + i) * 0.1, 0.3 + k * 3.2, Math.sin(ang + t) * 0.25 * k], i * 3); });
    geo.attributes.position.needsUpdate = true; if (mat.current) mat.current.opacity = always ? 0.8 : THREE.MathUtils.smoothstep(night(env), 0.25, 0.55);
  });
  return <points geometry={geo}><pointsMaterial ref={mat} color={new THREE.Color(color).multiplyScalar(3)} size={always ? 0.1 : 0.07} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>;
}
function VentCore() {
  const m = useRef(); const c = useMemo(() => new THREE.Color('#58ffe0'), []);
  useFrame(({ clock }) => { if (m.current) m.current.color.copy(c).multiplyScalar(2 + Math.sin(clock.elapsedTime * 2) * 0.6); });
  return <mesh position={[0, 0.8, 0]}><sphereGeometry args={[0.38, 16, 12]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>;
}
// the lit window of the big stone lantern: dim by day, warm at night
function StoneLanternGlow() {
  const { env } = useWorld(); const m = useRef();
  useFrame(({ clock }) => { if (m.current) m.current.color.copy(PAPER_GLOW).multiplyScalar(0.35 + THREE.MathUtils.smoothstep(night(env), 0.2, 0.6) * (2.4 + Math.sin(clock.elapsedTime * 3) * 0.2)); });
  return <mesh position={[0, 1.49, 0]}><boxGeometry args={[0.66, 0.26, 0.4]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>;
}
function GlowOrb({ color, y, halo }) {
  const m = useRef(); const r = useRef(); const c = useMemo(() => new THREE.Color(color), [color]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (m.current) m.current.color.copy(c).multiplyScalar(2.2 + Math.sin(t * 2) * 0.5); if (r.current) { r.current.rotation.z = t * 0.5; r.current.position.y = y + 0.6 + Math.sin(t) * 0.08; } });
  return (<group>
    <mesh position={[0, y, 0]}><sphereGeometry args={[halo ? 0.32 : 0.22, 16, 12]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>
    {halo && <mesh ref={r} position={[0, y + 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.05, 8, 40]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2.4)} toneMapped={false} /></mesh>}
  </group>);
}
export function Campfire({ cfg, count = 0 }) {
  const [gs] = useGrow([plazaGrow(count), plazaGrow(count)]); // the bench ring widens with the circle of bots
  const { layout } = useWorld(); const style = cfg.style || 'campfire'; const R = layout.plazaFoot;
  const vent = style === 'vent'; const glowC = { beacon: '#bfe3ff', halo: '#ffd36a' }[style]; const stone = style === 'lantern';
  const geo = useMemo(() => cached(`plaza_${style}`, () => {
    const P = [];
    if (style === 'beacon') { P.push([G.cyl(0.7, 0.85, 0.3, 8), '#9aa0a8', [0, 0.15, 0]], [G.cyl(0.12, 0.16, 2.2, 8), '#c9ccd2', [0, 1.4, 0]], [G.box(0.6, 0.6, 0.6), '#e8eaee', [0.9, 0.3, 0.6]], [G.box(0.5, 0.5, 0.5), '#ff8a3d', [-0.8, 0.25, 0.7]]);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; P.push([G.box(1.1, 0.35, 0.45), '#b9bec6', [Math.cos(a) * 1.45, 0.18, Math.sin(a) * 1.45], [0, -a + Math.PI / 2, 0]]); } }
    else if (style === 'halo') { P.push([G.cyl(0.9, 1.05, 0.25, 24), '#fbf8f2', [0, 0.12, 0]], [G.cyl(0.45, 0.55, 0.9, 16), '#fbf8f2', [0, 0.65, 0]], [G.torus(0.5, 0.05, 6, 24), '#e9c46a', [0, 1.1, 0], [Math.PI / 2, 0, 0]]);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; for (let k = 0; k < 3; k++) P.push([G.sph(0.32, 10, 7), ['#ffffff', '#fdf3ff', '#fff6e8'][k], [Math.cos(a) * 1.45 + Math.cos(a + 1.57) * (k - 1) * 0.38, 0.22, Math.sin(a) * 1.45 + Math.sin(a + 1.57) * (k - 1) * 0.38], [0, 0, 0], [1, 0.7, 1]]); } }
    else if (style === 'lantern') { // stone lantern garden: big ishidoro, raked gravel ring, stepping stones, low stone benches
      const ST = '#9a9690', ST2 = '#86827c';
      P.push([G.cyl(1.05, 1.05, 0.03, 28), '#e4ddcc', [0, 0.015, 0]], [G.cyl(0.6, 0.75, 0.22, 6), ST, [0, 0.11, 0]], [G.cyl(0.22, 0.28, 0.9, 8), ST2, [0, 0.66, 0]], [G.cyl(0.55, 0.45, 0.16, 6), ST, [0, 1.17, 0]],
        [G.box(0.62, 0.48, 0.62), ST2, [0, 1.49, 0]], [G.cone(0.85, 0.55, 6), ST, [0, 2.0, 0]], [G.sph(0.14, 8, 6), ST2, [0, 2.36, 0]]);
      [0.82, 0.95].forEach((r) => P.push([G.torus(r, 0.012, 3, 40), '#cfc6b0', [0, 0.035, 0], [Math.PI / 2, 0, 0]]));
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; P.push([G.box(1.1, 0.32, 0.42), ST, [Math.cos(a) * 1.45, 0.16, Math.sin(a) * 1.45], [0, -a + Math.PI / 2, 0]]); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; P.push([G.cyl(0.26, 0.28, 0.06, 7), '#b0aaa0', [Math.cos(a) * 2.0, 0.03, Math.sin(a) * 2.0]]); } }
    else if (style === 'brimstone') { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; P.push([G.dodec(0.22), '#2a2426', [Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7], [i, i * 2, 0]]); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; P.push([G.box(1.1, 0.35, 0.45), '#3a3134', [Math.cos(a) * 1.45, 0.18, Math.sin(a) * 1.45], [0, -a + Math.PI / 2, 0]], [G.box(1.0, 0.04, 0.4), '#7a2a1a', [Math.cos(a) * 1.45, 0.37, Math.sin(a) * 1.45], [0, -a + Math.PI / 2, 0]]); } }
    else if (vent) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P.push([G.dodec(0.3 + (i % 3) * 0.1), '#3d4a57', [Math.cos(a) * 0.65, 0.18, Math.sin(a) * 0.65], [i, i * 2, 0]]); }
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.75; P.push([G.dodec(0.45), '#55606b', [Math.cos(a) * 1.5, 0.2, Math.sin(a) * 1.5], [i, 0, 0], [1.2, 0.6, 1.2]]); } }
    else { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; P.push([G.dodec(0.16), '#8e9198', [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], [i, i * 2, 0]]); }
      for (let i = 0; i < 4; i++) P.push([G.cyl(0.05, 0.06, 0.8, 6), '#6b4a2c', [0, 0.28, 0], [0.5, (i / 4) * Math.PI * 2, 0, 'YXZ']]);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.75; P.push([G.cyl(0.16, 0.16, 1.1, 10), '#7b5634', [Math.cos(a) * 1.45, 0.14, Math.sin(a) * 1.45], [0, -a, Math.PI / 2]]);
        if (style === 'warming') P.push([G.box(0.5, 0.06, 1.0), '#e9e1d2', [Math.cos(a) * 1.45, 0.31, Math.sin(a) * 1.45], [0, -a + Math.PI / 2, 0]]); } }
    return mergeParts(P);
  }), [style]);
  const tor = (layout.spokes || []).slice(0, 2).flatMap((a) => [a - 0.38, a + 0.38]);
  const XP = EXT.plaza[style];
  if (XP) return (<group position={[0, layout.groundY(0, 0), 0]}><XP gs={gs} count={count} />
    {tor.map((a, i) => <Torch key={i} position={[Math.cos(a) * (R - 0.35), 0, Math.sin(a) * (R - 0.35)]} light={i === 1} seed={10 + i} />)}</group>);
  return (<group position={[0, layout.groundY(0, 0), 0]}>
    <group ref={gs}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow /></group>
    {stone ? <><StoneLanternGlow /><FlickerLight position={[0, 1.5, 0.0]} intensity={7} distance={12} min={0.15} color="#ffb35a" /></> :
    glowC ? <><GlowOrb color={glowC} y={style === 'beacon' ? 2.65 : 2.0} halo={style === 'halo'} /><FlickerLight position={[0, 2.4, 0]} intensity={9} distance={14} min={0.4} color={glowC} /></> :
    style === 'brimstone' ? <><group position={[0, 0.05, 0]}><Flame kind="hell" scale={2.6} always /><group position={[0.15, 0, 0.1]}><Flame kind="hell" scale={1.6} seed={2} always /></group><group position={[-0.15, 0, -0.08]}><Flame kind="hell" scale={1.9} seed={4} always /></group></group>
      <FlickerLight position={[0, 1.0, 0]} intensity={12} distance={14} min={0.45} color="#ff6a2a" /><Embers always count={50} /></> :
    vent ? <><VentCore /><Embers color="#58ffe0" always count={30} /><FlickerLight position={[0, 1.2, 0]} intensity={10} distance={14} min={0.45} color="#58ffe0" /></> : <>
      <group position={[0, 0.05, 0]}><Flame scale={2.2} always={style === 'warming'} /><group position={[0.12, 0, 0.08]}><Flame scale={1.4} seed={2} always={style === 'warming'} /></group><group position={[-0.12, 0, -0.05]}><Flame scale={1.6} seed={4} always={style === 'warming'} /></group></group>
      <FlickerLight position={[0, 1.0, 0]} intensity={12} distance={14} min={style === 'warming' ? 0.25 : 0} />
      <Embers /></>}
    {tor.map((a, i) => <Torch key={i} position={[Math.cos(a) * (R - 0.35), 0, Math.sin(a) * (R - 0.35)]} light={i === 1} seed={10 + i} />)}
  </group>);
}

// ---------- hammock instance between two posts (palms / jungle trees / ice pillars / kelp) ----------
const HAM_COL = { mast: ['#e8eaee', '#ff8a3d', '#c4c8cf', '#ff8a3d'], column: ['#ffffff', '#ffe9a8', '#f7d6ff', '#ffe9a8'], spire: ['#7a2a1a', '#3a2426', '#a83a1a', '#3a2426'], palm: ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'], vine: ['#9b7a4a', '#7f9a44', '#b89a5a', '#6a8a3a'], ice: ['#f4efe6', '#c9b79c', '#f4efe6', '#8a7a68'], kelp: ['#3fae8c', '#2f8f74', '#5fcfa8', '#2a7a62'], bamboo: ['#2d3e6a', '#f4ead2', '#2d3e6a', '#c0392b'] };
function hammockGeometry(span, style) {
  return cached(`ham_${style}`, () => {
    const nx = 14, nz = 3; const pos = []; const col = []; const idx = []; const cs = (HAM_COL[style] || EXT.hamCol[style] || HAM_COL.palm).map((c) => new THREE.Color(c));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const u = i / nx, v = j / nz; const x = (u - 0.5) * span; const w = 0.35 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.85)) + 0.05; const z = (v - 0.5) * 2 * w;
      const y = -0.55 * (1 - Math.pow(2 * u - 1, 2)) + 0.12 * Math.pow((v - 0.5) * 2, 2);
      pos.push(x, y, z); const c = cs[Math.floor(i / 2) % 4]; col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = i * (nz + 1) + j; idx.push(a, a + 1, a + nz + 1, a + 1, a + nz + 2, a + nz + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  });
}
function HamPost({ x, z, y, lean, seed, style, h }) {
  const XH = EXT.post[style]; if (XH) return <XH x={x} y={y} z={z} h={h} seed={seed} />;
  if (style === 'palm') return <Palm x={x} z={z} y={y - 0.05} height={h} lean={lean} seed={seed} />;
  if (style === 'mast') return <group position={[x, y, z]}>
    <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.06, 0.09, 2.2, 8]} /><meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshBasicMaterial color={new THREE.Color('#ff4a4a').multiplyScalar(2)} toneMapped={false} /></mesh>
    <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.3, 0.35, 0.12, 8]} /><meshStandardMaterial color="#9aa0a8" /></mesh></group>;
  if (style === 'column') return <group position={[x, y, z]}>
    <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.17, 0.2, 2.2, 12]} /><meshStandardMaterial color="#fbf8f2" roughness={0.4} /></mesh>
    <mesh position={[0, 2.25, 0]}><boxGeometry args={[0.45, 0.12, 0.45]} /><meshStandardMaterial color="#e9c46a" metalness={0.7} roughness={0.3} /></mesh>
    {[0, 1, 2].map((k) => <mesh key={k} position={[Math.cos(k * 2.1) * 0.25, 0.15, Math.sin(k * 2.1) * 0.25]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.3, 10, 7]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>)}</group>;
  if (style === 'spire') return <group position={[x, y, z]}>
    <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.18, 0.32, 2.3, 6]} /><meshStandardMaterial color="#2a2426" flatShading /></mesh>
    <mesh position={[0, 2.4, 0]}><coneGeometry args={[0.18, 0.4, 6]} /><meshStandardMaterial color="#2a2426" flatShading /></mesh></group>;
  if (style === 'bamboo') return <group position={[x, y, z]}>
    {[[0, 0, 2.6], [0.16, 0.08, 2.2], [-0.12, 0.12, 1.8]].map(([dx, dz, hh], i) => <group key={i}>
      <mesh position={[dx, hh / 2, dz]} castShadow><cylinderGeometry args={[0.065, 0.075, hh, 7]} /><meshStandardMaterial color={i ? '#7fae52' : '#6a9a44'} roughness={0.6} /></mesh>
      {[0.6, 1.2, 1.8].filter((yy) => yy < hh).map((yy) => <mesh key={yy} position={[dx, yy, dz]}><cylinderGeometry args={[0.08, 0.08, 0.04, 7]} /><meshStandardMaterial color="#5a8a3a" /></mesh>)}
      <mesh position={[dx + 0.15, hh - 0.1, dz]} rotation={[0, i, 0.9]} scale={[0.5, 0.12, 0.16]}><sphereGeometry args={[0.6, 6, 4]} /><meshStandardMaterial color="#5f9a3e" /></mesh></group>)}
  </group>;
  if (style === 'ice') return <mesh position={[x, y + 1.0, z]} material={crystalMat} castShadow scale={[1, 1, 1]}><cylinderGeometry args={[0.2, 0.3, 2.1, 6]} /></mesh>;
  if (style === 'kelp') return <group position={[x, y, z]}>
    <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.07, 0.12, 2.4, 6]} /><meshStandardMaterial color="#2f7a4a" /></mesh>
    {[0.6, 1.2, 1.8, 2.4].map((yy, i) => <mesh key={i} position={[0.18 * (i % 2 ? 1 : -1), yy, 0]} rotation={[0, 0, (i % 2 ? -1 : 1) * 0.8]} scale={[0.25, 0.7, 0.06]}><sphereGeometry args={[0.6, 8, 6]} /><meshStandardMaterial color="#3f9a5a" /></mesh>)}
  </group>;
  return <group position={[x, y, z]}>
    <mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 3.2, 7]} /><meshStandardMaterial color="#6a4a2e" /></mesh>
    <mesh position={[0, 3.4, 0]} castShadow><icosahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#3d7f34" flatShading /></mesh>
    {[0.3, -0.25].map((dx, i) => <mesh key={i} position={[dx, 2.2, 0.2 * i]}><cylinderGeometry args={[0.015, 0.015, 1.9, 4]} /><meshStandardMaterial color="#4f8a3a" /></mesh>)}
  </group>;
}
export function Hammocks({ inst, cfg }) {
  const { layout } = useWorld(); const style = cfg.style || 'palm'; const geo = hammockGeometry(2.0, style);
  const tx = Math.cos(inst.rot), tz = -Math.sin(inst.rot); const y = layout.groundY(inst.x, inst.z); const s = inst.index;
  const hy = EXT.post[style] ? 1.0 : style === 'ice' || style === 'mast' || style === 'column' || style === 'spire' || style === 'bamboo' ? 1.0 : 1.15;
  return (<group>
    <HamPost style={style} x={inst.x + tx * 1.35} z={inst.z + tz * 1.35} y={y} h={3.3} lean={[tx * 0.5, tz * 0.5]} seed={50 + s * 2} />
    <HamPost style={style} x={inst.x - tx * 1.35} z={inst.z - tz * 1.35} y={y} h={3.6} lean={[-tx * 0.5, -tz * 0.5]} seed={51 + s * 2} />
    <group position={[inst.x, y + hy, inst.z]} rotation={[0, inst.rot, 0]}>
      <mesh geometry={geo} castShadow receiveShadow material={MAT.vcDouble} />
      {[-1, 1].map((k) => <mesh key={k} position={[k * 1.18, 0.05, 0]} rotation={[0, 0, k * 0.5]}><cylinderGeometry args={[0.015, 0.015, 0.45, 4]} /><meshStandardMaterial color="#e8dcc0" /></mesh>)}
    </group>
  </group>);
}

// ---------- homes ----------
// Roof/dome cutaway: fades when the home is selected or the camera is close.
export function useCutaway(home, selected, mats, low = 0.18, near = 9) {
  const op = useRef(1);
  useFrame(({ camera }, dt) => {
    const close = Math.hypot(camera.position.x - home.x, camera.position.y - 2, camera.position.z - home.z) < near;
    op.current += ((selected || close ? low : 1) - op.current) * Math.min(1, dt * 4);
    for (const m of mats) if (m) { const base = m.userData.baseOpacity ?? 1; m.opacity = op.current * base; const tr = op.current * base < 0.99; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = op.current > 0.99 && base >= 0.99; }
  });
  return op;
}
// Bed (wooden frame, mattress, blanket + pillow in the bot color); bag = sleeping bag variant
export function Bed({ color, inBed, kind = 'bed', position }) {
  if (kind === 'bag') return (<group position={position}>
    <mesh position={[0, 0.03, 0]} receiveShadow><boxGeometry args={[1.5, 0.06, 1.0]} /><meshStandardMaterial color="#d9c7a8" roughness={1} /></mesh>
    <RoundedBox args={[1.3, 0.16, 0.68]} radius={0.07} smoothness={3} position={[0.05, 0.12, 0]} receiveShadow><meshStandardMaterial color={color} roughness={0.7} /></RoundedBox>
    <RoundedBox args={[0.3, 0.12, 0.5]} radius={0.05} smoothness={2} position={[-0.47, 0.25, 0]}><meshStandardMaterial color="#ffffff" roughness={0.9} /></RoundedBox>
    {inBed && <RoundedBox args={[0.92, 0.3, 0.72]} radius={0.12} smoothness={3} position={[0.25, 0.33, 0]} castShadow><meshStandardMaterial color={mix(color, '#ffffff', 0.2)} roughness={0.7} /></RoundedBox>}
  </group>);
  if (kind === 'cloud') return (<group position={position}>
    {[[-0.45, 0], [0, 0.1], [0.45, -0.05], [-0.2, -0.25], [0.25, 0.28]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]} scale={[1, 0.6, 1]} receiveShadow><sphereGeometry args={[0.38, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>)}
    <mesh position={[0.22, 0.4, 0]} scale={[1, 0.25, 1]} receiveShadow><sphereGeometry args={[0.5, 14, 8]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
    <mesh position={[-0.5, 0.42, 0]} scale={[0.7, 0.4, 1]}><sphereGeometry args={[0.28, 10, 8]} /><meshStandardMaterial color="#fff8e7" roughness={1} /></mesh>
    {inBed && <RoundedBox args={[0.78, 0.34, 0.86]} radius={0.14} smoothness={3} position={[0.33, 0.5, 0]} castShadow><meshStandardMaterial color={mix(color, '#ffffff', 0.25)} roughness={0.85} /></RoundedBox>}
  </group>);
  if (kind === 'futon') return (<group position={position}>
    <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[1.7, 0.04, 1.1]} /><meshStandardMaterial color="#cdbf86" roughness={1} /></mesh>
    <RoundedBox args={[1.45, 0.1, 0.82]} radius={0.04} smoothness={2} position={[0, 0.09, 0]} receiveShadow><meshStandardMaterial color="#f7f1e3" roughness={1} /></RoundedBox>
    <RoundedBox args={[1.0, 0.07, 0.86]} radius={0.03} smoothness={2} position={[0.22, 0.17, 0]} receiveShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>
    <mesh position={[0.22, 0.208, 0]}><boxGeometry args={[0.96, 0.005, 0.06]} /><meshStandardMaterial color={mix(color, '#ffffff', 0.55)} /></mesh>
    <RoundedBox args={[0.28, 0.1, 0.48]} radius={0.04} smoothness={2} position={[-0.52, 0.19, 0]}><meshStandardMaterial color="#e9dcb8" roughness={1} /></RoundedBox>
    {inBed && <RoundedBox args={[0.8, 0.32, 0.86]} radius={0.13} smoothness={3} position={[0.3, 0.32, 0]} castShadow><meshStandardMaterial color={mix(color, '#ffffff', 0.25)} roughness={0.85} /></RoundedBox>}
  </group>);
  const ember = kind === 'ember';
  return (<group position={position}>
    {ember && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.55, 1.0]} /><meshBasicMaterial color={new THREE.Color('#ff5a1a').multiplyScalar(1.6)} toneMapped={false} /></mesh>}
    <mesh position={[0, 0.13, 0]} castShadow receiveShadow><boxGeometry args={[1.4, 0.2, 0.86]} /><meshStandardMaterial color={kind === 'metal' ? '#8fa3b3' : ember ? '#2a2224' : WOOD} metalness={kind === 'metal' ? 0.5 : 0} roughness={0.6} /></mesh>
    <mesh position={[0, 0.29, 0]} receiveShadow><boxGeometry args={[1.32, 0.12, 0.78]} /><meshStandardMaterial color="#fbf7ee" /></mesh>
    <mesh position={[0.22, 0.355, 0]} receiveShadow><boxGeometry args={[0.92, 0.035, 0.82]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
    <mesh position={[-0.5, 0.39, 0]}><boxGeometry args={[0.28, 0.1, 0.55]} /><meshStandardMaterial color="#ffffff" roughness={0.9} /></mesh>
    {inBed && <RoundedBox args={[0.78, 0.36, 0.86]} radius={0.12} smoothness={3} position={[0.33, 0.47, 0]} castShadow><meshStandardMaterial color={mix(color, '#ffffff', 0.25)} roughness={0.85} /></RoundedBox>}
    <mesh position={[-0.72, 0.42, 0]} castShadow><boxGeometry args={[0.08, 0.66, 0.86]} /><meshStandardMaterial color={mix(color, kind === 'metal' ? '#203040' : ember ? '#1a1012' : '#3b2a1a', 0.35)} /></mesh>
  </group>);
}
export function useLantern(asleep, base = '#ffcf7a') {
  const { env } = useWorld(); const ref = useRef(); const c = useMemo(() => new THREE.Color(base), [base]);
  useFrame(() => { const on = THREE.MathUtils.smoothstep(night(env), 0.3, 0.6) * (asleep ? 0.35 : 1); if (ref.current) ref.current.color.copy(c).multiplyScalar(0.6 + on * 2.6); });
  return ref;
}
export function HomeSign({ bot, color, position }) {
  return <Html position={position} center distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="housesign" style={{ borderColor: color }}>{bot.name}</div></Html>;
}

// over-water bungalow on stilts; static parts merged (one draw call)
const bungalowGeo = () => cached('bungalow', () => {
  const f = 0.5; const P = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P.push([G.cyl(0.07, 0.08, 2.8, 6), WOOD_D, [Math.cos(a) * 1.5, f - 1.4, Math.sin(a) * 1.5]]); }
  P.push([G.cyl(1.85, 1.85, 0.14, 10), '#b98552', [0, f - 0.07, 0]]);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; P.push([G.cyl(0.06, 0.07, 1.9, 6), BAMBOO, [Math.cos(a) * 1.62, f + 0.95, Math.sin(a) * 1.62]]); }
  P.push([G.box(2.0, 1.1, 0.08), '#d8bf86', [0, f + 0.55, -1.45]]);
  [-1, 1].forEach((s) => P.push([G.box(0.06, 0.06, 2.2), WOOD_D, [s * 1.55, f + 0.35, -0.2]]));
  P.push([G.cyl(0.22, 0.18, 0.5, 10), WOOD_D, [0.95, f + 0.25, -0.75]]);
  return mergeParts(P);
});
export function Bungalow({ home, bot, selected, onSelect, asleep, inBed }) {
  const color = botColor(bot); const roofOp = useCutaway(home, selected, []); const lantern = useLantern(asleep);
  const walkLen = Math.hypot(home.x - home.walkFrom[0], home.z - home.walkFrom[1]) - 1.75; const f = home.floor;
  const sel = (e) => { e.stopPropagation(); onSelect(bot.id); };
  return (<group position={[home.x, 0, home.z]} rotation={[0, home.rot, 0]} onClick={sel}>
    <mesh geometry={bungalowGeo()} material={MAT.vc} castShadow receiveShadow />
    <group position={[0, (f + 0.02) / 2, 1.75 + walkLen / 2]} rotation={[Math.atan2(f - 0.02, walkLen), 0, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[0.85, 0.07, walkLen + 0.1]} /><meshStandardMaterial color="#a77a4b" /></mesh>
    </group>
    <Thatch r={2.35} h={1.45} sides={10} y={f + 1.9} opacityRef={roofOp} />
    <mesh position={[0, f + 1.9 + 1.55, 0]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color={color} /></mesh>
    <Bed color={color} inBed={inBed} position={[0, f, 0.2]} />
    <mesh position={[0.95, f + 0.6, -0.75]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial ref={lantern} color="#ffcf7a" toneMapped={false} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, f + 0.45, 1.75 + walkLen * 0.7]} />
  </group>);
}
