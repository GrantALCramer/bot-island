// Shared helpers for the town-style theme packs (City, Old West, Candy, Glade).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';
import { angDiff } from './layout.js';

export const BACK = Math.PI * 1.25; export const CAM_AZ = Math.PI / 4;
export const camSide = (a, w) => Math.abs(angDiff(a, CAM_AZ)) < w;
export const backPts = (n, r, spread = 2.4) => Array.from({ length: n }, (_, i) => { const a = BACK + (i / (n - 1) - 0.5) * spread; return [Math.cos(a) * r, Math.sin(a) * r, a]; });
export const sel = (onSelect, bot) => (e) => { e.stopPropagation(); onSelect(bot.id); };
export const nightK = (env) => THREE.MathUtils.smoothstep(1 - (env.current?.day ?? 1), 0.25, 0.6);
export const hashStr = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h; };
// vertex-colored material that is dim by day and glows at night (windows, neon, lamp globes, glowing mushrooms)
export function useNightGlow(day = 0.3, night = 2.4, { flicker = 0, opacity = 1 } = {}) {
  const { env } = useWorld();
  const m = useMemo(() => { const x = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: opacity < 1, opacity }); x.userData.baseOpacity = opacity; return x; }, [opacity]);
  useFrame(({ clock }) => { const n = nightK(env); const f = flicker ? 1 + Math.sin(clock.elapsedTime * 7.3) * flicker * Math.sin(clock.elapsedTime * 2.1) : 1; m.color.setScalar((day + (night - day) * n) * f); });
  return m;
}
// a blinking light (aviation beacon, server LED): basic material pulsing
export function Blink({ position, color = '#ff3030', r = 0.08, speed = 1.2, phase = 0 }) {
  const m = useRef(); const c = useMemo(() => new THREE.Color(color), [color]);
  useFrame(({ clock }) => { if (m.current) m.current.color.copy(c).multiplyScalar(((clock.elapsedTime * speed + phase) % 1) < 0.5 ? 3 : 0.3); });
  return <mesh position={position}><sphereGeometry args={[r, 8, 6]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>;
}
