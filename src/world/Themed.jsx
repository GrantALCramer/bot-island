// Theme-specific homes and decor: igloos, treehouses (+ rope bridges), glass domes, ice floes, penguins,
// aurora, fish schools, god rays, plankton, waterfall. Everything keeps a fixed size; only counts and
// placement radii follow the layout (land radius R, shore radius, extent).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useWorld } from './env.js';
import { mergeParts, G, MAT, cached, tintGeo } from './parts.js';
import { Bed, HomeSign, Thatch, useCutaway, useLantern, Flame } from './Structures.jsx';
import { isClear, angDiff } from './layout.js';
import { seeded, botColor } from '../util.js';

const night = (env) => 1 - (env.current?.day ?? 1);
const BACK = Math.PI * 1.25;

// ---------- Igloo ----------
const iglooDome = () => cached('iglooDome', () => {
  const g = new THREE.SphereGeometry(1.6, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(); g.deleteAttribute('uv');
  const p = g.attributes.position; const col = new Float32Array(p.count * 3); const r = seeded(5);
  for (let t = 0; t < p.count; t += 3) { const v = 0.9 + r() * 0.1; const c = new THREE.Color('#f2f8fc').multiplyScalar(v); c.b = Math.min(1, c.b + 0.03); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (t + k) * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
});
const iglooBase = () => cached('iglooBase', () => {
  const P = [];
  const tun = new THREE.CylinderGeometry(0.66, 0.66, 1.2, 12, 1, true, -Math.PI / 2, Math.PI); P.push([tun, '#e6f0f7', [0, 0, 1.75], [Math.PI / 2, 0, 0]]);
  P.push([G.torus(0.68, 0.08, 6, 14, Math.PI), '#d2e2ee', [0, 0, 2.35], [0, 0, 0]]);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; P.push([G.dodec(0.32), '#eef5fa', [Math.cos(a) * 1.75, 0.05, Math.sin(a) * 1.75], [i, i, 0], [1.3, 0.45, 1.3]]); }
  P.push([G.cyl(1.55, 1.55, 0.05, 20), '#c9b28c', [0, 0.03, 0]]);
  P.push([G.box(0.08, 0.5, 0.08), '#6b4a2c', [0.95, 0.25, -0.75]]);
  return mergeParts(P);
});
const tunnelDark = new THREE.MeshBasicMaterial({ color: '#2a3b4c', side: THREE.BackSide });
export function Igloo({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true }), []);
  useCutaway(home, selected, [mat], 0.35, 10); const lantern = useLantern(asleep, '#bfe8ff');
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={(e) => { e.stopPropagation(); onSelect(bot.id); }}>
    <mesh geometry={iglooBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh position={[0, 0, 1.75]} rotation={[Math.PI / 2, 0, 0]} material={tunnelDark}><cylinderGeometry args={[0.6, 0.6, 1.18, 12, 1, true, -Math.PI / 2, Math.PI]} /></mesh>
    <mesh geometry={iglooDome()} material={mat} castShadow receiveShadow />
    <Bed kind="bag" color={color} inBed={inBed} position={[0, 0.05, -0.25]} />
    <mesh position={[0.95, 0.58, -0.75]}><octahedronGeometry args={[0.1, 0]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <mesh position={[-0.9, 0.2, 2.5]}><boxGeometry args={[0.06, 0.4, 0.06]} /><meshStandardMaterial color="#6b4a2c" /></mesh>
    <mesh position={[-0.75, 0.33, 2.5]}><planeGeometry args={[0.3, 0.2]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.8]} />
  </group>);
}

// ---------- Treehouse ----------
const treeBase = () => cached('treeBase', () => {
  const f = 2.4; const P = [];
  P.push([G.cyl(0.42, 0.62, 7.2, 9), '#5b4630', [0, 3.6, -1.25]]);
  for (let k = 0; k < 5; k++) { const a = k * 1.26 + 0.4; P.push([G.box(0.1, 0.9, 0.8), '#4f3c28', [Math.sin(a) * 0.55, 0.42, -1.25 + Math.cos(a) * 0.55], [0, a, 0]]); }
  [[-1.5, 1.4], [1.5, 1.4], [-1.5, -0.2], [1.5, -0.2]].forEach(([x, z]) => P.push([G.cyl(0.08, 0.1, f, 6), '#6a4a2e', [x, f / 2, z]]));
  P.push([G.box(3.5, 0.16, 3.3), '#9a7046', [0, f - 0.08, 0.05]]);
  for (let i = 0; i < 10; i++) P.push([G.box(3.5, 0.012, 0.03), '#6e4a28', [0, f + 0.002, -1.5 + i * 0.34]]);
  [-1.7, 1.7].forEach((x) => { P.push([G.box(0.06, 0.06, 3.1), '#6a4a2e', [x, f + 0.55, 0.05]]); for (let i = 0; i < 5; i++) P.push([G.cyl(0.03, 0.03, 0.55, 5), '#6a4a2e', [x, f + 0.27, -1.4 + i * 0.75]]); });
  [[-1.1, 1.68], [1.1, 1.68]].forEach(([x, z]) => P.push([G.box(1.2, 0.06, 0.06), '#6a4a2e', [x, f + 0.55, z]]));
  P.push([G.box(3.3, 1.5, 0.08), '#b89a5a', [0, f + 0.75, -1.55]]);
  // rope ladder (front, toward the island center)
  const lad = (t) => [0, f * t, 1.72 + (1 - t) * 0.45];
  [-0.28, 0.28].forEach((x) => { const len = Math.hypot(f, 0.45); P.push([G.cyl(0.025, 0.025, len, 4), '#cdb48a', [x, f / 2, 1.72 + 0.225], [Math.atan2(0.45, f), 0, 0]]); });
  for (let i = 1; i < 7; i++) { const [, yy, zz] = lad(i / 7); P.push([G.box(0.6, 0.05, 0.08), '#8a6a44', [0, yy, zz]]); }
  P.push([G.cyl(0.18, 0.15, 0.45, 8), '#6a4a2e', [1.1, f + 0.22, -0.95]]);
  return mergeParts(P);
});
const treeCanopy = () => cached('treeCanopy', () => {
  const P = []; const r = seeded(3);
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; const s = 1.2 + r() * 0.6; P.push([G.ico(s, 0), ['#1f6b2f', '#2d8a3e', '#185a28', '#3a8a30'][k % 4], [Math.cos(a) * 1.3, 6.4 + r() * 0.8, -1.25 + Math.sin(a) * 1.3], [0, 0, 0], [1, 0.7, 1]]); }
  P.push([G.ico(1.6, 0), '#2d8a3e', [0, 7.3, -1.25], [0, 0, 0], [1, 0.7, 1]]);
  return mergeParts(P);
});
export function Treehouse({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot); const f = home.floor;
  const can = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), []);
  const roofOp = useCutaway(home, selected, [can], 0.15, 11); const lantern = useLantern(asleep);
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={(e) => { e.stopPropagation(); onSelect(bot.id); }}>
    <mesh geometry={treeBase()} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh geometry={treeCanopy()} material={can} castShadow />
    <group position={[0, 0, 0.05]}><Thatch r={2.25} h={1.25} sides={8} y={f + 1.75} opacityRef={roofOp} color="#5f8f3a" dark="#4a7a2e" /></group>
    {[-1.4, 1.4].map((x) => [-1.35, 1.45].map((z) => <mesh key={`${x}${z}`} position={[x, f + 0.9, z]}><cylinderGeometry args={[0.05, 0.06, 1.8, 5]} /><meshStandardMaterial color="#6a4a2e" /></mesh>))}
    <Bed color={color} inBed={inBed} position={[0, f, 0.35]} />
    <mesh position={[1.1, f + 0.6, -0.95]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.5, 2.6]} />
  </group>);
}
// Rope bridges between neighboring treehouse platforms (one merged mesh)
export function TreeBridges() {
  const { layout } = useWorld();
  const geo = useMemo(() => {
    const hs = layout.homes; const P = [];
    const byRow = {}; hs.forEach((h) => (byRow[h.row] ||= []).push(h));
    Object.values(byRow).forEach((row) => { row.sort((a, b) => a.angle - b.angle);
      for (let i = 0; i + 1 < row.length; i++) { const A = row[i], B = row[i + 1]; const d = Math.hypot(A.x - B.x, A.z - B.z); if (d > 9.5) continue;
        const ux = (B.x - A.x) / d, uz = (B.z - A.z) / d; const ya = layout.groundY(A.x, A.z) + A.floor, yb = layout.groundY(B.x, B.z) + B.floor;
        const a = [A.x + ux * 1.7, ya, A.z + uz * 1.7], b = [B.x - ux * 1.7, yb, B.z - uz * 1.7]; const L = d - 3.4; const rot = Math.atan2(ux, uz); const n = Math.max(2, Math.round(L / 0.36));
        for (let k = 0; k <= n; k++) { const t = k / n; const sag = Math.sin(Math.PI * t) * 0.45; const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag - 0.04, a[2] + (b[2] - a[2]) * t];
          P.push([G.box(0.7, 0.05, 0.2), k % 2 ? '#8a6a44' : '#9a7a4e', p, [0, rot, 0]]);
          if (k < n) [-0.38, 0.38].forEach((s) => { const t2 = (k + 1) / n; const sag2 = Math.sin(Math.PI * t2) * 0.45; const q = [a[0] + (b[0] - a[0]) * t2, a[1] + (b[1] - a[1]) * t2 - sag2, a[2] + (b[2] - a[2]) * t2];
            const px = Math.cos(rot) * s, pz = -Math.sin(rot) * s; const m = [(p[0] + q[0]) / 2 + px, (p[1] + q[1]) / 2 + 0.55, (p[2] + q[2]) / 2 + pz]; const seg = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
            P.push([G.cyl(0.018, 0.018, seg, 4), '#cdb48a', m, [Math.PI / 2 - Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2])), rot, 0, 'YXZ']]); });
        } } });
    return P.length ? mergeParts(P) : null;
  }, [layout]);
  return geo ? <mesh geometry={geo} material={MAT.vc} castShadow /> : null;
}

// ---------- Glass dome (Atlantis) ----------
const domeBase = () => cached('domeBase', () => mergeParts([
  [G.cyl(1.82, 1.9, 0.14, 28), '#7c8fa0', [0, 0.06, 0]], [G.torus(1.72, 0.07, 6, 36), '#9fb3c4', [0, 0.15, 0], [Math.PI / 2, 0, 0]],
  [G.cyl(1.66, 1.66, 0.02, 28), '#d9cba3', [0, 0.13, 0]], [G.cyl(0.16, 0.2, 0.3, 10), '#7c8fa0', [1.05, 0.28, -0.85]],
  ...Array.from({ length: 5 }, (_, i) => [G.cyl(0.02, 0.03, 0.6 + i * 0.1, 4), '#3f9a5a', [-1.15 + (i % 2) * 0.08, 0.4, -0.75 + i * 0.06], [0.1 * (i - 2), 0, 0.15 * (i - 2)]]),
  [G.cyl(0.14, 0.12, 0.2, 8), '#c86a8a', [-1.15, 0.22, -0.65]],
]));
const domeRibs = () => cached('domeRibs', () => mergeParts([
  ...Array.from({ length: 4 }, (_, i) => [G.torus(1.7, 0.035, 5, 24, Math.PI), '#b9cbd8', [0, 0.14, 0], [0, (i / 4) * Math.PI, 0]]),
  [G.torus(1.2, 0.035, 5, 30), '#b9cbd8', [0, 1.3, 0], [Math.PI / 2, 0, 0]], [G.torus(0.62, 0.08, 6, 18, Math.PI), '#9fb3c4', [0, 0.14, 1.62]],
]));
export function GlassDome({ home, bot, selected, onSelect, asleep, inBed }) {
  const { layout } = useWorld(); const color = botColor(bot);
  const glass = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: '#c8f6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }); m.userData.baseOpacity = 0.2; return m; }, []);
  const ribs = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6 }), []);
  useCutaway(home, selected, [glass, ribs], 0.25, 9); const lantern = useLantern(asleep, '#6dffe0');
  const y = layout.groundY(home.x, home.z);
  return (<group position={[home.x, y, home.z]} rotation={[0, home.rot, 0]} onClick={(e) => { e.stopPropagation(); onSelect(bot.id); }}>
    <mesh geometry={domeBase()} material={MAT.vcGloss} castShadow receiveShadow />
    <mesh geometry={domeRibs()} material={ribs} castShadow />
    <mesh position={[0, 0.14, 0]} material={glass} renderOrder={2}><sphereGeometry args={[1.7, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <Bed kind="metal" color={color} inBed={inBed} position={[0, 0.12, -0.1]} />
    <mesh position={[1.05, 0.52, -0.85]}><sphereGeometry args={[0.14, 12, 10]} /><meshBasicMaterial ref={lantern} toneMapped={false} /></mesh>
    <mesh position={[0, 1.88, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
    <HomeSign bot={bot} color={color} position={[0, 0.4, 2.3]} />
  </group>);
}

// ---------- Antarctica decor ----------
export function IceFloes() {
  const { layout } = useWorld(); const g = useRef();
  const geo = useMemo(() => { const r = seeded(12); const P = []; const n = Math.round(layout.extent * 1.4);
    for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) { const a = r() * Math.PI * 2; const rr = layout.shoreR + 1.5 + Math.pow(r(), 0.8) * (layout.extent * 0.9 + 6); if (layout.bankR && rr > layout.bankR - 1.2) continue; const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (!isClear(layout, x, z, 1.2)) continue; if (Math.abs(angDiff(a, Math.PI / 4)) < 0.35 && rr < layout.extent + 4) continue; const s = 0.5 + r() * 1.7; const sides = 5 + Math.floor(r() * 3);
      P.push([G.cyl(s, s * 1.08, 0.3, sides), r() < 0.5 ? '#f4f9fc' : '#e3eff6', [x, -0.32, z], [0, r() * 6, 0], [1, 1, 0.6 + r() * 0.5]]); i++;
      if (r() < 0.2) P.push([G.oct(s * 0.5), '#cfe8f5', [x, 0, z], [0, r() * 6, 0], [1, 0.8 + r(), 1]]); }
    return P.length ? mergeParts(P) : null; }, [layout]);
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.04; });
  return geo ? <mesh ref={g} geometry={geo} material={MAT.vcFlat} receiveShadow castShadow /> : null;
}
const pengGeo = () => cached('penguin', () => mergeParts([
  [G.sph(0.22, 12, 10), '#1d232c', [0, 0.3, 0], [0, 0, 0], [1, 1.45, 0.95]], [G.sph(0.17, 12, 10), '#f4f4f0', [0, 0.27, 0.07], [0, 0, 0], [1, 1.35, 0.8]],
  [G.sph(0.14, 10, 8), '#1d232c', [0, 0.62, 0]], [G.cone(0.04, 0.12, 6), '#f39c12', [0, 0.6, 0.15], [Math.PI / 2, 0, 0]],
  [G.sph(0.03, 6, 5), '#ffffff', [0.06, 0.66, 0.1]], [G.sph(0.03, 6, 5), '#ffffff', [-0.06, 0.66, 0.1]],
  [G.box(0.05, 0.22, 0.12), '#1d232c', [0.21, 0.32, 0], [0, 0, 0.3]], [G.box(0.05, 0.22, 0.12), '#1d232c', [-0.21, 0.32, 0], [0, 0, -0.3]],
  [G.box(0.09, 0.03, 0.14), '#f39c12', [0.07, 0.015, 0.04]], [G.box(0.09, 0.03, 0.14), '#f39c12', [-0.07, 0.015, 0.04]],
]));
export function Penguins() {
  const { layout } = useWorld(); const refs = useRef([]);
  const list = useMemo(() => { const r = seeded(4); const docks = layout.zones.waiting.instances.map((d) => d.angle); const out = []; const n = Math.round(5 + layout.R / 3);
    for (let i = 0, t = 0; out.length < n && t < 200; t++, i++) { const a = r() * Math.PI * 2; if (docks.some((d) => Math.abs(angDiff(a, d)) < 0.35)) continue; out.push({ a, amp: (0.8 + r() * 1.6) / layout.R, sp: 0.15 + r() * 0.2, ph: r() * 6, rr: layout.R + 0.5 + r() * 0.8 }); }
    return out; }, [layout]);
  useFrame(({ clock }) => { const t = clock.elapsedTime;
    list.forEach((p, i) => { const g = refs.current[i]; if (!g) return; const s = Math.sin(t * p.sp + p.ph); const a = p.a + p.amp * s; const x = Math.cos(a) * p.rr, z = Math.sin(a) * p.rr;
      const dir = Math.cos(t * p.sp + p.ph) >= 0 ? 1 : -1; g.position.set(x, layout.groundY(x, z) + Math.abs(Math.sin(t * 7 + i)) * 0.03, z);
      g.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), Math.sin(t * 7 + i) * 0.14); }); });
  return <group>{list.map((p, i) => <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={pengGeo()} material={MAT.vc} castShadow />)}</group>;
}
const AUR_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const AUR_F = `uniform float uTime, uOp, uSeed; varying vec2 vUv;
void main(){ float x = vUv.x*6. + uSeed; float wave = sin(x*1.3 + uTime*0.25)*0.5 + sin(x*3.1 - uTime*0.4)*0.25;
  float band = smoothstep(0., 0.25, vUv.y) * (1. - smoothstep(0.35, 1., vUv.y)); float rays = 0.6 + 0.4*sin(vUv.x*140. + uTime*1.5 + wave*6.);
  float edge = smoothstep(0., 0.08, vUv.x)*smoothstep(1., 0.92, vUv.x);
  vec3 c = mix(vec3(0.15,1.,0.55), vec3(0.6,0.3,1.), smoothstep(0.3, 1., vUv.y + wave*0.2));
  gl_FragColor = vec4(c*1.6, band*rays*edge*uOp*(0.7+0.3*wave)); }`;
export function Aurora() {
  const { layout, env } = useWorld(); const E = layout.extent;
  const mats = useMemo(() => [0, 1, 2].map((i) => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOp: { value: 0 }, uSeed: { value: i * 3.7 } }, vertexShader: AUR_V, fragmentShader: AUR_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })), []);
  const geos = useMemo(() => [0, 1, 2].map((i) => { const D = E * (2.1 + i * 0.3); const g = new THREE.PlaneGeometry(1, 1, 80, 1); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const u = p.getX(k) + 0.5, v = p.getY(k) + 0.5; const a = BACK + (u - 0.5) * (1.7 - i * 0.2) + i * 0.25; const rr = D + Math.sin(u * 9 + i) * E * 0.12;
      p.setXYZ(k, Math.cos(a) * rr, E * (0.03 + i * 0.04) + v * E * (0.36 + i * 0.06), Math.sin(a) * rr); }
    g.computeBoundingSphere(); return g; }), [E]);
  useFrame(({ clock }) => { const n = THREE.MathUtils.smoothstep(night(env), 0.45, 0.85) * (1 - (env.current?.gray ?? 0) * 0.85); mats.forEach((m) => { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uOp.value = n; }); });
  return <group>{geos.map((g, i) => <mesh key={i} geometry={g} material={mats[i]} frustumCulled={false} renderOrder={-1} />)}</group>;
}

// ---------- Atlantis decor ----------
const fishGeo = () => cached('fish', () => mergeParts([[G.sph(0.16, 10, 8), '#ffffff', [0, 0, 0], [0, 0, 0], [0.55, 0.8, 1.4]], [G.cone(0.13, 0.22, 4), '#ffffff', [0, 0, -0.3], [-Math.PI / 2, 0, 0], [0.3, 1, 1]]]));
export function FishSchools() {
  const { layout } = useWorld(); const refs = useRef([]); const E = layout.extent;
  const schools = useMemo(() => { const r = seeded(9); return Array.from({ length: Math.round(3 + E / 12) }, (_, i) => ({ r: layout.R * (0.5 + r() * 0.7), h: 2.6 + r() * 3, sp: (0.06 + r() * 0.08) * (r() < 0.5 ? 1 : -1), ph: r() * 6, n: 10 + Math.floor(r() * 8), color: ['#ffb347', '#ffd93d', '#7fd8ff', '#ff6f91', '#c3a5ff'][i % 5],
    off: Array.from({ length: 20 }, () => [(r() - 0.5) * 2.2, (r() - 0.5) * 1.0, (r() - 0.5) * 2.2, r() * 6]) })); }, [layout]);
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime;
    schools.forEach((s, i) => { const im = refs.current[i]; if (!im) return; const a = s.ph + t * s.sp; const cx = Math.cos(a) * s.r, cz = Math.sin(a) * s.r; const heading = Math.atan2(-Math.sin(a) * Math.sign(s.sp), Math.cos(a) * Math.sign(s.sp));
      for (let k = 0; k < s.n; k++) { const o = s.off[k]; m.position.set(cx + o[0] + Math.sin(t * 1.3 + o[3]) * 0.2, s.h + o[1] + Math.sin(t * 2 + o[3]) * 0.1, cz + o[2]); m.rotation.set(0, heading + Math.sin(t * 6 + o[3]) * 0.15, 0); m.updateMatrix(); im.setMatrixAt(k, m.matrix); }
      im.instanceMatrix.needsUpdate = true; }); });
  return <group>{schools.map((s, i) => <instancedMesh key={i} ref={(el) => (refs.current[i] = el)} args={[fishGeo(), null, s.n]} frustumCulled={false}><meshStandardMaterial color={s.color} roughness={0.4} metalness={0.2} /></instancedMesh>)}</group>;
}
const RAY_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RAY_F = `uniform float uOp, uTime, uSeed; varying vec2 vUv; void main(){ float a = smoothstep(0., 0.6, vUv.y) * (0.6 + 0.4*sin(vUv.x*12.566 + uTime*0.3 + uSeed)); gl_FragColor = vec4(vec3(0.75,1.,1.), a*uOp); }`;
export function GodRays() {
  const { layout, env } = useWorld(); const E = layout.extent;
  const rays = useMemo(() => { const r = seeded(14); return Array.from({ length: 9 }, () => ({ x: (r() - 0.5) * E * 1.4, z: (r() - 0.5) * E * 1.4, w: 2 + r() * 4, ph: r() * 6 })); }, [E]);
  const mats = useMemo(() => rays.map((q) => new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uSeed: { value: q.ph } }, vertexShader: RAY_V, fragmentShader: RAY_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), [rays]);
  useFrame(({ clock }) => { const d = env.current?.day ?? 1; const g = env.current?.gray ?? 0; mats.forEach((m, i) => { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uOp.value = 0.09 * d * (1 - g * 0.8) * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.3 + rays[i].ph)); }); });
  return <group>{rays.map((q, i) => <mesh key={i} material={mats[i]} position={[q.x, 15, q.z]} rotation={[0.18, 0, 0.28]}><cylinderGeometry args={[q.w * 0.6, q.w, 34, 16, 1, true]} /></mesh>)}</group>;
}
const PL_V = `attribute float aSeed; uniform float uTime, uSpeed, uSize; varying float vA;
void main(){ vec3 p = position; float t = uTime*uSpeed + aSeed*20.; p.x += sin(t*0.5 + aSeed*7.)*1.2 + uTime*uSpeed*0.6; p.y += sin(t*0.7+aSeed*3.)*0.6; p.z += cos(t*0.4+aSeed*5.)*1.2;
  p.x = mod(p.x + 60., 120.) - 60.; vA = 0.4 + 0.6*sin(uTime*2. + aSeed*30.);
  vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(30./-mv.z); }`;
const PL_F = `uniform vec3 uColor; uniform float uOp; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = clamp((1.0 - smoothstep(0.0, 0.5, d)) * vA * uOp, 0.0, 1.0); if (a <= 0.0) discard; gl_FragColor = vec4(max(uColor, vec3(0.0)), a); }`;
export function Plankton() {
  const { layout, env } = useWorld(); const E = layout.extent; const count = 700;
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3); const s = new Float32Array(count); const r = seeded(3);
    for (let i = 0; i < count; i++) { p.set([(r() - 0.5) * E * 2, 0.5 + r() * 10, (r() - 0.5) * E * 2], i * 3); s[i] = r(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); return g; }, [E]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSpeed: { value: 0.3 }, uSize: { value: 2.5 }, uOp: { value: 0.3 }, uColor: { value: new THREE.Color('#8fffd8').multiplyScalar(2) } }, vertexShader: PL_V, fragmentShader: PL_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useFrame(({ clock }) => { const e = env.current || {}; mat.uniforms.uTime.value = clock.elapsedTime; mat.uniforms.uSpeed.value = 0.3 + (e.current ?? 0) * 1.4;
    mat.uniforms.uOp.value = (0.18 + (e.plankton ?? 0) * 0.8) * (0.6 + 0.6 * night(env)); mat.uniforms.uSize.value = 2.5 + (e.plankton ?? 0) * 2; });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export { Waterfall } from './Waterfall.jsx'; // the jungle waterfall lives in its own module
