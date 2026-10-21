// Jungle: dense canopy island in a river, waterfall at the back. Treehouses with rope ladders and bridges,
// temple-ruin holo lab, stone ruin ring, jungle hut, vine hammocks, river dock with canoes.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'jungle', name: 'Jungle', status: 'ready',
  description: 'Treehouses with rope bridges, temple-ruin lab, stone ring, jungle hut, river dock, waterfall.',
  terrain: {
    component: 'BeachTerrain', top: 0.05, minR: 7.5, grassInset: 0.6,
    rel: [[1.4, 0], [5, -1.1], [10, -2.6], [60, -4]],
    colors: { grass: '#4f9a3c', grass2: '#3c8032', sand: '#8a6a44', wetSand: '#5f4a32', path: '#a88a5c', rock: '#6d7268' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#5fa88a', mid: '#2c7a6a', deep: '#123f3c', foam: '#e6f4e6', waveAmp: 0.04 },
  sky: [
    [0, '#040c12', '#0f2420', '#a8c8ff'], [5, '#081a1e', '#1c3a32', '#a8c8ff'], [6.0, '#2c4f5a', '#e2a77c', '#ffbe85'],
    [7.2, '#4f97c2', '#d9e8c4', '#ffe4b8'], [12, '#3d93cf', '#cfe9d8', '#fffbe8'], [16.8, '#4a8fc4', '#d6e8c8', '#fff0d0'],
    [18.2, '#5d6fa8', '#f0a868', '#ffa860'], [19.1, '#38306e', '#d0645a', '#ff7a4a'], [20.2, '#10202a', '#2c3a3a', '#a8c8ff'],
    [24, '#040c12', '#0f2420', '#a8c8ff'],
  ],
  weathers: ['clear', 'cloudy', 'rain', 'storm', 'mist'], defaultWeather: 'clear',
  wind: 0.7,
  vegetation: ['JungleCanopy', 'Ferns', 'Waterfall'],
  ambient: ['Fireflies'],
  waterfall: { angle: deg(238) },
  fun: { hottub: { type: 'HotTub', style: 'jungle', angle: deg(-120), frac: 0.6, label: '♨️ Jungle Hot Tub' }, vineswing: { type: 'VineSwing', angle: deg(170), frac: 0.62, label: '🐒 Vine Swing' } },
  zones: {
    work: { type: 'HoloLab', style: 'temple', angle: deg(115), frac: 0.62, span: deg(100), label: '🗿 Temple Lab' },
    research: { type: 'HoloRing', style: 'stone', angle: deg(-62), frac: 0.68, label: '🔭 Ruin Ring' },
    social: { type: 'TikiBar', style: 'jungle', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍌 Jungle Hut' },
    lounge: { type: 'Hammocks', style: 'vine', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'river', angle: deg(70), label: '🛶 River dock: waiting on you' },
    plaza: { type: 'Campfire', style: 'campfire' },
  },
  homes: { type: 'Treehouse', center: deg(219), arc: deg(150), maxArc: deg(280), bridges: true },
  lights: { torch: 'tiki' },
  gait: 'hop',
  stateLabels: { thinking: 'Thinking (jungle hut)', waiting_on_user: 'Waiting on you (river dock)', idle: 'Idle (vine hammock / treehouse)', stale: 'Asleep in treehouse' },
  props: { thinking: 'coconut', researching: 'book' },
  surround: {
    water: { label: 'River lake' },
    land: { label: 'Jungle floor + pond', pond: true, colors: ['#4f7a34', '#3d6a2c', '#6a5a38'], hills: [1.0, 10], scatter: [['jungleTrees', 120], ['bushes', 120], ['rocks', 25]] },
  },
  fog: { clear: [1.6, 4.6], tint: '#b9d3c0' },
};
