// Candy Land: a sugar island in a strawberry-milk sea. Gingerbread houses with icing and gumdrop roofs, a
// layer-cake lab with candles, a lollipop research ring, an ice-cream parlor, a wafer pier with a rubber-duck
// boat, a giant cupcake plaza with donut benches, candy-cane lamps, a jelly trampoline, a hot-cocoa pool,
// lollipop and cotton-candy trees, gumdrops, sprinkles drifting down and ice-cream mountains on the horizon.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'candy', name: 'Candy Land', status: 'ready',
  description: 'Gingerbread houses, layer-cake lab, lollipop ring, ice-cream parlor, cupcake plaza, jelly trampoline, cocoa pool.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.5,
    rel: [[1.6, 0], [6.0, -1.1], [11, -2.8], [60, -4.5]],
    colors: { grass: '#a8ecc4', grass2: '#98e0b8', sand: '#f4d6a8', wetSand: '#e0b888', path: '#fff0f6', rock: '#d8a0c0' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#ffc8e0', mid: '#ff9cc8', deep: '#d0609a', foam: '#ffffff', waveAmp: 0.06 },
  sky: [
    [0, '#1a1040', '#3a2a6a', '#d8c4ff'], [4.8, '#20144a', '#4a3478', '#d8c4ff'], [5.8, '#5a4a9a', '#ffb0c8', '#ffc0a0'],
    [6.8, '#8ab0f0', '#ffe0ec', '#ffe8d0'], [8, '#80b8f8', '#ffeef8', '#fff6ee'], [12, '#78b4fa', '#fff0fa', '#ffffff'],
    [16.5, '#88b4f0', '#ffe6f2', '#fff1e6'], [17.8, '#9aa0e8', '#ffd0e0', '#ffd0b0'], [18.6, '#a888d8', '#ffa8c8', '#ffb090'],
    [19.2, '#7a5ab8', '#ff90b8', '#ff9080'], [19.8, '#4a3488', '#d070a8', '#ff8080'], [20.6, '#24185a', '#5a3a88', '#d8c4ff'],
    [24, '#1a1040', '#3a2a6a', '#d8c4ff'],
  ],
  skyFx: { cloud: '#fff4fa', cloudDark: '#e0b8d0', nightLight: ['#d8b8ff', 1.2] },
  weathers: ['clear', 'rainbow', 'sprinkles', 'sugarsnow', 'haze'], defaultWeather: 'clear',
  wind: 0.5,
  vegetation: ['CandyGarden'],
  ambient: ['Sprinkles', 'IceCreamHills'],
  fun: {
    trampoline: { type: 'Trampoline', style: 'jelly', angle: deg(170), frac: 0.62, label: '🟩 Jelly Trampoline' },
    hottub: { type: 'HotTub', style: 'cocoa', angle: deg(-120), frac: 0.6, label: '☕ Hot Cocoa Pool' },
  },
  funEmojis: { trampoline: ['🤸', '😆', '🍬', '🟩'], hottub: ['☕', '🍫', '😋', '🤤'] },
  actLabels: { campfire: 'Cupcake candle glow', stroll: 'Walk the wafer pier', stargaze: 'Sugar stars from the pier' },
  drink: '🥤',
  zones: {
    work: { type: 'HoloLab', style: 'cake', angle: deg(115), frac: 0.62, span: deg(100), label: '🎂 Cake Lab' },
    research: { type: 'HoloRing', style: 'lollipop', angle: deg(-62), frac: 0.68, label: '🍭 Lollipop Ring' },
    social: { type: 'TikiBar', style: 'parlor', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🍦 Ice Cream Parlor' },
    lounge: { type: 'Hammocks', style: 'candycane', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'wafer', angle: deg(70), label: '🦆 Wafer pier: waiting on you' },
    plaza: { type: 'Campfire', style: 'cupcake' },
  },
  homes: { type: 'Gingerbread', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'candycane' },
  gait: 'hop',
  stateLabels: { thinking: 'Thinking (ice cream parlor)', waiting_on_user: 'Waiting on you (wafer pier)', idle: 'Idle (hammock / gingerbread house)', stale: 'Asleep in the gingerbread house' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Strawberry milk sea' },
    land: { label: 'Candy meadows + milk moat', pond: true, colors: ['#a8ecc4', '#ffd6e8', '#f4d6a8'], hills: [1.0, 7], scatter: [['lollipops', 90], ['gumdrops', 120]] },
  },
  fog: { clear: [2.0, 5.6], tint: '#ffd8ec' },
};
