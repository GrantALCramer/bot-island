// Geometry helpers: merge many static parts (each with its own color) into one vertex-colored mesh.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function tintGeo(g, color) { const c = new THREE.Color(color); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// parts: [geometry, color, pos?, rot?, scale?]
export function mergeParts(parts) {
  const list = parts.map(([g, c, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]]) => {
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    _m.compose(_p.set(...p), _q.setFromEuler(_e.set(r[0], r[1], r[2], r[3] || 'XYZ')), _s.set(...(Array.isArray(s) ? s : [s, s, s]))); g.applyMatrix4(_m);
    return tintGeo(g, c);
  });
  const g = mergeGeometries(list, false); g.computeBoundingSphere(); return g;
}
export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open),
  sph: (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs),
  dome: (r, ws = 14, hs = 6) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  dodec: (r) => new THREE.DodecahedronGeometry(r, 0),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
  torus: (r, t, rs = 6, ts = 24, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
};
export const MAT = {
  vc: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  vcFlat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }),
  vcGloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.3 }),
  vcDouble: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
};
const cache = new Map();
export const cached = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
