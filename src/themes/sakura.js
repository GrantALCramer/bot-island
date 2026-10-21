// Sakura (old-school Japan): a spring island in a calm lake. Minka houses with shoji walls and futons in the
// bot's color, a wooden dojo with paper-lantern holo screens, a floating-scroll library, a tea house, a
// vermilion pier with a torii and a little sampan, a stone-lantern garden plaza, cherry trees shedding petals,
// maples, bamboo, a koi pond with a red arched bridge, a zen sand garden, a pagoda and Mt. Fuji on the horizon.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'sakura', name: 'Sakura', status: 'ready',
  curveStart: (L) => L.camDist * 10.5, // Fuji + mountain ranges stay above the horizon
  description: 'Cherry-blossom island: minka houses with futons, dojo lab, scroll library, tea house, torii pier, koi pond, pagoda, Mt. Fuji.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.4,
    rel: [[1.6, 0], [6.0, -1.1], [11, -2.8], [60, -4.5]],
    colors: { grass: '#8cc46c', grass2: '#76b25e', sand: '#dcd2ae', wetSand: '#bfae86', path: '#dcd3bd', rock: '#8f8b84' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#86d9c9', mid: '#3d9fb3', deep: '#1f587c', foam: '#ffffff', waveAmp: 0.05 },
  sky: [
    [0, '#090b22', '#1c1f46', '#b4c4ff'], [4.8, '#0e1230', '#2a2a58', '#b4c4ff'], [5.8, '#3a3a78', '#f2a3a8', '#ffb59a'],
    [6.8, '#6a9edc', '#ffd9c9', '#ffe0c0'], [8, '#5f9fe0', '#d8eefc', '#fff6e6'], [12, '#5a9de6', '#e2f2fd', '#ffffff'],
    [16.5, '#6a9fe0', '#f3e6ef', '#fff1dc'], [17.6, '#7a8fd0', '#ffd6b0', '#ffd090'], [18.5, '#8a74bc', '#ffb4ba', '#ffb070'],
    [19.2, '#5c4c9a', '#ff9cae', '#ff9068'], [19.8, '#2e2a68', '#c56d98', '#ff8068'], [20.6, '#12153e', '#3d3270', '#b4c4ff'],
    [24, '#090b22', '#1c1f46', '#b4c4ff'],
  ],
  weathers: ['clear', 'petals', 'springrain', 'mist', 'lightsnow'], defaultWeather: 'clear',
  wind: 0.7,
  vegetation: ['SakuraTrees', 'Maples', 'Bamboo', 'KoiPond', 'ZenGarden', 'Pagoda'],
  ambient: ['Petals', 'Fuji'],
  fun: { hottub: { type: 'HotTub', style: 'onsen', angle: deg(-120), frac: 0.6, label: '♨️ Onsen' } },
  zones: {
    work: { type: 'HoloLab', style: 'dojo', angle: deg(115), frac: 0.62, span: deg(100), label: '🏯 Dojo Lab' },
    research: { type: 'HoloRing', style: 'scrolls', angle: deg(-62), frac: 0.68, label: '📜 Scroll Library' },
    social: { type: 'TikiBar', style: 'teahouse', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍵 Tea House' },
    lounge: { type: 'Hammocks', style: 'bamboo', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'torii', angle: deg(70), label: '⛩️ Torii pier: waiting on you' },
    plaza: { type: 'Campfire', style: 'lantern' },
  },
  homes: { type: 'Minka', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'paper' },
  gait: 'hop',
  accessory: 'kasa',
  stateLabels: { thinking: 'Thinking (tea house)', waiting_on_user: 'Waiting on you (torii pier)', idle: 'Idle (hammock / futon)', stale: 'Asleep on the futon' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Lake' },
    land: { label: 'Rolling hills + rice paddies', pond: true, colors: ['#8cc46c', '#7ab45a', '#a6c97c'], hills: [1.3, 8], scatter: [['paddies', 36], ['teaRows', 36], ['cherryTrees', 70], ['greenPines', 50], ['rocks', 20]] },
  },
  fog: { clear: [2.0, 5.6], tint: '#e9d2dc' },
  camera: { dir: [1, 0.4, 1], fov: 45 }, // a bit lower than tropical so the horizon (and Mt. Fuji) is in the default view
};
