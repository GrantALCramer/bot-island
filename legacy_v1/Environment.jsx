import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { dayFactor, skyColor } from './util.js';

export const WEATHER = {
  clear: { label: 'Clear', dim: 1, gray: 0, fog: [70, 160], clouds: 3, cloudGray: 0 },
  cloudy: { label: 'Cloudy', dim: 0.72, gray: 0.45, fog: [55, 140], clouds: 12, cloudGray: 0.25 },
  rain: { label: 'Rain', dim: 0.55, gray: 0.6, fog: [35, 100], clouds: 14, cloudGray: 0.55, rain: 1800 },
  storm: { label: 'Thunderstorm', dim: 0.38, gray: 0.75, fog: [28, 85], clouds: 16, cloudGray: 0.75, rain: 3000, lightning: true },
  snow: { label: 'Snow', dim: 0.82, gray: 0.5, fog: [32, 95], clouds: 12, cloudGray: 0.3, snow: 1600 },
  fog: { label: 'Fog', dim: 0.7, gray: 0.55, fog: [6, 42], clouds: 4, cloudGray: 0.2 },
};

function Lights({ hour, weather, flash }) {
  const { scene } = useThree();
  const sun = useRef(); const amb = useRef(); const hemi = useRef(); const moon = useRef();
  const target = useMemo(() => {
    const W = WEATHER[weather] || WEATHER.clear; const d = dayFactor(hour);
    let sky = skyColor(hour); const lum = sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11;
    sky = sky.clone().lerp(new THREE.Color(lum, lum, lum * 1.05), W.gray);
    if (weather === 'fog') sky.lerp(new THREE.Color(d > 0.3 ? '#d7dde3' : '#3a4150'), 0.6);
    const a = ((hour - 6) / 13) * Math.PI; // sun arc
    return { sky, d, W, sunPos: new THREE.Vector3(Math.cos(a) * -30, Math.max(Math.sin(a), 0.15) * 32 + 4, 14),
      sunI: 2.6 * d * W.dim, ambI: (0.32 + 0.55 * d) * (0.6 + 0.4 * W.dim), hemiI: (0.25 + 0.6 * d) * W.dim, moonI: 0.55 * (1 - d) * (0.5 + 0.5 * W.dim) };
  }, [hour, weather]);
  const cur = useRef({ sky: target.sky.clone(), sunI: target.sunI, ambI: target.ambI, hemiI: target.hemiI, moonI: target.moonI, near: target.W.fog[0], far: target.W.fog[1] });
  useEffect(() => { if (!scene.fog) scene.fog = new THREE.Fog(target.sky, target.W.fog[0], target.W.fog[1]); scene.background = cur.current.sky.clone(); }, []);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.5); const c = cur.current;
    c.sky.lerp(target.sky, k); c.sunI += (target.sunI - c.sunI) * k; c.ambI += (target.ambI - c.ambI) * k; c.hemiI += (target.hemiI - c.hemiI) * k; c.moonI += (target.moonI - c.moonI) * k;
    c.near += (target.W.fog[0] - c.near) * k; c.far += (target.W.fog[1] - c.far) * k;
    const f = flash.current; flash.current = Math.max(0, f - dt * 3);
    const bg = c.sky.clone().lerp(new THREE.Color('#dfe6ff'), f * 0.7);
    if (!scene.fog || !scene.background?.isColor) return;
    scene.background.copy(bg); scene.fog.color.copy(bg); scene.fog.near = c.near; scene.fog.far = c.far;
    if (sun.current) { sun.current.intensity = c.sunI; sun.current.position.lerp(target.sunPos, k); }
    if (amb.current) amb.current.intensity = c.ambI + f * 2.5;
    if (hemi.current) hemi.current.intensity = c.hemiI;
    if (moon.current) moon.current.intensity = c.moonI;
  });
  return (<>
    <ambientLight ref={amb} color="#dfe8ff" />
    <hemisphereLight ref={hemi} args={['#cfe8ff', '#6a8f4e']} />
    <directionalLight ref={sun} color="#fff1d6" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
      shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-far={90} />
    <directionalLight ref={moon} color="#9db4ff" position={[20, 25, -10]} />
  </>);
}

function SunMoon({ hour, weather }) {
  const d = dayFactor(hour); const a = ((hour - 6) / 13) * Math.PI; const W = WEATHER[weather] || WEATHER.clear;
  const overcast = W.gray > 0.4;
  const ma = (((hour + 12) % 24 - 6) / 13) * Math.PI;
  return (<>
    {d > 0.05 && !overcast && <mesh position={[Math.cos(a) * -70, Math.sin(a) * 50 + 5, -40]}><sphereGeometry args={[4, 24, 16]} /><meshBasicMaterial color="#fff2b0" fog={false} toneMapped={false} /></mesh>}
    {d < 0.6 && weather !== 'fog' && <mesh position={[Math.cos(ma) * -70, Math.max(Math.sin(ma), 0.25) * 45 + 8, -50]}><sphereGeometry args={[3, 24, 16]} /><meshBasicMaterial color="#f2f4ff" fog={false} toneMapped={false} transparent opacity={overcast ? 0.35 : 1} /></mesh>}
  </>);
}

function Clouds({ weather, hour }) {
  const W = WEATHER[weather] || WEATHER.clear; const d = dayFactor(hour);
  const list = useMemo(() => Array.from({ length: 16 }, (_, i) => { const a = i * 2.39996; const r = 25 + (i % 4) * 4; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: -5 + (i % 5) * 3, s: 1.0 + (i % 3) * 0.4 }; }), []);
  const g = useRef();
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.012; });
  const col = new THREE.Color('#ffffff').lerp(new THREE.Color('#5d6470'), W.cloudGray).multiplyScalar(0.5 + 0.5 * d);
  return (<group ref={g}>{list.map((c, i) => (
    <group key={i} position={[c.x, c.y, c.z]} scale={c.s} visible={i < W.clouds}>
      {[[0, 0, 0, 1.3], [1.2, -0.2, 0.2, 0.95], [-1.2, -0.25, -0.1, 0.9], [0.4, 0.5, -0.2, 0.9]].map((b, k) => <mesh key={k} position={b.slice(0, 3)}><sphereGeometry args={[b[3], 14, 10]} /><meshStandardMaterial color={col} roughness={1} transparent opacity={0.93} /></mesh>)}
    </group>))}</group>);
}

function Rain({ count, storm }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(3000 * 6);
    for (let i = 0; i < 3000; i++) { const x = Math.random() * 40 - 20, y = Math.random() * 24, z = Math.random() * 40 - 20; p.set([x, y, z, x + 0.05, y - 0.55, z + 0.05], i * 6); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  useFrame((_, dt) => {
    const a = geo.attributes.position.array; const v = (storm ? 26 : 20) * Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) { const o = i * 6; a[o + 1] -= v; a[o + 4] -= v; if (a[o + 4] < -1) { const y = 22 + Math.random() * 3; a[o + 1] = y; a[o + 4] = y - 0.55; } }
    geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, count * 2);
  });
  return <lineSegments geometry={geo}><lineBasicMaterial color="#b9cfe8" transparent opacity={0.55} /></lineSegments>;
}

function Snow({ count }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); }, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3); for (let i = 0; i < count; i++) p.set([Math.random() * 40 - 20, Math.random() * 22, Math.random() * 40 - 20], i * 3); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; }, [count]);
  useFrame(({ clock }, dt) => {
    const a = geo.attributes.position.array; const t = clock.elapsedTime; dt = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) { const o = i * 3; a[o + 1] -= (1.2 + (i % 5) * 0.15) * dt; a[o] += Math.sin(t + i) * 0.3 * dt; if (a[o + 1] < -0.5) a[o + 1] = 22; }
    geo.attributes.position.needsUpdate = true;
  });
  return <points geometry={geo}><pointsMaterial map={tex} size={0.28} transparent depthWrite={false} color="#ffffff" sizeAttenuation /></points>;
}

function Lightning({ flash }) {
  const next = useRef(3);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (t > next.current) { flash.current = 1; next.current = t + 3 + Math.random() * 6; } });
  return null;
}

export default function Sky({ hour, weather }) {
  const flash = useRef(0); const W = WEATHER[weather] || WEATHER.clear; const d = dayFactor(hour);
  const starsOn = d < 0.45 && W.gray < 0.5;
  return (<>
    <Lights hour={hour} weather={weather} flash={flash} />
    <SunMoon hour={hour} weather={weather} />
    {starsOn && <Stars radius={90} depth={40} count={2500} factor={4} saturation={0} fade speed={0.6} />}
    <Clouds weather={weather} hour={hour} />
    {W.rain && <Rain count={W.rain} storm={!!W.lightning} />}
    {W.snow && <Snow count={W.snow} />}
    {W.lightning && <Lightning flash={flash} />}
  </>);
}
