// Mt. Fuji for the sakura theme: a displaced polar-grid stratovolcano (concave radial profile, gullies, notched
// crater, slight asymmetry), a streaky snowcap, foothill ranges in front (far shore on Water, rolling into the hills
// on Land), and a low mist band. Aerial perspective is computed in the shader from true view distance and height and
// blended toward the live sky horizon color (pink/orange at sunset, dark at night with moonlit snow). The whole group
// is far away and follows the camera's horizontal position most of the way, so orbiting gives no parallax weirdness.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';

const BACK = Math.PI * 1.25;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// unit mountain: height 1, base radius ~3.3, centered at origin
function mountainGeo(land) {
  const RINGS = 70, SEG = 160, R0 = 3.3, RC = 0.16; const pos = [], col = [], idx = [];
  const rock = new THREE.Color('#58637f'), purple = new THREE.Color('#665b86'), dark = new THREE.Color('#414a63'), forest = new THREE.Color(land ? '#5f7d5c' : '#566e6a'), snow = new THREE.Color('#f4f6fb'), snowShade = new THREE.Color('#c9d3e6');
  const c = new THREE.Color();
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS; // 0 summit rim -> 1 base
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const asym = 1 + 0.09 * Math.cos(a - 0.6) + 0.04 * Math.cos(2 * a + 1.1); // longer slope on one side
      const r = (RC + (R0 - RC) * Math.pow(u, 1.0)) * asym;
      // concave profile: steep near the top, long sweeping foot
      let h = Math.pow(1 - u, 2.15);
      // gullies: radial ridges, strongest on the upper-middle slopes
      const gully = (Math.sin(a * 23 + fbm(a * 3, u * 4) * 7) * 0.55 + Math.sin(a * 37 + fbm(a * 2 + 5, 1) * 6) * 0.45);
      const gW = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) ;
      h += gully * 0.018 * gW + (fbm(a * 4, u * 6) - 0.5) * 0.04 * u * (1 - u);
      // notched crater rim: summit flat with a small dip on one side
      if (i === 0) h -= 0.012 + 0.02 * Math.exp(-((Math.atan2(Math.sin(a - 2.3), Math.cos(a - 2.3))) ** 2) / 0.08);
      const x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, h - 0.02, z);
      // colors: rock blue-grey <-> purple by noise, forested foot, streaky snow reaching down the gullies
      const n = fbm(a * 6 + 7, u * 9);
      c.copy(rock).lerp(purple, sstep(0.35, 0.7, n)).lerp(dark, Math.max(0, gully) * 0.25 * gW);
      c.lerp(forest, sstep(0.55, 0.92, u) * 0.8);
      const streak = Math.pow(fbm(a * 5 + 11, 0.5), 1.5) * 2.2; // some gullies hold long tongues of snow, others short
      const line = 0.19 + 0.15 * Math.max(0, -gully) * streak * sstep(0.05, 0.3, u) + (fbm(a * 9, 3.1) - 0.5) * 0.08 + (fbm(a * 17, u * 20) - 0.5) * 0.04; // ~top 45% of the height // snow reaches lower in gullies
      const sn = 1 - sstep(line - 0.035, line + 0.02, u);
      if (sn > 0) { const sc = snow.clone().lerp(snowShade, Math.max(0, gully) * 0.5 + (n - 0.5) * 0.3); c.lerp(sc, sn); }
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { const p = i * (SEG + 1) + j, q = p + SEG + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  // crater cap
  const top = pos.length / 3; pos.push(0, 1 - 0.05, 0); col.push(0.86, 0.89, 0.95);
  for (let j = 0; j < SEG; j++) idx.push(top, j + 1, j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// foothill range: a band of noisy ridges along an arc (local coords: x along the arc, z depth)
function rangeGeo(seed, len, depth, height, land, snowy = 0) {
  const NX = 140, NZ = 14; const pos = [], col = [], idx = [];
  const lo = new THREE.Color(land ? '#5c7a55' : '#4e6662'), hi = new THREE.Color(land ? '#6f7f78' : '#66708a'), sn = new THREE.Color('#e6ebf4'); const c = new THREE.Color();
  for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NX; j++) {
    const s = j / NX, t = i / NZ; const x = (s - 0.5) * len, z = (t - 0.5) * depth;
    const env = Math.sin(Math.PI * s) ** 0.6 * Math.sin(Math.PI * t) ** 0.8;
    const ridge = 1 - Math.abs(fbm(s * 7 + seed, t * 1.3 + seed * 0.3, 5) * 2 - 1);
    const y = height * env * (0.35 + 0.9 * ridge * ridge) - height * 0.06;
    pos.push(x, y, z);
    c.copy(lo).lerp(hi, sstep(0.2, 0.9, y / height)); if (snowy && y / height > 0.78 - fbm(s * 20, 1) * 0.15) c.lerp(sn, snowy);
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NX; j++) { const p = i * (NX + 1) + j, q = p + NX + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Lambert + vertex colors, but our own aerial perspective instead of scene fog
function farMaterial(u) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform vec3 uHaze; uniform float uDens, uLow, uBase, uTop; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <fog_fragment>', `
      float dist = length(vWp - cameraPosition);
      float hf = clamp((vWp.y - uBase) / (uTop - uBase), 0.0, 1.0);
      float haze = 1.0 - exp(-dist * uDens * (1.0 + uLow * pow(1.0 - hf, 2.0)));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, clamp(haze, 0.0, 0.97));`);
  };
  return m;
}

let mistTex = null;
const getMistTex = () => mistTex ||= (() => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 32, 2, 64, 32, 62); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.setTransform(1, 0, 0, 0.5, 0, 16); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();

export function Fuji() {
  const { layout, env } = useWorld(); const land = layout.surround === 'land';
  const D = layout.camDist * 6.2;            // far beyond the island, inside the camera far plane
  const H = D * 0.115;                       // reads as huge: ~6.5 deg above the horizon
  const az = BACK + 0.06;                    // behind the island, near the center of the default view (clear of both panels)
  const u = useMemo(() => ({ uHaze: { value: new THREE.Color('#dfe6f0') }, uDens: { value: 0.42 / D }, uLow: { value: 1.1 }, uBase: { value: -2 }, uTop: { value: H } }), [D, H]);
  const mat = useMemo(() => farMaterial(u), [u]);
  const mGeo = useMemo(() => mountainGeo(land), [land]);
  const ranges = useMemo(() => [
    // [geometry, distance factor, angle offset, rotation tweak]
    [rangeGeo(1.7, D * 1.5, D * 0.16, H * 0.24, land), 0.80, -0.05],
    [rangeGeo(4.2, D * 1.1, D * 0.14, H * 0.32, land, 0.5), 1.08, 0.42],
    [rangeGeo(8.9, D * 0.9, D * 0.12, H * 0.2, land), 0.66, -0.45],
  ], [D, H, land]);
  const mist = useMemo(() => { const r = []; let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9; i++) r.push({ dx: (rnd() - 0.5) * D * 0.9, dz: (rnd() - 0.5) * D * 0.25 - D * 0.05, y: H * (0.12 + rnd() * 0.16), w: D * (0.22 + rnd() * 0.25), h: H * (0.1 + rnd() * 0.08) }); return r; }, [D, H]);
  const mistMat = useMemo(() => new THREE.SpriteMaterial({ map: getMistTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.55 }), []);
  const grp = useRef(); const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ camera }) => {
    const e = env.current; if (!e || !grp.current) return;
    // follow the camera horizontally (85%): distant scenery barely moves while orbiting
    grp.current.position.set(camera.position.x * 0.85, 0, camera.position.z * 0.85);
    // haze color = sky near the horizon, warmed by a low sun
    const low = THREE.MathUtils.smoothstep(e.sunDir.y, -0.1, 0.05) * (1 - THREE.MathUtils.smoothstep(e.sunDir.y, 0.12, 0.4));
    tmp.copy(e.horizon).lerp(e.zenith, 0.18).lerp(e.sunColor, 0.35 * low * e.sunVis);
    u.uHaze.value.copy(tmp);
    u.uDens.value = (0.4 + 1.6 * (e.gray || 0)) / D;
    mistMat.color.copy(tmp).lerp(new THREE.Color(1, 1, 1), 0.35 * e.day).multiplyScalar(0.75 + 0.35 * e.day);
    mistMat.opacity = 0.3 + 0.35 * (e.gray || 0) + 0.15 * e.day;
  });
  const ca = Math.cos(az), sa = Math.sin(az);
  const at = (f, da = 0) => [Math.cos(az + da) * D * f, Math.sin(az + da) * D * f];
  // far lake / plain under the foothills, so nothing floats past the edge of the island's water plane
  const floor = useMemo(() => { const g = new THREE.RingGeometry(150, D * 2.4, 96, 6); g.rotateX(-Math.PI / 2); const n = g.attributes.position.count; const c = new THREE.Color(land ? '#7b956d' : '#7d95a6');
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(n).fill([c.r, c.g, c.b]).flat(), 3)); return g; }, [D, land]);
  return (<>
  <mesh geometry={floor} material={mat} position={[0, land ? (layout.plainY ?? 0) + 2.2 : -0.45, 0]} />
  <group ref={grp}>
    <group position={[ca * D, -2.5, sa * D]} rotation={[0, -az + Math.PI / 2 + 0.4, 0]} scale={[H, H, H]}><mesh geometry={mGeo} material={mat} /></group>
    {ranges.map(([g, f, da], i) => { const [x, z] = at(f, da); return <mesh key={i} geometry={g} material={mat} position={[x, -1.2, z]} rotation={[0, -(az + da) - Math.PI / 2, 0]} />; })}
    {mist.map((m, i) => { const fx = -sa, fz = ca; return <sprite key={i} material={mistMat} position={[ca * D * 0.93 + fx * m.dx + ca * m.dz, m.y, sa * D * 0.93 + fz * m.dx + sa * m.dz]} scale={[m.w, m.h, 1]} />; })}
  </group></>);
}
