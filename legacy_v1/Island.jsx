import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ISLAND_R, WORKSHOP, DESK_SLOTS, LIBRARY, CAFE, CAFE_TABLES, MAILBOX, LAMPS } from './layout.js';
import { botColor, mix, seeded } from './util.js';

const WOOD = '#a0703f', WOOD_D = '#7a5230', GRASS = '#7cc46a', SAND = '#ead9a8';

function Terrain({ snow }) {
  const under = useMemo(() => {
    const g = new THREE.ConeGeometry(ISLAND_R * 0.98, 10, 28, 6, true); g.rotateX(Math.PI); g.translate(0, -5.6, 0);
    const p = g.attributes.position; const r = seeded(7);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.7) { p.setX(i, p.getX(i) * (0.88 + r() * 0.24)); p.setZ(i, p.getZ(i) * (0.88 + r() * 0.24)); p.setY(i, y + (r() - 0.5) * 0.8); } }
    g.computeVertexNormals(); return g;
  }, []);
  const rocks = useMemo(() => { const r = seeded(3); return Array.from({ length: 7 }, (_, i) => { const a = r() * Math.PI * 2, d = ISLAND_R + 2 + r() * 5; return { p: [Math.cos(a) * d, -2 - r() * 5, Math.sin(a) * d], s: 0.6 + r() * 1.1, k: i }; }); }, []);
  const grass = snow ? '#eef3f7' : GRASS;
  return (<group>
    <mesh position={[0, -0.5, 0]} receiveShadow><cylinderGeometry args={[ISLAND_R, ISLAND_R * 0.99, 1, 64]} /><meshStandardMaterial color={grass} roughness={0.95} /></mesh>
    <mesh position={[0, -1.05, 0]}><cylinderGeometry args={[ISLAND_R * 0.99, ISLAND_R * 0.97, 0.3, 64]} /><meshStandardMaterial color="#8a6a45" roughness={1} /></mesh>
    <mesh geometry={under}><meshStandardMaterial color="#7d6450" roughness={1} flatShading /></mesh>
    {rocks.map((k) => (<group key={k.k} position={k.p}>
      <mesh><dodecahedronGeometry args={[k.s, 0]} /><meshStandardMaterial color="#7d6450" flatShading /></mesh>
      <mesh position={[0, k.s * 0.95, 0]}><cylinderGeometry args={[k.s * 0.95, k.s * 0.85, 0.3, 10]} /><meshStandardMaterial color={grass} /></mesh>
    </group>))}
    {/* paths */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow><circleGeometry args={[3.3, 40]} /><meshStandardMaterial color={SAND} roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow><ringGeometry args={[8.9, 9.9, 64, 1, (140 * Math.PI) / 180, (155 * Math.PI) / 180]} /><meshStandardMaterial color={SAND} roughness={1} /></mesh>
    {[[WORKSHOP.c, 1.6], [LIBRARY.pos, 1.2], [CAFE.pos, 1.2], [MAILBOX.pos, 1.0]].map(([p, w], i) => <PathTo key={i} to={p} w={w} />)}
    {[150, 185, 217, 250, 285].map((d) => { const a = (d * Math.PI) / 180; return <PathTo key={d} to={[Math.cos(a) * 9.4, Math.sin(a) * 9.4]} w={0.9} />; })}
  </group>);
}
function PathTo({ to, w }) {
  const len = Math.hypot(to[0], to[1]); const a = Math.atan2(to[0], to[1]);
  return <mesh rotation={[-Math.PI / 2, 0, -a + Math.PI]} position={[to[0] / 2, 0.004, to[1] / 2]} receiveShadow><planeGeometry args={[w, len]} /><meshStandardMaterial color={SAND} roughness={1} /></mesh>;
}

function Tree({ p, s = 1, kind = 0, snow }) {
  const leaf = snow ? '#e8eef2' : ['#3f9a4f', '#4cae5b', '#2f8a5a'][kind % 3];
  return (<group position={[p[0], 0, p[1]]} scale={s}>
    <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.12, 0.17, 0.9, 8]} /><meshStandardMaterial color={WOOD_D} /></mesh>
    {kind % 2 === 0 ? (<>
      <mesh position={[0, 1.35, 0]} castShadow><coneGeometry args={[0.75, 1.3, 9]} /><meshStandardMaterial color={leaf} flatShading /></mesh>
      <mesh position={[0, 1.95, 0]} castShadow><coneGeometry args={[0.55, 1.0, 9]} /><meshStandardMaterial color={leaf} flatShading /></mesh>
    </>) : (<mesh position={[0, 1.4, 0]} castShadow><icosahedronGeometry args={[0.75, 1]} /><meshStandardMaterial color={leaf} flatShading /></mesh>)}
  </group>);
}
function Trees({ snow }) {
  const list = useMemo(() => {
    const r = seeded(11); const out = [];
    const angles = [140, 160, 172, 196, 208, 232, 244, 262, 275, 296, 318, 335, 350, 20, 32, 95, 110, 125];
    angles.forEach((d, i) => { const a = (d * Math.PI) / 180; const rad = d > 135 && d < 300 ? 13.4 + r() * 0.8 : 12.6 + r() * 1.4; out.push({ p: [Math.cos(a) * rad, Math.sin(a) * rad], s: 0.7 + r() * 0.5, k: i }); });
    return out;
  }, []);
  return <group>{list.map((t) => <Tree key={t.k} p={t.p} s={t.s} kind={t.k} snow={snow} />)}{[[-1.2, -10.4], [6.8, 8.6], [-9, -3]].map((p, i) => <Bush key={i} p={p} snow={snow} />)}</group>;
}
function Bush({ p, snow }) { const c = snow ? '#e3eaef' : '#5fb35f'; return <group position={[p[0], 0, p[1]]}>{[[0, 0.3, 0, 0.45], [0.4, 0.25, 0.1, 0.32], [-0.35, 0.22, 0.05, 0.3]].map((b, i) => <mesh key={i} position={b.slice(0, 3)} castShadow><sphereGeometry args={[b[3], 12, 10]} /><meshStandardMaterial color={c} /></mesh>)}<Flowers /></group>; }
function Flowers() { return <>{[[0.6, 0.5], [-0.6, 0.5], [0.1, 0.7]].map(([x, z], i) => <mesh key={i} position={[x, 0.12, z]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color={['#f472b6', '#facc15', '#ffffff'][i]} /></mesh>)}</>; }

function Sign({ text, position, rot = 0, color = '#fff7e0' }) {
  return (<group position={position} rotation={[0, rot, 0]}>
    <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.08, 1, 0.08]} /><meshStandardMaterial color={WOOD_D} /></mesh>
    <Html position={[0, 1.1, 0]} center distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="sign" style={{ background: color }}>{text}</div></Html>
  </group>);
}

function Workshop({ night }) {
  const [cx, cz] = WORKSHOP.c;
  return (<group>
    <mesh position={[cx, 0.04, cz]} receiveShadow castShadow><boxGeometry args={[5.2, 0.08, 4.0]} /><meshStandardMaterial color="#c89a63" /></mesh>
    {DESK_SLOTS.map((s, i) => (<group key={i} position={[s.desk[0], 0, s.desk[1]]}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow><boxGeometry args={[0.95, 0.07, 0.5]} /><meshStandardMaterial color={WOOD} /></mesh>
      {[[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]].map(([x, z], k) => <mesh key={k} position={[x, 0.23, z]}><boxGeometry args={[0.05, 0.46, 0.05]} /><meshStandardMaterial color={WOOD_D} /></mesh>)}
      <mesh position={[0, 0.72, 0.12]} castShadow><boxGeometry args={[0.5, 0.34, 0.04]} /><meshStandardMaterial color="#22252e" /></mesh>
      <mesh position={[0, 0.72, 0.098]}><planeGeometry args={[0.44, 0.28]} /><meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.6 + night * 1.2} side={THREE.DoubleSide} /></mesh>
    </group>))}
    {/* shed */}
    <group position={[cx - 1.2, 0, cz + 3.1]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow><boxGeometry args={[2.2, 1.6, 1.6]} /><meshStandardMaterial color="#c0763f" /></mesh>
      <mesh position={[0, 1.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.6, 0.8, 4]} /><meshStandardMaterial color="#6b3f22" flatShading /></mesh>
      <mesh position={[0, 0.6, 0.81]}><boxGeometry args={[0.7, 1.1, 0.04]} /><meshStandardMaterial color="#5a3820" /></mesh>
    </group>
    {[[cx + 2.9, cz - 1.6], [cx + 3.0, cz - 0.9]].map((p, i) => <mesh key={i} position={[p[0], 0.25, p[1]]} rotation={[0, i * 0.5, 0]} castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#b98a52" /></mesh>)}
    <Sign text="Workshop" position={[cx + 2.7, 0, cz + 1.7]} />
  </group>);
}

function Library({ night }) {
  const win = new THREE.Color('#ffd27a');
  return (<group position={[LIBRARY.pos[0], 0, LIBRARY.pos[1]]} rotation={[0, LIBRARY.rot, 0]}>
    <mesh position={[0, 0.12, 0.2]} receiveShadow castShadow><boxGeometry args={[4.2, 0.24, 3.2]} /><meshStandardMaterial color="#d8d2c4" /></mesh>
    <mesh position={[0, 1.45, 0]} castShadow receiveShadow><boxGeometry args={[3.6, 2.5, 2.4]} /><meshStandardMaterial color="#e9e1cf" /></mesh>
    <mesh position={[0, 3.15, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.05, 1, 0.75]} castShadow><cylinderGeometry args={[0.01, 2.55, 0.9, 4, 1]} /><meshStandardMaterial color="#5b6b8c" flatShading /></mesh>
    {[-1.5, -0.5, 0.5, 1.5].map((x) => <mesh key={x} position={[x, 1.4, 1.35]} castShadow><cylinderGeometry args={[0.12, 0.14, 2.3, 10]} /><meshStandardMaterial color="#f5f0e6" /></mesh>)}
    <mesh position={[0, 0.85, 1.21]}><boxGeometry args={[0.8, 1.3, 0.05]} /><meshStandardMaterial color="#4a3221" /></mesh>
    {[-1.05, 1.05].map((x) => (<group key={x} position={[x, 1.55, 1.21]}>
      <mesh><boxGeometry args={[0.7, 0.8, 0.04]} /><meshStandardMaterial color="#3b2b20" /></mesh>
      {[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => <mesh key={r * 9 + c} position={[-0.24 + c * 0.12, -0.25 + r * 0.25, 0.03]}><boxGeometry args={[0.08, 0.18, 0.03]} /><meshStandardMaterial color={['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea'][(r + c) % 5]} emissive={win} emissiveIntensity={night * 0.35} /></mesh>))}
    </group>))}
    {[-1.5, 0, 1.5].map((x) => <mesh key={x} position={[x, 0.22, 2.75]} castShadow><boxGeometry args={[0.9, 0.08, 0.3]} /><meshStandardMaterial color={WOOD} /></mesh>)}
    <Sign text="Library" position={[2.3, 0, 1.9]} />
  </group>);
}

function Cafe({ night }) {
  const stripes = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
  return (<group>
    <group position={[CAFE.pos[0], 0, CAFE.pos[1]]} rotation={[0, CAFE.rot, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow><boxGeometry args={[2.8, 2.1, 2.0]} /><meshStandardMaterial color="#fbe3c4" /></mesh>
      <mesh position={[0, 2.35, 0]} castShadow><boxGeometry args={[3.0, 0.5, 2.2]} /><meshStandardMaterial color="#7a4b2a" /></mesh>
      {stripes.map((i) => <mesh key={i} position={[-1.2 + i * 0.4, 1.95, 1.3]} rotation={[0.5, 0, 0]} castShadow><boxGeometry args={[0.4, 0.06, 0.8]} /><meshStandardMaterial color={i % 2 ? '#ffffff' : '#e5484d'} /></mesh>)}
      <mesh position={[0.6, 0.75, 1.01]}><boxGeometry args={[0.6, 1.5, 0.04]} /><meshStandardMaterial color="#6b3f22" /></mesh>
      <mesh position={[-0.6, 1.1, 1.01]}><boxGeometry args={[0.9, 0.7, 0.04]} /><meshStandardMaterial color="#ffe7a8" emissive="#ffb54a" emissiveIntensity={0.15 + night * 1.6} /></mesh>
      <Sign text="Café" position={[-1.7, 0, 1.3]} color="#ffe2e2" />
    </group>
    {CAFE_TABLES.map(([x, z], i) => (<group key={i} position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.38, 0.38, 0.06, 18]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.05, 0.08, 0.5, 8]} /><meshStandardMaterial color="#555" /></mesh>
      <mesh position={[0, 1.85, 0]} castShadow><coneGeometry args={[0.62, 0.32, 12]} /><meshStandardMaterial color={['#e5484d', '#3b82f6', '#22b8a8'][i]} /></mesh>
      <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.025, 0.025, 1.4, 6]} /><meshStandardMaterial color="#ddd" /></mesh>
    </group>))}
  </group>);
}

function Mailbox({ waiting }) {
  const flag = useRef();
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.z = waiting ? -0.2 + Math.sin(clock.elapsedTime * 6) * 0.25 : -1.5; });
  return (<group position={[MAILBOX.pos[0], 0, MAILBOX.pos[1]]} rotation={[0, Math.PI / 4, 0]}>
    <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.12, 1.0, 0.12]} /><meshStandardMaterial color={WOOD_D} /></mesh>
    <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.75, 20, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#2f6fd6" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[0.56, 0.25, 0.75]} /><meshStandardMaterial color="#2f6fd6" /></mesh>
    <group ref={flag} position={[0.3, 1.05, -0.15]}><mesh position={[0, 0.25, 0]}><boxGeometry args={[0.04, 0.5, 0.04]} /><meshStandardMaterial color="#888" /></mesh><mesh position={[0.1, 0.42, 0]}><boxGeometry args={[0.22, 0.15, 0.03]} /><meshStandardMaterial color="#ef4444" /></mesh></group>
    <Sign text="Waiting on you" position={[-0.75, 0, 0.1]} color="#ffe2e2" />
  </group>);
}

function Lamp({ p, night }) {
  return (<group position={[p[0], 0, p[1]]}>
    <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.05, 0.07, 2.0, 8]} /><meshStandardMaterial color="#3a3a44" /></mesh>
    <mesh position={[0, 2.1, 0]}><sphereGeometry args={[0.18, 14, 10]} /><meshStandardMaterial color="#fff3c4" emissive="#ffcf6b" emissiveIntensity={0.1 + night * 3} toneMapped={false} /></mesh>
    {night > 0.05 && <pointLight position={[0, 2.0, 0]} intensity={night * 9} distance={8} decay={1.6} color="#ffcf8a" />}
  </group>);
}

function Well() {
  return (<group>
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow><cylinderGeometry args={[0.7, 0.75, 0.5, 20]} /><meshStandardMaterial color="#9aa0a6" flatShading /></mesh>
    <mesh position={[0, 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.58, 20]} /><meshStandardMaterial color="#4aa3df" roughness={0.1} /></mesh>
    {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.9, 0]}><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color={WOOD_D} /></mesh>)}
    <mesh position={[0, 1.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><coneGeometry args={[0.55, 1.6, 4]} /><meshStandardMaterial color="#b45309" flatShading /></mesh>
  </group>);
}

export function House({ house, bot, night, onSelect }) {
  const color = botColor(bot); const wall = mix(color, '#fff7ea', 0.62); const roof = mix(color, '#2a1a10', 0.25);
  const home = bot.state === 'idle' || bot.state === 'stale'; const lit = home && bot.state !== 'stale' ? 1 : bot.state === 'stale' ? 0.25 : 0.1;
  return (<group position={[house.pos[0], 0, house.pos[1]]} rotation={[0, house.rot, 0]}
    onClick={(e) => { e.stopPropagation(); onSelect(bot.id); }}>
    <mesh position={[0, 0.75, 0]} castShadow receiveShadow><boxGeometry args={[2.0, 1.5, 1.8]} /><meshStandardMaterial color={wall} /></mesh>
    <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.62, 0.95, 4]} /><meshStandardMaterial color={roof} flatShading /></mesh>
    <mesh position={[0.5, 2.0, -0.3]} castShadow><boxGeometry args={[0.22, 0.6, 0.22]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
    <mesh position={[0, 0.55, 0.91]}><boxGeometry args={[0.5, 1.0, 0.04]} /><meshStandardMaterial color="#6b3f22" /></mesh>
    <mesh position={[0.17, 0.55, 0.94]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color="#facc15" /></mesh>
    {[-0.62, 0.62].map((x) => (<group key={x} position={[x, 0.9, 0.91]}>
      <mesh><boxGeometry args={[0.42, 0.42, 0.04]} /><meshStandardMaterial color="#fff2c2" emissive="#ffb547" emissiveIntensity={0.05 + night * lit * 2.2} /></mesh>
      <mesh position={[0, 0, 0.025]}><boxGeometry args={[0.04, 0.42, 0.02]} /><meshStandardMaterial color="#6b3f22" /></mesh>
      <mesh position={[0, 0, 0.025]}><boxGeometry args={[0.42, 0.04, 0.02]} /><meshStandardMaterial color="#6b3f22" /></mesh>
    </group>))}
    <mesh position={[0, 0.012, 1.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[0.9, 0.6]} /><meshStandardMaterial color={mix(color, '#d9c6a0', 0.5)} /></mesh>
    <mesh position={[0.75, 0.22, 1.3]} castShadow><boxGeometry args={[0.8, 0.08, 0.3]} /><meshStandardMaterial color={WOOD} /></mesh>
    <group position={[-1.2, 0, 1.2]}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.06, 0.8, 0.06]} /><meshStandardMaterial color={WOOD_D} /></mesh>
      <Html position={[0, 0.95, 0]} center distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="housesign" style={{ borderColor: color }}>{bot.name}</div></Html>
    </group>
  </group>);
}

export default function Island({ night, snow, waiting }) {
  return (<group>
    <Terrain snow={snow} />
    <Trees snow={snow} />
    <Workshop night={night} />
    <Library night={night} />
    <Cafe night={night} />
    <Mailbox waiting={waiting} />
    <Well />
    {LAMPS.map((p, i) => <Lamp key={i} p={p} night={night} />)}
  </group>);
}
