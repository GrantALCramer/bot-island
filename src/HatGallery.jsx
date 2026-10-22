// ?hatgallery : every body shape x every hat, legacy placement (left of each pair) vs fitted (right). Dev/test page.
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import { Body, Hat, kindFor, resolveHatColor } from './Blob.jsx';
import { SHAPE_ORDER } from './avatars.js';
const TOP = { sphere: 0.9, blob: 0.84, oval: 1.04, box: 0.92, pill: 1.0, cone: 0.8, hex: 0.82, cloud: 0.94, drop: 1.06 };
const HAT_MAT = (c, r = 0.6, m = 0) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
function LegacyHat({ kind, hat }) { const y = TOP[kind] - 0.02;
  if (hat === 'tophat') return <group position={[0, y, 0]}><mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.025, 24]} />{HAT_MAT('#1c1c22')}</mesh><mesh position={[0, 0.17, 0]} castShadow><cylinderGeometry args={[0.18, 0.19, 0.28, 24]} />{HAT_MAT('#1c1c22')}</mesh><mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.195, 0.195, 0.05, 24]} />{HAT_MAT('#b3202a')}</mesh></group>;
  if (hat === 'crown') return <group position={[0, y + 0.06, 0]}><mesh><cylinderGeometry args={[0.2, 0.2, 0.12, 20, 1, true]} /><meshStandardMaterial color="#f5c542" metalness={0.8} roughness={0.25} side={2} /></mesh>{[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.257) * 0.19, 0.1, Math.sin(i * 1.257) * 0.19]}><coneGeometry args={[0.045, 0.1, 6]} />{HAT_MAT('#f5c542', 0.25, 0.8)}</mesh>)}<mesh position={[0, 0.02, 0.2]}><sphereGeometry args={[0.035, 10, 8]} /><meshStandardMaterial color="#e0245e" emissive="#e0245e" emissiveIntensity={0.4} /></mesh></group>;
  if (hat === 'beanie') return <group position={[0, y - 0.1, 0]}><mesh scale={[1, 0.8, 1]} castShadow><sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{HAT_MAT('#3b7dd8', 0.95)}</mesh><mesh><torusGeometry args={[0.295, 0.04, 8, 24]} /><meshStandardMaterial color="#2b5fa8" roughness={0.95} /></mesh><mesh position={[0, 0.27, 0]}><sphereGeometry args={[0.07, 10, 8]} />{HAT_MAT('#ffffff', 1)}</mesh></group>;
  if (hat === 'party') return <group position={[0, y + 0.13, 0]} rotation={[0, 0, 0.15]}><mesh castShadow><coneGeometry args={[0.15, 0.32, 18]} />{HAT_MAT('#ff5fa2', 0.5)}</mesh><mesh position={[0, 0.17, 0]}><sphereGeometry args={[0.045, 10, 8]} />{HAT_MAT('#ffe14d', 0.5)}</mesh></group>;
  if (hat === 'flower') return <group position={[0.17, y - 0.02, 0.12]} rotation={[0.3, 0, -0.4]}>{[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.257) * 0.07, 0, Math.sin(i * 1.257) * 0.07]} scale={[1, 0.4, 1]}><sphereGeometry args={[0.06, 10, 8]} />{HAT_MAT('#ffffff', 0.7)}</mesh>)}<mesh position={[0, 0.02, 0]}><sphereGeometry args={[0.04, 10, 8]} />{HAT_MAT('#ffc93c', 0.6)}</mesh></group>;
  if (hat === 'cap') return <group position={[0, y - 0.08, 0]}><mesh castShadow><sphereGeometry args={[0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{HAT_MAT('#e74c3c', 0.8)}</mesh><mesh position={[0, 0.01, 0.27]} rotation={[0.08, 0, 0]} scale={[1, 0.15, 0.9]}><cylinderGeometry args={[0.2, 0.2, 0.1, 20, 1, false, -Math.PI / 2, Math.PI]} />{HAT_MAT('#c0392b', 0.8)}</mesh></group>;
  return null;
}

const STYLE = new URLSearchParams(location.search).get('style'); // ?style=avatar|gem|voxel|jelly|ghost : fitted hats on that blob style
const KINDS = STYLE && STYLE !== 'classic' ? [...new Set(SHAPE_ORDER.map((n) => kindFor(STYLE, n)))] : Object.keys(TOP); const HATS = ['tophat', 'crown', 'beanie', 'party', 'flower', 'cap'];
function Cell({ kind, hat, legacy, x, z, squash, body = '#7aa7e8', hc }) { const ref = useRef();
  return <group position={[x, 0, z]} scale={squash ? [1.12, 0.82, 1.12] : 1}><group ref={ref}><Body kind={kind} color={body} /></group>
    {legacy ? <LegacyHat kind={kind} hat={hat} /> : <Hat kind={kind} hat={hat} bodyRef={ref} color={resolveHatColor(hc, body)} />}</group>; }
export default function HatGallery() {
  const q = new URLSearchParams(location.search); const hats = q.get('hats') ? q.get('hats').split(',') : HATS; const mode = q.get('mode') || (STYLE && STYLE !== 'classic' ? 'after' : 'both'); const squash = q.has('squash');
  const hcs = q.get('colors') ? q.get('colors').split(',') : null; // ?colors=default,match,%23e74c3c… : columns = hat colors on one shape
  const BODIES = ['#7aa7e8', '#ff8a5c', '#6fcf97', '#c39bd3'];
  if (hcs) { const kinds = q.get('kinds') ? q.get('kinds').split(',') : KINDS.slice(0, 1); const cols2 = hcs.length * kinds.length; return (<div style={{ position: 'fixed', inset: 0, background: '#e9eef3' }}>
    <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 2, font: '600 14px system-ui' }}>Hat colors: rows = {hats.join(', ')} · columns = {kinds.join('/')} × {hcs.join(', ')}{STYLE ? ' · style ' + STYLE : ''}</div>
    <Canvas orthographic camera={{ position: [0, 3, 14], zoom: Number(q.get('zoom') || 52) }} shadows><ambientLight intensity={0.8} /><directionalLight position={[4, 8, 6]} intensity={1.6} />
      {hats.flatMap((h, r) => kinds.flatMap((k, ki) => hcs.map((hc, i) => { const c = ki * hcs.length + i; const x = (c - (cols2 - 1) / 2) * 1.25, y = (hats.length - 1) / 2 * 1.75 - r * 1.75 - 0.4;
        return <group key={h + k + hc} position={[0, y, 0]}><Cell kind={k} hat={h} hc={hc === 'default' ? null : hc} body={BODIES[(r + c) % BODIES.length]} x={x} z={0} /></group>; })))}
      <OrbitControls /></Canvas></div>); }
  const cols = mode === 'both' ? 2 : 1;
  return (<div style={{ position: 'fixed', inset: 0, background: '#e9eef3' }}>
    <div style={{ position: 'absolute', top: 8, left: 12, zIndex: 2, font: '600 14px system-ui' }}>Hats: rows = {hats.join(', ')} · columns = {KINDS.join(', ')} · {mode === 'both' ? 'each pair: before | after' : mode}{STYLE ? ' · style ' + STYLE : ''}{squash ? ' · squashed' : ''}</div>
    <Canvas orthographic camera={{ position: [0, 3, 14], zoom: Number(q.get("zoom") || 52) }} shadows>
      <ambientLight intensity={0.8} /><directionalLight position={[4, 8, 6]} intensity={1.6} />
      {hats.flatMap((h, r) => KINDS.flatMap((k, c) => [...Array(cols)].map((_, jj) => { const legacy = mode === 'before' || (mode === 'both' && jj === 0);
        const x = (c - (KINDS.length - 1) / 2) * 1.25 * cols + (jj - (cols - 1) / 2) * 1.05, y = (hats.length - 1) / 2 * 1.75 - r * 1.75 - 0.4;
        return <group key={h + k + jj} position={[0, y, 0]}><Cell kind={k} hat={h} legacy={legacy} squash={squash} x={x} z={0} /></group>; })))}
      <OrbitControls />
    </Canvas></div>);
}
