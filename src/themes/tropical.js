// Tropical theme: the reference theme. Every world piece is named here and resolved through
// src/world/registry.js. Bot/status logic never looks at this file; it only sees zone slots.
// Sizes are NOT fixed: the layout engine (src/world/layout.js) picks the land radius R from the bot
// count, packs fixed-size zone instances into the sectors below, and rings the homes around the island.
const deg = (d) => (d * Math.PI) / 180;

export default {
  id: 'tropical',
  name: 'Tropical Island',
  status: 'ready',
  description: 'Beach, palms, over-water bungalows, holo lab, tiki bar, dock and a campfire.',

  // Ground: flat top of radius R (auto), then a relative falloff [[R + dr, height], ...].
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.7,
    rel: [[1.8, 0], [6.8, -1.2], [11.8, -3], [60, -4.5]],
    colors: { grass: '#7fcf6a', grass2: '#5fb85a', sand: '#f2dfae', wetSand: '#d6b986', path: '#efd9a4', rock: '#8f939b' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#4fe3d2', mid: '#16a6c9', deep: '#0b4a86', foam: '#ffffff', waveAmp: 0.09 },

  // Sky per hour: [hour, zenith, horizon, sun color]. Sunset is tuned to look good.
  sky: [
    [0, '#05081c', '#141a3c', '#9db4ff'], [4.8, '#0a0f2c', '#22264f', '#9db4ff'], [5.8, '#2a2f66', '#e58f74', '#ffb37a'],
    [6.8, '#4f8fd6', '#ffd2a1', '#ffd9a8'], [8, '#3d8fe0', '#b9e6ff', '#fff3df'], [12, '#2f86e6', '#bfeaff', '#ffffff'],
    [16.5, '#3a8ee0', '#c8ecff', '#fff1d6'], [17.8, '#4d7fd0', '#ffd39a', '#ffd08a'], [18.6, '#5a5fb8', '#ff9a5c', '#ff9c55'],
    [19.2, '#3d3a8c', '#ff6f61', '#ff7046'], [19.8, '#262563', '#b4527a', '#ff6a50'], [20.6, '#0f1440', '#3b2f6b', '#9db4ff'],
    [24, '#05081c', '#141a3c', '#9db4ff'],
  ],
  sun: { riseHour: 6.4, setHour: 19.3, setAzimuth: deg(225) },
  weathers: ['clear', 'cloudy', 'rain', 'storm', 'fog'],
  defaultWeather: 'clear',
  wind: 1,

  vegetation: ['PalmGrove', 'TropicalPlants'],
  ambient: ['Fireflies'],

  // Zones: `type` = slot generator + component (registry). angle = sector direction from the island
  // center, frac = preferred distance as a fraction of the walking ring. Instances are fixed-size;
  // their count grows with the bot count (see CAPACITY in layout.js).
  fun: { hottub: { type: 'HotTub', style: 'wood', angle: deg(-120), frac: 0.6, label: '♨️ Hot Tub' }, volleyball: { type: 'Volleyball', angle: deg(170), frac: 0.62, label: '🏐 Volleyball Court' } },
  zones: {
    work: { type: 'HoloLab', style: 'beach', angle: deg(115), frac: 0.62, span: deg(100), label: '🖥️ Holo Lab' },
    research: { type: 'HoloRing', style: 'holo', angle: deg(-62), frac: 0.68, label: '🔭 Research Ring' },
    social: { type: 'TikiBar', style: 'tiki', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍹 Tiki Bar' },
    lounge: { type: 'Hammocks', style: 'palm', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'wood', angle: deg(70), label: '⚓ Dock: waiting on you' },
    plaza: { type: 'Campfire', style: 'campfire' },
  },
  homes: { type: 'Bungalow', center: deg(219), arc: deg(138), maxArc: deg(270), sign: 'housesign' },
  lights: { torch: 'tiki' },
  gait: 'hop',

  stateZones: { working: 'work', error: 'work', researching: 'research', thinking: 'social', waiting_on_user: 'waiting', done: 'plaza', idle: 'home', stale: 'home' },
  stateLabels: { thinking: 'Thinking (tiki bar)', waiting_on_user: 'Waiting on you (dock)', idle: 'Idle (hammock / bed)', stale: 'Asleep in bungalow' },
  props: { thinking: 'coconut', researching: 'book' },
  idleLoungeSeconds: 45,
  camera: { dir: [1, 0.68, 1], fov: 45 },
  surround: {
    water: { label: 'Ocean' },
    land: { label: 'Dunes + lagoon', pond: true, colors: ['#e8d29c', '#d9be84', '#a9b56a'], hills: [0.9, 7], scatter: [['palms', 70], ['dunegrass', 160], ['bushes', 50], ['rocks', 30]] },
  },
  fog: { clear: [2.0, 5.6] }, // multiples of the layout camera distance
};
