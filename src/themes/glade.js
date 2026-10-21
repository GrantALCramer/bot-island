// Fairy Glade: an enchanted forest island in a dark pond that glows at night. Toadstool cottages, a tree-stump
// lab ringed by glowing mushrooms, a standing-stone fairy ring, an acorn tavern with firefly jars, a lily-pad
// landing with a leaf boat, a wisp pool plaza, glow-mushroom lamps, a bouncy mushroom trampoline, a mossy dew
// pool, giant mushrooms, glow flowers, drifting spores, fireflies and a deep forest rim.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'glade', name: 'Fairy Glade', status: 'ready',
  description: 'Glowing forest: toadstool cottages, stump lab, fairy ring, acorn tavern, wisp pool, mushroom trampoline.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.3,
    rel: [[1.4, 0], [5.0, -1.0], [10, -2.6], [60, -4.5]],
    colors: { grass: '#5a9a48', grass2: '#4a8a3c', sand: '#7a6a4a', wetSand: '#5a4a34', path: '#9a8a68', rock: '#7a7f76' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#3aa890', mid: '#1f6a68', deep: '#0e3440', foam: '#d8ffe8', waveAmp: 0.03 },
  sky: [
    [0, '#060c1a', '#10283a', '#b4ffd8'], [4.8, '#0a1424', '#183448', '#b4ffd8'], [5.8, '#2a3a5a', '#d8a0a0', '#ffc0a0'],
    [6.8, '#5a90b8', '#e8e0c0', '#ffe8c0'], [8, '#5a9ac8', '#d8f0e0', '#fff6e6'], [12, '#58a0d0', '#dcf4e4', '#ffffff'],
    [16.5, '#5a98c8', '#e8ecd8', '#fff1dc'], [17.8, '#6a88b8', '#ffd0a0', '#ffd090'], [18.6, '#6a6aa8', '#ffa080', '#ffb070'],
    [19.2, '#3a4a88', '#d87a8a', '#ff9068'], [19.8, '#1e2a5a', '#7a5a88', '#ff8068'], [20.6, '#0c1a34', '#1e3a50', '#b4ffd8'],
    [24, '#060c1a', '#10283a', '#b4ffd8'],
  ],
  skyFx: { nightLight: ['#8affd0', 0.9] },
  weathers: ['clear', 'mist', 'springrain', 'spores', 'fog'], defaultWeather: 'clear',
  wind: 0.4,
  vegetation: ['GiantShrooms', 'Ferns'],
  ambient: ['Fireflies', 'Spores', 'ForestRim'],
  fun: {
    trampoline: { type: 'Trampoline', style: 'shroom', angle: deg(170), frac: 0.62, label: '🍄 Bouncy Mushroom' },
    hottub: { type: 'HotTub', style: 'dew', angle: deg(-120), frac: 0.6, label: '💧 Dew Pool' },
  },
  funEmojis: { trampoline: ['🍄', '🤸', '✨', '😆'], hottub: ['💧', '🧚', '😌', '✨'] },
  actLabels: { campfire: 'Wisps at the fairy pool', stroll: 'Wander to the lily landing', stargaze: 'Firefly watching' },
  drink: '🍯',
  zones: {
    work: { type: 'HoloLab', style: 'stump', angle: deg(115), frac: 0.62, span: deg(100), label: '🪵 Stump Lab' },
    research: { type: 'HoloRing', style: 'fairy', angle: deg(-62), frac: 0.68, label: '🧚 Fairy Ring' },
    social: { type: 'TikiBar', style: 'tavern', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🌰 Acorn Tavern' },
    lounge: { type: 'Hammocks', style: 'shroom', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'lily', angle: deg(70), label: '🍃 Lily landing: waiting on you' },
    plaza: { type: 'Campfire', style: 'wisp' },
  },
  homes: { type: 'Shroom', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'glowshroom' },
  gait: 'hop',
  stateLabels: { thinking: 'Thinking (acorn tavern)', waiting_on_user: 'Waiting on you (lily landing)', idle: 'Idle (hammock / toadstool)', stale: 'Asleep in the toadstool' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Enchanted pond' },
    land: { label: 'Deep forest + pond', pond: true, colors: ['#4a8a3c', '#3a7a30', '#5a9a48'], hills: [1.2, 9], scatter: [['shrooms', 90], ['greenPines', 120], ['bushes', 60]] },
  },
  fog: { clear: [1.8, 5.2], tint: '#a8d8c0' },
};
