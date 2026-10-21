// Distant scatter for the "land" surroundings: hills/craters come from the terrain (surround.js); this adds
// low-poly props on the plain so it doesn't look empty. One merged mesh per theme; kinds are listed in
// theme.surround.land.scatter as [kind, count]. Props stay out of the camera's foreground.
import { useMemo } from 'react';
import * as THREE from 'three';
import { useWorld, dens } from './env.js';
import { mergeParts, G, MAT } from './parts.js';
import { angDiff } from './layout.js';
import { seeded } from '../util.js';

const CAM_AZ = Math.PI / 4;
const pick = (r, a) => a[Math.floor(r() * a.length)];
// builders push [geometry, color, pos, rot, scale] parts; (x, y, z) is the ground point, s a size factor
export const SCATTER = {
  palms(P, x, y, z, s, r) { const h = 3.5 * s; const lx = (r() - 0.5) * 1.2 * s, lz = (r() - 0.5) * 1.2 * s;
    for (let k = 0; k < 3; k++) P.push([G.cyl(0.12 * s, 0.17 * s, h / 3 + 0.05, 6), '#8d6a45', [x + lx * (k + 0.5) / 3, y + h * (k + 0.5) / 3, z + lz * (k + 0.5) / 3], [lz * 0.15, 0, -lx * 0.15]]);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r(); P.push([G.cone(0.32 * s, 1.9 * s, 4), k % 2 ? '#3f9a3a' : '#4fb043', [x + lx + Math.cos(a) * 0.8 * s, y + h - 0.15 * s, z + lz + Math.sin(a) * 0.8 * s], [0, -a, Math.PI / 2 + 0.35], [1, 1, 0.35]]); } },
  dunegrass(P, x, y, z, s, r) { for (let k = 0; k < 4; k++) P.push([G.cone(0.08 * s, 0.6 * s, 4), pick(r, ['#b9b26a', '#9fa65a', '#c8bb7a']), [x + (r() - 0.5) * 0.6 * s, y + 0.25 * s, z + (r() - 0.5) * 0.6 * s], [(r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5]]); },
  rocks(P, x, y, z, s, r, th) { const k = 0.5 + r() * 1.4; P.push([G.dodec(k * s), r() < 0.5 ? th.terrain.colors.rock : '#9a9ca0', [x, y + k * s * 0.25, z], [r(), r() * 6, 0], [1.3, 0.7, 1]]); },
  boulders(P, x, y, z, s, r) { const k = 0.8 + r() * 2.4; P.push([G.dodec(k * s), pick(r, ['#8c8c8c', '#7a7a7a', '#a3a3a3']), [x, y + k * s * 0.2, z], [r(), r() * 6, r()], [1.2, 0.6 + r() * 0.3, 1]]); },
  bushes(P, x, y, z, s, r) { for (let k = 0; k < 3; k++) P.push([G.ico(0.5 * s + r() * 0.4 * s, 0), pick(r, ['#2f8f45', '#3aa356', '#1f7a3e']), [x + (r() - 0.5) * s, y + 0.3 * s, z + (r() - 0.5) * s], [0, r() * 6, 0], [1, 0.7, 1]]); },
  pines(P, x, y, z, s, r) { const h = (2.6 + r() * 2) * s; P.push([G.cyl(0.1 * s, 0.16 * s, h * 0.4, 5), '#5b4630', [x, y + h * 0.2, z]]);
    for (let k = 0; k < 3; k++) { const rr = (0.95 - k * 0.25) * (h / 3); P.push([G.cone(rr, h * 0.42, 7), '#2f5d4a', [x, y + h * 0.51 + k * h * 0.22, z]], [G.cone(rr * 0.8, h * 0.18, 7), '#f4f9fc', [x, y + h * 0.66 + k * h * 0.22, z]]); } },
  drifts(P, x, y, z, s, r) { const k = 1 + r() * 2.5; P.push([G.sph(k * s, 10, 6), pick(r, ['#f4f9fc', '#e6f0f7']), [x, y - k * s * 0.55, z], [0, r() * 6, 0], [1.6, 0.6, 1]]); },
  iceRocks(P, x, y, z, s, r) { const k = 0.6 + r() * 1.6; P.push([G.oct(k * s), pick(r, ['#bfe6ff', '#d9f0fb', '#a8d8f0']), [x, y + k * s * 0.4, z], [r(), r() * 6, 0], [0.8, 1.5, 0.8]]); },
  coral(P, x, y, z, s, r) { const c = pick(r, ['#ff6f91', '#ffb347', '#c38fff', '#5ee0c6', '#ff8f6b']);
    if (r() < 0.5) P.push([G.dome((0.5 + r() * 0.6) * s, 10, 5), c, [x, y, z], [0, 0, 0], [1, 0.7, 1]]);
    else for (let k = 0; k < 4; k++) P.push([G.cyl(0.07 * s, 0.1 * s, (0.6 + r()) * s, 5), c, [x + (r() - 0.5) * 0.6 * s, y + 0.4 * s, z + (r() - 0.5) * 0.6 * s], [(r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7]]); },
  kelp(P, x, y, z, s, r) { for (let k = 0; k < 4; k++) { const h = (2.5 + r() * 4) * s; P.push([G.box(0.25 * s, h, 0.06), pick(r, ['#2f7a4a', '#3f9a5a', '#2a6a52']), [x + (r() - 0.5) * 1.2, y + h / 2, z + (r() - 0.5) * 1.2], [0, r() * 3, (r() - 0.5) * 0.15]]); } },
  shells(P, x, y, z, s, r) { P.push([G.dome(0.5 * s, 8, 4), pick(r, ['#f2b5c8', '#c9a5d8', '#fff1e0']), [x, y, z], [0, r() * 6, 0], [1, 0.45, 1]]); },
  jungleTrees(P, x, y, z, s, r) { const h = (4 + r() * 4) * s; P.push([G.cyl(0.25 * s, 0.4 * s, h, 6), '#5b4630', [x, y + h / 2, z]]);
    for (let k = 0; k < 4; k++) P.push([G.ico((1.2 + r()) * s, 0), pick(r, ['#1f6b2f', '#2d8a3e', '#185a28', '#3a8a30']), [x + (r() - 0.5) * 2 * s, y + h + (r() - 0.3) * s, z + (r() - 0.5) * 2 * s], [0, r() * 6, 0], [1, 0.7, 1]]); },
  // moon
  craterRims(P, x, y, z, s, r) { const k = (1.2 + r() * 2.5) * s; P.push([G.torus(k, k * 0.18, 4, 14), '#9a9a9a', [x, y + 0.02, z], [Math.PI / 2, 0, 0], [1, 1, 0.5]], [G.cyl(k * 0.95, k * 0.95, 0.03, 14), '#5f5f62', [x, y + 0.01, z]]); },
  // heaven
  cloudPuffs(P, x, y, z, s, r) { for (let k = 0; k < 4; k++) { const q = (0.9 + r() * 1.3) * s; P.push([G.sph(q, 14, 10), pick(r, ['#ffffff', '#fdf6ff', '#fff8ec']), [x + (r() - 0.5) * 2.4 * s, y + q * 0.35, z + (r() - 0.5) * 2.4 * s]]); } },
  ruins(P, x, y, z, s, r) { const n = 2 + Math.floor(r() * 3); const a0 = r() * 6;
    for (let k = 0; k < n; k++) { const a = a0 + k * 0.9; const h = (1.2 + r() * 2.4) * s; const px = x + Math.cos(a) * 1.4 * s, pz = z + Math.sin(a) * 1.4 * s; P.push([G.cyl(0.22 * s, 0.26 * s, h, 10), '#f4efe6', [px, y + h / 2, pz]], [G.box(0.6 * s, 0.14 * s, 0.6 * s), '#e9c46a', [px, y + h + 0.07 * s, pz]]); } },
  goldTrees(P, x, y, z, s, r) { const h = (2 + r() * 1.5) * s; P.push([G.cyl(0.08 * s, 0.14 * s, h, 5), '#efe6d6', [x, y + h / 2, z]]);
    for (let k = 0; k < 3; k++) P.push([G.ico((0.7 + r() * 0.5) * s, 0), pick(r, ['#ffd76a', '#ffc2d9', '#fff0b3']), [x + (r() - 0.5) * s, y + h + (r() - 0.3) * 0.6 * s, z + (r() - 0.5) * s], [0, r() * 6, 0], [1, 0.75, 1]]); },
  // hell
  spires(P, x, y, z, s, r) { const n = 1 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const h = (1.5 + r() * 4.5) * s; P.push([G.cyl(0.35 * s, 0.4 * s, h, 6), pick(r, ['#2a2426', '#1f1b1d', '#352c2c']), [x + (r() - 0.5) * 1.6 * s, y + h / 2 - 0.2, z + (r() - 0.5) * 1.6 * s], [0, r(), (r() - 0.5) * 0.2]]); } },
  deadTrees(P, x, y, z, s, r) { const h = (2 + r() * 2) * s; P.push([G.cyl(0.08 * s, 0.18 * s, h, 5), '#2b211d', [x, y + h / 2, z], [0, 0, (r() - 0.5) * 0.25]]);
    for (let k = 0; k < 3; k++) { const a = r() * 6; P.push([G.cyl(0.03 * s, 0.07 * s, h * 0.45, 4), '#2b211d', [x + Math.cos(a) * 0.35 * s, y + h * (0.6 + k * 0.12), z + Math.sin(a) * 0.35 * s], [Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9]]); } },
  // sakura
  cherryTrees(P, x, y, z, s, r) { const h = (2.4 + r() * 1.6) * s; P.push([G.cyl(0.12 * s, 0.2 * s, h, 5), '#4a3328', [x, y + h / 2, z]]);
    for (let k = 0; k < 4; k++) P.push([G.ico((0.8 + r() * 0.6) * s, 0), pick(r, ['#f7b6c8', '#f9c9d6', '#f29bb5', '#ffdbe5']), [x + (r() - 0.5) * 1.6 * s, y + h + (r() - 0.3) * 0.7 * s, z + (r() - 0.5) * 1.6 * s], [0, r() * 6, 0], [1.1, 0.75, 1.1]]); },
  greenPines(P, x, y, z, s, r) { const h = (2.4 + r() * 2) * s; P.push([G.cyl(0.1 * s, 0.16 * s, h * 0.5, 5), '#5b4630', [x, y + h * 0.25, z]]);
    for (let k = 0; k < 3; k++) P.push([G.cyl((1.0 - k * 0.25) * s, (1.2 - k * 0.25) * s, 0.35 * s, 7), pick(r, ['#2f5d3a', '#3a6a42', '#28523a']), [x + (r() - 0.5) * 0.5 * s, y + h * (0.55 + k * 0.17), z + (r() - 0.5) * 0.5 * s], [0, 0, 0], [1, 1, 0.8]]); },
  paddies(P, x, y, z, s, r) { const a = r() * 0.4; const w = (5 + r() * 3) * s, d = (3 + r() * 2) * s; const c = Math.cos(a), sn = Math.sin(a);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const ox = (i - 0.5) * (w + 0.4 * s), oz = (j - 0.5) * (d + 0.4 * s); const px = x + ox * c - oz * sn, pz = z + ox * sn + oz * c;
      P.push([G.box(w + 0.35 * s, 0.12, d + 0.35 * s), '#8a7a52', [px, y + 0.02, pz], [0, -a, 0]], [G.box(w, 0.04, d), (i + j) % 2 ? '#7fb3a8' : '#8ec2b0', [px, y + 0.08, pz], [0, -a, 0]]);
      for (let k = 0; k < 5; k++) { const oo = (k / 4 - 0.5) * d * 0.8; P.push([G.box(w * 0.9, 0.12, 0.12 * s), '#6fae4a', [px - oo * sn, y + 0.13, pz + oo * c], [0, -a, 0]]); } } },
  teaRows(P, x, y, z, s, r) { const a = r() * Math.PI; const c = Math.cos(a), sn = Math.sin(a); const L = (5 + r() * 4) * s;
    for (let k = 0; k < 5; k++) { const o = (k - 2) * 1.1 * s; P.push([G.cyl(0.5 * s, 0.5 * s, L, 8), pick(r, ['#3f7f3a', '#4a8f3f', '#3a7535']), [x - o * sn, y - 0.12 * s, z + o * c], [Math.PI / 2, -a + Math.PI / 2, 0, 'YXZ'], [1, 1, 0.8]]); } },
  // city
  towers(P, x, y, z, s, r) { const w = (3 + r() * 5) * s, h = (6 + r() * r() * 34) * s; P.push([G.box(w, h, w), pick(r, ['#7a8494', '#5a6470', '#9aa3ad', '#4a5260', '#b9bec6']), [x, y + h / 2, z], [0, r() * 3, 0]]); if (r() < 0.35) P.push([G.box(w * 0.6, h * 0.2, w * 0.6), '#6a7484', [x, y + h * 1.1, z]]); },
  // old west
  mesas(P, x, y, z, s, r) { const w = (6 + r() * 10) * s, h = (4 + r() * 8) * s; const c = pick(r, ['#b8643a', '#c47a48', '#a85a34']); P.push([G.cyl(w * 0.75, w, h, 7), c, [x, y + h / 2, z], [0, r() * 3, 0]], [G.cyl(w * 0.78, w * 0.76, h * 0.1, 7), '#d89a64', [x, y + h * 0.7, z], [0, r() * 3, 0]]); },
  deadtrees(P, x, y, z, s, r) { const h = (2 + r() * 3) * s; P.push([G.cyl(0.1 * h, 0.16 * h, h, 6), '#3e3430', [x, y + h / 2, z]]); for (let k = 0; k < 3; k++) { const a = r() * 6.28, L = h * 0.45; P.push([G.cyl(0.02 * h, 0.05 * h, L, 4), '#3e3430', [x + Math.cos(a) * L * 0.4, y + h * 0.75, z + Math.sin(a) * L * 0.4], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]]); } },
  tombs(P, x, y, z, s, r) { const c = pick(r, ['#8a8794', '#6a6774', '#a6a3ae']); if (r() < 0.5) P.push([G.box(0.5 * s, 0.7 * s, 0.14 * s), c, [x, y + 0.3 * s, z], [0, r() * 3, (r() - 0.5) * 0.2]]); else P.push([G.box(0.13 * s, 0.9 * s, 0.13 * s), c, [x, y + 0.42 * s, z]], [G.box(0.5 * s, 0.13 * s, 0.13 * s), c, [x, y + 0.62 * s, z]]); },
  saguaros(P, x, y, z, s, r) { const h = (2 + r() * 2) * s; P.push([G.cyl(0.2 * s, 0.24 * s, h, 7), '#4f7a3a', [x, y + h / 2, z]]); for (const k of [-1, 1]) if (r() < 0.8) { const ay = y + h * (0.35 + r() * 0.25); P.push([G.cyl(0.13 * s, 0.13 * s, 0.6 * s, 6), '#4f7a3a', [x + k * 0.35 * s, ay, z], [0, 0, Math.PI / 2]], [G.cyl(0.13 * s, 0.13 * s, 0.8 * s, 6), '#4f7a3a', [x + k * 0.62 * s, ay + 0.4 * s, z]]); } },
  // candy
  lollipops(P, x, y, z, s, r) { const h = (2 + r() * 2.5) * s; P.push([G.cyl(0.07 * s, 0.07 * s, h, 5), '#fffaf0', [x, y + h / 2, z]], [G.cyl(0.9 * s, 0.9 * s, 0.25 * s, 14), pick(r, ['#ff6fa8', '#7ad7ff', '#ffd23f', '#9b6bff', '#6fe08a']), [x, y + h + 0.6 * s, z], [Math.PI / 2, r() * 3, 0, 'YXZ']]); },
  gumdrops(P, x, y, z, s, r) { const k = (0.6 + r() * 1.2) * s; P.push([G.dome(k, 10, 5), pick(r, ['#ff4f7a', '#ffb13d', '#7ad75a', '#9b6bff', '#4fc3ff']), [x, y, z], [0, 0, 0], [1, 1.1, 1]]); },
  // glade
  shrooms(P, x, y, z, s, r) { const h = (1.5 + r() * 3.5) * s; const c = pick(r, ['#d8433a', '#e8a33a', '#c95ad8', '#4fb8d8']); P.push([G.cyl(0.2 * s, 0.3 * s, h, 7), '#efe6d2', [x, y + h / 2, z]], [G.dome((0.9 + r() * 0.9) * s * (h / 3), 12, 5), c, [x, y + h - 0.1, z], [0, 0, 0], [1, 0.7, 1]]); },
  // crystal cave
  crystals(P, x, y, z, s, r) { const c = pick(r, ['#7dfcff', '#c08cff', '#ff7ad8', '#7dff9a', '#ffd27d', '#7d9dff']); for (let k = 0; k < 3; k++) { const h = (1 + r() * 2.5) * s; P.push([G.oct(1), c, [x + (r() - 0.5) * s, y + h * 0.35, z + (r() - 0.5) * s], [(r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6], [h * 0.18, h / 2, h * 0.18]]); } },
  stalagmites(P, x, y, z, s, r) { const h = (1.5 + r() * 4) * s; P.push([G.cone(h * 0.2, h, 6), pick(r, ['#4a4258', '#5a5270', '#3e3650']), [x, y + h / 2, z]]); },
  ventCones(P, x, y, z, s, r) { const k = (0.6 + r()) * s; P.push([G.cone(k, k * 1.2, 7), '#2a2224', [x, y + k * 0.5, z]], [G.cyl(k * 0.28, k * 0.32, 0.05, 7), '#ff7a1a', [x, y + k * 1.05, z]]); },
};

const SOFT = new Set(['cloudPuffs']); // smooth-shaded kinds
export function LandScatter() {
  const { layout, theme } = useWorld(); const S = theme.surroundCfg || {};
  const geo = useMemo(() => {
    if (layout.surround !== 'land' || !S.scatter) return null;
    const r = seeded(123); const P = [], Ps = []; const E = layout.extent; const r0 = (layout.bankR ?? layout.edgeR) + 3.5; const r1 = r0 + Math.max(80, E * 4.5);
    for (const [kind, cnt, size = 1] of S.scatter) { const count = dens(cnt, 0.4); const B = SCATTER[kind]; if (!B) continue;
      for (let i = 0, t = 0; i < count && t < count * 10; t++) {
        const a = r() * Math.PI * 2; const rr = r0 + Math.pow(r(), 0.85) * (r1 - r0);
        if (Math.abs(angDiff(a, CAM_AZ)) < 0.75 && rr < E * 2.6) continue; // keep the camera foreground clear
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const s = size * (0.8 + r() * 0.5) * (1 + Math.max(0, rr - r0) / 140);
        B(SOFT.has(kind) ? Ps : P, x, layout.groundY(x, z), z, s, r, theme); i++;
      } }
    return [P.length ? mergeParts(P) : null, Ps.length ? mergeParts(Ps) : null];
  }, [layout, theme]);
  if (!geo) return null;
  return (<>{geo[0] && <mesh geometry={geo[0]} material={MAT.vcFlat} castShadow receiveShadow />}{geo[1] && <mesh geometry={geo[1]} material={MAT.vc} receiveShadow />}</>);
}
