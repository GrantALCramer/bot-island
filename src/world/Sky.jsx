import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { sampleSky, sunDir, themeDay, useWorld, dens, QUALITY } from './env.js';

// Weather presets (theme picks which are offered via theme.weathers)
// fog values are multiples of the layout camera distance (so they work at every island size)
export const WEATHER = {
  clear: { label: 'Clear', dim: 1, gray: 0, fog: null, clouds: 5, cloudGray: 0, wind: 0.2 },
  cloudy: { tint: '#b9c3cc', label: 'Cloudy', dim: 0.7, gray: 0.45, fog: [1.15, 3.8], clouds: 14, cloudGray: 0.25, wind: 0.5 },
  rain: { tint: '#76818e', label: 'Rain', dim: 0.52, gray: 0.6, fog: [0.77, 2.8], clouds: 16, cloudGray: 0.55, rain: 1800, wind: 0.9 },
  storm: { tint: '#454e5a', label: 'Thunderstorm', dim: 0.36, gray: 0.78, fog: [0.61, 2.3], clouds: 18, cloudGray: 0.8, rain: 3000, lightning: true, wind: 1.8 },
  snow: { tint: '#d5dde6', label: 'Snow', dim: 0.82, gray: 0.5, fog: [0.77, 2.6], clouds: 14, cloudGray: 0.3, snow: 1600, wind: 0.3 },
  blizzard: { tint: '#c4ced9', label: 'Blizzard', dim: 0.6, gray: 0.72, fog: [0.3, 1.45], clouds: 18, cloudGray: 0.45, snow: 3200, drift: 7, wind: 2.2 },
  sprinkles: { label: 'Sprinkle shower', dim: 1, gray: 0, fog: null, clouds: 8, cloudGray: 0, wind: 0.6, dry: true, particles: { count: 2400, color: '#ff7ad0', size: 0.3, drift: 2, fall: 1.2 } },
  sugarsnow: { tint: '#f4eef6', label: 'Powdered sugar', dim: 0.92, gray: 0.15, fog: [1.0, 3.2], clouds: 10, cloudGray: 0.05, snow: 1000, wind: 0.3 },
  spores: { label: 'Glowing spores', dim: 0.9, gray: 0.1, fog: [1.2, 3.8], clouds: 5, cloudGray: 0.1, wind: 0.2, dry: true, particles: { count: 1800, color: '#a8ffb0', size: 0.26, drift: 1.5, fall: -0.15, glow: true } },
  still: { label: 'Still air', dim: 1, gray: 0, fog: null, clouds: 0, wind: 0.05 },
  glowpulse: { label: 'Glow pulse', dim: 1, gray: 0, fog: null, clouds: 0, wind: 0.05, dry: true, pulse: 1 },
  drips: { label: 'Dripping water', dim: 0.85, gray: 0.15, fog: [1.2, 3.6], clouds: 0, wind: 0.05, rain: 380 },
  cavemist: { label: 'Drifting mist', dim: 0.8, gray: 0.25, fog: [0.3, 1.8], clouds: 0, wind: 0.1, fogCol: ['#4a4070', '#1e1838'] },
  shimmer: { label: 'Crystal shimmer', dim: 1.05, gray: 0, fog: null, clouds: 0, wind: 0.1, dry: true, shimmer: 1, particles: { count: 1400, color: '#d8b8ff', size: 0.18, drift: 0.6, fall: -0.08, glow: true } },
  witching: { tint: '#5a7a5a', label: 'Witching hour', dim: 0.75, gray: 0.35, fog: [0.5, 2.2], clouds: 10, cloudGray: 0.6, wind: 0.4, dry: true, fogCol: ['#7a9a7a', '#1a2a1e'], particles: { count: 900, color: '#9aff7a', size: 0.16, drift: 0.8, fall: -0.1, glow: true } },
  fog: { tint: '#cfd8de', label: 'Fog', dim: 0.7, gray: 0.55, fog: [0.15, 1.1], clouds: 4, cloudGray: 0.2, wind: 0.1, fogCol: ['#d4dde3', '#3a4352'] },
  petals: { label: 'Petal storm', dim: 0.96, gray: 0.04, fog: [1.3, 4.2], clouds: 6, cloudGray: 0, wind: 1.6, particles: { count: 3600, color: '#ff8fb8', size: 0.42, drift: 5, fall: 0.45 } },
  springrain: { tint: '#a3adb8', label: 'Spring rain', dim: 0.74, gray: 0.36, fog: [1.0, 3.4], clouds: 12, cloudGray: 0.35, rain: 1100, wind: 0.5 },
  lightsnow: { tint: '#e0e6ee', label: 'Light snow', dim: 0.88, gray: 0.32, fog: [1.0, 3.4], clouds: 10, cloudGray: 0.2, snow: 1000, wind: 0.2 },
  mist: { tint: '#c3d3c6', label: 'Mist', dim: 0.78, gray: 0.45, fog: [0.25, 1.6], clouds: 6, cloudGray: 0.15, wind: 0.1, fogCol: ['#cfdccf', '#2f3d36'] },
  // underwater "weathers" (Atlantis)
  calm: { label: 'Calm', dim: 1, gray: 0, fog: null, clouds: 0, wind: 0.3 },
  currents: { label: 'Currents', dim: 0.9, gray: 0.12, fog: [0.5, 2.0], clouds: 0, wind: 1.4, current: 1 },
  plankton: { label: 'Plankton bloom', dim: 0.75, gray: 0.2, fog: [0.42, 1.9], clouds: 0, wind: 0.3, plankton: 1 },
  murky: { tint: '#2f5f55', label: 'Murky', dim: 0.55, gray: 0.6, fog: [0.16, 1.05], clouds: 0, wind: 0.4, fogCol: ['#2f6a5e', '#0c2420'] },
  // moon
  vacuum: { label: 'Clear', dim: 1, gray: 0, fog: null, clouds: 0, wind: 0 },
  meteors: { label: 'Meteor shower', dim: 1, gray: 0, fog: null, clouds: 0, wind: 0, meteors: 1 },
  duststorm: { tint: '#9a917f', label: 'Dust storm', dim: 0.62, gray: 0.55, fog: [0.28, 1.4], clouds: 0, wind: 2, fogCol: ['#9a917f', '#2c2924'], particles: { count: 2600, color: '#cfc5b2', size: 0.2, drift: 6, fall: 0.3 } },
  flare: { label: 'Solar flare', dim: 1.22, gray: 0, fog: null, clouds: 0, wind: 0, flare: 1, flash: { color: '#fff1c4', every: [4, 8], decay: 1.2, amb: 1.6 } },
  // heaven
  golden: { label: 'Golden glow', dim: 1.05, gray: 0, fog: null, clouds: 9, cloudGray: 0, wind: 0.2, warm: 1 },
  rainbow: { label: 'Rainbow', dim: 1, gray: 0.05, fog: null, clouds: 11, cloudGray: 0, wind: 0.2, rainbow: 1 },
  haze: { tint: '#f1e4f2', label: 'Gentle mist', dim: 0.9, gray: 0.3, fog: [0.28, 1.6], clouds: 5, cloudGray: 0, wind: 0.1, fogCol: ['#f6eaf4', '#4a3d5a'] },
  // hell
  ashfall: { tint: '#5a4c4a', label: 'Ash fall', dim: 0.72, gray: 0.4, fog: [0.6, 2.4], clouds: 12, cloudGray: 0.7, wind: 0.4, particles: { count: 2200, color: '#8f8685', size: 0.17, drift: 0.5, fall: 0.6 } },
  embers: { label: 'Ember storm', dim: 0.9, gray: 0.15, fog: [0.8, 3.0], clouds: 10, cloudGray: 0.6, wind: 2, particles: { count: 1800, color: '#ff8a2a', size: 0.13, drift: 4, fall: -0.8, glow: true } },
  eruption: { label: 'Eruption', dim: 0.85, gray: 0.25, fog: [0.7, 2.8], clouds: 14, cloudGray: 0.75, wind: 0.8, eruption: 1, flash: { color: '#ff5a1a', every: [3, 7], decay: 1.5, amb: 1.2 }, particles: { count: 900, color: '#ff7a2a', size: 0.12, drift: 1, fall: 1.2, glow: true } },
  smoke: { tint: '#3a2e2c', label: 'Smoke', dim: 0.6, gray: 0.6, fog: [0.2, 1.25], clouds: 16, cloudGray: 0.85, wind: 0.3, fogCol: ['#5a4844', '#1c1311'] },
};
const FX = ['current', 'plankton', 'meteors', 'flare', 'warm', 'rainbow', 'eruption', 'pulse', 'shimmer', 'tumble'];

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; }`;
const SKY_FRAG = `
uniform vec3 uZenith, uHorizon, uSunColor, uSunDir; uniform float uSunVis; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.55, h), 0.75));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSunColor * (pow(s, 6.0)*0.28 + pow(s, 60.0)*0.5) * uSunVis;
  c += uSunColor * smoothstep(0.9990, 0.9995, s) * 2.2 * uSunVis;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function SkyDome() {
  const { env } = useWorld(); const ref = useRef();
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunVis: { value: 1 } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }), []);
  useFrame(({ camera }) => {
    const e = env.current; if (!e) return; const u = mat.uniforms;
    u.uZenith.value.copy(e.zenith); u.uHorizon.value.copy(e.horizon); u.uSunColor.value.copy(e.sunColor); u.uSunDir.value.copy(e.sunDir); u.uSunVis.value = e.sunVis;
    ref.current?.position.copy(camera.position);
  });
  return <mesh ref={ref} material={mat} renderOrder={-1}><sphereGeometry args={[300, 32, 16]} /></mesh>;
}

// Computes the live environment (colors/intensities) once per frame into env.current; other parts read it.
function EnvDriver({ hour, weather, flash, slow }) {
  const { theme, env, layout } = useWorld(); const { scene } = useThree();
  const W = WEATHER[weather] || WEATHER.clear;
  const goal = useMemo(() => {
    const s = sampleSky(theme.sky, hour); const day = themeDay(theme, hour);
    const gray = (c) => { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; return c.clone().lerp(new THREE.Color(l, l, l * 1.06), W.gray); };
    let zenith = gray(s.zenith).multiplyScalar(0.5 + 0.5 * W.dim), horizon = gray(s.horizon).multiplyScalar(0.55 + 0.45 * W.dim);
    if (W.tint) { const tc = new THREE.Color(W.tint).multiplyScalar(0.2 + 0.8 * day); zenith.lerp(tc, W.gray * 0.85); horizon.lerp(tc, W.gray * 0.85); }
    if (W.fogCol) { const f = new THREE.Color(day > 0.3 ? W.fogCol[0] : W.fogCol[1]); zenith.lerp(f, 0.6); horizon.lerp(f, 0.7); }
    if (W.warm) { zenith.lerp(new THREE.Color('#ffb36b'), 0.35 * W.warm); horizon.lerp(new THREE.Color('#ffd27a'), 0.5 * W.warm); }
    if (W.flare) { zenith.lerp(new THREE.Color('#3a3018'), 0.5); horizon.lerp(new THREE.Color('#fff0c0'), 0.35); }
    if (theme.fog.tint && !W.fogCol) horizon.lerp(new THREE.Color(theme.fog.tint).multiplyScalar(0.25 + 0.75 * day), 0.25);
    const dir = sunDir(theme, hour); const D = layout.camDist; const fog = (W.fog || theme.fog.clear).map((f) => f * D);
    const sunColor = s.sun.clone(); if (W.warm) sunColor.lerp(new THREE.Color('#ffc46b'), 0.6);
    const g = { zenith, horizon, sunColor, day, dir, fog, sunVis: (theme.underwater ? 0 : 1 - W.gray) * THREE.MathUtils.smoothstep(dir.y, -0.12, 0.05), wind: W.wind * theme.wind, gray: W.gray, dim: W.dim };
    FX.forEach((k) => (g[k] = W[k] ?? 0)); return g;
  }, [theme, hour, weather, layout.camDist]);
  if (!env.current) { env.current = { zenith: goal.zenith.clone(), horizon: goal.horizon.clone(), sunColor: goal.sunColor.clone(), sunDir: goal.dir.clone(), day: goal.day, sunVis: goal.sunVis, wind: goal.wind, gray: goal.gray, near: goal.fog[0], far: goal.fog[1], dim: goal.dim, flash: 0, flashCol: new THREE.Color('#dfe6ff') }; FX.forEach((k) => (env.current[k] = goal[k])); }
  const flashCol = useMemo(() => new THREE.Color(W.flash?.color || '#dfe6ff'), [weather]);
  useEffect(() => { scene.fog = new THREE.Fog(goal.horizon.clone(), goal.fog[0], goal.fog[1]); scene.background = null; }, []);
  useFrame((_, dt) => {
    const e = env.current; const k = Math.min(1, dt * (slow ? 0.35 : 2.5)); // slow: random weather drifts over ~10 s
    e.zenith.lerp(goal.zenith, k); e.horizon.lerp(goal.horizon, k); e.sunColor.lerp(goal.sunColor, k); e.sunDir.lerp(goal.dir, k).normalize();
    for (const key of ['day', 'sunVis', 'wind', 'gray', 'dim', ...FX]) e[key] += (goal[key] - e[key]) * k;
    e.near += (goal.fog[0] - e.near) * k; e.far += (goal.fog[1] - e.far) * k;
    e.flash = flash.current; flash.current = Math.max(0, flash.current - dt * (W.flash?.decay ?? 3)); e.flashCol.copy(flashCol);
    if (scene.fog) { scene.fog.color.copy(e.horizon).lerp(flashCol, e.flash * 0.6); scene.fog.near = e.near; scene.fog.far = e.far; }
  });
  return null;
}

function Lights() {
  const { env, theme, layout } = useWorld(); const E = layout.extent + 4;
  const sun = useRef(); const amb = useRef(); const hemi = useRef(); const moon = useRef();
  useFrame(() => {
    const e = env.current; if (!e || !sun.current) return;
    const lowSun = THREE.MathUtils.smoothstep(e.sunDir.y, -0.08, 0.12);
    sun.current.position.copy(e.sunDir).multiplyScalar(Math.max(50, E * 2)); sun.current.color.copy(e.sunColor);
    sun.current.intensity = (theme.underwater ? 1.9 : 2.7) * lowSun * e.dim * e.dim;
    const dusk = THREE.MathUtils.smoothstep(e.sunDir.y, -0.15, 0.05) * (1 - THREE.MathUtils.smoothstep(e.sunDir.y, 0.1, 0.4)); // golden-hour boost
    amb.current.intensity = (0.3 + 0.42 * e.day + 0.35 * dusk) * (0.35 + 0.65 * e.dim) * (theme.skyFx?.ambient ?? 1) + e.flash * 2.5 * (amb.current.userData.fa ?? 1);
    amb.current.color.copy(e.zenith).lerp(new THREE.Color('#ffffff'), 0.6).lerp(e.sunColor, 0.45 * dusk).lerp(e.flashCol, Math.min(1, e.flash));
    hemi.current.intensity = (0.3 + 0.55 * e.day) * e.dim; hemi.current.color.copy(e.zenith).lerp(new THREE.Color('#ffffff'), 0.4);
    moon.current.intensity = 0.6 * (theme.skyFx?.nightLight?.[1] ?? 1) * (1 - e.day) * (0.5 + 0.5 * e.dim);
  });
  return (<>
    <ambientLight ref={amb} />
    <hemisphereLight ref={hemi} args={['#cfe8ff', theme.terrain.colors.sand, 1]} />
    <directionalLight key={Math.round(E)} ref={sun} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02}
      shadow-camera-left={-E} shadow-camera-right={E} shadow-camera-top={E} shadow-camera-bottom={-E} shadow-camera-far={Math.max(120, E * 5)} />
    <directionalLight ref={moon} color={theme.skyFx?.nightLight?.[0] ?? '#9db4ff'} position={theme.skyFx?.earth ? [Math.cos(EARTH_AZ) * 40, 14, Math.sin(EARTH_AZ) * 40] : [-20, 30, -25]} />
  </>);
}

function Moon({ hour, weather }) {
  const { theme, layout } = useWorld(); const W = WEATHER[weather] || WEATHER.clear;
  const d = themeDay(theme, hour); if (d > 0.6 || W.fogCol) return null;
  const dir = sunDir(theme, (hour + 12) % 24); const y = Math.max(dir.y, 0.3); const M = Math.max(200, layout.camDist * 3.2);
  return <mesh position={[dir.x * M, y * M, dir.z * M]}><sphereGeometry args={[7 * M / 200, 24, 16]} /><meshBasicMaterial color="#eef1ff" fog={false} toneMapped={false} transparent opacity={(W.gray > 0.4 ? 0.3 : 1) * (1 - d)} /></mesh>;
}

function Clouds({ weather }) {
  const { env, layout, theme } = useWorld(); const W = WEATHER[weather] || WEATHER.clear; const k = Math.max(1, layout.extent / 24);
  const list = useMemo(() => Array.from({ length: 18 }, (_, i) => { const a = i * 2.39996; const r = (60 + (i % 5) * 11) * k; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: (16 + (i % 4) * 5) * k, s: (2.2 + (i % 3) * 0.9) * k }; }), [k]);
  const g = useRef(); const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, transparent: true, opacity: 0.95, fog: false }), []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.01; const e = env.current; if (!e) return;
    const base = new THREE.Color(theme.skyFx?.cloud ?? '#ffffff').lerp(e.sunColor, 0.35 * (1 - e.day * 0.7)).lerp(new THREE.Color(theme.skyFx?.cloudDark ?? '#5d6470'), W.cloudGray ?? 0);
    mat.color.copy(base).multiplyScalar(0.35 + 0.65 * e.day); mat.emissive.copy(e.horizon).multiplyScalar(0.35);
  });
  return (<group ref={g}>{list.map((c, i) => (
    <group key={i} position={[c.x, c.y, c.z]} scale={c.s} visible={i < W.clouds}>
      {[[0, 0, 0, 1.3], [1.2, -0.2, 0.2, 0.95], [-1.2, -0.25, -0.1, 0.9], [0.4, 0.5, -0.2, 0.9]].map((b, k) => <mesh key={k} position={b.slice(0, 3)} material={mat}><sphereGeometry args={[b[3], 14, 10]} /></mesh>)}
    </group>))}</group>);
}

function Rain({ count, storm, k = 1, fade }) {
  const mat = useRef();
  const N = 7500; count = dens(Math.min(N, Math.round(count * Math.min(2.5, k * k))), 0.35);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = (Math.random() * 48 - 24) * k, y = Math.random() * 24, z = (Math.random() * 48 - 24) * k; p.set([x, y, z, x + 0.08, y - 0.6, z + 0.05], i * 6); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, [k]);
  useFrame((_, dt) => {
    const a = geo.attributes.position.array; const v = (storm ? 26 : 20) * Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) { const o = i * 6; a[o + 1] -= v; a[o + 4] -= v; a[o] += v * 0.04; a[o + 3] += v * 0.04; if (a[o + 4] < -0.5) { const y = 22 + Math.random() * 3; a[o + 1] = y; a[o + 4] = y - 0.6; a[o] = a[o + 3] - 0.08; } }
    geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, count * 2);
    if (mat.current) mat.current.opacity = 0.5 * (fade ? fade.current : 1);
  });
  return <lineSegments geometry={geo}><lineBasicMaterial ref={mat} color="#c3d6ea" transparent opacity={0.5} /></lineSegments>;
}

function Snow({ count, k = 1, drift = 0, color = '#ffffff', size = 0.28, fall = 1, glow = false, fade }) {
  const mat = useRef();
  count = dens(Math.round(count * Math.min(2.5, k * k)), 0.35); const H = 22 * Math.min(k, 1.6);
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); }, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3); for (let i = 0; i < count; i++) p.set([(Math.random() * 44 - 22) * k, Math.random() * H, (Math.random() * 44 - 22) * k], i * 3); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; }, [count, k]);
  useFrame(({ clock }, dt) => {
    const a = geo.attributes.position.array; const t = clock.elapsedTime; dt = Math.min(dt, 0.05);
    const X = 22 * k; for (let i = 0; i < count; i++) { const o = i * 3; a[o + 1] -= (1.2 + (i % 5) * 0.15 + drift * 0.2) * fall * dt; a[o] += (Math.sin(t + i) * 0.3 + drift) * dt; a[o + 2] += drift * 0.4 * dt; if (a[o] > X) a[o] -= 2 * X; if (a[o + 2] > X) a[o + 2] -= 2 * X; if (a[o + 1] < -0.5) a[o + 1] = H; else if (a[o + 1] > H) a[o + 1] = -0.4; }
    geo.attributes.position.needsUpdate = true;
    if (mat.current) mat.current.opacity = fade ? fade.current : 1;
  });
  const col = useMemo(() => new THREE.Color(color).multiplyScalar(glow ? 2.5 : 1), [color, glow]);
  return <points geometry={geo}><pointsMaterial ref={mat} map={tex} size={size} transparent depthWrite={false} color={col} sizeAttenuation blending={glow ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={!glow} /></points>;
}

function Lightning({ flash, every = [3, 9] }) {
  const next = useRef(every[0]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (t > next.current) { flash.current = 1; next.current = t + every[0] + Math.random() * (every[1] - every[0]); } });
  return null;
}

// ---------- moon sky: Earth (fixed in the lunar sky, phase lit by the sun), meteors; heaven: rainbow ----------
export const EARTH_AZ = Math.PI * 1.25 - 0.22;
const EARTH_V = `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vN = normalize(position); vW = normalize(mat3(modelMatrix)*position); vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
// real Earth: NASA Blue Marble day map + cloud layer (public domain, bundled in public/textures), sampled in a
// frame where world up = north and the face pointing at the island shows the Atlantic (Americas + Africa/Europe)
const EARTH_F = `uniform vec3 uSun; uniform float uTime; uniform sampler2D uDay; uniform sampler2D uCloud; uniform vec3 uFace; uniform vec3 uRight;
varying vec3 vN; varying vec3 vP; varying vec3 vW;
const float PI = 3.14159265;
void main(){ vec3 n = normalize(vN); vec3 w = normalize(vW);
  float lat = asin(clamp(w.y, -1., 1.)); float lon0 = atan(dot(w, uRight), dot(w, uFace));
  float lon = lon0 - 0.35 + uTime*0.01; // -20 deg (mid-Atlantic) faces the island, then a slow spin eastward
  vec2 uv = vec2(fract((lon + PI) / (2.*PI)), 0.5 + lat / PI);
  vec3 c = texture2D(uDay, uv).rgb; c = pow(c, vec3(0.9)) * 1.15;
  float cl = texture2D(uCloud, vec2(fract(uv.x + uTime*0.0004), uv.y)).r; c = mix(c, vec3(1.), smoothstep(0.15, 0.85, cl) * 0.7);
  float lit = clamp(dot(n, normalize(uSun))*1.4 + 0.15, 0., 1.);
  vec3 V = normalize(cameraPosition - vP); float rim = pow(1. - max(dot(n, V), 0.), 3.);
  vec3 col = c*(0.03 + 1.25*lit) + vec3(0.35,0.6,1.)*rim*(0.25 + lit);
  gl_FragColor = vec4(col, 1.); }`;
let earthTex = null;
const loadEarthTex = () => { if (earthTex) return earthTex; const L = new THREE.TextureLoader(); const base = import.meta.env.BASE_URL || '/';
  const day = L.load(`${base}textures/earth_day_2048.jpg`); day.colorSpace = THREE.NoColorSpace; day.anisotropy = 4;
  const cloud = L.load(`${base}textures/earth_clouds_1024.jpg`); [day, cloud].forEach((t) => { t.wrapS = THREE.RepeatWrapping; });
  return (earthTex = { day, cloud }); };
function Earth() {
  const { env, layout } = useWorld(); const M = Math.max(220, layout.camDist * 3.4);
  const mat = useMemo(() => { const T = loadEarthTex(); const f = new THREE.Vector3(-Math.cos(EARTH_AZ), 0, -Math.sin(EARTH_AZ)); // Earth -> island
    const right = new THREE.Vector3().crossVectors(f.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
    return new THREE.ShaderMaterial({ uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) }, uTime: { value: 0 }, uDay: { value: T.day }, uCloud: { value: T.cloud }, uFace: { value: f }, uRight: { value: right } }, vertexShader: EARTH_V, fragmentShader: EARTH_F, fog: false }); }, []);
  useFrame(({ clock }) => { const e = env.current; if (e) mat.uniforms.uSun.value.copy(e.sunDir); mat.uniforms.uTime.value = clock.elapsedTime; });
  const el = 0.11; const pos = [Math.cos(EARTH_AZ) * Math.cos(el) * M, Math.sin(el) * M, Math.sin(EARTH_AZ) * Math.cos(el) * M];
  return <mesh position={pos} material={mat} rotation={[0.4, 0, 0.2]}><sphereGeometry args={[M * 0.085, 64, 48]} /></mesh>;
}
function Meteors() {
  const { layout } = useWorld(); const N = 14; const D = Math.max(160, layout.camDist * 2.4);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3)); return g; }, []);
  const st = useMemo(() => Array.from({ length: N }, (_, i) => ({ t0: -Math.random() * 6, az: Math.PI * 1.25 + (Math.random() - 0.5) * 2.2, el: 0.12 + Math.random() * 0.45, dx: (Math.random() - 0.5) * 0.6 })), []);
  useFrame(({ clock }) => { const t = clock.elapsedTime; const a = geo.attributes.position.array;
    st.forEach((m, i) => { let k = (t - m.t0) / 1.6; if (k > 1 || k < 0) { m.t0 = t + Math.random() * 3; m.az = Math.PI * 1.25 + (Math.random() - 0.5) * 2.2; m.el = 0.12 + Math.random() * 0.45; m.dx = (Math.random() - 0.5) * 0.6; k = 0; }
      const az = m.az + m.dx * k, el = m.el - 0.22 * k; const az2 = m.az + m.dx * (k - 0.12), el2 = m.el - 0.22 * (k - 0.12);
      a.set([Math.cos(az) * Math.cos(el) * D, Math.sin(el) * D, Math.sin(az) * Math.cos(el) * D, Math.cos(az2) * Math.cos(el2) * D, Math.sin(el2) * D, Math.sin(az2) * Math.cos(el2) * D], i * 6); });
    geo.attributes.position.needsUpdate = true; });
  return <lineSegments geometry={geo} frustumCulled={false}><lineBasicMaterial color={new THREE.Color('#fff2d0').multiplyScalar(3)} toneMapped={false} fog={false} /></lineSegments>;
}
const RB_F = `varying vec2 vUv; uniform float uOp; vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.); }
void main(){ float v = vUv.y; float a = smoothstep(0., 0.15, v)*smoothstep(1., 0.85, v)*smoothstep(0., 0.12, vUv.x)*smoothstep(1., 0.88, vUv.x); gl_FragColor = vec4(hue(v*0.8), a*0.38*uOp); }`;
function Rainbow() {
  const { layout, env } = useWorld(); const E = layout.extent;
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(1, 1, 96, 1); const p = g.attributes.position; const R = E * 2.2;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5; const ang = Math.PI * (0.08 + 0.84 * u); const rr = R * (0.86 + 0.14 * v); const az = Math.PI * 1.25 + 0.15;
      p.setXYZ(i, Math.cos(az) * E * 2.4 + Math.cos(ang) * rr * Math.sin(az), Math.sin(ang) * rr - E * 0.35, Math.sin(az) * E * 2.4 - Math.cos(ang) * rr * Math.cos(az)); }
    g.computeBoundingSphere(); return g; }, [E]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: RB_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }), []);
  useFrame(() => { mat.uniforms.uOp.value = (env.current?.rainbow ?? 0) * (0.3 + 0.7 * (env.current?.day ?? 1)); });
  return <mesh geometry={geo} material={mat} renderOrder={-1} frustumCulled={false} />;
}

// Rain/snow/particles of one weather; fades in (and out, while the next weather fades in) instead of popping.
function Precip({ weather, out, slow, k }) {
  const W = WEATHER[weather] || WEATHER.clear; const fade = useRef(slow ? 0 : 1);
  useFrame((_, dt) => { const goal = out ? 0 : 1; const r = Math.min(dt, 0.05) * (slow ? 0.18 : 3); fade.current += Math.max(-r, Math.min(r, goal - fade.current)); });
  return (<>
    {W.rain && <Rain count={W.rain} storm={!!W.lightning} k={k} fade={fade} />}
    {W.snow && <Snow count={W.snow} k={k} drift={W.drift ?? 0} fade={fade} />}
    {W.particles && <Snow count={W.particles.count} k={k} drift={W.particles.drift} color={W.particles.color} size={W.particles.size} fall={W.particles.fall} glow={W.particles.glow} fade={fade} />}
  </>);
}
let layerId = 0;
export default function Sky({ hour, weather, slow = false }) {
  const { theme, layout } = useWorld();
  // precipitation layers: the current weather plus any previous one still fading out
  const [layers, setLayers] = useState(() => [{ id: ++layerId, w: weather, out: false }]);
  useEffect(() => {
    setLayers((ls) => (ls.some((l) => l.w === weather && !l.out) ? ls : [...ls.map((l) => ({ ...l, out: true })), { id: ++layerId, w: weather, out: false }]));
    const t = setTimeout(() => setLayers((ls) => ls.filter((l) => !l.out)), slow ? 7000 : 600);
    return () => clearTimeout(t);
  }, [weather, slow]); const flash = useRef(0); const W = WEATHER[weather] || WEATHER.clear; const uw = !!theme.underwater;
  const fx = theme.skyFx || {};
  const d = themeDay(theme, hour); const starsOn = !uw && fx.stars !== false && (fx.stars === 'always' ? W.gray < 0.5 : d < 0.45 && W.gray < 0.5 && !W.fogCol); const k = Math.max(1, layout.extent / 24);
  return (<>
    <EnvDriver hour={hour} weather={weather} flash={flash} slow={slow} />
    <SkyDome />
    <Lights />
    {!uw && fx.moon !== false && <Moon hour={hour} weather={weather} />}
    {fx.earth && <Earth />}
    {starsOn && <Stars radius={Math.max(150, layout.camDist * 2.6)} depth={60} count={dens(fx.stars === 'always' ? 5000 : 3000, 0.4)} factor={6} saturation={0} fade speed={0.6} />}
    {!uw && fx.clouds !== false && <Clouds weather={weather} />}
    {layers.map((l) => <Precip key={l.id} weather={l.w} out={l.out} slow={slow} k={k} />)}
    {W.lightning && <Lightning flash={flash} />}
    {W.flash && <Lightning flash={flash} every={W.flash.every} />}
    {W.meteors && <Meteors />}
    {W.rainbow && <Rainbow />}
  </>);
}
