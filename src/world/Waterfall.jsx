// Jungle waterfall: rocky cliff with ledges, moss and vines; a two-tier fall (upper sheet breaks on a ledge, lower
// sheet into a splash pool) made of layered translucent scrolling sheets with ragged edges and white water at the lip;
// a rippling foam pool, rising mist + spray particles, and a rainbow in the mist when it's clear and the sun is behind
// the viewer. Position/distance are the same as before: angle theme.waterfall.angle, radius shoreR + 5.5.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';
import { mergeParts, G, MAT, cached } from './parts.js';
import { seeded } from '../util.js';

const BACK = Math.PI * 1.25;
const NOISE = `float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }`;

// ---- water sheet: bulges out from the lip, streaks scroll down, ragged edges, foam at top and bottom ----
const SHEET_V = `uniform float uBulge; varying vec2 vUv;
void main(){ vUv = uv; vec3 p = position; p.z += uBulge * sqrt(max(0., 1. - uv.y)); p.x *= 1. + 0.12 * (1. - uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`;
const SHEET_F = `uniform float uTime, uSpeed, uSeed, uOp, uLight, uTopFoam, uBotFoam; uniform vec3 uTint, uNight; varying vec2 vUv;
${NOISE}
void main(){
  float x = vUv.x, y = vUv.y, t = uTime * uSpeed;
  float wob = (vn(vec2(y * 5. + t * 0.35, uSeed)) - 0.5) * 0.22;
  float wob2 = (vn(vec2(y * 5. + t * 0.35, uSeed + 9.)) - 0.5) * 0.22;
  float mask = smoothstep(0.02 + wob, 0.16 + wob, x) * smoothstep(0.02 + wob2, 0.16 + wob2, 1. - x);
  float gaps = smoothstep(0.18, 0.42, vn(vec2(x * 7. + uSeed, y * 0.8 + t * 0.5)));       // thin spots / broken curtain
  float s1 = vn(vec2(x * 34. + uSeed, y * 3. + t * 1.6));
  float s2 = vn(vec2(x * 11. + uSeed * 2., y * 1.4 + t * 0.9));
  float streak = smoothstep(0.35, 0.9, s1 * 0.55 + s2 * 0.45);
  float top = smoothstep(1. - uTopFoam, 1., y) * (0.6 + 0.4 * vn(vec2(x * 20., t * 3.)));
  float bot = smoothstep(uBotFoam, 0., y) * (0.6 + 0.4 * vn(vec2(x * 16., t * 4.)));
  float white = clamp(streak * 0.75 + top + bot, 0., 1.);
  vec3 c = mix(uTint, vec3(0.97, 1., 1.), white);
  c *= mix(uNight, vec3(1.), uLight) * (0.16 + 0.84 * uLight);
  float a = mask * (0.25 + 0.55 * streak * gaps + 0.25 * gaps + top + bot) * uOp;
  gl_FragColor = vec4(c, clamp(a, 0., 0.95));
}`;

// ---- splash pool: rings expanding from the impact, foam in the middle ----
const POOL_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const POOL_F = `uniform float uTime, uLight, uRain; uniform vec2 uC; uniform vec3 uNight; varying vec2 vP;
${NOISE}
void main(){
  vec2 d = (vP - uC) * vec2(0.8, 1.25); float r = length(d);
  float rip = sin(r * 7. - uTime * 3.2) * 0.5 + 0.5; rip *= smoothstep(3.6, 0.8, r);
  float foam = smoothstep(2.2, 0.3, r + (vn(vP * 2.2 + vec2(0., uTime * 0.8)) - 0.5) * 1.2);
  float speck = smoothstep(0.6, 0.95, vn(vP * 6. + vec2(uTime * 0.4, -uTime * 0.6))) * smoothstep(3.4, 1.0, r);
  vec3 c = mix(vec3(0.33, 0.62, 0.58), vec3(0.96, 1., 1.), clamp(foam * 0.9 + speck * 0.6 + rip * 0.12, 0., 1.));
  c *= mix(uNight, vec3(1.), uLight) * (0.16 + 0.84 * uLight);
  float edge = 1. - smoothstep(3.0, 3.9, length((vP - uC) * vec2(0.75, 1.15)));
  gl_FragColor = vec4(c, edge * clamp(0.18 + foam * 0.75 + speck * 0.4 + rip * 0.12 + uRain * 0.08, 0., 0.92));
}`;

// ---- mist + spray: one point cloud, each point either a slow rising mist puff or a fast ballistic droplet ----
const MIST_V = `uniform float uTime, uScale; attribute vec4 aSeed; varying float vA; varying float vSpray;
void main(){
  float spray = step(aSeed.w, 0.38); vSpray = spray; vec3 base = position; vec3 p;
  if (spray > 0.5) { float t = fract(uTime * (0.9 + aSeed.x * 0.6) + aSeed.y * 7.);
    vec2 dir = normalize(vec2(aSeed.z - 0.5, 0.35 + aSeed.x)); float v = 2.2 + aSeed.y * 2.;
    p = base + vec3(dir.x * v * t * 1.3, v * t * 1.4 - 5.5 * t * t, dir.y * v * t);
    vA = (1. - t) * 0.9; gl_PointSize = (0.07 + aSeed.x * 0.07) * uScale / -(modelViewMatrix * vec4(p, 1.)).z;
  } else { float t = fract(uTime * (0.05 + aSeed.x * 0.05) + aSeed.y * 5.);
    p = base + vec3((aSeed.z - 0.5) * 3. * t + sin(uTime * 0.3 + aSeed.y * 9.) * 0.4 * t, t * (5. + aSeed.x * 5.), t * (1.2 + aSeed.z * 2.2));
    vA = smoothstep(0., 0.15, t) * (1. - t); gl_PointSize = (1.0 + aSeed.x * 1.6) * (0.5 + t) * uScale / -(modelViewMatrix * vec4(p, 1.)).z; }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;
const MIST_F = `uniform float uLight, uOp; uniform vec3 uNight; varying float vA; varying float vSpray;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float s = vSpray > 0.5 ? smoothstep(0.5, 0.15, d) : smoothstep(0.5, 0., d) * 0.3;
  vec3 col = mix(uNight, vec3(1.), uLight) * (0.2 + 0.8 * uLight); gl_FragColor = vec4(col, s * vA * uOp); }`;

// ---- rainbow: a spectral arc band, additive ----
const BOW_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const BOW_F = `uniform float uAmt, uR0, uR1; varying vec2 vP;
vec3 spec(float t){ return clamp(vec3(abs(t * 6. - 3.) - 1., 2. - abs(t * 6. - 2.), 2. - abs(t * 6. - 4.)), 0., 1.); }
void main(){ float r = length(vP); float b = (r - uR0) / (uR1 - uR0); if (b < 0. || b > 1.) discard;
  vec3 c = spec(0.83 * (1. - b)); // red outside, violet inside
  float a = sin(3.14159 * b) * smoothstep(0.0, 1.6, vP.y) * uAmt * 0.38;
  gl_FragColor = vec4(c * a, a); }`;

function cliffGeo() {
  return cached('cliff2', () => {
    const r = seeded(6); const P = []; const rock = ['#6d7268', '#7c8276', '#646a5e', '#727866'], wet = '#3f4740', moss = ['#3f7a36', '#2f6a2c', '#4f8a3c'];
    // back wall and the big rock masses on both sides (the fall's channel stays open)
    P.push([G.box(11, 15.5, 3), '#5d6357', [0, 5.2, -3.0]]);
    for (let i = 0; i < 30; i++) { const lx = (r() - 0.5) * 16, lz = -1.5 - r() * 3; const s = 1.3 + r() * 1.6; const hh = 9 + r() * 7 - Math.abs(lx) * 0.45;
      if (Math.abs(lx) < 2.3 + s * 0.9 && lz + s * 0.8 > -3.4) continue;
      P.push([G.dodec(s), rock[i % 4], [lx, hh * 0.5 - 2, lz], [r(), r(), r()], [1, hh / s * 0.55, 1]]); }
    // wet dark rock behind the water, stepped
    for (let y = 0.4; y < 13; y += 1.3) P.push([G.dodec(1.05 + r() * 0.3), wet, [(r() - 0.5) * 1.2, y, -2.05 - r() * 0.3], [r(), r(), r()], [1.4, 0.8, 0.6]]);
    // the mid ledge that breaks the fall, and ledges along the face
    for (const [lx, sc, rz] of [[-1.3, 1.0, 0.2], [0.1, 1.15, 0.9], [1.4, 0.95, 1.7], [0, 0.9, 2.4]]) P.push([G.dodec(sc), '#4f564b', [lx, 6.45, -1.2], [rz, rz * 1.7, 0.3], [1.25, 0.55, 1.1]]);
    P.push([G.dodec(0.7), wet, [-1.5, 6.9, -0.4], [0.3, 0.2, 0.1], [1.4, 0.6, 1]]); P.push([G.dodec(0.6), wet, [1.6, 6.8, -0.5], [0.1, 0.5, 0.2], [1.3, 0.6, 1]]);
    for (const [lx, ly, w] of [[-4.1, 4.2, 2.4], [4.3, 9.6, 2.2], [-3.6, 10.4, 2], [3.6, 3.1, 2.6], [-5.2, 7.4, 1.8], [5.4, 6.2, 1.8]]) {
      P.push([G.box(w, 0.45, 1.3), '#5f655a', [lx, ly, -1.2], [0, r() * 0.3, (r() - 0.5) * 0.12]]);
      P.push([G.box(w * 0.9, 0.12, 1.1), moss[(lx > 0) + 0], [lx, ly + 0.27, -1.15]]); }
    // lip rocks around the top notch
    for (let i = 0; i < 9; i++) { const lx = -5 + i * 1.25; if (Math.abs(lx) < 1.7) continue; P.push([G.dodec(1.1 + r() * 0.5), i % 2 ? '#6d7268' : '#5f645a', [lx, 12.6 + r() * 0.8, -1.9 - r() * 0.5], [r(), r(), r()]]); }
    P.push([G.box(2.6, 0.5, 1.3), wet, [0, 12.85, -1.6]]);
    // moss patches on the rocks
    for (let i = 0; i < 26; i++) { const lx = (r() < 0.5 ? -1 : 1) * (2.4 + r() * 5); const ly = 1 + r() * 11.5 - Math.abs(lx) * 0.25;
      P.push([G.ico(0.5 + r() * 0.6, 0), moss[i % 3], [lx, ly, -0.7 - r() * 0.9 + Math.max(0, 3 - Math.abs(lx)) * -0.2], [r(), r(), r()], [1.3, 0.45, 0.5]]); }
    // canopy on top
    for (let i = 0; i < 14; i++) { const lx = (r() - 0.5) * 15; P.push([G.ico(1.1 + r() * 0.9, 0), ['#1f6b2f', '#2d8a3e', '#185a28'][i % 3], [lx, 14 + r() * 1.5 - Math.abs(lx) * 0.45, -2.5 - r() * 2], [0, 0, 0], [1, 0.7, 1]]); }
    // hanging vines with leaves
    for (let i = 0; i < 16; i++) { const lx = (r() < 0.5 ? -1 : 1) * (1.9 + r() * 4.8); const top = 13.4 - Math.abs(lx) * 0.35; const len = 2.5 + r() * 5; const z = -0.9 - r() * 0.6;
      P.push([G.box(0.06, len, 0.06), '#2c5a22', [lx, top - len / 2, z], [0, 0, (r() - 0.5) * 0.08]]);
      for (let k = 0; k < len / 0.7; k++) P.push([G.ico(0.17 + r() * 0.08, 0), moss[(i + k) % 3], [lx + (r() - 0.5) * 0.3, top - k * 0.7 - r() * 0.3, z + 0.05], [r(), r(), r()], [1.3, 0.6, 0.5]]); }
    // pool rim boulders
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.05 + 0.9 * (i / 8)); P.push([G.dodec(0.45 + r() * 0.55), i % 2 ? '#5f645a' : '#4f554b', [Math.cos(a) * (3.4 + r() * 0.6), -0.25, 0.6 + Math.sin(a) * 2.6], [r(), r(), r()], [1.2, 0.7, 1]]); }
    return mergeParts(P);
  });
}

export function Waterfall() {
  const { layout, theme, env } = useWorld(); const a = theme.waterfall?.angle ?? BACK; const rr = layout.shoreR + 5.5; // unchanged placement
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const rot = Math.atan2(-x, -z);
  const cliff = useMemo(() => cliffGeo(), []);
  const night = useMemo(() => new THREE.Color('#5a6f9a'), []);
  const sheets = useMemo(() => {
    // [width, height, centerY, z, bulge, speed, opacity, topFoam, botFoam, seed, tint]
    const S = [
      [2.6, 6.2, 9.95, -1.42, 0.25, 1.0, 0.95, 0.10, 0.10, 1.3, '#9fd3d6'], // upper tier, back sheet
      [2.2, 6.0, 9.9, -1.32, 0.35, 1.35, 0.8, 0.12, 0.14, 4.7, '#c6e9ea'], // upper tier, front sheet
      [1.0, 5.6, 9.6, -1.25, 0.5, 1.7, 0.55, 0.2, 0.18, 8.1, '#e4f6f6'],   // thin bright ribbon
      [3.4, 7.3, 3.1, -0.35, 0.3, 1.1, 0.95, 0.12, 0.12, 2.2, '#9fd3d6'],  // lower tier (off the ledge), back
      [2.9, 7.1, 3.05, -0.2, 0.45, 1.5, 0.8, 0.16, 0.16, 6.6, '#c6e9ea'],
      [1.3, 6.9, 2.95, -0.1, 0.6, 1.9, 0.55, 0.22, 0.2, 9.4, '#e4f6f6'],
    ];
    return S.map(([w, h, cy, zz, bulge, speed, op, tf, bf, seed, tint]) => ({ w, h, cy, zz,
      mat: new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSpeed: { value: speed }, uSeed: { value: seed }, uOp: { value: op }, uLight: { value: 1 }, uTopFoam: { value: tf }, uBotFoam: { value: bf }, uBulge: { value: bulge }, uTint: { value: new THREE.Color(tint) }, uNight: { value: night } },
        vertexShader: SHEET_V, fragmentShader: SHEET_F, transparent: true, depthWrite: false, side: THREE.DoubleSide }) }));
  }, [night]);
  const pool = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uLight: { value: 1 }, uRain: { value: 0 }, uC: { value: new THREE.Vector2(0, -0.2) }, uNight: { value: night } }, vertexShader: POOL_V, fragmentShader: POOL_F, transparent: true, depthWrite: false }), [night]);
  const poolGeo = useMemo(() => { const g = new THREE.PlaneGeometry(8.5, 6, 1, 1); return g; }, []);
  const mist = useMemo(() => { const N = 320; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3); const s = new Float32Array(N * 4); const r = seeded(11);
    for (let i = 0; i < N; i++) { const upper = r() < 0.22; p.set([(r() - 0.5) * (upper ? 2 : 3), upper ? 6.95 : -0.2, upper ? -0.4 : 0.2 + r() * 0.5], i * 3); s.set([r(), r(), r(), upper ? r() * 0.37 : r()], i * 4); } // the mid ledge throws spray only (mist up there read as smoke)
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 4)); return g; }, []);
  const mistMat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uLight: { value: 1 }, uOp: { value: 0.55 }, uNight: { value: night } }, vertexShader: MIST_V, fragmentShader: MIST_F, transparent: true, depthWrite: false }), [night]);
  const bowMat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uAmt: { value: 0 }, uR0: { value: 3.3 }, uR1: { value: 4.0 } }, vertexShader: BOW_V, fragmentShader: BOW_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), []);
  const bow = useRef(); const grp = useRef(); const v = useMemo(() => ({ f: new THREE.Vector3(), amt: 0 }), []);
  useFrame(({ clock, camera, size }, dt) => {
    const t = clock.elapsedTime; const e = env.current || {}; const light = Math.min(1, Math.max(0, (e.day ?? 1) * (e.dim ?? 1)));
    for (const s of sheets) { s.mat.uniforms.uTime.value = t; s.mat.uniforms.uLight.value = light; }
    pool.uniforms.uTime.value = t; pool.uniforms.uLight.value = light; pool.uniforms.uRain.value = e.gray ?? 0;
    mistMat.uniforms.uTime.value = t; mistMat.uniforms.uLight.value = light; mistMat.uniforms.uScale.value = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); // world size -> pixels
    mistMat.uniforms.uOp.value = 0.5 + 0.35 * (e.gray ?? 0);
    // rainbow: clear-ish weather, sun up but not high, and the sun behind the viewer
    camera.getWorldDirection(v.f); const sd = e.sunDir; let want = 0;
    if (sd) { const hor = Math.hypot(sd.x, sd.z) || 1; const behind = -(sd.x * v.f.x + sd.z * v.f.z) / (hor * (Math.hypot(v.f.x, v.f.z) || 1));
      want = THREE.MathUtils.smoothstep(behind, 0.1, 0.55) * THREE.MathUtils.smoothstep(sd.y, 0.04, 0.16) * (1 - THREE.MathUtils.smoothstep(sd.y, 0.55, 0.8))
        * (1 - THREE.MathUtils.smoothstep(e.gray ?? 0, 0.08, 0.3)) * (e.sunVis ?? 1); }
    v.amt += (want - v.amt) * Math.min(1, dt * 0.8); bowMat.uniforms.uAmt.value = v.amt;
    if (bow.current && grp.current) { bow.current.visible = v.amt > 0.01; // face the camera (yaw only), in the group's frame
      const gp = grp.current.position; const yaw = Math.atan2(camera.position.x - gp.x, camera.position.z - gp.z); bow.current.rotation.y = yaw - rot; }
  });
  return (<group ref={grp} position={[x, 0, z]} rotation={[0, rot, 0]}>
    <mesh geometry={cliff} material={MAT.vcFlat} castShadow receiveShadow />
    {sheets.map((s, i) => <mesh key={i} material={s.mat} position={[0, s.cy, s.zz]} renderOrder={2 + i}><planeGeometry args={[s.w, s.h, 1, 24]} /></mesh>)}
    <mesh geometry={poolGeo} material={pool} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.27, 1.0]} renderOrder={1} />
    <points geometry={mist} material={mistMat} frustumCulled={false} renderOrder={9} />
    <group ref={bow} position={[0, -0.4, 1.6]}><mesh material={bowMat} renderOrder={10}><ringGeometry args={[3.3, 4.0, 64, 1, 0, Math.PI]} /></mesh></group>
  </group>);
}
