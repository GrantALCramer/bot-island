import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';

const VERT = `attribute float aSeed; uniform float uTime, uSize; varying float vA;
void main(){ vec3 p = position; float t = uTime*0.35 + aSeed*10.;
  p += vec3(sin(t*1.3+aSeed)*0.9, sin(t*1.7+aSeed*3.)*0.35, cos(t*1.1+aSeed*5.)*0.9);
  vA = smoothstep(0.2, 1.0, sin(uTime*(1.5+aSeed)+aSeed*20.)*0.5+0.5);
  vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(0.6+vA)*(30./-mv.z); }`;
const FRAG = `uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a*vA*uOpacity); }`;

// Fireflies drift around the vegetation and only show at night.
export function Fireflies() {
  const { env, layout } = useWorld(); const R = layout.R; const count = Math.round(Math.min(260, 7 * R));
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3); const s = new Float32Array(count);
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2; const r = 3.5 + Math.random() * (R - 1.5); p.set([Math.cos(a) * r, 0.4 + Math.random() * 2.2, Math.sin(a) * r], i * 3); s[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); return g;
  }, [count, R]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: 5 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#d8ff6a').multiplyScalar(3) } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; const n = 1 - (env.current?.day ?? 1); mat.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(n, 0.4, 0.8) * (1 - (env.current?.gray ?? 0) * 0.8); });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

// Bubbles rise from the sea floor, more around the homes and the vent (underwater themes).
export function Bubbles() {
  const { layout } = useWorld(); const E = layout.extent; const count = Math.round(Math.min(500, 6 * E));
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3); const hs = layout.homes;
    for (let i = 0; i < count; i++) { let x, z; if (i % 3 === 0 && hs.length) { const h = hs[i % hs.length]; x = h.x + (Math.random() - 0.5) * 1.5; z = h.z + (Math.random() - 0.5) * 1.5; } else if (i % 7 === 1) { x = (Math.random() - 0.5) * 1.2; z = (Math.random() - 0.5) * 1.2; } else { x = (Math.random() - 0.5) * E * 2; z = (Math.random() - 0.5) * E * 2; }
      p.set([x, Math.random() * 14, z], i * 3); } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; }, [count, layout]);
  useFrame(({ clock }, dt) => { const a = geo.attributes.position.array; for (let i = 0; i < count; i++) { a[i * 3 + 1] += (0.6 + (i % 7) * 0.12) * Math.min(dt, 0.05); a[i * 3] += Math.sin(clock.elapsedTime * 2 + i) * 0.004; if (a[i * 3 + 1] > 14) a[i * 3 + 1] = 0; } geo.attributes.position.needsUpdate = true; });
  return <points geometry={geo}><pointsMaterial color="#e0ffff" size={0.14} transparent opacity={0.65} depthWrite={false} /></points>;
}
