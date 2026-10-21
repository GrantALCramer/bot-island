import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seeded } from '../util.js';
import { isClear } from './layout.js';
import { useWorld, dens } from './env.js';

// ---------- geometry helpers ----------
const strip = (g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
const tint = (g, color) => { const c = new THREE.Color(color); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const merge = (list) => { const g = mergeGeometries(list, false); g.computeBoundingSphere(); return g; };

export function frondGeometry(L = 1.9, W = 0.34, droop = 0.9) {
  const n = 10; const pos = []; const idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const x = t * L; const y = 0.35 * t * L * 0.5 - droop * t * t * L * 0.5; const w = W * Math.pow(Math.sin(Math.PI * Math.min(t * 1.15, 1)), 0.6) * (1 - 0.35 * t);
    pos.push(x, y - w * 0.25, -w, x, y + 0.04, 0, x, y - w * 0.25, w);
  }
  for (let i = 0; i < n; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

// ---------- palm ----------
export function makePalm(rand, height = 3.6, leanX = 0.6, leanZ = 0) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(leanX * 0.15, height * 0.55, leanZ * 0.15), new THREE.Vector3(leanX, height, leanZ));
  const segs = []; const N = 9;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N; const p0 = curve.getPoint(t0), p1 = curve.getPoint(t1);
    const len = p0.distanceTo(p1); const r0 = 0.2 - 0.075 * t0, r1 = 0.2 - 0.075 * t1;
    const g = new THREE.CylinderGeometry(r1 * 0.92, r0, len * 1.04, 8, 1); g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); g.applyQuaternion(q); g.translate(p0.x, p0.y, p0.z);
    segs.push(tint(strip(g), i % 2 ? '#8d6a45' : '#7a5a3a'));
  }
  const trunk = merge(segs);
  const fronds = []; const nf = 8;
  for (let i = 0; i < nf; i++) {
    const g = frondGeometry(1.7 + rand() * 0.5, 0.32, 0.8 + rand() * 0.5);
    g.rotateZ(0.25 + rand() * 0.25); g.rotateY((i / nf) * Math.PI * 2 + rand() * 0.3);
    fronds.push(tint(strip(g), i % 2 ? '#3f9a3a' : '#4fb043'));
  }
  for (let i = 0; i < 3; i++) { const g = new THREE.SphereGeometry(0.11, 8, 6); const a = i * 2.1; g.translate(Math.cos(a) * 0.16, -0.12, Math.sin(a) * 0.16); fronds.push(tint(strip(g), '#5a3d22')); }
  return { trunk, crown: merge(fronds), top: curve.getPoint(1) };
}

const vcMat = (opts = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, ...opts });
const palmMats = { trunk: vcMat({ side: THREE.FrontSide }), crown: vcMat({ roughness: 0.7 }) };

export function Palm({ x, z, y = 0, height = 3.6, lean = [0.6, 0], seed = 1 }) {
  const { env } = useWorld(); const crown = useRef();
  const p = useMemo(() => makePalm(seeded(seed * 7919 + 13), height, lean[0], lean[1]), [height, lean[0], lean[1], seed]);
  useFrame(({ clock }) => {
    if (!crown.current) return; const w = env.current?.wind ?? 0.2; const t = clock.elapsedTime + seed;
    crown.current.rotation.z = Math.sin(t * (0.9 + w * 0.8)) * (0.03 + 0.07 * w); crown.current.rotation.x = Math.cos(t * 0.7 + 1) * (0.02 + 0.05 * w);
  });
  return (<group position={[x, y, z]}>
    <mesh geometry={p.trunk} material={palmMats.trunk} castShadow receiveShadow />
    <group ref={crown} position={[p.top.x, p.top.y, p.top.z]}><mesh geometry={p.crown} material={palmMats.crown} castShadow /></group>
  </group>);
}

// Poisson-ish scatter on clear ground
export function scatter(layout, rand, n, rMin, rMax, minD, existing = [], margin = 0, accept = () => true) {
  n = dens(n, 0.55);
  const out = []; let tries = 0;
  while (out.length < n && tries++ < n * 80) {
    const a = rand() * Math.PI * 2; const r = rMin + Math.sqrt(rand()) * (rMax - rMin); const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!isClear(layout, x, z, margin) || !accept(x, z, a, r)) continue;
    if ([...out, ...existing].some((p) => Math.hypot(p[0] - x, p[1] - z) < minD)) continue;
    out.push([x, z, a, r]);
  }
  return out;
}

// keep tall palms off the camera-facing half of the island so they don't hide the action
const camSide = (a, w = 1.2) => { const d = Math.abs(((a - Math.PI / 4 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return d < w; };

export function PalmGrove() {
  const { layout } = useWorld(); const R = layout.R;
  const palms = useMemo(() => {
    const rand = seeded(42);
    const ring = scatter(layout, rand, Math.round(R * 1.5), R - 2.8, R + 1.1, 2.3, [], 0.2, (x, z, a, r) => !camSide(a, r > R - 0.6 ? 0.7 : 1.15));
    const inner = scatter(layout, rand, Math.round(R * 0.4), layout.plazaFoot + 1, R - 3.2, 2.8, ring, 0.3, (x, z, a) => !camSide(a, 1.5));
    return [...ring, ...inner].map(([x, z, a, r], i) => ({ x, z, h: 3.0 + rand() * 1.6, lean: [Math.cos(a) * (0.4 + rand() * 0.8) * (r > R - 3 ? 1 : 0.4), Math.sin(a) * (0.4 + rand() * 0.8) * (r > R - 3 ? 1 : 0.4)], seed: i + 1 }));
  }, [layout]);
  return <group>{palms.map((p, i) => <Palm key={i} x={p.x} z={p.z} y={layout.groundY(p.x, p.z) - 0.05} height={p.h} lean={p.lean} seed={p.seed} />)}</group>;
}

// Bushes with broad leaves + flowers, beach rocks and shells, merged into a few draw calls.
function Plants({ jungle = false }) {
  const { layout, theme } = useWorld(); const R = layout.R;
  const g = useMemo(() => {
    const rand = seeded(jungle ? 17 : 7); const leaves = []; const flowers = []; const rocks = []; const shells = [];
    const spots = scatter(layout, rand, Math.round(R * (jungle ? 4.5 : 2.6)), layout.plazaFoot - 0.2, R - 0.2, jungle ? 1.0 : 1.3, [], 0.0);
    const greens = jungle ? ['#1f6b2f', '#2d8a3e', '#185a28', '#3a9a3a'] : ['#2f8f45', '#3aa356', '#1f7a3e', '#4cae4f'];
    spots.forEach(([x, z]) => {
      const y = layout.groundY(x, z); const nL = 5 + Math.floor(rand() * 4); const s = (jungle ? 0.5 : 0.35) + rand() * 0.3;
      for (let i = 0; i < nL; i++) { const f = frondGeometry(1.0, jungle ? 0.36 : 0.28, -0.2 + rand() * 0.5); f.rotateZ(0.7 + rand() * 0.6); f.rotateY(rand() * Math.PI * 2); f.scale(s, s, s); f.translate(x, y, z); leaves.push(tint(strip(f), greens[Math.floor(rand() * 4)])); }
      if (rand() < (jungle ? 0.3 : 0.6)) { const col = (jungle ? ['#ff3d6e', '#ffb02e', '#c23dff', '#ff6b3d'] : ['#ff4f6d', '#ff8a3d', '#ffd23f', '#f472b6'])[Math.floor(rand() * 4)]; for (let k = 0; k < 3; k++) { const fl = new THREE.SphereGeometry(0.09, 8, 6); fl.scale(1, 0.55, 1); fl.translate(x + (rand() - 0.5) * 0.6, y + 0.35 + rand() * 0.15, z + (rand() - 0.5) * 0.6); flowers.push(tint(strip(fl), col)); } }
    });
    const rr = seeded(99);
    for (let i = 0; i < Math.round(R * 1.4); i++) { const a = rr() * Math.PI * 2; const r = R + 1.0 + rr() * 3.4; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!isClear(layout, x, z, -0.4)) continue;
      const s = 0.3 + rr() * 0.55; const ge = new THREE.DodecahedronGeometry(s, 0); ge.scale(1.3, 0.7, 1); ge.rotateY(rr() * 3); ge.translate(x, layout.groundY(x, z) + s * 0.25, z); rocks.push(tint(strip(ge), rr() < 0.5 ? theme.terrain.colors.rock : '#a0a3a8')); }
    if (!jungle) for (let i = 0; i < Math.round(R * 2.2); i++) { const a = rr() * Math.PI * 2; const r = R + 0.2 + rr() * 2.0; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!isClear(layout, x, z, -0.6)) continue;
      const sh = rr() < 0.5 ? new THREE.ConeGeometry(0.07, 0.16, 7) : new THREE.SphereGeometry(0.08, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
      if (sh.type === 'ConeGeometry') sh.rotateZ(Math.PI / 2); sh.rotateY(rr() * 6); sh.translate(x, layout.groundY(x, z) + 0.03, z); shells.push(tint(strip(sh), ['#ffd1dc', '#fff1e0', '#f7b9a0', '#e8d5ff'][i % 4])); }
    return { leaves: leaves.length && merge(leaves), flowers: flowers.length && merge(flowers), rocks: rocks.length && merge(rocks), shells: shells.length && merge(shells) };
  }, [layout, theme]);
  return (<group>
    {g.leaves && <mesh geometry={g.leaves} material={palmMats.crown} castShadow receiveShadow />}
    {g.flowers && <mesh geometry={g.flowers}><meshStandardMaterial vertexColors roughness={0.5} /></mesh>}
    {g.rocks && <mesh geometry={g.rocks} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.9} flatShading /></mesh>}
    {g.shells && <mesh geometry={g.shells}><meshStandardMaterial vertexColors roughness={0.4} /></mesh>}
  </group>);
}
export const TropicalPlants = () => <Plants />;
export const Ferns = () => <Plants jungle />;

// ---------- merged scatter helper (counts/ranges are functions of the layout so they scale with R) ----------
function MergedScatter({ seed, n, band, minD, build, matProps, accept, material, margin = 0 }) {
  const { layout } = useWorld();
  const geo = useMemo(() => { const rand = seeded(seed); const parts = []; const [r0, r1] = band(layout);
    scatter(layout, rand, Math.round(n(layout)), r0, r1, minD, [], margin, accept ? (x, z, a, r) => accept(x, z, a, r, layout) : undefined).forEach(([x, z, a, r]) => build(parts, x, layout.groundY(x, z), z, rand, a, r, layout));
    return parts.length ? merge(parts) : null; }, [layout]);
  if (!geo) return null;
  return material ? <mesh geometry={geo} material={material} castShadow receiveShadow /> : <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial vertexColors {...matProps} /></mesh>;
}
export const IceSpikes = () => <MergedScatter seed={3} n={(L) => L.R * 1.3} band={(L) => [L.plazaFoot + 0.8, L.R + 1.2]} minD={1.8} matProps={{ roughness: 0.2, metalness: 0.1, flatShading: true }}
  build={(p, x, y, z, r) => { for (let k = 0; k < 3; k++) { const h = 0.6 + r() * 1.3; const g = new THREE.ConeGeometry(0.22 + r() * 0.2, h, 5); g.rotateZ((r() - 0.5) * 0.4); g.translate(x + (r() - 0.5) * 0.7, y + h / 2, z + (r() - 0.5) * 0.7); p.push(tint(strip(g), r() < 0.5 ? '#bfe6ff' : '#e8f6ff')); } }} />;
export const SnowPines = () => <MergedScatter seed={11} n={(L) => L.R * 1.1} band={(L) => [L.R * 0.45, L.R + 0.6]} minD={2.2} margin={0.2} accept={(x, z, a, r, L) => !camSide(a, r > L.R * 0.8 ? 0.8 : 1.3)} matProps={{ roughness: 0.85, flatShading: true }}
  build={(p, x, y, z, r) => { const h = 2.2 + r() * 1.6; const t = new THREE.CylinderGeometry(0.1, 0.16, h * 0.4, 6); t.translate(x, y + h * 0.2, z); p.push(tint(strip(t), '#5b4630'));
    for (let k = 0; k < 3; k++) { const rr = (0.95 - k * 0.25) * (h / 3); const c = new THREE.ConeGeometry(rr, h * 0.42, 7); c.translate(x, y + h * 0.3 + k * h * 0.22 + h * 0.21, z); p.push(tint(strip(c), '#2f5d4a'));
      const s = new THREE.ConeGeometry(rr * 0.82, h * 0.18, 7); s.translate(x, y + h * 0.3 + k * h * 0.22 + h * 0.36, z); p.push(tint(strip(s), '#f4f9fc')); } }} />;
export const CoralGarden = () => <MergedScatter seed={5} n={(L) => L.R * 2.4} band={(L) => [L.plazaFoot + 0.3, L.R + 3]} minD={1.4} matProps={{ roughness: 0.6, flatShading: true }}
  build={(p, x, y, z, r) => { const c = ['#ff6f91', '#ffb347', '#c38fff', '#5ee0c6', '#ff8f6b'][Math.floor(r() * 5)];
    if (r() < 0.35) { const b = new THREE.SphereGeometry(0.35 + r() * 0.25, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2); b.scale(1, 0.7, 1); b.translate(x, y, z); p.push(tint(strip(b), c)); return; }
    const branch = (bx, by, bz, ang, len, depth) => { const g = new THREE.CylinderGeometry(0.035 * depth, 0.05 * depth, len, 5); g.translate(0, len / 2, 0); g.rotateZ(ang); g.rotateY(r() * 6.28); g.translate(bx, by, bz); p.push(tint(strip(g), c));
      const tx = bx - Math.sin(ang) * len * 0.7, ty = by + Math.cos(ang) * len; if (depth > 1) for (let k = 0; k < 2; k++) branch(tx, ty, bz, ang + (k ? 0.6 : -0.6), len * 0.7, depth - 1); };
    for (let k = 0; k < 3; k++) branch(x + (r() - 0.5) * 0.4, y, z + (r() - 0.5) * 0.4, (r() - 0.5) * 0.8, 0.35 + r() * 0.2, 3); }} />;
export const SeaRocks = () => <MergedScatter seed={21} n={(L) => L.R * 1.2} band={(L) => [L.R - 1, L.R + 9]} minD={1.6} matProps={{ roughness: 0.9, flatShading: true }}
  build={(p, x, y, z, r) => { if (r() < 0.3) { const h = 1.2 + r() * 1.4; const c = new THREE.CylinderGeometry(0.22, 0.26, h, 10); c.rotateZ(Math.PI / 2 - 0.15); c.rotateY(r() * 6); c.translate(x, y + 0.25, z); p.push(tint(strip(c), '#d8d0b4')); return; }
    const s = 0.4 + r() * 0.8; const g = new THREE.DodecahedronGeometry(s, 0); g.scale(1.3, 0.7, 1); g.rotateY(r() * 3); g.translate(x, y + s * 0.2, z); p.push(tint(strip(g), r() < 0.5 ? '#5c6b78' : '#6f6a5c')); }} />;
// jungle trees: buttress roots, layered canopy, hanging vines
export const JungleCanopy = () => <MergedScatter seed={8} n={(L) => L.R * 1.25} band={(L) => [L.R * 0.5, L.R + 1.0]} minD={2.6} margin={0.3} accept={(x, z, a, r, L) => !camSide(a, r > L.R * 0.8 ? 0.75 : 1.3)} matProps={{ roughness: 0.9, flatShading: true }}
  build={(p, x, y, z, r) => { const h = 3.6 + r() * 3; const t = new THREE.CylinderGeometry(0.2, 0.36, h, 7); t.translate(x, y + h / 2, z); p.push(tint(strip(t), '#5b4630'));
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + r(); const b = new THREE.BoxGeometry(0.08, 0.7, 0.6); b.translate(0, 0.35, 0.35); b.rotateY(a); b.translate(x, y, z); p.push(tint(strip(b), '#4f3c28')); }
    for (let k = 0; k < 5; k++) { const s = 1.0 + r() * 0.9; const g = new THREE.IcosahedronGeometry(s, 0); g.scale(1, 0.7, 1); g.translate(x + (r() - 0.5) * 1.8, y + h + (r() - 0.3) * 1.0, z + (r() - 0.5) * 1.8); p.push(tint(strip(g), ['#1f6b2f', '#2d8a3e', '#185a28', '#3a8a30'][k % 4])); }
    for (let k = 0; k < 3; k++) { const l = 1.2 + r() * 1.6; const v = new THREE.CylinderGeometry(0.02, 0.02, l, 4); v.translate(x + (r() - 0.5) * 1.6, y + h - l / 2 + 0.2, z + (r() - 0.5) * 1.6); p.push(tint(strip(v), '#3f7a2c')); } }} />;

// ---------- kelp forest: one merged mesh, swaying in a vertex shader ----------
export const swayUniforms = { uTime: { value: 0 }, uAmp: { value: 1 } };
const kelpMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
kelpMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = swayUniforms.uTime; sh.uniforms.uAmp = swayUniforms.uAmp;
  sh.vertexShader = 'uniform float uTime; uniform float uAmp; attribute float aH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  float hk = aH; float ph = transformed.x * 0.7 + transformed.z * 0.5;
  transformed.x += sin(uTime * 1.1 + ph + hk * 0.5) * 0.06 * hk * uAmp; transformed.z += cos(uTime * 0.9 + ph + hk * 0.4) * 0.05 * hk * uAmp;`); };
export function Kelp() {
  const { layout, env } = useWorld();
  useFrame(({ clock }) => { swayUniforms.uTime.value = clock.elapsedTime; swayUniforms.uAmp.value = 1 + (env.current?.current ?? 0) * 1.6; });
  const geo = useMemo(() => { const rand = seeded(31); const parts = []; const R = layout.R;
    scatter(layout, rand, Math.round(R * 0.9), R - 1.5, R + 7, 2.2, [], 0.3, (x, z, a, r) => !camSide(a, r < R + 2 ? 0.9 : 0.5)).forEach(([x, z]) => {
      const n = 4 + Math.floor(rand() * 4); const y0 = layout.groundY(x, z);
      for (let k = 0; k < n; k++) { const h = 2.5 + rand() * 4; const bx = x + (rand() - 0.5) * 1.2, bz = z + (rand() - 0.5) * 1.2; const g = new THREE.PlaneGeometry(0.28, h, 1, 10); g.translate(0, h / 2, 0); g.rotateY(rand() * Math.PI); g.translate(bx, y0, bz); const sg = tint(strip(g), ['#2f7a4a', '#3f9a5a', '#5a8a2a', '#2a6a52'][k % 4]); const P = sg.attributes.position; const ah = new Float32Array(P.count); for (let i = 0; i < P.count; i++) ah[i] = P.getY(i) - y0; sg.setAttribute('aH', new THREE.BufferAttribute(ah, 1)); parts.push(sg); }
    }); return parts.length ? merge(parts) : null; }, [layout]);
  return geo ? <mesh geometry={geo} material={kelpMat} castShadow /> : null;
}
