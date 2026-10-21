// Hell (cute, cartoony): a basalt island with glowing lava cracks in a lava sea under a fiery sky. Obsidian cabins
// with ember-glow beds, forge lab with red holo screens, rune ring of flames, lava hot spring, Styx ferry dock,
// brimstone fire pit, volcanoes on the horizon. Blobs get tiny horns.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'hell', name: 'Hell', status: 'ready',
  description: 'Basalt island in a lava sea: obsidian cabins, forge lab, rune ring of flames, hot spring, Styx ferry, volcanoes.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.2, lava: true,
    rel: [[1.4, 0], [5, -1], [10, -2.5], [60, -4]],
    colors: { grass: '#3d3335', grass2: '#30282a', sand: '#4b3c37', wetSand: '#2a1e1c', path: '#6e5040', rock: '#2a2224' },
  },
  water: { component: 'Ocean', style: 'lava', level: -0.35, shallow: '#ffd27a', mid: '#ff5a1a', deep: '#1c0805', foam: '#ffb84a', waveAmp: 0.03 },
  sky: [
    [0, '#120303', '#4a1006', '#ff9a6a'], [5.5, '#1a0504', '#6a1a08', '#ff9a6a'], [7, '#3a0c08', '#d8481a', '#ffb07a'],
    [12, '#4a1008', '#ff6a2a', '#ffc49a'], [17.5, '#3e0d08', '#ff5a1f', '#ffaa70'], [19.5, '#240706', '#a8300e', '#ff8a5a'],
    [21, '#140303', '#5a1407', '#ff9a6a'], [24, '#120303', '#4a1006', '#ff9a6a'],
  ],
  skyFx: { cloud: '#6a2a20', cloudDark: '#1a0807', moon: false, nightLight: ['#ff7a4a', 1.3] },
  sun: { riseHour: 6.5, setHour: 19, setAzimuth: deg(225) },
  weathers: ['clear', 'ashfall', 'embers', 'eruption', 'smoke'], defaultWeather: 'clear',
  wind: 0.5,
  vegetation: ['HellRocks'],
  ambient: ['HellEmbers', 'Volcano'],
  fun: { icebath: { type: 'HotTub', style: 'ice', angle: deg(-120), frac: 0.6, label: '🧊 Ice Bath' }, marshmallow: { type: 'LavaPit', angle: deg(170), frac: 0.62, label: '🍡 Lava Pit' } },
  zones: {
    work: { type: 'HoloLab', style: 'forge', angle: deg(115), frac: 0.62, span: deg(100), label: '⚒️ Forge' },
    research: { type: 'HoloRing', style: 'runes', angle: deg(-62), frac: 0.68, label: '🔥 Rune Ring' },
    social: { type: 'ClamLounge', style: 'spring', angle: deg(-6), frac: 0.8, label: '♨️ Lava Hot Spring' },
    lounge: { type: 'Hammocks', style: 'spire', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'styx', angle: deg(70), label: '⛴️ Styx ferry: waiting on you' },
    plaza: { type: 'Campfire', style: 'brimstone' },
  },
  homes: { type: 'Cabin', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'brazier' },
  gait: 'hop',
  accessory: 'horns',
  stateLabels: { thinking: 'Thinking (hot spring)', waiting_on_user: 'Waiting on you (Styx ferry)', idle: 'Idle (hammock / cabin)', stale: 'Asleep in cabin' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Lava sea' },
    land: { label: 'Basalt plains + lava moat', pond: true, colors: ['#2e2628', '#3a3032', '#4a3a36'], hills: [0.9, 9], scatter: [['spires', 100], ['deadTrees', 50], ['ventCones', 40]] },
  },
  fog: { clear: [1.8, 5.2], tint: '#a03a1a' },
};
