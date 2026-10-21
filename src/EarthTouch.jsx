// Google Earth-style touch controls for the island camera (touch only; mouse keeps OrbitControls).
// 1 finger: grab-and-move the ground · pinch: zoom · twist: rotate heading · 2 fingers up/down together: tilt · double-tap: zoom in.
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MIN_POLAR = 0.2, MAX_POLAR = 1.38;
export default function EarthTouch({ enabled, follow, minDist = 5, maxDist = 120 }) {
  const controls = useThree((s) => s.controls); const camera = useThree((s) => s.camera); const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!enabled || !controls) return;
    const el = gl.domElement; const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const ray = new THREE.Raycaster();
    const ground = (x, y, out) => { const r = el.getBoundingClientRect(); ray.setFromCamera({ x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }, camera); return ray.ray.intersectPlane(plane, out); };
    const sph = new THREE.Spherical(); const off = new THREE.Vector3();
    const getSph = () => { off.subVectors(camera.position, controls.target); sph.setFromVector3(off); };
    const setSph = () => { sph.phi = Math.min(MAX_POLAR, Math.max(MIN_POLAR, sph.phi)); sph.radius = Math.min(maxDist, Math.max(minDist, sph.radius)); off.setFromSpherical(sph); camera.position.copy(controls.target).add(off); camera.lookAt(controls.target); };
    let st = null, lastTap = 0, lastX = 0, lastY = 0;
    // Stop OrbitControls from seeing touch pointers while keeping R3F taps (we don't stop propagation).
    const gate = (e) => { if (e.pointerType === 'touch' && e.target === el) controls.enabled = false; };
    const ungate = (e) => { if (e.pointerType === 'touch') setTimeout(() => { if (!st) controls.enabled = true; }, 0); };
    const two = (t) => { const [a, b] = [t[0], t[1]]; return { mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), ang: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX), ay: a.clientY, by: b.clientY }; };
    const start = (e) => {
      follow.current = false; controls.enabled = false; const t = e.touches;
      if (t.length === 1) { const g = ground(t[0].clientX, t[0].clientY, new THREE.Vector3()); st = { n: 1, g, x: t[0].clientX, y: t[0].clientY, moved: false };
        const now = performance.now(); if (now - lastTap < 350 && Math.hypot(t[0].clientX - lastX, t[0].clientY - lastY) < 40) { // double-tap: zoom in toward the tapped point
          getSph(); const k = 0.6; if (g) { const d = g.clone().sub(controls.target).multiplyScalar(1 - k); d.y = 0; controls.target.add(d); } sph.radius *= k; setSph(); st.n = 0; lastTap = 0; }
        else { lastTap = now; lastX = t[0].clientX; lastY = t[0].clientY; } }
      else if (t.length >= 2) st = { n: 2, ...two(t) };
      e.preventDefault();
    };
    const move = (e) => {
      if (!st) return; const t = e.touches; e.preventDefault();
      if (st.n === 1 && t.length === 1) { // grab-and-move: keep the grabbed ground point under the finger
        if (Math.hypot(t[0].clientX - st.x, t[0].clientY - st.y) > 6) { st.moved = true; lastTap = 0; }
        if (!st.g) return; const cur = ground(t[0].clientX, t[0].clientY, new THREE.Vector3()); if (!cur) return;
        const d = st.g.clone().sub(cur); d.y = 0; const lim = maxDist * 1.2; // don't fling far off the island
        const nt = controls.target.clone().add(d); if (Math.hypot(nt.x, nt.z) > lim) return;
        controls.target.add(d); camera.position.add(d); camera.lookAt(controls.target); return; }
      if (st.n === 2 && t.length >= 2) { const c = two(t); getSph();
        sph.radius *= st.d / Math.max(10, c.d); // pinch
        let da = c.ang - st.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; sph.theta -= da; // twist
        const dyA = c.ay - st.ay, dyB = c.by - st.by; // both fingers same vertical direction -> tilt
        if (Math.sign(dyA) === Math.sign(dyB) && Math.abs(st.d - c.d) < 12) sph.phi -= ((dyA + dyB) / 2) * 0.006;
        setSph(); Object.assign(st, c); }
    };
    const end = (e) => { if (e.touches.length === 0) { st = null; controls.enabled = true; } else if (e.touches.length === 1) { const t = e.touches[0]; st = { n: 1, g: ground(t.clientX, t.clientY, new THREE.Vector3()), x: t.clientX, y: t.clientY, moved: true }; } else st = { n: 2, ...two(e.touches) }; };
    window.addEventListener('pointerdown', gate, true); window.addEventListener('pointerup', ungate, true);
    el.addEventListener('touchstart', start, { passive: false }); el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    return () => { window.removeEventListener('pointerdown', gate, true); window.removeEventListener('pointerup', ungate, true);
      el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end); controls.enabled = true; };
  }, [enabled, controls, camera, gl, minDist, maxDist]); // eslint-disable-line
  return null;
}
