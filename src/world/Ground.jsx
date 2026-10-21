import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from './env.js';

function segDist(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// Radial island: grass core, sand beach sloping into the sea, sandy trails to every zone.
export function BeachTerrain() {
  const { theme, layout } = useWorld(); const T = theme.terrain; const C = T.colors;
  const geo = useMemo(() => {
    const R = layout.R; const far = layout.curve ? layout.curve.far : Math.max(160, layout.extent * 6); const land = layout.surround === 'land'; const SC = theme.surroundCfg || {};
    const mid = Math.max(R + 14, land ? layout.edgeR + 12 : 0);
    const radii = []; for (let r = 0; r < R + 3; r += 0.22) radii.push(r); const fine0 = land && layout.pond ? layout.edgeR - 0.5 : 1e9, fine1 = fine0 + (SC.bankW ?? 3.6) + 1.5; // steep pond banks (canyon walls) get a finer ring step
    for (let r = R + 3; r < mid; r += r > fine0 && r < fine1 ? 0.18 : 0.5) radii.push(r); for (let r = mid + 6; r < far; r *= layout.curve ? 1.1 : land ? 1.18 : 1.35) radii.push(r); radii.push(far);
    const abyssC = new THREE.Color('#06283a'); const pc = (SC.colors || [C.sand, C.wetSand]).map((h) => new THREE.Color(h)); const pcol = new THREE.Color();
    const seg = R > 20 ? 384 : 256; const pos = []; const col = []; const idx = [];
    const cg = new THREE.Color(C.grass), cg2 = new THREE.Color(C.grass2), cs = new THREE.Color(C.sand), cw = new THREE.Color(C.wetSand), cp = new THREE.Color(C.path);
    const shore = theme.water ? layout.shoreR : 1e9; const edge = layout.edgeR ?? R; const grassR = R - (T.grassInset ?? 1.7); const deepC = new THREE.Color(theme.water ? '#2a6f8a' : C.rock);
    const c = new THREE.Color();
    radii.forEach((r) => {
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2; const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const wob = Math.sin(a * 5 + 1.3) * 0.45 + Math.sin(a * 11 + 0.4) * 0.25 + Math.sin(a * 23) * 0.12;
        let y = layout.groundY(x, z) + (r < grassR - 1 ? Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.03 : 0);
        const gr = grassR + wob;
        const n = (Math.sin(x * 1.7 + z * 0.9) + Math.sin(x * 0.5 - z * 1.3)) * 0.25 + 0.5;
        if (r < gr) c.copy(cg).lerp(cg2, n); else c.copy(cs).lerp(cs.clone().multiplyScalar(0.94), n);
        if (r >= gr - 0.25 && r < gr) c.lerp(cs, (r - (gr - 0.25)) / 0.25 * 0.6);
        if (r > shore - 0.9) c.lerp(cw, Math.min(1, (r - shore + 0.9) / 0.9));
        if (r > shore + 0.3) c.copy(cw).lerp(deepC, Math.min(1, (r - shore) / 9));
        if (!theme.water && !land && r > R + 1.5) c.lerp(deepC, Math.min(0.75, (r - R - 1.5) / 14));
        if (theme.underwater && y < -2.5) c.lerp(abyssC, Math.min(0.92, (-2.5 - y) / 14));
        if (land) { // edge blend into the surrounding plain (patchy, two or three tones)
          const m = 0.5 + 0.5 * Math.sin(x * 0.09 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.083 - 1);
          pcol.copy(pc[0]).lerp(pc[1], THREE.MathUtils.smoothstep(m, 0.3, 0.75)); if (pc[2]) pcol.lerp(pc[2], 0.5 * THREE.MathUtils.smoothstep(n, 0.6, 0.95));
          if (layout.pond) { if (r > edge - 0.8) { c.copy(cw).lerp(cs, THREE.MathUtils.smoothstep(r, (layout.bankR ?? edge) - 0.3, (layout.bankR ?? edge) + 1.2)); c.lerp(pcol, THREE.MathUtils.smoothstep(r, (layout.bankR ?? edge) + 1.0, (layout.bankR ?? edge) + 5)); } }
          else c.lerp(pcol, THREE.MathUtils.smoothstep(r, R + 0.2, R + 4.5));
          if (SC.strata && r > (layout.bankR ?? edge) && y > 0.25 && y < (layout.plainY ?? 1) - 0.15) { // canyon walls: banded red-rock strata
            const sc = SC.strata; const b = y * 1.6 + Math.sin(a * 9 + r * 0.05) * 0.18; const i0 = Math.floor(b) % sc.length; pcol.set(sc[(i0 + sc.length) % sc.length]); c.lerp(pcol, 0.9); }
          for (const [cx, cz, rad] of layout.craters || []) { const dd = Math.hypot(x - cx, z - cz) / rad; if (dd < 1.1) c.multiplyScalar(dd < 0.95 ? 0.82 : 1.12); }
        }
        if (r < Math.min(shore - 0.6, R + 1.2)) {
          let pd = r < layout.hubR - 0.2 ? 0 : 99;
          for (const rr of layout.rings) pd = Math.min(pd, Math.abs(r - rr) - 0.15);
          for (const p of layout.paths) pd = Math.min(pd, segDist(x, z, p[0], p[1]));
          const k = 1 - THREE.MathUtils.smoothstep(pd, 0.35, 0.7);
          if (k > 0) { c.lerp(cp, k * 0.9); y += k * 0.012; }
        }
        pos.push(x, y, z); col.push(c.r, c.g, c.b);
      }
    });
    for (let i = 0; i < radii.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c2 = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
      idx.push(a, b, c2, b, d, c2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [theme, layout]);
  const { env } = useWorld();
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: T.snow ? 0.7 : 0.95, metalness: 0 });
    if (T.lava) { m.userData.u = { uTime: { value: 0 }, uC: { value: 1 } };
      m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, m.userData.u);
        sh.vertexShader = 'varying vec3 vCW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'uniform float uTime; uniform float uC; varying vec3 vCW;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          vec2 p = vCW.xz * 0.21; float a = abs(sin(p.x * 1.7 + sin(p.y * 1.3) * 1.6) * sin(p.y * 1.9 + sin(p.x * 1.1) * 1.3));
          float crack = smoothstep(0.022, 0.0, a) * smoothstep(0.1, 0.55, sin(p.y * 0.9 + p.x * 0.6) * 0.5 + 0.5);
          float pulse = 0.85 + 0.25 * sin(uTime * 1.4 + p.x * 2.0 + p.y);
          gl_FragColor.rgb += vec3(1.0, 0.33, 0.06) * clamp(crack, 0.0, 1.0) * 1.1 * pulse * uC;`); };
    }
    if (T.caustics) { m.userData.u = { uTime: { value: 0 }, uC: { value: 1 } };
      m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, m.userData.u);
        sh.vertexShader = 'varying vec3 vCW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'uniform float uTime; uniform float uC; varying vec3 vCW;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          vec2 p = vCW.xz * 0.55; float c = 0.;
          for (int i = 0; i < 3; i++) { p += vec2(sin(p.y * 1.7 + uTime * 0.6 + float(i)), cos(p.x * 1.5 - uTime * 0.5 + float(i) * 1.7)) * 0.45; c += abs(sin(p.x * 2.2) * sin(p.y * 2.2)); }
          c = pow(clamp(1.0 - c / 3.0, 0.0, 1.0), 6.0);
          gl_FragColor.rgb += vec3(0.55, 0.95, 1.0) * c * 0.34 * uC * smoothstep(-9.0, -1.5, vCW.y);`); };
    }
    return m; }, [T]);
  useFrame(({ clock }) => { const u = mat.userData.u; if (!u) return; u.uTime.value = clock.elapsedTime; const e = env.current; if (e && !T.lava) u.uC.value = (0.25 + 0.75 * e.day) * (1 - e.gray * 0.7); });
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

const WATER_VERT = `
#include <common>
#include <fog_pars_vertex>
uniform float uTime, uAmp, uShore, uBank, uRc, uRp; varying vec3 vW; varying float vWave;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  float wave = sin(w.x*0.35 + uTime*1.1)*0.6 + sin(w.z*0.42 + uTime*0.9)*0.5 + sin((w.x+w.z)*0.8 + uTime*1.7)*0.25;
  float r = length(w.xz);
  w.y += wave * uAmp * smoothstep(uShore - 4.0, uShore + 8.0, r) * (1.0 - smoothstep(uBank - 5.0, uBank, r));
  float cd = max(r - uRc, 0.0); w.y -= cd * cd / (2.0 * uRp);
  vWave = wave; vW = w.xyz;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
// uStyle: 0 ocean, 1 frozen ice sheet, 2 lava, 3 cloud sea
const WATER_FRAG = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uShallow, uMid, uDeep, uFoam, uSky, uSun, uSunDir; uniform float uDay, uShore, uBank, uTime, uRain, uAmp, uStyle;
varying vec3 vW; varying float vWave;
float vn(vec2 p){ return sin(p.x)*sin(p.y)*0.5 + sin(p.x*2.3 + p.y*1.7)*0.25 + sin(p.x*4.1 - p.y*3.7)*0.125; }
void main(){
  float r = length(vW.xz); float ang = atan(vW.z, vW.x);
  float shore = uShore + 0.18*sin(ang*7.0 + uTime*0.6) + 0.1*sin(ang*13.0 - uTime*0.8);
  float d = r - shore; float db = uBank - r;
  float swash = 0.5 + 0.5*sin(uTime*0.9);
  if (uStyle > 1.5 && uStyle < 2.5) { // lava: dark crust plates drifting over glowing rivers
    vec2 p = vW.xz*0.16 + vec2(uTime*0.03, uTime*0.02);
    float n = vn(p + vn(p*0.7 + uTime*0.04)*1.3);
    float hot = smoothstep(0.045, 0.0, abs(n)) * 0.85; hot = max(hot, smoothstep(1.2, 0.0, d) ); hot = max(hot, smoothstep(1.4, 0.0, db));
    vec3 crust = mix(uDeep, uMid*0.35, 0.3 + 0.3*n) * (0.35 + 0.65*uDay);
    vec3 glow = mix(uMid, uShallow, smoothstep(0.4, 1.0, hot)) * (1.4 + 0.5*sin(uTime*2.0 + n*6.0));
    vec3 c = mix(crust, glow, hot);
    gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    return;
  }
  if (uStyle > 2.5) { // cloud sea: soft billows, lit by the sky
    vec2 p = vW.xz*0.12 + vec2(uTime*0.02, 0.0);
    float n = vn(p) + 0.5*vn(p*2.7 + uTime*0.03);
    vec3 c = mix(uMid, uShallow, smoothstep(-0.6, 0.7, n));
    c = mix(c, uDeep, smoothstep(10.0, 90.0, d)*0.6);
    c = mix(c, uSky, 0.12 + 0.3*smoothstep(uShore + 20.0, uShore + 120.0, r));
    c += uSun * 0.12 * smoothstep(0.2, 0.9, n) * uDay;
    float foam = smoothstep(0.9, 0.0, abs(d - 0.3 - 0.4*swash));
    c = mix(c, uFoam, foam*0.6);
    c *= 0.35 + 0.65*uDay;
    gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    return;
  }
  if (uStyle > 0.5) { // frozen sea: smooth ice with cracks and frost near the shore
    vec2 p = vW.xz*0.45; float n = vn(p);
    float crack = smoothstep(0.035, 0.0, abs(sin(p.x*1.3 + sin(p.y*0.9)*1.7) * cos(p.y*1.1 + sin(p.x*0.7))));
    vec3 c = mix(uShallow, uMid, smoothstep(0.0, 14.0, d) * (0.7 + 0.3*n));
    c = mix(c, uDeep, smoothstep(14.0, 60.0, d)*0.5);
    c = mix(c, uFoam, crack*0.45 + smoothstep(1.2, 0.0, d)*0.6);
    vec3 Vd = normalize(cameraPosition - vW); vec3 H = normalize(normalize(uSunDir) + Vd + vec3(0.0, 1e-4, 0.0));
    float sp = pow(max(H.y, 0.0), 60.0) * smoothstep(-0.1, 0.05, uSunDir.y);
    c = mix(c, uSky, pow(1.0 - max(Vd.y, 0.0), 4.0)*0.5);
    c *= 0.22 + 0.78*uDay; c += uSun*sp*0.5;
    gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    return;
  }
  vec3 c = mix(uShallow, uMid, smoothstep(0.5, 6.0, min(d, db)));
  c = mix(c, uDeep, smoothstep(6.0, 26.0, min(d, db)));
  c += vWave * 0.035;
  c = mix(c, uSky, 0.12 + 0.25*smoothstep(uShore + 6.0, uShore + 80.0, r));
  float foam = smoothstep(0.45, 0.0, abs(d - 0.1 - 0.35*swash)) * (0.75 + 0.25*sin(ang*40.0 + uTime*2.0));
  float foam2 = smoothstep(0.18, 0.0, abs(d - 1.3 - 0.5*sin(uTime*0.7 + ang*3.0))) * 0.35;
  foam = max(foam, smoothstep(0.4, 0.0, abs(db - 0.1 - 0.3*swash)) * 0.8);
  float t = uTime; float x = vW.x, z = vW.z;
  float dx = 0.6*0.35*cos(0.35*x+1.1*t) + 0.25*0.8*cos(0.8*(x+z)+1.7*t) + 0.12*2.1*cos(2.1*x+1.3*z+2.0*t) - 0.1*1.7*cos(-1.7*x+2.6*z+2.4*t) + 0.05*4.3*cos(4.3*x-3.1*z+3.1*t);
  float dz = 0.5*0.42*cos(0.42*z+0.9*t) + 0.25*0.8*cos(0.8*(x+z)+1.7*t) + 0.12*1.3*cos(2.1*x+1.3*z+2.0*t) + 0.1*2.6*cos(-1.7*x+2.6*z+2.4*t) - 0.05*3.1*cos(4.3*x-3.1*z+3.1*t);
  vec3 N = normalize(vec3(-dx*0.25, 1.0, -dz*0.25));
  vec3 Vd = normalize(cameraPosition - vW); vec3 H = normalize(normalize(uSunDir) + Vd + vec3(0.0, 1e-4, 0.0));
  float sp = pow(max(dot(N, H), 0.0), 320.0) * 2.0 * smoothstep(0.5, 3.0, d) * smoothstep(-0.1, 0.05, uSunDir.y);
  float fres = pow(1.0 - max(dot(N, Vd), 0.0), 3.0);
  c = mix(c, uSky, fres * 0.45);
  c = mix(c, uFoam, clamp(foam + foam2, 0.0, 1.0));
  c *= 0.18 + 0.82*uDay;
  c += uSun * sp * (1.0 - uRain);
  float alpha = mix(0.55, 0.96, smoothstep(0.0, 3.5, min(d, db)));
  alpha = max(alpha, foam);
  gl_FragColor = vec4(max(c, vec3(0.0)), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// Animated ocean: vertex waves, radial shallow->deep gradient, foam line that laps the shore.
export function Ocean() {
  const { theme, env, layout } = useWorld(); const W = theme.water;
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uAmp: { value: W.waveAmp }, uShallow: { value: new THREE.Color(W.shallow) }, uMid: { value: new THREE.Color(W.mid) },
      uDeep: { value: new THREE.Color(W.deep) }, uFoam: { value: new THREE.Color(W.foam) }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uShore: { value: layout.shoreR }, uRain: { value: 0 }, uBank: { value: 1e5 }, uRc: { value: 1e7 }, uRp: { value: 1 }, uStyle: { value: { ocean: 0, ice: 1, lava: 2, cloud: 3 }[W.style] ?? 0 },
    }]),
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true, transparent: !W.style || W.style === 'ocean', depthWrite: !!W.style && W.style !== 'ocean',
  }), [theme]);
  mat.uniforms.uShore.value = layout.shoreR; mat.uniforms.uBank.value = layout.bankR ?? 1e5; mat.uniforms.uRc.value = layout.curve ? layout.curve.rc : 1e7; mat.uniforms.uRp.value = layout.curve ? layout.curve.rp : 1;
  useFrame(({ clock }) => {
    const u = mat.uniforms; u.uTime.value = clock.elapsedTime; const e = env.current; if (!e) return;
    u.uDay.value = e.day; u.uSky.value.copy(e.horizon); u.uSun.value.copy(e.sunColor); u.uRain.value = e.gray; u.uSunDir.value.copy(e.sunDir);
    u.uAmp.value = W.waveAmp * (1 + e.wind * 1.2);
  });
  const size = Math.max(320, Math.ceil(layout.extent / 10) * 100); const cf = layout.curve?.far;
  const geo = useMemo(() => { if (!cf) { const g = new THREE.PlaneGeometry(size, size, 240, 240); g.rotateX(-Math.PI / 2); return g; }
    // round water disc (curves away with the planet in the vertex shader): dense near the island, sparser out to the horizon
    const radii = [0]; for (let r = 1; r < cf; r = r < layout.extent * 3 ? r + 0.9 : r * 1.05) radii.push(r); radii.push(cf); const seg = 160; const pos = [], idx = [];
    radii.forEach((r) => { for (let j = 0; j < seg; j++) { const a = (j / seg) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } });
    for (let i = 0; i < radii.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg); idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; }, [size, cf, layout.extent]);
  return <mesh geometry={geo} material={mat} position={[0, W.level, 0]} renderOrder={1} />;
}
