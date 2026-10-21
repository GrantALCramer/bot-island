// Moon: a lunar base on a regolith highland. Moon-base pods with bunks, pressurized hab lab, radio dish array,
// mess module, landing pad with a lander, beacon plaza. Black starry sky with Earth hanging over the horizon.
// Day = harsh sunlight; night = blue earthlight. Low gravity: blobs float in slow, high hops.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;
const BLACK = (h, sun) => [h, '#000004', '#05060b', sun];

export default {
  ...tropical,
  id: 'moon', name: 'Moon Base', status: 'ready',
  description: 'Lunar base: pods with bunks, hab dome lab, dish array, mess module, landing pad and lander, Earth in the sky.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.4,
    rel: [[1.5, 0], [5, -0.6], [10, -1.4], [60, -2]],
    colors: { grass: '#b9b7b1', grass2: '#aaa8a2', sand: '#9e9c97', wetSand: '#7d7b78', path: '#d6d4ce', rock: '#6f6e6b' },
  },
  water: { component: 'Ocean', style: 'ice', level: -0.35, shallow: '#c9d6df', mid: '#9fb3c2', deep: '#6f8494', foam: '#eef4f8', waveAmp: 0 },
  sky: [BLACK(0, '#dfe6ff'), BLACK(6, '#fff4e0'), BLACK(12, '#ffffff'), BLACK(19, '#fff4e0'), BLACK(24, '#dfe6ff')],
  skyFx: { clouds: false, stars: 'always', earth: true, moon: false, nightLight: ['#8fb8ff', 1.7], ambient: 0.75 },
  sun: { riseHour: 6.2, setHour: 19.2, setAzimuth: deg(200) },
  weathers: ['vacuum', 'meteors', 'duststorm', 'flare'], defaultWeather: 'vacuum',
  wind: 0,
  vegetation: ['MoonRocks'],
  ambient: ['MoonDust'],
  fun: { trampoline: { type: 'Trampoline', angle: deg(-120), frac: 0.6, label: '🤸 Low-G Trampoline' } },
  zones: {
    work: { type: 'HoloLab', style: 'hab', angle: deg(115), frac: 0.62, span: deg(100), label: '🧪 Hab Lab' },
    research: { type: 'HoloRing', style: 'dish', angle: deg(-62), frac: 0.68, label: '📡 Dish Array' },
    social: { type: 'TikiBar', style: 'mess', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍽️ Mess Module' },
    lounge: { type: 'Hammocks', style: 'mast', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'pad', angle: deg(70), label: '🚀 Landing pad: waiting on you' },
    plaza: { type: 'Campfire', style: 'beacon' },
  },
  homes: { type: 'MoonPod', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'lamp' },
  gait: 'float',
  stateLabels: { thinking: 'Thinking (mess module)', waiting_on_user: 'Waiting on you (landing pad)', idle: 'Idle (hammock / pod)', stale: 'Asleep in pod' },
  props: { thinking: 'cup', researching: 'book' },
  camera: { dir: [1, 0.52, 1], fov: 45 },
  surround: {
    water: { kind: 'land', label: 'Cratered moon dust', colors: ['#b8b5af', '#aaa7a1', '#c6c3bc'], hills: [0.2, 3], craters: 150, craterSeed: 131, craterScale: 1.35, scatter: [['craterRims', 90, 0.9], ['boulders', 20, 0.4]] },
    land: { label: 'Regolith plains', colors: ['#8f8d89', '#9d9b97', '#7e7c79'], hills: [0.5, 7], craters: 70, scatter: [['boulders', 55, 0.55], ['craterRims', 60, 0.9]] },
  },
  fog: { clear: [2.6, 8] },
};
