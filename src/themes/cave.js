// Crystal Cave: the island sits inside a vast cavern on a glowing underground lake. Rock dome with stalactites
// and glowworms instead of a sky; "day" is a pale light shaft through a ceiling crack, "night" is the crystals at
// full glow. Weathers are cave moods: still air, glow pulses, dripping water, drifting mist, crystal shimmer.
// Geode homes, crystal lab, geode ring, crystal bar, hot spring, mine-cart ride, a bioluminescent river with
// plank bridges, a raft landing with a lantern gondola, crystal lamps and crystal fields in many colors.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'cave', name: 'Crystal Cave', status: 'ready',
  description: 'Inside a glowing cavern: geode homes, crystal bar, hot spring, mine-cart ride, bioluminescent river, glowworm ceiling.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.3,
    rel: [[1.4, 0], [5.0, -1.0], [10, -2.6], [60, -4.5]],
    colors: { grass: '#3e3654', grass2: '#463e5e', sand: '#5a5068', wetSand: '#3e3650', path: '#6e6684', rock: '#4a4258' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#2ad8c8', mid: '#0e5a70', deep: '#061a2a', foam: '#9ffff0', waveAmp: 0.02 },
  sky: [ // [hour, rock-shadow tone, haze (fog), "light shaft" color]
    [0, '#06050e', '#120e24', '#8ad8ff'], [5, '#08071a', '#161230', '#8ad8ff'], [7, '#141030', '#262044', '#cfe6ff'],
    [12, '#1a1438', '#2e2650', '#e6f2ff'], [17, '#161032', '#2a2248', '#ffd8c0'], [19.5, '#0c0a20', '#1a1434', '#a8c8ff'], [24, '#06050e', '#120e24', '#8ad8ff'],
  ],
  skyFx: { clouds: false, moon: false, stars: false, nightLight: ['#a890ff', 1.5], ambient: 0.9 },
  camZoom: 1.45, flatWorld: true,
  weathers: ['still', 'glowpulse', 'drips', 'cavemist', 'shimmer'], defaultWeather: 'still',
  wind: 0.15,
  vegetation: ['CrystalFields', 'GlowRiver'],
  ambient: ['CaveDome', 'CaveMotes'],
  fun: {
    seahorse: { type: 'SeahorseRide', style: 'minecart', angle: deg(170), frac: 0.62, label: '🛒 Mine-cart Ride' },
    hottub: { type: 'HotTub', style: 'spring', angle: deg(-120), frac: 0.6, label: '♨️ Crystal Hot Spring' },
  },
  funEmojis: { seahorse: ['🛒', '⛏️', '😆', '💎'], hottub: ['♨️', '💎', '😌', '🫧'] },
  actLabels: { campfire: 'Gathered round the crystal hearth', stroll: 'Stroll along the glowing river', stargaze: 'Glowworm gazing' },
  drink: '🧪',
  zones: {
    work: { type: 'HoloLab', style: 'crystal', angle: deg(115), frac: 0.62, span: deg(100), label: '💎 Crystal Lab' },
    research: { type: 'HoloRing', style: 'geode', angle: deg(-62), frac: 0.68, label: '🔮 Geode Ring' },
    social: { type: 'TikiBar', style: 'crystal', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍸 Crystal Bar' },
    lounge: { type: 'Hammocks', style: 'stalagmite', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'raft', angle: deg(70), label: '🛶 Raft landing: waiting on you' },
    plaza: { type: 'Campfire', style: 'hearth' },
  },
  homes: { type: 'Geode', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'crystal' },
  gait: 'hop',
  stateLabels: { thinking: 'Thinking (crystal bar)', waiting_on_user: 'Waiting on you (raft landing)', idle: 'Idle (hammock / geode)', stale: 'Asleep in the geode' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Underground lake' },
    land: { label: 'Cavern floor', pond: true, colors: ['#3e3654', '#352e4a', '#463e5e'], hills: [1.0, 8], scatter: [['crystals', 110], ['stalagmites', 120], ['rocks', 50]] },
  },
  fog: { clear: [1.6, 4.4], tint: '#2a2248' },
};
