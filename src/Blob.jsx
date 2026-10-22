import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { SWING, RIDE } from './world/Fun.jsx';
import * as THREE from 'three';
import { botColor, isDark, STATE_INFO, truncate } from './util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { QUALITY } from './world/env.js';
import { AVATAR_SHAPES, SHAPE_ORDER, avatarShape } from './avatars.js';

// ---------- body shapes (Grok-Bot-style: simple shape + two eyes) ----------
const SHAPES = {
  sphere: { eye: [0.14, 0.56, 0.4] },
  blob: { eye: [0.15, 0.5, 0.42] },
  oval: { eye: [0.13, 0.62, 0.36] },
  box: { eye: [0.16, 0.56, 0.31] },
  pill: { eye: [0.12, 0.66, 0.31] },
  cone: { eye: [0.11, 0.36, 0.32] },
  hex: { eye: [0.14, 0.5, 0.42] },
  cloud: { eye: [0.13, 0.5, 0.38] },
  drop: { eye: [0.14, 0.44, 0.39] },
};
const TOP = { sphere: 0.9, blob: 0.84, oval: 1.04, box: 0.92, pill: 1.0, cone: 0.8, hex: 0.82, cloud: 0.94, drop: 1.06 };
// ---------- Grok Bot avatar bodies: the exact 2D silhouette, extruded and bevelled into a puffy cookie standing upright ----------
const AV_R = 0.47, AV_D = 0.36, AV_B = 0.17, AV_BS = 0.1, AV_FRONT = AV_D / 2 + AV_B; // every silhouette style keeps its face plane at AV_FRONT
const silhouette = (flat, s, step = 1) => { const sh = new THREE.Shape(); for (let i = 0, k = 0; i < flat.length; i += 2 * step, k++) { const x = flat[i] * s, y = flat[i + 1] * s; k ? sh.lineTo(x, y) : sh.moveTo(x, y); } sh.closePath(); return sh; };
// register a body kind: geometry sits on y=0 facing +z; eyes go on the front face a little right of and above the centroid
function registerKind(kind, g, { mat, flat = false, ex = 0.07, front = AV_FRONT } = {}) {
  g.computeBoundingBox(); const minY = g.boundingBox.min.y, h = g.boundingBox.max.y - minY; g.translate(0, -minY, 0); if (!flat) g.computeVertexNormals();
  SHAPES[kind] = { eye: [0.105, -minY + 0.06, front + 0.005], ex, geo: g, mat }; TOP[kind] = h; return kind;
}
const extruded = (name, opts) => { const g = new THREE.ExtrudeGeometry(silhouette(AVATAR_SHAPES[name], AV_R - AV_BS, opts.step), { depth: AV_D, bevelEnabled: true, bevelThickness: AV_B, bevelSize: AV_BS, bevelSegments: opts.seg, curveSegments: opts.seg }); g.translate(0, 0, -AV_D / 2); return g; };
// point-in-polygon voxelisation of the silhouette: chunky pixel-art blocks, 7 cells thick
function voxels(name) { const f = AVATAR_SHAPES[name]; const P = []; for (let i = 0; i < f.length; i += 2) P.push([f[i] * AV_R, f[i + 1] * AV_R]);
  const inside = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const C = 0.1, parts = [];
  for (let gx = -6; gx <= 6; gx++) for (let gy = -6; gy <= 6; gy++) { const x = gx * C, y = gy * C; if (!inside(x, y)) continue;
    for (let gz = -3; gz <= 3; gz++) { if (Math.abs(gz) === 3 && (!inside(x + C, y) || !inside(x - C, y) || !inside(x, y + C) || !inside(x, y - C))) continue; // bevel the edge cells
      const b = new THREE.BoxGeometry(C * 0.96, C * 0.96, C * 0.96); b.translate(x, y, gz * C); parts.push(b); } }
  return mergeGeometries(parts); }
// Blob styles: pluggable. Each style maps an avatarShape to a body kind (built lazily, once); add a style by adding an entry.
//   kind(shape) -> kind id;  build(name) -> registers SHAPES[kind] (geometry, eye placement, optional material(color))
export const BLOB_STYLES = {
  avatar: { label: 'Avatar match', hint: 'Puffy versions of the Grok Bot avatars', kind: (s) => 'av_' + avatarShape(s), build: (n, k) => registerKind(k, extruded(n, { seg: 6 })) },
  classic: { label: 'Classic', hint: 'The original island blobs', kind: (s) => legacyShapeKind(s) },
  gem: { label: 'Gem', hint: 'Low-poly faceted crystal', kind: (s) => 'gem_' + avatarShape(s),
    build: (n, k) => registerKind(k, extruded(n, { seg: 1, step: 5 }).toNonIndexed(), { flat: true, mat: (c) => <meshStandardMaterial color={c} roughness={0.18} metalness={0.15} flatShading emissive={c} emissiveIntensity={0.08} /> }) },
  voxel: { label: 'Voxel', hint: 'Chunky pixel blocks', kind: (s) => 'vox_' + avatarShape(s), build: (n, k) => { const g = voxels(n); g.computeBoundingBox(); return registerKind(k, g, { flat: true, front: g.boundingBox.max.z, mat: (c) => <meshStandardMaterial color={c} roughness={0.75} flatShading /> }); } },
  jelly: { label: 'Jelly', hint: 'Glossy see-through gummy', kind: (s) => 'jel_' + avatarShape(s), build: (n, k) => registerKind(k, extruded(n, { seg: 8 }), {
    mat: (c) => QUALITY.lite ? <meshStandardMaterial color={c} roughness={0.08} transparent opacity={0.7} /> : <meshPhysicalMaterial color={c} roughness={0.05} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={0.8} emissive={c} emissiveIntensity={0.18} /> }) },
};
export const DEFAULT_BLOB_STYLE = 'avatar';
export function kindFor(style, shape) { const S = BLOB_STYLES[style] || BLOB_STYLES[DEFAULT_BLOB_STYLE]; const k = S.kind(shape); if (!SHAPES[k] && S.build) S.build(k.slice(k.indexOf('_') + 1), k); return k; }
export const AV_KINDS = SHAPE_ORDER.map((n) => kindFor('avatar', n));
function shapeKind(s) { return kindFor(DEFAULT_BLOB_STYLE, s); }
function legacyShapeKind(s) {
  s = String(s || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (['tablet', 'square', 'roundedsquare', 'box', 'house', 'rect', 'rectangle'].includes(s)) return 'box';
  if (['pill', 'capsule'].includes(s)) return 'pill';
  if (['triangle', 'cone', 'gumdrop'].includes(s)) return 'cone';
  if (['hexagon', 'hex'].includes(s)) return 'hex';
  if (['cloud', 'clover', 'flower'].includes(s)) return 'cloud';
  if (['teardrop', 'drop'].includes(s)) return 'drop';
  if (['oval', 'egg'].includes(s)) return 'oval';
  if (['blob'].includes(s)) return 'blob';
  return 'sphere';
}
export function Body({ kind, color }) {
  const m = <meshStandardMaterial color={color} roughness={0.42} metalness={0.02} />;
  if (SHAPES[kind]?.geo) return <mesh geometry={SHAPES[kind].geo} castShadow>{SHAPES[kind].mat ? SHAPES[kind].mat(color) : m}</mesh>;
  switch (kind) {
    case 'box': return <RoundedBox args={[0.82, 0.92, 0.6]} radius={0.2} smoothness={4} position={[0, 0.46, 0]} castShadow>{m}</RoundedBox>;
    case 'pill': return <mesh position={[0, 0.5, 0]} castShadow><capsuleGeometry args={[0.31, 0.38, 8, 20]} />{m}</mesh>;
    case 'cone': return <mesh position={[0, 0.48, 0]} castShadow><coneGeometry args={[0.5, 0.96, 32]} />{m}</mesh>;
    case 'hex': return <RoundedHex color={color} />;
    case 'cloud': return (<group>
      <mesh position={[0, 0.42, 0]} castShadow><sphereGeometry args={[0.38, 24, 18]} />{m}</mesh>
      <mesh position={[-0.3, 0.32, -0.02]} castShadow><sphereGeometry args={[0.26, 20, 14]} />{m}</mesh>
      <mesh position={[0.3, 0.32, -0.02]} castShadow><sphereGeometry args={[0.26, 20, 14]} />{m}</mesh>
      <mesh position={[0.05, 0.72, -0.08]} castShadow><sphereGeometry args={[0.24, 20, 14]} />{m}</mesh>
    </group>);
    case 'drop': return (<group>
      <mesh position={[0, 0.42, 0]} castShadow><sphereGeometry args={[0.42, 28, 20]} />{m}</mesh>
      <mesh position={[0, 0.92, 0]} castShadow><coneGeometry args={[0.3, 0.42, 28]} />{m}</mesh>
    </group>);
    case 'oval': return <mesh position={[0, 0.52, 0]} scale={[0.82, 1.14, 0.82]} castShadow><sphereGeometry args={[0.46, 28, 20]} />{m}</mesh>;
    case 'blob': return <mesh position={[0, 0.42, 0]} scale={[1.08, 0.92, 1]} castShadow><sphereGeometry args={[0.46, 28, 20]} />{m}</mesh>;
    default: return <mesh position={[0, 0.45, 0]} castShadow><sphereGeometry args={[0.45, 28, 20]} />{m}</mesh>;
  }
}
function RoundedHex({ color }) {
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.45, 0.47, 0.82, 6, 1); g.rotateY(Math.PI / 6); return g; }, []);
  return <mesh geometry={geo} position={[0, 0.41, 0]} castShadow><meshStandardMaterial color={color} roughness={0.42} flatShading /></mesh>;
}

// ---------- state effects ----------
function Sparks({ active }) {
  const refs = useRef([]); const n = 10;
  const seeds = useMemo(() => Array.from({ length: n }, () => [Math.random(), Math.random() * 2 - 1, Math.random() * 2 - 1]), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => { if (!m) return; const [p, a, b] = seeds[i]; const k = (t * 1.3 + p) % 1;
      m.position.set(a * 0.35 * k, 0.55 + k * 0.9, 0.55 + b * 0.15); m.scale.setScalar((1 - k) * 0.9 + 0.1); m.visible = active; });
  });
  return <group>{seeds.map((_, i) => <mesh key={i} ref={(r) => (refs.current[i] = r)}><boxGeometry args={[0.06, 0.06, 0.06]} /><meshBasicMaterial color={i % 2 ? '#ffd166' : '#ff8c42'} toneMapped={false} /></mesh>)}</group>;
}
function Smoke({ active }) {
  const refs = useRef([]); const n = 6;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => { if (!m) return; const k = (t * 0.45 + i / n) % 1;
      m.position.set(Math.sin(i * 2.1 + t) * 0.15, 1.0 + k * 1.3, Math.cos(i * 1.7) * 0.1); m.scale.setScalar(0.18 + k * 0.4);
      m.material.opacity = (1 - k) * 0.7; m.visible = active; });
  });
  return <group>{Array.from({ length: n }, (_, i) => <mesh key={i} ref={(r) => (refs.current[i] = r)}><sphereGeometry args={[0.5, 12, 10]} /><meshStandardMaterial color="#6b6b70" transparent depthWrite={false} roughness={1} /></mesh>)}</group>;
}
const CONF = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
function Confetti({ active }) {
  const refs = useRef([]); const n = 26;
  const seeds = useMemo(() => Array.from({ length: n }, () => [Math.random(), Math.random() * Math.PI * 2, 0.3 + Math.random() * 0.7]), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => { if (!m) return; const [p, a, r] = seeds[i]; const k = (t * 0.55 + p) % 1;
      m.position.set(Math.cos(a) * r * (0.3 + k), 2.4 - k * 2.3, Math.sin(a) * r * (0.3 + k)); m.rotation.set(t * 3 + i, t * 2 + a, 0); m.visible = active; });
  });
  return <group>{seeds.map((_, i) => <mesh key={i} ref={(r) => (refs.current[i] = r)}><planeGeometry args={[0.09, 0.14]} /><meshBasicMaterial color={CONF[i % CONF.length]} side={THREE.DoubleSide} toneMapped={false} /></mesh>)}</group>;
}
function Book({ active }) {
  const r = useRef();
  useFrame(({ clock }) => { if (!r.current) return; const t = clock.elapsedTime; r.current.position.y = 1.25 + Math.sin(t * 2) * 0.06; r.current.rotation.y = Math.sin(t) * 0.5; r.current.visible = active; });
  return (<group ref={r} position={[0, 1.25, 0.25]}>
    <mesh rotation={[0, 0, 0.35]} position={[-0.12, 0, 0]}><boxGeometry args={[0.24, 0.32, 0.03]} /><meshStandardMaterial color="#2563eb" /></mesh>
    <mesh rotation={[0, 0, -0.35]} position={[0.12, 0, 0]}><boxGeometry args={[0.24, 0.32, 0.03]} /><meshStandardMaterial color="#2563eb" /></mesh>
    <mesh position={[0, 0.02, 0.02]}><boxGeometry args={[0.4, 0.27, 0.01]} /><meshStandardMaterial color="#fff8e7" /></mesh>
  </group>);
}
// idle-activity chatter: the group takes turns showing little emoji bubbles
function EmojiChat({ list, turn = 0 }) {
  const [i, setI] = useState(-1);
  useEffect(() => { let n = 0; const tick = () => { n++; const slot = (n + turn * 2) % 4; setI(slot < 2 ? Math.floor(Math.random() * list.length) : -1); };
    const t0 = setTimeout(tick, 600 + turn * 900); const iv = setInterval(tick, 1700); return () => { clearTimeout(t0); clearInterval(iv); }; }, [list, turn]);
  return i >= 0 ? <div className="bubble emo">{list[i]}</div> : null;
}
function Cup({ active }) {
  const r = useRef();
  useFrame(({ clock }) => { if (r.current) { r.current.visible = active; r.current.children[1].position.y = 0.2 + ((clock.elapsedTime * 0.5) % 1) * 0.3; r.current.children[1].material.opacity = 0.6 * (1 - ((clock.elapsedTime * 0.5) % 1)); } });
  return (<group ref={r} position={[0.38, 0.45, 0.3]}>
    <mesh><cylinderGeometry args={[0.08, 0.065, 0.14, 14]} /><meshStandardMaterial color="#fff" /></mesh>
    <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#fff" transparent opacity={0.5} /></mesh>
  </group>);
}
function Coconut({ active }) {
  const r = useRef();
  useFrame(({ clock }) => { if (r.current) { r.current.visible = active; r.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.15; } });
  return (<group ref={r} position={[0.4, 0.42, 0.3]}>
    <mesh><sphereGeometry args={[0.12, 14, 10]} /><meshStandardMaterial color="#6b4423" roughness={0.9} /></mesh>
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.07, 12]} /><meshStandardMaterial color="#fff6e0" /></mesh>
    <mesh position={[0.03, 0.2, 0]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.012, 0.012, 0.26, 5]} /><meshStandardMaterial color="#ff5fa2" /></mesh>
    <mesh position={[-0.06, 0.26, 0]} rotation={[0, 0, 0.5]}><coneGeometry args={[0.12, 0.06, 8, 1, true]} /><meshStandardMaterial color="#ffd23f" side={THREE.DoubleSide} /></mesh>
  </group>);
}
function Stick({ active }) { // marshmallow on a stick, toasting
  const r = useRef(); useFrame(({ clock }) => { if (r.current) { r.current.visible = active; r.current.rotation.x = 0.9 + Math.sin(clock.elapsedTime * 0.8) * 0.08; } });
  return (<group ref={r} position={[0.32, 0.4, 0.15]}><mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.012, 0.015, 0.9, 4]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    <mesh position={[0, 0.92, 0]}><cylinderGeometry args={[0.06, 0.06, 0.1, 10]} /><meshStandardMaterial color="#f3e2c0" emissive="#ff8a2a" emissiveIntensity={0.25} /></mesh></group>);
}
function Lantern({ active }) { // paper lantern on a pole (sakura lantern walk)
  const r = useRef(); useFrame(({ clock }) => { if (r.current) { r.current.visible = active; r.current.children[1].rotation.z = Math.sin(clock.elapsedTime * 2) * 0.12; } });
  return (<group ref={r} position={[0.55, 0.2, 0.2]}><mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.012, 0.012, 0.7, 4]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
    <group position={[0, 0.7, 0]}><mesh position={[0, -0.16, 0]} scale={[1, 1.3, 1]}><sphereGeometry args={[0.12, 12, 10]} /><meshBasicMaterial color={[2.6, 0.9, 0.35]} toneMapped={false} /></mesh></group>
    <pointLight position={[0, 0.55, 0]} color="#ff9a4a" intensity={2.5} distance={3.5} /></group>);
}
function Hands({ active, color }) {
  const l = useRef(); const r = useRef();
  useFrame(({ clock }) => { const t = clock.elapsedTime * 11; [l, r].forEach((h, i) => { if (!h.current) return; h.current.visible = active; h.current.position.y = 0.5 + Math.max(0, Math.sin(t + i * Math.PI)) * 0.1; }); });
  return (<>{[l, r].map((h, i) => <mesh key={i} ref={h} position={[i ? 0.3 : -0.3, 0.5, 0.42]} castShadow><sphereGeometry args={[0.085, 10, 8]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>)}</>);
}
function AlertRing({ active }) {
  const r = useRef();
  useFrame(({ clock }) => { if (!r.current) return; const k = (clock.elapsedTime * 0.8) % 1; r.current.scale.setScalar(0.6 + k * 0.9); r.current.material.opacity = 1 - k; r.current.visible = active; });
  return <mesh ref={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[0.5, 0.6, 32]} /><meshBasicMaterial color="#ef4444" transparent toneMapped={false} /></mesh>;
}

// ---------- theme accessories: halo + wings (heaven), horns (hell) ----------
function Horns({ kind }) { const y = TOP[kind] - 0.07; const w = kind === 'cone' ? 0.09 : 0.17;
  return <>{[-1, 1].map((s) => <mesh key={s} position={[s * w, y, 0.06]} rotation={[0.2, 0, -s * 0.45]} castShadow><coneGeometry args={[0.065, 0.2, 8]} /><meshStandardMaterial color="#d63a2a" roughness={0.5} /></mesh>)}</>; }
function Wings({ flap }) { const l = useRef(); const r = useRef();
  useFrame(({ clock }) => { const a = Math.sin(clock.elapsedTime * (flap.current ? 14 : 2.5)) * (flap.current ? 0.45 : 0.12); if (l.current) l.current.rotation.z = 0.35 + a; if (r.current) r.current.rotation.z = -0.35 - a; });
  return <>{[[l, -1], [r, 1]].map(([ref, s]) => <group key={s} ref={ref} position={[s * 0.26, 0.6, -0.3]}><mesh position={[s * 0.2, 0.05, 0]} rotation={[0, s * 0.5, 0]} scale={[1.3, 0.75, 0.28]}><sphereGeometry args={[0.2, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={0.6} /></mesh></group>)}</>; }
// personal hats picked in the bot's card (stored server-side)
// Hats are fitted to the actual body geometry (any blob style): we measure the body's width profile once per shape,
// then size each hat to the head and seat it where the head is as wide as the hat's opening, so the body never pokes
// through. The hat lives in the same animated group as the body, so squash/bounce/lie poses deform both together.
const PROFILE = new Map(); // kind -> { top, R(y) }
function bodyProfile(obj, key) {
  if (key && PROFILE.has(key)) return PROFILE.get(key);
  obj.updateWorldMatrix(true, true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const pts = []; const v = new THREE.Vector3(), w = new THREE.Vector3(), m = new THREE.Matrix4();
  obj.traverse((o) => { if (!o.isMesh || !o.geometry?.attributes?.position) return; m.multiplyMatrices(inv, o.matrixWorld);
    const pos = o.geometry.attributes.position; const idx = o.geometry.index; const n = idx ? idx.count : pos.count; const at = (k) => (idx ? idx.getX(k) : k);
    for (let t = 0; t + 2 < n; t += 3) for (let e = 0; e < 3; e++) { v.fromBufferAttribute(pos, at(t + e)).applyMatrix4(m); w.fromBufferAttribute(pos, at(t + (e + 1) % 3)).applyMatrix4(m);
      for (let s = 0; s <= 6; s++) pts.push(v.x + (w.x - v.x) * s / 6, v.y + (w.y - v.y) * s / 6, v.z + (w.z - v.z) * s / 6); } });
  let top = -Infinity, bot = Infinity; for (let i = 1; i < pts.length; i += 3) { top = Math.max(top, pts[i]); bot = Math.min(bot, pts[i]); }
  const STEP = 0.01, N = Math.ceil((top - bot) / STEP) + 1, R = new Float32Array(N);
  for (let i = 0; i < pts.length; i += 3) { const b = Math.min(N - 1, Math.max(0, Math.round((top - pts[i + 1]) / STEP))); R[b] = Math.max(R[b], Math.hypot(pts[i], pts[i + 2])); }
  for (let b = 1; b < N; b++) R[b] = Math.max(R[b], R[b - 1]); // width at depth d = widest point from the top down to d (conservative)
  const p = { top, R: (d) => R[Math.min(N - 1, Math.max(0, Math.round(d / STEP)))] };
  if (key) PROFILE.set(key, p); return p;
}
// rb = opening radius at the hat's bottom (origin), H = how much head fits inside above the opening
const HATS_FIT = { tophat: { rb: 0.18, H: 0.28 }, crown: { rb: 0.2, H: 0.4 }, beanie: { rb: 0.29, H: 0.22 }, cap: { rb: 0.27, H: 0.25 }, party: { rb: 0.14, H: 0.26 }, flower: { rb: 0.2, H: 0 } };
export function hatFit(p, hat) {
  const f = HATS_FIT[hat]; if (!p || !f) return null;
  if (hat === 'flower') { const d = 0.08; return { y: p.top - d, x: Math.max(0.08, p.R(d) * 0.72), s: Math.min(1.3, Math.max(0.7, p.R(0.12) / 0.3)) }; }
  const s = Math.min(1.5, Math.max(0.7, p.R(0.12) / (f.rb * 0.9))); // size to the head
  let d = 0.02; while (d < f.H * s * 0.85 && p.R(d) < f.rb * s * 0.95) d += 0.01; // seat where the head reaches the opening
  return { y: p.top - d, s };
}
const HAT_MAT = (c, r = 0.6, m = 0) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
// hat color: null = original colors, 'match' = the bot's color, '#rrggbb' = custom. Secondary parts get derived shades.
export function shadeHex(hex, f) { const n = parseInt(hex.slice(1), 16); const ch = (v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join(''); }
export function resolveHatColor(hatColor, botCol) { if (hatColor === 'match') { const c = String(botCol || ''); return /^#[0-9a-f]{3}$/i.test(c) ? '#' + [...c.slice(1)].map((x) => x + x).join('') : /^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : null; } return /^#[0-9a-f]{6}$/i.test(hatColor || '') ? hatColor : null; }
function HatModel({ hat, color: hc }) { // origin = bottom/opening of the hat; hc = resolved custom color or null
  const C = (orig, f = 0) => (hc ? (f ? shadeHex(hc, f) : hc) : orig);
  if (hat === 'tophat') return <><mesh position={[0, 0.0125, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.025, 24]} />{HAT_MAT(C('#1c1c22'))}</mesh><mesh position={[0, 0.165, 0]} castShadow><cylinderGeometry args={[0.18, 0.19, 0.28, 24]} />{HAT_MAT(C('#1c1c22'))}</mesh><mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.195, 0.195, 0.05, 24]} />{HAT_MAT(hc ? shadeHex(hc, -0.55) : '#b3202a')}</mesh></>;
  if (hat === 'crown') return <><mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.2, 0.2, 0.12, 20, 1, true]} /><meshStandardMaterial color={C('#f5c542')} metalness={0.8} roughness={0.25} side={2} /></mesh>{[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.257) * 0.19, 0.16, Math.sin(i * 1.257) * 0.19]}><coneGeometry args={[0.045, 0.1, 6]} />{HAT_MAT(C('#f5c542'), 0.25, 0.8)}</mesh>)}<mesh position={[0, 0.08, 0.2]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color="#e0245e" emissive="#e0245e" emissiveIntensity={0.4} /></mesh></>;
  if (hat === 'beanie') return <><mesh scale={[1, 0.8, 1]} castShadow><sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{HAT_MAT(C('#3b7dd8'), 0.95)}</mesh><mesh><torusGeometry args={[0.295, 0.04, 8, 24]} /><meshStandardMaterial color={hc ? shadeHex(hc, -0.28) : '#2b5fa8'} roughness={0.95} /></mesh><mesh position={[0, 0.27, 0]}><sphereGeometry args={[0.07, 10, 8]} />{HAT_MAT('#ffffff', 1)}</mesh></>;
  if (hat === 'party') return <group rotation={[0, 0, 0.12]}><mesh position={[0, 0.16, 0]} castShadow><coneGeometry args={[0.15, 0.32, 18]} />{HAT_MAT(C('#ff5fa2'), 0.5)}</mesh><mesh position={[0, 0.33, 0]}><sphereGeometry args={[0.045, 10, 8]} />{HAT_MAT('#ffe14d', 0.5)}</mesh></group>;
  if (hat === 'flower') return <group rotation={[0.3, 0, -0.4]}>{[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.257) * 0.07, 0, Math.sin(i * 1.257) * 0.07]} scale={[1, 0.4, 1]}><sphereGeometry args={[0.06, 10, 8]} />{HAT_MAT(C('#ffffff', 0.35), 0.7)}</mesh>)}<mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.04, 10, 8]} />{HAT_MAT('#ffc93c', 0.6)}</mesh></group>;
  if (hat === 'cap') return <><mesh castShadow><sphereGeometry args={[0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{HAT_MAT(C('#e74c3c'), 0.8)}</mesh><mesh position={[0, 0.01, 0.27]} rotation={[0.08, 0, 0]} scale={[1, 0.15, 0.9]}><cylinderGeometry args={[0.2, 0.2, 0.1, 20, 1, false, -Math.PI / 2, Math.PI]} />{HAT_MAT(C('#c0392b', -0.2), 0.8)}</mesh></>;
  return null;
}
// bodyRef: the group holding <Body>; profKey: cache key for that body geometry (e.g. the shape kind)
export function Hat({ kind, hat, bodyRef, profKey, color }) {
  const [fit, setFit] = useState(null);
  useEffect(() => { const o = bodyRef?.current; if (o) setFit(hatFit(bodyProfile(o, profKey ?? kind), hat)); }, [kind, hat, profKey]); // eslint-disable-line
  const f = fit || { y: TOP[kind] - 0.02, s: 1, x: 0.17 };
  if (hat === 'flower') return <group position={[f.x, f.y, f.x * 0.7]} scale={f.s}><HatModel hat={hat} color={color} /></group>;
  return <group position={[0, f.y, 0]} scale={f.s}><HatModel hat={hat} color={color} /></group>;
}
function Kasa({ kind }) { const y = TOP[kind] + 0.02; // straw hat (sugegasa) with a red tie
  return <group position={[0, y, 0]} rotation={[-0.12, 0, 0]}>
    <mesh position={[0, 0.07, 0]} castShadow><coneGeometry args={[0.4, 0.17, 18]} /><meshStandardMaterial color="#d9b56a" roughness={0.9} /></mesh>
    <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.39, 0.012, 4, 24]} /><meshStandardMaterial color="#b08a48" /></mesh>
    <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.16, 0.02, 4, 16]} /><meshStandardMaterial color="#c0392b" /></mesh>
  </group>; }
// ---------- Old West: holster + cartoon six-shooter; at the shooting range: draw, aim, fire (flash + pop), twirl, holster ----------
export const SHOTS = []; // {t, p: Vector3 (muzzle, world)} read by the range so the cans react to real shots
const RV_T = 3.2; const _mz = new THREE.Vector3();
let lastPop = 0;
function pop() { // tiny procedural "pop" only if the page's audio is already unlocked (alert sound on); never starts audio itself
  const A = window.__botsimAudio; if (!A || A.state !== 'running') return; const now = performance.now(); if (now - lastPop < 250) return; lastPop = now;
  try { const t = A.currentTime; const n = Math.floor(A.sampleRate * 0.08); const b = A.createBuffer(1, n, A.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = A.createBufferSource(); s.buffer = b; const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; const g = A.createGain(); g.gain.value = 0.06; s.connect(f).connect(g).connect(A.destination); s.start(t); } catch {}
}
function Revolver({ kind, active, seed }) {
  const gun = useRef(); const flash = useRef(); const puff = useRef(); const fired = useRef(-1);
  const hipY = TOP[kind] * 0.3, hipX = (kind === 'pill' || kind === 'drop' ? 0.36 : 0.42);
  const geo = useMemo(() => { const g = (geo, c, p, r) => ({ geo, c, p, r });
    return [g(new THREE.BoxGeometry(0.05, 0.06, 0.24), '#9aa3ad', [0, 0.02, 0.1]), g(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), '#6f7680', [0, 0.04, 0.27], [Math.PI / 2, 0, 0]),
      g(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 6), '#7a828c', [0, 0.01, 0.02], [Math.PI / 2, 0, 0]), g(new THREE.BoxGeometry(0.045, 0.13, 0.06), '#8a5a2b', [0, -0.07, -0.05], [-0.35, 0, 0]),
      g(new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI), '#4a4f58', [0, -0.03, 0.03], [0, Math.PI / 2, Math.PI]), g(new THREE.BoxGeometry(0.012, 0.03, 0.02), '#4a4f58', [0, 0.065, 0.32])]; }, []);
  useFrame(({ clock }) => { const g = gun.current; if (!g) return; const t = clock.elapsedTime + seed * 0.37;
    // holstered pose (grip up out of the holster) vs aiming pose (arm's-length in front, pointing forward)
    const H = { x: hipX + 0.02, y: hipY + 0.16, z: 0.02, rx: Math.PI / 2 - 0.15, rz: 0 }; const Aim = { x: 0.26, y: TOP[kind] * 0.66, z: 0.52, rx: 0, rz: -0.25 };
    let k = 0, recoil = 0, spin = 0, shot = -1; const c = active ? (t % RV_T) / RV_T * RV_T : -1;
    if (active) {
      if (c < 0.35) k = THREE.MathUtils.smoothstep(c, 0, 0.35); else if (c < 2.4) k = 1; else if (c < 2.9) { k = 1; spin = (c - 2.4) / 0.5 * Math.PI * 4; } else k = 1 - THREE.MathUtils.smoothstep(c, 2.9, 3.15);
      for (const ft of [1.0, 1.9]) if (c >= ft && c < ft + 0.3) { recoil = Math.sin(((c - ft) / 0.3) * Math.PI) * (1 - (c - ft) / 0.3 * 0.4); shot = ft; }
      const cyc = Math.floor(t / RV_T) * 10 + (shot === 1.0 ? 1 : 2); if (shot > 0 && fired.current !== cyc) { fired.current = cyc;
        g.updateWorldMatrix(true, false); _mz.set(0, 0.04, 0.36).applyMatrix4(g.matrixWorld); SHOTS.push({ t: performance.now(), p: _mz.clone() }); if (SHOTS.length > 40) SHOTS.shift(); pop(); }
    }
    const L = (a, b) => a + (b - a) * k; const wob = active && k === 1 && !spin ? Math.sin(t * 7) * 0.015 : 0;
    g.position.set(L(H.x, Aim.x), L(H.y, Aim.y) + wob, L(H.z, Aim.z)); g.rotation.set(L(H.rx, Aim.rx) - recoil * 0.6 - spin, 0, L(H.rz, Aim.rz));
    const f = flash.current; const since = shot > 0 ? c - shot : 9; if (f) { const on = since < 0.09; f.visible = on; if (on) { const s = 0.6 + since * 12; f.scale.setScalar(s); f.rotation.z = t * 20; } }
    const pf = puff.current; if (pf) { const on = since < 0.6; pf.visible = on; if (on) { pf.position.set(0, 0.06 + since * 0.25, 0.4 + since * 0.2); pf.scale.setScalar(0.04 + since * 0.18); pf.material.opacity = 0.5 * (1 - since / 0.6); } } });
  return (<group>
    {/* belt + holster on the right hip */}
    <mesh position={[0, hipY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.05, 1]}><torusGeometry args={[hipX - 0.01, 0.025, 6, 28]} /><meshStandardMaterial color="#5a3a1e" roughness={0.8} /></mesh>
    <mesh position={[0, hipY, hipX - 0.02]}><boxGeometry args={[0.09, 0.06, 0.03]} /><meshStandardMaterial color="#e6c25a" metalness={0.7} roughness={0.3} /></mesh>
    <mesh position={[hipX + 0.03, hipY - 0.04, 0.02]} rotation={[0, 0, 0.12]}><boxGeometry args={[0.07, 0.2, 0.12]} /><meshStandardMaterial color="#7a4a26" roughness={0.85} /></mesh>
    <mesh position={[hipX + 0.065, hipY - 0.04, 0.02]} rotation={[0, 0, 0.12]}><boxGeometry args={[0.01, 0.12, 0.06]} /><meshStandardMaterial color="#e6c25a" /></mesh>
    <group ref={gun} scale={1.5}>
      {geo.map((m, i) => <mesh key={i} geometry={m.geo} position={m.p} rotation={m.r || [0, 0, 0]}><meshStandardMaterial color={m.c} metalness={m.c === '#8a5a2b' ? 0 : 0.6} roughness={0.4} /></mesh>)}
      <mesh ref={flash} position={[0, 0.04, 0.4]} visible={false}><octahedronGeometry args={[0.09, 0]} /><meshBasicMaterial color={new THREE.Color('#ffd23a').multiplyScalar(3)} toneMapped={false} /></mesh>
    </group>
    <mesh ref={puff} visible={false}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#e8e2d8" transparent opacity={0.4} depthWrite={false} /></mesh>
  </group>);
}
const hatTones = ['#7a4a26', '#3b2a1e', '#c8a06a', '#5a3a22'];
function Cowboy({ kind, tone = 0 }) { const y = TOP[kind] + 0.0; const c = hatTones[tone % hatTones.length]; // cowboy hat: curled brim, pinched crown, band
  return <group position={[0, y, 0]} rotation={[-0.1, 0, 0.06]}>
    <mesh position={[0, 0.01, 0]} scale={[1, 0.18, 1.12]} castShadow><cylinderGeometry args={[0.38, 0.4, 0.12, 22]} /><meshStandardMaterial color={c} roughness={0.85} /></mesh>
    <mesh position={[-0.33, 0.04, 0]} rotation={[0, 0, 0.5]} scale={[0.5, 0.12, 1.5]}><cylinderGeometry args={[0.1, 0.1, 0.12, 10]} /><meshStandardMaterial color={c} roughness={0.85} /></mesh>
    <mesh position={[0.33, 0.04, 0]} rotation={[0, 0, -0.5]} scale={[0.5, 0.12, 1.5]}><cylinderGeometry args={[0.1, 0.1, 0.12, 10]} /><meshStandardMaterial color={c} roughness={0.85} /></mesh>
    <mesh position={[0, 0.13, 0]} scale={[0.9, 1, 1.1]} castShadow><cylinderGeometry args={[0.17, 0.22, 0.24, 16]} /><meshStandardMaterial color={c} roughness={0.85} /></mesh>
    <mesh position={[0, 0.25, 0]} scale={[0.75, 0.25, 1]}><sphereGeometry args={[0.18, 12, 8]} /><meshStandardMaterial color={c} roughness={0.85} /></mesh>
    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.215, 0.215, 0.05, 16]} /><meshStandardMaterial color="#2a1a10" /></mesh>
  </group>; }
const COSTUMES = ['witch', 'pumpkin', 'cat', 'witch2', 'devil'];
function Costume({ kind, id }) { const y = TOP[kind]; const c = COSTUMES[[...(id || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COSTUMES.length];
  if (c === 'witch' || c === 'witch2') { const hat = c === 'witch' ? '#2a1e3a' : '#1a1a22'; const band = c === 'witch' ? '#8a4ad8' : '#f07a1a';
    return <group position={[0, y - 0.02, 0]} rotation={[-0.12, 0, 0.1]}><mesh castShadow><cylinderGeometry args={[0.42, 0.42, 0.03, 22]} /><meshStandardMaterial color={hat} roughness={0.8} /></mesh>
      <mesh position={[0, 0.3, 0]} rotation={[0.15, 0, -0.12]} castShadow><coneGeometry args={[0.2, 0.6, 14]} /><meshStandardMaterial color={hat} roughness={0.8} /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.205, 0.205, 0.07, 14]} /><meshStandardMaterial color={band} /></mesh></group>; }
  if (c === 'pumpkin') return <group position={[0, y + 0.02, 0]}><mesh scale={[1.25, 0.6, 1.25]} castShadow><sphereGeometry args={[0.22, 12, 8]} /><meshStandardMaterial color="#f07a1a" roughness={0.7} /></mesh><mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.03, 0.04, 0.1, 6]} /><meshStandardMaterial color="#4a6a2a" /></mesh></group>;
  if (c === 'cat') return <group position={[0, y - 0.1, 0]}>{[-1, 1].map((s) => <mesh key={s} position={[s * 0.22, 0.08, 0]} rotation={[0, 0, -s * 0.35]} castShadow><coneGeometry args={[0.1, 0.2, 4]} /><meshStandardMaterial color="#1a1a1e" /></mesh>)}</group>;
  return <Horns kind={kind} />; }
const haloCol = new THREE.Color('#ffd36a');
function Halo({ kind, poseK, asleep }) { const g = useRef(); const m = useRef();
  useFrame(({ clock }) => { const k = poseK.current; if (g.current) { g.current.position.y = (TOP[kind] + 0.2) * (1 - k) + 0.98 * k + Math.sin(clock.elapsedTime * 2) * 0.025; }
    if (m.current) m.current.color.copy(haloCol).multiplyScalar(asleep ? 2.8 + Math.sin(clock.elapsedTime * 1.5) * 0.4 : 1.7); });
  return <group ref={g}><mesh rotation={[Math.PI / 2 - 0.15, 0, 0]}><torusGeometry args={[asleep ? 0.24 : 0.2, 0.035, 8, 28]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh></group>; }

// ---------- the blob ----------
const tmp = new THREE.Vector3();
const angD = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);

// target: { pos:[x,y,z], face, pose:'stand'|'lie'|'hammock', approach:[[x,y,z]...], lift }
export default function Blob({ bot, target, selected, onSelect, showBubble, positions, layout, gait = 'hop', props = {}, accessory, say, unread = 0, blobStyle = DEFAULT_BLOB_STYLE }) {
  const { groundY, Ro, spokes = [], plazaFoot } = layout;
  const color = botColor(bot); const kind = kindFor(blobStyle, bot.shape); const eye = SHAPES[kind].eye;
  const eyeColor = SHAPES[kind].geo || !isDark(color) ? '#17171c' : '#f8fafc'; // real avatars: dark eyes on every color
  const outer = useRef(); const bodyRef = useRef(); const inner = useRef(); const eyes = useRef(); const sel = useRef();
  const pos = useRef(V(target.pos));
  const path = useRef([]); const trail = useRef([...(target.approach || [])]); const rot = useRef(target.face || 0); const hop = useRef(0);
  const blinkAt = useRef(2 + Math.random() * 3); const [moving, setMoving] = useState(false); const movingRef = useRef(false);
  const seed = useMemo(() => Math.random() * 10, []); const poseK = useRef(0);
  const key = target.pos.map((v) => v.toFixed(2)).join(',');

  useEffect(() => {
    const cur = pos.current; const end = V(target.pos);
    if (cur.distanceTo(end) < 0.05 && !path.current.length) return;
    if (window.__botsim?.snapWalk) { cur.copy(end); path.current = []; trail.current = (target.approach || []).map((p) => [...p]); return; } // screenshots: skip the walk
    const pts = [];
    // walk back out the way we came (bungalow walkway, dock...)
    const exit = [...trail.current].reverse(); trail.current = [];
    exit.forEach((p) => pts.push({ v: V(p) }));
    const start = pts.length ? pts[pts.length - 1].v : cur.clone();
    const appr = (target.approach || []).map((p) => ({ v: V(p), appr: true }));
    const first = appr.length ? appr[0].v : end;
    if (start.distanceTo(first) > 3.2) {
      // walk on the ring road (radius Ro); the plaza is entered/left through the nearest free spoke
      const ring = (a, r = Ro) => { const x = Math.cos(a) * r, z = Math.sin(a) * r; return { v: new THREE.Vector3(x, groundY(x, z), z), hub: true }; };
      const nearSpoke = (a) => spokes.reduce((b, s) => (Math.abs(angD(s, a)) < Math.abs(angD(b, a)) ? s : b), spokes[0] ?? a);
      let a0 = Math.atan2(start.z, start.x), a1 = Math.atan2(first.z, first.x);
      const r0 = Math.hypot(start.x, start.z), r1 = Math.hypot(first.x, first.z);
      if (r0 < plazaFoot) { a0 = nearSpoke(a0); pts.push(ring(a0, plazaFoot - 0.6)); }
      const inPlaza1 = r1 < plazaFoot; if (inPlaza1) a1 = nearSpoke(a1);
      const d = angD(a1, a0);
      if (Math.abs(d) < 0.25 && !inPlaza1 && r0 >= plazaFoot) { /* same direction: go straight */ }
      else {
        pts.push(ring(a0)); const stepA = Math.min(0.5, 2.5 / Ro); const steps = Math.ceil(Math.abs(d) / stepA);
        for (let i = 1; i < steps; i++) pts.push(ring(a0 + (d * i) / steps));
        pts.push(ring(a1)); if (inPlaza1) pts.push(ring(a1, plazaFoot - 0.6));
      }
    }
    pts.push(...appr, { v: end, end: true }); path.current = pts;
  }, [key]);

  useFrame((s, dt) => {
    dt = Math.min(dt, 0.25); const t = s.clock.elapsedTime + seed; const g = outer.current; const b = inner.current; if (!g || !b) return;
    let y = 0, sy = 1, sxz = 1, faceTo = target.face || 0, tilt = 0, lieGoal = 0, swing = 0, ox = 0, oz = 0, pitch = 0; const T0 = s.clock.elapsedTime; const A = target.activity;
    const p = pos.current; const st = target.activity ? 'idle' : bot.state; // a napping bot that joined an activity is awake
    if (path.current.length) {
      const nx = path.current[0]; tmp.subVectors(nx.v, p); const dist = tmp.length(); const step = (gait === 'waddle' ? 2.2 : gait === 'swim' ? 2.5 : gait === 'float' ? 2.3 : 2.6) * dt;
      if (dist <= step) { p.copy(nx.v); path.current.shift(); if (nx.appr) trail.current.push(nx.v.toArray()); if (nx.hub) trail.current = []; }
      else p.addScaledVector(tmp.normalize(), step);
      if (Math.hypot(tmp.x, tmp.z) > 0.001) faceTo = Math.atan2(tmp.x, tmp.z); else faceTo = rot.current;
      if (gait === 'waddle') { hop.current += dt * 11; const s1 = Math.abs(Math.sin(hop.current)); y = s1 * 0.07; sy = 0.95 + s1 * 0.06; tilt = Math.sin(hop.current) * 0.2; }
      else if (gait === 'float') { hop.current += dt * 4.0; const s1 = Math.abs(Math.sin(hop.current)); y = s1 * 1.05; sy = 0.96 + s1 * 0.08; sxz = 1.03 - s1 * 0.04; tilt = Math.sin(hop.current * 0.5) * 0.08; }
      else if (gait === 'swim') { hop.current += dt * 4; y = 0.3 + Math.sin(hop.current) * 0.1; sy = 1 + Math.sin(hop.current * 2) * 0.05; sxz = 1 - Math.sin(hop.current * 2) * 0.03; tilt = Math.sin(hop.current) * 0.06; }
      else { hop.current += dt * 9.5; const s1 = Math.abs(Math.sin(hop.current)); y = s1 * 0.32; sy = 0.8 + s1 * 0.32; sxz = 1.12 - s1 * 0.14; }
    } else {
      hop.current = 0;
      const pose = target.pose || 'stand';
      if (pose === 'lie' || pose === 'hammock') {
        lieGoal = 1; sy = 1 + Math.sin(t * (st === 'stale' ? 0.9 : 1.5)) * 0.03; sxz = 1;
        if (pose === 'hammock') swing = Math.sin(t * 0.8) * 0.12;
      } else switch (st) {
        case 'working': y = Math.abs(Math.sin(t * 9)) * 0.05; sy = 1 - Math.abs(Math.sin(t * 9)) * 0.05; tilt = Math.sin(t * 4.5) * 0.05; break;
        case 'researching': tilt = Math.sin(t * 1.2) * 0.07; sy = 1 + Math.sin(t * 2) * 0.02; break;
        case 'thinking': tilt = Math.sin(t * 0.9) * 0.1; sy = 1 + Math.sin(t * 1.6) * 0.03; break;
        case 'waiting_on_user': { const k = (t * (gait === 'float' ? 0.6 : 1.1)) % 1; const s1 = k < 0.35 ? Math.sin((k / 0.35) * Math.PI) : 0; y = s1 * (gait === 'float' ? 0.6 : 0.22); sy = 1 + s1 * 0.12 - (k > 0.35 && k < 0.45 ? 0.1 : 0); break; }
        case 'error': tilt = Math.sin(t * 25) * 0.06; sy = 0.95; break;
        case 'done': { const s1 = Math.abs(Math.sin(t * (gait === 'float' ? 1.7 : 3.2))); y = s1 * (gait === 'float' ? 1.7 : 0.75); sy = 0.82 + s1 * 0.3; sxz = 1.1 - s1 * 0.12; faceTo += t * 2; break; }
        default:
          if (target.activity === 'drinks') { const k = (t * 0.35) % 1; const sip = k > 0.7 ? Math.sin(((k - 0.7) / 0.3) * Math.PI) : 0; tilt = -sip * 0.28; y = sip * 0.05; sy = 1 + Math.sin(t * 1.4) * 0.03; }
          else if (target.activity === 'huddle') { const s1 = Math.abs(Math.sin(t * 2.2)); y = s1 * 0.06; sy = 1 + s1 * 0.05; tilt = Math.sin(t * 1.1) * 0.08; }
          else if (target.activity === 'campfire' || target.activity === 'hanami') { tilt = Math.sin(t * 0.9) * 0.09; sy = 1 + Math.sin(t * 1.2) * 0.04; }
          else if (target.activity === 'stroll') { y = Math.abs(Math.sin(t * 1.6)) * 0.05; tilt = Math.sin(t * 0.8) * 0.06; }
          else if (A === 'hottub' || A === 'bubblevent') { sy = 1 + Math.sin(t * 1.1) * 0.04; tilt = Math.sin(t * 0.6) * 0.07; y = Math.sin(t * 1.3) * 0.03;
            if (A === 'bubblevent') { y = Math.sin(t * 1.4) * 0.45; faceTo += t * 0.8; tilt = Math.sin(t * 2) * 0.15; } }
          else if (A === 'icebath') { tilt = Math.sin(t * 38) * 0.05; sxz = 0.94 + Math.sin(t * 31) * 0.02; sy = 0.92; y = Math.abs(Math.sin(t * 27)) * 0.02; }
          else if (A === 'trampoline') { const per = 1.9, k = (t / per) % 1, n = Math.floor(t / per); const air = Math.sin(k * Math.PI); y = air * 2.6; sy = k < 0.06 || k > 0.94 ? 0.75 : 1 + air * 0.06; sxz = k < 0.06 || k > 0.94 ? 1.15 : 1;
            if (n % 3 === 1) pitch = -k * Math.PI * 2; else if (n % 3 === 2) faceTo += k * Math.PI * 2; }
          else if (A === 'volleyball') { const k = (t * 0.9) % 1; const j = Math.max(0, Math.sin(k * Math.PI * 2)); y = j * 0.55; sy = 1 + j * 0.1; tilt = Math.sin(t * 2) * 0.06; }
          else if (A === 'vineswing' && target.swing) { const th = Math.sin(T0 * SWING.w) * SWING.amp; const d = -Math.sin(th) * SWING.L; ox = Math.sin(target.face) * d; oz = Math.cos(target.face) * d; y = (1 - Math.cos(th)) * SWING.L; pitch = -th * 0.6; }
          else if (A === 'snowball') { const k = (t * 0.7) % 1; pitch = k > 0.75 ? Math.sin(((k - 0.75) / 0.25) * Math.PI) * 0.45 : -0.08; y = k < 0.3 ? 0 : Math.abs(Math.sin(t * 5)) * 0.04; sy = k < 0.5 ? 0.85 : 1; }
          else if (A === 'seahorse' && target.ride) { const R = target.ride; const a = R.a + RIDE.w * T0; const i = R.i ?? 0;
            ox = R.c[0] + Math.cos(a) * R.r - p.x; oz = R.c[1] + Math.sin(a) * R.r - p.z; y = Math.sin(T0 * 2 + i * 1.6) * 0.12; faceTo = Math.atan2(-Math.sin(a), Math.cos(a)); }
          else if (A === 'harp') { tilt = Math.sin(t * 1.8) * 0.12; sy = 1 + Math.sin(t * 3.6) * 0.04; }
          else if (A === 'marshmallow') { pitch = 0.22 + Math.sin(t * 0.8) * 0.06; tilt = Math.sin(t * 0.5) * 0.05; }
          else if (A === 'lanternwalk') { tilt = Math.sin(t * 0.8) * 0.06; }
          else { sy = 1 + Math.sin(t * 1.4) * 0.035; tilt = Math.sin(t * 0.7) * 0.05; }
      }
      if (gait === 'swim' && pose === 'stand') y += 0.06 + Math.sin(t * 1.3) * 0.05;
    }
    if (movingRef.current !== path.current.length > 0) { movingRef.current = path.current.length > 0; setMoving(movingRef.current); }
    poseK.current += (lieGoal - poseK.current) * Math.min(1, dt * 5);
    const k = poseK.current;
    rot.current = lerpAngle(rot.current, faceTo, Math.min(1, dt * 8));
    g.position.set(p.x + ox, p.y + y, p.z + oz); g.rotation.y = rot.current;
    b.scale.set(sxz, sy, sxz); b.rotation.set(-Math.PI / 2 * k + pitch, 0, tilt + swing); if (pitch) b.position.y = 0.42 * k + 0.4 * Math.abs(Math.sin(pitch / 2)); b.position.set(0, 0.42 * k, 0);
    if (eyes.current) {
      let ey = 1; if (st === 'stale') ey = 0.12; else { const kk = t - blinkAt.current; const dur = k > 0.5 ? 0.45 : 0.14; if (kk > 0 && kk < dur) ey = 0.12; else if (kk >= dur) blinkAt.current = t + 2.5 + Math.random() * 3; }
      eyes.current.scale.y = ey;
    }
    if (sel.current) { sel.current.visible = selected && k < 0.5; sel.current.rotation.z = t; }
    positions.current[bot.id] = p;
  });

  const arrived = !moving; const st = target.activity ? 'idle' : bot.state; const info = STATE_INFO[st] || STATE_INFO.idle;
  const lying = arrived && (target.pose === 'lie' || target.pose === 'hammock');
  const bubble = showBubble && arrived && !['idle', 'stale'].includes(st) && bot.task;
  const tagY = (lying ? 1.05 : kind === 'drop' ? 1.42 : 1.22) + (arrived ? target.lift || 0 : 0);
  return (
    <group ref={outer} onClick={(e) => { e.stopPropagation(); onSelect(bot.id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => (document.body.style.cursor = '')}>
      <group ref={inner}>
        <group ref={bodyRef}><Body kind={kind} color={color} /></group>
        {accessory === 'horns' && <Horns kind={kind} />}
        {accessory === 'kasa' && !bot.hat && <Kasa kind={kind} />}
        {accessory === 'costume' && !bot.hat && <Costume kind={kind} id={bot.id} />}
        {accessory === 'cowboy' && !bot.hat && <Cowboy kind={kind} tone={[...(bot.id || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0)} />}
        {bot.hat && <Hat kind={kind} hat={bot.hat} bodyRef={bodyRef} color={resolveHatColor(bot.hatColor, botColor(bot))} />}
        {accessory === 'cowboy' && <Revolver kind={kind} active={arrived && target.activity === 'shooting'} seed={[...(bot.id || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 7} />}
        {accessory === 'halo' && <Wings flap={movingRef} />}
        <group ref={eyes} position={[SHAPES[kind].ex || 0, eye[1], eye[2]]}>
          {[-1, 1].map((s) => (<group key={s} position={[s * eye[0], 0, 0]}>
            <mesh scale={[0.75, 1.3, 0.5]}><sphereGeometry args={[0.075, 14, 12]} /><meshStandardMaterial color={eyeColor} roughness={0.2} /></mesh>
            {eyeColor !== '#f8fafc' && <mesh position={[0.02, 0.04, 0.035]}><sphereGeometry args={[0.018, 8, 6]} /><meshBasicMaterial color="#fff" /></mesh>}
          </group>))}
        </group>
      </group>
      {accessory === 'halo' && <Halo kind={kind} poseK={poseK} asleep={st === 'stale'} />}
      <mesh ref={sel} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[0.58, 0.68, 6]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      {!lying && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><circleGeometry args={[0.42, 20]} /><meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} /></mesh>}
      <Sparks active={arrived && st === 'working'} />
      <Hands active={arrived && st === 'working'} color={color} />
      <Smoke active={arrived && st === 'error'} />
      <Confetti active={arrived && st === 'done'} />
      <Book active={arrived && st === 'researching' && props.researching !== 'none'} />
      {props.thinking === 'coconut' ? <Coconut active={arrived && (st === 'thinking' || target.activity === 'drinks')} /> : <Cup active={arrived && (st === 'thinking' || target.activity === 'drinks')} />}
      <AlertRing active={arrived && st === 'waiting_on_user'} />
      {target.activity === 'marshmallow' && <Stick active={arrived} />}
      {target.activity === 'lanternwalk' && <Lantern active />}
      <Html position={[0, tagY, 0]} distanceFactor={16} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tagwrap">
          {arrived && st === 'waiting_on_user' && <div className="bang">!</div>}
          {arrived && st === 'stale' && <div className="zzz"><span>z</span><span>z</span><span>Z</span></div>}
          {say ? <div className="bubble say" style={{ borderColor: color }}>💬 {truncate(say, 90)}</div>
            : arrived && target.emojis ? <EmojiChat list={target.emojis} turn={target.emojiTurn || 0} />
            : bubble && <div className="bubble" style={{ borderColor: info.color }}>{truncate(bot.task, 34)}</div>}
          {(bot.nameTag !== false || selected || unread > 0) && <div className={'nametag' + (selected ? ' sel' : '')}><i style={{ background: color }} />{bot.name}{unread > 0 && <span className="ubadge">{unread}</span>}</div>}
        </div>
      </Html>
    </group>
  );
}

// standalone figure (body + eyes only) for the ?avgallery= preview page
export function AvatarFigure({ shape, color: c, style }) {
  const kind = kindFor(style, shape); const color = botColor({ color: c, id: shape }); const eye = SHAPES[kind].eye; const eyeColor = SHAPES[kind].geo || !isDark(color) ? '#17171c' : '#f8fafc'; // real avatars: dark eyes on every color
  return (<group><Body kind={kind} color={color} />
    <group position={[SHAPES[kind].ex || 0, eye[1], eye[2]]}>{[-1, 1].map((s) => (<group key={s} position={[s * eye[0], 0, 0]}>
      <mesh scale={[0.75, 1.3, 0.5]}><sphereGeometry args={[0.075, 14, 12]} /><meshStandardMaterial color={eyeColor} roughness={0.2} /></mesh>
      {eyeColor !== '#f8fafc' && <mesh position={[0.02, 0.04, 0.035]}><sphereGeometry args={[0.018, 8, 6]} /><meshBasicMaterial color="#fff" /></mesh>}</group>))}</group></group>);
}
