// Idle-activity structures (hot tubs, ice bath, bubble vent, trampoline, volleyball, vine swing, snow fort,
// seahorse ride, harp stage, lava pit). Fixed footprints from layout.js FUN_TYPES; placed by the layout engine
// like any zone instance. Local +z faces the island center.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';
import { mergeParts, G, MAT } from './parts.js';
import { growOf } from './layout.js';
import { EXT } from './ext.js';
export { Rising, Place, useSize, busy };

const busy = (inst, occupied) => [...Array(8).keys()].some((i) => occupied?.has(`${inst.id}:${i}`));
const dummy = new THREE.Object3D();
// rising puffs (steam / mist / bubbles): instanced spheres that grow then shrink as they rise
function Rising({ n = 14, r = 1, h = 1.4, color = '#fff', size = 0.22, speed = 0.35, opacity = 0.35, y0 = 0, drift = 0.3, emissive }) {
  const ref = useRef(); const seeds = useMemo(() => Array.from({ length: n }, () => [Math.random(), Math.random() * Math.PI * 2, Math.sqrt(Math.random()) * r, Math.random()]), [n, r]);
  useFrame(({ clock }) => { const m = ref.current; if (!m) return; const t = clock.elapsedTime;
    seeds.forEach(([ph, a, rr, k], i) => { const f = (t * speed * (0.7 + k * 0.6) + ph) % 1; const s = size * Math.sin(f * Math.PI) * (0.6 + f);
      dummy.position.set(Math.cos(a + f) * (rr + f * drift), y0 + f * h, Math.sin(a + f) * (rr + f * drift)); dummy.scale.setScalar(Math.max(0.001, s)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={ref} args={[null, null, n]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} />
    <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={1} emissive={emissive || '#000'} emissiveIntensity={emissive ? 0.6 : 0} /></instancedMesh>;
}
// g: optional grow ref (scaled x/z with the head count); fixed: children that move but never scale
const Place = ({ inst, children, rot = true, g, fixed }) => { const { layout } = useWorld(); return <group position={[inst.x, layout.groundY(inst.x, inst.z), inst.z]} rotation={[0, rot ? inst.rot : 0, 0]}><group ref={g}>{children}</group>{fixed}</group>; };
const useSize = (type, inst, count) => useGrow(growOf(type, inst).scale(count || 0));

// ---------- tubs: wood / jungle / onsen / heated / cloud / ice / vent ----------
const TUB = {
  wood: { wall: '#9a6a3c', band: '#4b4b4b', water: '#56c8d8', steam: '#ffffff' },
  jungle: { wall: '#7d5a33', band: '#4f7a2c', water: '#5fc0b0', steam: '#ffffff' },
  onsen: { wall: '#8f8b84', band: '#6f6b64', water: '#8fd6cf', steam: '#ffffff' },
  heated: { wall: '#7d8fa3', band: '#c7d2de', water: '#62c4e6', steam: '#ffffff' },
  cloud: { wall: '#ffffff', band: '#ffe6a0', water: '#ffe7b0', steam: '#fff6dc' },
  ice: { wall: '#bfe6ff', band: '#e8f7ff', water: '#8fd2f5', steam: '#dff4ff' },
};
const ICE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.1, emissive: '#5ab8ff', emissiveIntensity: 0.55, transparent: true, opacity: 0.92 });
export function HotTub(props) {
  const XF = EXT.fun['HotTub:' + (props.cfg?.style || '')]; if (XF) return <XF {...props} />;
  return <HotTubBase {...props} />;
}
function HotTubBase({ inst, cfg, occupied, count }) {
  const style = cfg.style || 'wood'; if (style === 'vent') return <BubbleVent inst={inst} count={count} />;
  const [g] = useSize('HotTub', inst, count);
  const C = TUB[style] || TUB.wood; const ice = style === 'ice';
  const geo = useMemo(() => { const P = []; const r = (s) => { let x = Math.sin(s * 99.1) * 43758.5; return x - Math.floor(x); };
    if (style === 'onsen') { for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; P.push([G.dodec(0.3 + r(i) * 0.12), r(i + 3) < 0.5 ? '#8f8b84' : '#a19d95', [Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3], [r(i), r(i + 1), 0], [1, 1.25, 1]]); }
      P.push([G.cyl(1.2, 1.2, 0.1, 20), '#5d5a55', [0, 0.02, 0]]); }
    else if (style === 'cloud') { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P.push([G.sph(0.36 + r(i) * 0.1, 10, 8), i % 2 ? '#ffffff' : '#f4f1ff', [Math.cos(a) * 1.25, 0.32, Math.sin(a) * 1.25]]); }
      P.push([G.cyl(1.25, 1.1, 0.2, 20), '#ffffff', [0, 0.1, 0]]); }
    else { P.push([G.cyl(1.3, 1.22, 0.62, 24, true), C.wall, [0, 0.31, 0]], [G.cyl(1.18, 1.12, 0.62, 24, true), C.wall, [0, 0.31, 0]], [G.torus(1.25, 0.06, 6, 28), C.band, [0, 0.62, 0], [Math.PI / 2, 0, 0]],
      [G.torus(1.29, 0.03, 4, 28), C.band, [0, 0.18, 0], [Math.PI / 2, 0, 0]], [G.cyl(1.2, 1.2, 0.06, 24), C.wall, [0, 0.03, 0]], [G.box(0.9, 0.22, 0.45), C.wall, [0, 0.11, 1.55]]);
      if (style === 'jungle') for (let i = 0; i < 9; i++) { const a = r(i + 9) * 6.28; P.push([G.sph(0.14, 6, 4), '#4f8a2c', [Math.cos(a) * 1.26, 0.64, Math.sin(a) * 1.26], [0, 0, 0], [1.4, 0.5, 1]]); }
      if (style === 'heated') { P.push([G.box(0.5, 0.5, 0.4), '#56606c', [1.45, 0.25, -0.6]]); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; P.push([G.sph(0.15, 6, 4), '#f6fbff', [Math.cos(a) * 1.25, 0.66, Math.sin(a) * 1.25], [0, 0, 0], [1.6, 0.45, 1]]); } }
      if (ice) for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; P.push([G.ico(0.16 + r(i) * 0.08), '#e9f8ff', [Math.cos(a) * 1.3, 0.62 + r(i + 2) * 0.1, Math.sin(a) * 1.3], [r(i), r(i + 5), 0]]); } }
    return mergeParts(P); }, [style]); // eslint-disable-line
  const cubes = useRef(); const on = busy(inst, occupied);
  useFrame(({ clock }) => { const t = clock.elapsedTime; if (cubes.current) cubes.current.children.forEach((c, i) => { c.position.y = 0.46 + Math.sin(t * 1.3 + i) * 0.025; c.rotation.y = t * 0.2 + i; }); });
  const wy = style === 'onsen' ? 0.34 : style === 'cloud' ? 0.42 : 0.47;
  return (<Place inst={inst} g={g}>
    <mesh geometry={geo} material={ice ? ICE_MAT : MAT.vc} castShadow receiveShadow />
    <mesh position={[0, wy, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.17, 28]} /><meshStandardMaterial color={C.water} roughness={0.15} metalness={0.1} transparent opacity={0.88} emissive={style === 'heated' || style === 'wood' || style === 'jungle' ? '#0e5d6b' : '#000'} emissiveIntensity={0.25} /></mesh>
    {style === 'heated' && <mesh position={[1.45, 0.42, -0.39]}><boxGeometry args={[0.3, 0.12, 0.02]} /><meshBasicMaterial color="#ff8a2a" toneMapped={false} /></mesh>}
    {ice && <group ref={cubes}>{[[0.4, 0.3], [-0.5, 0.2], [0.1, -0.55], [-0.2, 0.6], [0.65, -0.3], [-0.7, -0.35]].map(([x, z], i) => <mesh key={i} position={[x, 0.46, z]}><boxGeometry args={[0.2, 0.18, 0.2]} /><meshStandardMaterial color="#eefaff" transparent opacity={0.8} roughness={0.1} /></mesh>)}</group>}
    {ice ? <><Rising n={22} r={1.3} h={0.7} y0={wy - 0.1} color="#eaf8ff" size={0.38} speed={0.15} opacity={0.45} drift={0.9} emissive="#7cc8ff" /><pointLight position={[0, 1.2, 0]} color="#8fd8ff" intensity={4} distance={4} /></>
      : <Rising n={on ? 18 : 10} r={0.9} h={style === 'onsen' ? 2.0 : 1.5} y0={wy} color={C.steam} size={0.26} speed={0.28} opacity={style === 'onsen' ? 0.4 : 0.3} />}
    <Rising n={10} r={0.95} h={0.06} y0={wy - 0.02} color="#ffffff" size={0.05} speed={1.2} opacity={0.7} drift={0} />
  </Place>);
}
function BubbleVent({ inst, count }) {
  const [g] = useSize('HotTub', inst, count);
  const geo = useMemo(() => mergeParts([[G.cyl(0.55, 1.0, 0.5, 9), '#5a4e60', [0, 0.25, 0]], [G.cyl(0.35, 0.55, 0.25, 9), '#4a3e50', [0, 0.6, 0]],
    ...Array.from({ length: 8 }, (_, i) => [G.dodec(0.25), '#6c5e6c', [Math.cos(i * 0.8) * 1.2, 0.12, Math.sin(i * 0.8) * 1.2]])]), []);
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh position={[0, 0.74, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.32, 14]} /><meshBasicMaterial color="#6ff6e8" toneMapped={false} /></mesh>
    <Rising n={34} r={0.45} h={4.5} y0={0.7} color="#cffcff" size={0.13} speed={0.3} opacity={0.55} drift={0.5} emissive="#4ad8e0" /></Place>);
}

// ---------- moon trampoline ----------
export function Trampoline(props) {
  const XF = EXT.fun['Trampoline:' + (props.cfg?.style || '')]; if (XF) return <XF {...props} />;
  return <TrampolineBase {...props} />;
}
function TrampolineBase({ inst, count }) {
  const [g] = useSize('Trampoline', inst, count);
  const geo = useMemo(() => mergeParts([[G.torus(1.35, 0.07, 6, 28), '#c8ccd4', [0, 0.5, 0], [Math.PI / 2, 0, 0]],
    ...Array.from({ length: 6 }, (_, i) => [G.cyl(0.05, 0.05, 0.5, 6), '#9aa0aa', [Math.cos(i * 1.047) * 1.3, 0.25, Math.sin(i * 1.047) * 1.3]]),
    ...Array.from({ length: 24 }, (_, i) => [G.cyl(0.02, 0.02, 0.22, 4), '#e0e4ea', [Math.cos(i * 0.2618) * 1.22, 0.5, Math.sin(i * 0.2618) * 1.22], [0, -i * 0.2618, Math.PI / 2]])]), []);
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vcGloss} castShadow receiveShadow />
    <mesh position={[0, 0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.12, 28]} /><meshStandardMaterial color="#26293a" roughness={0.6} /></mesh>
    <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.0, 1.12, 28]} /><meshBasicMaterial color="#56e0ff" toneMapped={false} /></mesh></Place>);
}

// ---------- tropical beach volleyball ----------
export function Volleyball(props) {
  const XF = EXT.fun['Volleyball:' + (props.cfg?.style || '')]; if (XF) return <XF {...props} />;
  return <VolleyballBase {...props} />;
}
function VolleyballBase({ inst, occupied, count }) {
  const [g] = useSize('Volleyball', inst, count);
  const geo = useMemo(() => mergeParts([[G.box(2.9, 0.04, 4.0), '#f2dfae', [0, 0.02, 0]], [G.box(2.9, 0.045, 0.05), '#ffffff', [0, 0.03, 1.98]], [G.box(2.9, 0.045, 0.05), '#ffffff', [0, 0.03, -1.98]],
    [G.box(0.05, 0.045, 4.0), '#ffffff', [1.43, 0.03, 0]], [G.box(0.05, 0.045, 4.0), '#ffffff', [-1.43, 0.03, 0]],
    [G.cyl(0.06, 0.06, 1.9, 6), '#8a5a30', [1.6, 0.95, 0]], [G.cyl(0.06, 0.06, 1.9, 6), '#8a5a30', [-1.6, 0.95, 0]], [G.box(3.2, 0.06, 0.03), '#ffffff', [0, 1.78, 0]]]), []);
  const ball = useRef(); const on = busy(inst, occupied);
  useFrame(({ clock }) => { const b = ball.current; if (!b) return; b.visible = on; const k = (clock.elapsedTime * 0.45) % 1; const side = Math.floor(clock.elapsedTime * 0.45) % 2 ? 1 : -1;
    b.position.set(Math.sin(clock.elapsedTime * 0.9) * 0.5, 1.0 + Math.sin(k * Math.PI) * 1.1, side * (1.1 - 2.2 * k)); b.rotation.x += 0.05; });
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vc} receiveShadow castShadow />
    <mesh position={[0, 1.45, 0]}><planeGeometry args={[3.2, 0.62, 12, 3]} /><meshStandardMaterial color="#222" wireframe /></mesh>
    <mesh ref={ball} castShadow><sphereGeometry args={[0.2, 14, 10]} /><meshStandardMaterial color="#ffd23f" emissive="#ff9a00" emissiveIntensity={0.25} /></mesh></Place>);
}

// ---------- jungle vine swing (bots swing on the vines; swing phase shared with Blob via SWING) ----------
export const SWING = { w: 1.7, amp: 0.85, L: 2.0, top: 3.1 };
export function VineSwing({ inst, occupied, count }) {
  const Gr = growOf('VineSwing', inst); const [g, cur] = useSize('VineSwing', inst, count); const V = Gr.vines(count || 0);
  const branch = useMemo(() => mergeParts([[G.cyl(0.18, 0.2, 3.3, 8), '#5e4026', [0, SWING.top + 0.1, 0], [0, 0, Math.PI / 2]], [G.ico(0.85, 0), '#3f7d2a', [0, 3.6, 0], [0.3, 0, 0], [1.2, 0.8, 1.0]]]), []);
  const post = useMemo(() => mergeParts([[G.cyl(0.24, 0.34, 3.4, 8), '#6b4a2b', [0, 1.7, 0]], [G.ico(0.85, 0), '#3f7d2a', [0, 3.6, 0], [0.3, 1, 0], [1.2, 0.8, 1.0]]]), []);
  const posts = useRef(); const vines = useRef(); const on = busy(inst, occupied);
  useFrame(({ clock }) => { const sx = cur.current?.[0] ?? 1; if (posts.current) posts.current.children.forEach((c, i) => { c.position.x = (i ? 1 : -1) * 1.45 * sx; });
    if (vines.current) vines.current.children.forEach((v) => { v.rotation.x = on ? Math.sin(clock.elapsedTime * SWING.w) * SWING.amp : Math.sin(clock.elapsedTime * 0.8) * 0.06; }); });
  return (<Place inst={inst} g={g} fixed={<>
    <group ref={posts}>{[0, 1].map((i) => <mesh key={i} geometry={post} material={MAT.vcFlat} castShadow receiveShadow />)}</group>
    <group ref={vines}>{Array.from({ length: V }, (_, i) => (i - (V - 1) / 2) * 0.85).map((x) => <group key={x} position={[x, SWING.top, 0]}>
      <mesh position={[0, -SWING.L / 2, 0]}><cylinderGeometry args={[0.03, 0.03, SWING.L, 5]} /><meshStandardMaterial color="#4f7a2c" /></mesh>
      <mesh position={[0, -SWING.L, 0]}><boxGeometry args={[0.5, 0.06, 0.3]} /><meshStandardMaterial color="#7d5a33" /></mesh></group>)}</group></>}>
    <mesh geometry={branch} material={MAT.vcFlat} castShadow receiveShadow /></Place>);
}

// ---------- antarctica snow fort (snowball fight) ----------
export function SnowFort({ inst, occupied, count }) {
  const [g] = useSize('SnowFort', inst, count);
  const geo = useMemo(() => { const P = []; for (const s of [-1, 1]) { for (let i = 0; i < 7; i++) { const x = -1.2 + i * 0.4; P.push([G.box(0.42, 0.5, 0.36), i % 2 ? '#f4f9ff' : '#e6f0fb', [x, 0.25, s * 0.95 + Math.abs(x) * 0.15 * s], [0, x * 0.15 * s, 0]]); }
    for (let i = 0; i < 5; i++) P.push([G.sph(0.11, 8, 6), '#ffffff', [0.9 + (i % 3) * 0.2, 0.11 + (i > 2 ? 0.16 : 0), s * 1.6]]); } return mergeParts(P); }, []);
  const balls = useRef(); const on = busy(inst, occupied);
  useFrame(({ clock }) => { if (!balls.current) return; balls.current.children.forEach((b, i) => { b.visible = on; const k = (clock.elapsedTime * 0.7 + i * 0.5) % 1; const s = i % 2 ? 1 : -1;
    b.position.set((i - 1.5) * 0.5, 0.8 + Math.sin(k * Math.PI) * 1.0, s * (1.6 - 3.2 * k)); }); });
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vc} castShadow receiveShadow />
    <group ref={balls}>{[0, 1, 2, 3].map((i) => <mesh key={i}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#fff" /></mesh>)}</group></Place>);
}

// ---------- atlantis seahorse carousel (orbit shared with Blob via RIDE) ----------
export const RIDE = { w: 0.55, r: 1.45 };
function seahorseGeo(color) { return mergeParts([[G.sph(0.22, 10, 8), color, [0, 0.35, 0], [0, 0, 0], [0.8, 1.2, 0.9]], [G.sph(0.14, 8, 6), color, [0, 0.72, 0.12], [0, 0, 0], [0.8, 1, 1.4]],
  [G.cone(0.06, 0.25, 6), color, [0, 0.7, 0.36], [Math.PI / 2, 0, 0]], [G.torus(0.12, 0.045, 5, 10, Math.PI * 1.4), color, [0, 0.05, -0.08], [0, Math.PI / 2, 0]], [G.cone(0.09, 0.25, 4), '#ffd23f', [0, 0.78, -0.1], [-0.6, 0, 0]]]); }
export function SeahorseRide({ inst, cfg, count }) {
  const { layout } = useWorld(); const grp = useRef(); const Gr = growOf('SeahorseRide', inst); const H = Gr.horses(count || 0); const [g, cur] = useSize('SeahorseRide', inst, count);
  const kit = EXT.ride[cfg?.style || '']; const extra = kit?.Extra;
  const geos = useMemo(() => kit?.riders ? kit.riders() : ['#ff9a4a', '#ffd23f', '#ff6fa8', '#6fe0d0'].map(seahorseGeo), [kit]);
  const pole = useMemo(() => kit?.pole ? kit.pole() : mergeParts([[G.cyl(0.14, 0.2, 2.6, 8), '#f2b8c6', [0, 1.3, 0]], [G.dome(0.5), '#ff8fb0', [0, 2.6, 0]]]), [kit]);
  const disc = useMemo(() => kit?.disc ? kit.disc() : mergeParts([[G.cyl(1.9, 1.9, 0.08, 32), '#d8c7a8', [0, 0.04, 0]]]), [kit]);
  const Extra = extra; const rod = kit ? !!kit.rod : true;
  useFrame(({ clock }) => { const gr = grp.current; if (!gr) return; const t = clock.elapsedTime; const R = RIDE.r * (cur.current?.[0] ?? 1); gr.rotation.y = -RIDE.w * t;
    gr.children.forEach((c, i) => { const a = (i / gr.children.length) * Math.PI * 2; c.position.set(Math.cos(a) * R, 0.15 + Math.sin(t * 2 + i * 1.6) * 0.12, Math.sin(a) * R); }); });
  return (<group position={[inst.x, layout.groundY(inst.x, inst.z), inst.z]}><mesh geometry={pole} material={MAT.vc} castShadow receiveShadow /><group ref={g}><mesh geometry={disc} material={MAT.vc} receiveShadow /></group>{Extra && <Extra inst={inst} count={count} />}
    <group ref={grp}>{Array.from({ length: H }, (_, i) => { const a = (i / H) * Math.PI * 2; return <group key={i} rotation={[0, Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI, 0]}>
      <mesh geometry={geos[i % geos.length]} material={MAT.vc} castShadow />{rod && <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.02, 0.02, 2.2, 4]} /><meshStandardMaterial color="#e8d8b0" /></mesh>}</group>; })}</group></group>);
}

// ---------- heaven harp stage ----------
export function HarpStage({ inst, count }) {
  const [g] = useSize('HarpStage', inst, count);
  const geo = useMemo(() => { const P = [[G.cyl(1.6, 1.5, 0.22, 24), '#ffffff', [0, 0.11, 0]], ...Array.from({ length: 12 }, (_, i) => [G.sph(0.3, 8, 6), '#f6f2ff', [Math.cos(i * 0.52) * 1.6, 0.12, Math.sin(i * 0.52) * 1.6], [0, 0, 0], [1, 0.6, 1]])];
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.95; const x = Math.cos(a) * 0.6, z = Math.sin(a) * 0.6; const ry = Math.atan2(-x, -z) + Math.PI / 2;
      P.push([G.torus(0.62, 0.06, 5, 14, Math.PI * 0.9), '#f0c650', [x, 1.0, z], [0, ry, 0.4]], [G.cyl(0.06, 0.08, 1.3, 6), '#f0c650', [x, 0.85, z]], [G.cyl(0.18, 0.22, 0.12, 8), '#f0c650', [x, 0.28, z]]);
      for (let s = 0; s < 6; s++) P.push([G.cyl(0.008, 0.008, 0.85, 3), '#fff6d0', [x + Math.cos(ry) * (0.1 + s * 0.08), 0.95, z - Math.sin(ry) * (0.1 + s * 0.08)]]); }
    return mergeParts(P); }, []);
  return <Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vcGloss} castShadow receiveShadow /><Rising n={8} r={1.2} h={2.4} y0={0.8} color="#fff1b8" size={0.06} speed={0.25} opacity={0.8} emissive="#ffd860" /></Place>;
}

// ---------- hell lava pit (marshmallow roasting) ----------
export function LavaPit(props) {
  const XF = EXT.fun['LavaPit:' + (props.cfg?.style || '')]; if (XF) return <XF {...props} />;
  return <LavaPitBase {...props} />;
}
function LavaPitBase({ inst, count }) {
  const [g] = useSize('LavaPit', inst, count);
  const geo = useMemo(() => mergeParts(Array.from({ length: 12 }, (_, i) => [G.dodec(0.3), i % 2 ? '#2b2224' : '#3a2c2c', [Math.cos(i * 0.5236) * 0.95, 0.16, Math.sin(i * 0.5236) * 0.95], [i, i * 2, 0], [1, 0.7, 1]])), []);
  const lava = useRef(); useFrame(({ clock }) => { if (lava.current) lava.current.color.setRGB(1, 0.35 + Math.sin(clock.elapsedTime * 2) * 0.08, 0.05); });
  return (<Place inst={inst} g={g}><mesh geometry={geo} material={MAT.vcFlat} castShadow receiveShadow />
    <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 18]} /><meshBasicMaterial ref={lava} toneMapped={false} /></mesh>
    <pointLight position={[0, 0.8, 0]} color="#ff6a1a" intensity={6} distance={5} />
    <Rising n={12} r={0.5} h={1.3} y0={0.15} color="#ffb040" size={0.08} speed={0.6} opacity={0.9} emissive="#ff6a00" drift={0.1} /></Place>);
}

// smooth resize: lerps a group's x/z scale toward the size needed for `count` seats (activity structures only)
export function useGrow(target) {
  const g = useRef(); const cur = useRef(null);
  useFrame((_, dt) => { const t = target; if (!cur.current) cur.current = [...t]; const k = Math.min(1, dt * 2.2);
    cur.current[0] += (t[0] - cur.current[0]) * k; cur.current[1] += (t[1] - cur.current[1]) * k; if (g.current) g.current.scale.set(cur.current[0], 1, cur.current[1]); });
  return [g, cur];
}
