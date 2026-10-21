import { createContext, useContext } from 'react';
import * as THREE from 'three';

// Shared world context: theme + environment values every world component may need.
export const WorldCtx = createContext(null);
export const useWorld = () => useContext(WorldCtx);
// Render quality. App sets QUALITY.lite before the Canvas mounts (the Canvas is keyed on it, so the world rebuilds).
export const QUALITY = { lite: false };
export const dens = (n, f = 0.45) => (QUALITY.lite ? Math.max(1, Math.round(n * f)) : n);

// Radial terrain height from a theme profile [[r, y], ...]
export function makeGroundY(profile) {
  return (x, z) => {
    const r = Math.hypot(x, z);
    for (let i = 0; i < profile.length - 1; i++) {
      const [r0, y0] = profile[i]; const [r1, y1] = profile[i + 1];
      if (r <= r1) { const t = Math.max(0, (r - r0) / (r1 - r0)); const s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; }
    }
    return profile[profile.length - 1][1];
  };
}
// Theme terrain is described relative to the land radius R (which the layout engine picks from the bot count).
export function profileFor(theme, R) {
  const T = theme.terrain; return [[0, T.top ?? 0.04], [R, T.top ?? 0.04], ...T.rel.map(([dr, y]) => [R + dr, y])];
}
// radius where terrain crosses the water level
export function shoreRadius(profile, level) {
  const g = makeGroundY(profile);
  for (let r = 0; r < 300; r += 0.02) if (g(r, 0) < level) return r;
  return 300;
}

// Sky keyframes -> { zenith, horizon, sun } colors at hour h
const cache = new Map();
export function sampleSky(keys, h) {
  const C = (c) => { if (!cache.has(c)) cache.set(c, new THREE.Color(c)); return cache.get(c); };
  h = ((h % 24) + 24) % 24;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (h >= a[0] && h <= b[0]) {
      const t = (h - a[0]) / (b[0] - a[0] || 1);
      return { zenith: C(a[1]).clone().lerp(C(b[1]), t), horizon: C(a[2]).clone().lerp(C(b[2]), t), sun: C(a[3]).clone().lerp(C(b[3]), t) };
    }
  }
  const k = keys[0]; return { zenith: C(k[1]).clone(), horizon: C(k[2]).clone(), sun: C(k[3]).clone() };
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function themeDay(theme, h) { const { riseHour: r, setHour: s } = theme.sun; return smooth(r - 0.9, r + 0.9, h) * (1 - smooth(s - 1.2, s + 0.8, h)); }

// Sun direction: rises opposite setAzimuth, arcs overhead, sets at setAzimuth.
export function sunDir(theme, h) {
  const { riseHour: r, setHour: s, setAzimuth: az } = theme.sun;
  const k = (h - r) / (s - r);
  const phi = az - Math.PI + k * Math.PI;
  const el = Math.sin(Math.min(Math.max(k, -0.15), 1.15) * Math.PI) * 1.05;
  return new THREE.Vector3(Math.cos(phi) * Math.cos(el), Math.sin(el), Math.sin(phi) * Math.cos(el));
}

// Holographic panel material (scrolling code / graphs). kind 0 = code, 1 = graph, 2 = doc/radar
export const HOLO_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
export const HOLO_FRAG = `
uniform float uTime, uSeed, uActive, uKind; uniform vec3 uColor; varying vec2 vUv;
float h1(float n){ return fract(sin(n)*43758.5453); }
void main(){
  vec2 uv = vUv; float a = 0.10;
  float sp = 0.35 + 0.65*uActive;
  if (uKind < 0.5) {
    float rows = 13.; float y = uv.y + uTime*0.07*sp; float row = floor(y*rows); float fy = fract(y*rows);
    float len = 0.2 + 0.6*h1(row*1.3 + uSeed*7.); float ind = 0.06 + 0.08*floor(h1(row*2.1+uSeed)*3.);
    float line = step(ind, uv.x)*step(uv.x, ind+len)*step(0.32, fy)*step(fy, 0.68);
    float acc = step(0.8, h1(row*5.7+uSeed));
    a += line*(0.5 + 0.35*acc);
  } else if (uKind < 1.5) {
    float g = 0.55 + 0.22*sin(uv.x*11. + uTime*1.6*sp + uSeed) + 0.08*sin(uv.x*29. - uTime*sp*2.);
    a += smoothstep(0.035, 0.0, abs(uv.y - g))*0.9;
    float bx = floor(uv.x*9.); float bh = 0.08 + 0.3*h1(bx + uSeed + floor(uTime*0.8*sp));
    a += step(uv.y, bh)*step(0.2, fract(uv.x*9.))*step(fract(uv.x*9.), 0.8)*0.35;
    a += step(0.985, fract(uv.y*5.))*0.12;
  } else {
    vec2 c = uv - 0.5; float r = length(c); float ang = atan(c.y, c.x);
    a += smoothstep(0.02, 0., abs(r - 0.32))*0.6 + smoothstep(0.015, 0., abs(r - 0.18))*0.4;
    float sweep = mod(ang - uTime*1.5*sp, 6.2832); a += smoothstep(0.9, 0., sweep)*step(r, 0.32)*0.4;
    float dots = step(0.93, h1(floor(uv.x*14.)*31. + floor(uv.y*14.) + uSeed))*step(r, 0.33);
    a += dots*0.6;
  }
  a += 0.06*sin(uv.y*180. + uTime*4.);
  float b = max(max(step(uv.x,0.025), step(0.975,uv.x)), max(step(uv.y,0.035), step(0.965,uv.y)));
  a += b*0.8;
  float on = 0.45 + 0.55*uActive;
  vec3 col = mix(vec3(0.01, 0.12, 0.2), uColor*(1.3 + 1.7*uActive), clamp(a*1.5, 0., 1.));
  gl_FragColor = vec4(col, clamp(0.22 + a*0.75, 0., 0.95) * on);
  #include <colorspace_fragment>
}`;
export function holoMaterial(seed, kind, color = '#5ff6ff') {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uActive: { value: 0 }, uKind: { value: kind }, uColor: { value: new THREE.Color(color) } },
    vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
}
