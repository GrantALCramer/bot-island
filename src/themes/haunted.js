// Haunted Graveyard (Halloween): a spooky island on a black lake under a huge full moon. Stone crypt homes,
// a mad-science lab, a candle-lit seance circle, the cauldron bar, a ferry landing with a lantern skiff, a
// pumpkin bonfire plaza, bobbing for apples, a haunted hayride, a pumpkin-patch bonfire, tombstones, iron
// fences, dead trees, jack-o'-lanterns, ghosts, bats and rolling ground fog. Blobs wear little costumes.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'haunted', name: 'Haunted Graveyard', status: 'ready',
  description: 'Halloween: crypt homes, cauldron bar, seance circle, hayride, bobbing for apples, ghosts, bats and a full moon.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.3,
    rel: [[1.4, 0], [5.0, -1.0], [10, -2.6], [60, -4.5]],
    colors: { grass: '#4a5a3e', grass2: '#3e4e36', sand: '#5a5048', wetSand: '#3e3630', path: '#7a7068', rock: '#5a5660' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#3a5a5a', mid: '#1a2e36', deep: '#0a141c', foam: '#c8d8d0', waveAmp: 0.03 },
  sky: [
    [0, '#05060f', '#1a1630', '#b8c8ff'], [5, '#080a18', '#221c3a', '#b8c8ff'], [6.5, '#2a2a4a', '#a86a5a', '#ffb080'],
    [8, '#4a5a7a', '#a8a0a0', '#fff0d8'], [12, '#56688a', '#b0aaa8', '#f8f0e0'], [16.5, '#4a587a', '#c8987a', '#ffd8a0'],
    [17.8, '#3a3a6a', '#e07a3a', '#ff9a40'], [18.8, '#2a1e4a', '#b0402a', '#ff6a30'], [19.8, '#140e2a', '#4a2240', '#c0b0ff'],
    [24, '#05060f', '#1a1630', '#b8c8ff'],
  ],
  skyFx: { moon: false, nightLight: ['#a8b8ff', 1.6], cloudDark: '#2a2836' },
  weathers: ['clear', 'fog', 'witching', 'rain', 'storm'], defaultWeather: 'clear',
  wind: 0.6,
  vegetation: ['Graveyard'],
  ambient: ['FullMoon', 'Ghosts', 'Bats', 'GroundFog', 'Swamp'],
  fun: {
    hottub: { type: 'HotTub', style: 'apples', angle: deg(-120), frac: 0.6, label: '🍎 Bobbing for Apples' },
    seahorse: { type: 'SeahorseRide', style: 'hayride', angle: deg(170), frac: 0.62, label: '🎃 Haunted Hayride' },
    marshmallow: { type: 'LavaPit', style: 'patch', angle: deg(52), frac: 0.5, label: '🎃 Pumpkin Patch Bonfire' },
  },
  funEmojis: { hottub: ['🍎', '😆', '💦', '🎃'], seahorse: ['🎃', '👻', '😱', '🌾'], marshmallow: ['🎃', '🔥', '🍡', '👻'] },
  actLabels: { campfire: 'Ghost stories at the bonfire', stroll: 'Creep down to the ferry', stargaze: 'Howling at the full moon' },
  drink: '🧪',
  zones: {
    work: { type: 'HoloLab', style: 'witch', angle: deg(115), frac: 0.62, span: deg(100), label: '🧪 Mad Lab' },
    research: { type: 'HoloRing', style: 'seance', angle: deg(-62), frac: 0.68, label: '🕯️ Seance Circle' },
    social: { type: 'TikiBar', style: 'cauldron', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🧙 Cauldron Bar' },
    lounge: { type: 'Hammocks', style: 'deadtree', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'ferry', angle: deg(70), label: '⚰️ Ferry landing: waiting on you' },
    plaza: { type: 'Campfire', style: 'bonfire' },
  },
  homes: { type: 'Crypt', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'jack' },
  gait: 'hop',
  accessory: 'costume',
  stateLabels: { thinking: 'Thinking (cauldron bar)', waiting_on_user: 'Waiting on you (ferry landing)', idle: 'Idle (hammock / crypt)', stale: 'Resting in the crypt' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Misty swamp', swamp: true, water: { shallow: '#4a5232', mid: '#2e3522', deep: '#161b10', foam: '#7d8a62', waveAmp: 0.012 } },
    land: { label: 'Moors + dead woods', pond: true, colors: ['#3e4a36', '#36402e', '#4a5240'], hills: [1.2, 9], scatter: [['deadtrees', 120], ['tombs', 90], ['rocks', 40]] },
  },
  fog: { clear: [1.5, 4.6], tint: '#6a6a88' },
};
