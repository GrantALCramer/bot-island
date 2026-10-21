// Old West: a dusty frontier town on a desert lake. False-front shacks with porches and rocking chairs, a
// telegraph office lab, an assay office (mine cart, gold), the saloon with balcony + piano, a riverboat landing,
// ranch-post hammocks, oil-lantern posts, a shooting range hangout, Main Street storefronts, saguaros, water
// tower, windmill, covered wagon, tumbleweeds, buzzards and red mesas. Blobs wear cowboy hats.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'west', name: 'Old West', status: 'ready',
  description: 'Frontier town: saloon, Main Street, telegraph office, assay office, shooting range, riverboat, mesas. Cowboy hats!',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.5,
    rel: [[1.6, 0], [6.0, -1.1], [11, -2.8], [60, -4.5]],
    colors: { grass: '#d2ad74', grass2: '#c49e66', sand: '#e2c592', wetSand: '#b8935e', path: '#a8805a', rock: '#9a6a4a' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#7ac8b8', mid: '#3a8fa0', deep: '#1f5a70', foam: '#f4efe6', waveAmp: 0.04 },
  sky: [
    [0, '#0a0c22', '#2a2440', '#b4c4ff'], [4.8, '#101430', '#3a2e4a', '#b4c4ff'], [5.8, '#3a3466', '#f0a070', '#ffb070'],
    [6.8, '#6a9ad8', '#ffd8a8', '#ffd9a0'], [8, '#5a9ae0', '#f4e4c8', '#fff3df'], [12, '#4f92e6', '#f2e6d0', '#ffffff'],
    [16.5, '#5a94e0', '#f6dcb8', '#fff1d6'], [17.8, '#6a84cc', '#ffc888', '#ffc070'], [18.6, '#7a5aa8', '#ff8a4c', '#ff9040'],
    [19.2, '#4e3484', '#ff6a3a', '#ff6a30'], [19.8, '#2a2262', '#b8486a', '#ff5a40'], [20.6, '#141638', '#3e2e5a', '#b4c4ff'],
    [24, '#0a0c22', '#2a2440', '#b4c4ff'],
  ],
  weathers: ['clear', 'golden', 'cloudy', 'duststorm', 'storm'], defaultWeather: 'clear',
  wind: 0.8,
  vegetation: ['MainStreet', 'WestProps'],
  ambient: ['Tumbleweeds', 'Buzzards', 'Mesas'],
  fun: {
    range: { type: 'Range', angle: deg(170), frac: 0.62, label: '🎯 Shooting Range' },
    hottub: { type: 'HotTub', style: 'wood', angle: deg(-120), frac: 0.6, label: '🛁 Bathhouse Barrel' },
  },
  funEmojis: { hottub: ['🛁', '🤠', '🫧', '😌'] },
  actLabels: { campfire: 'Campfire songs & beans', stroll: 'Mosey down to the landing', stargaze: 'Stars over the prairie' },
  drink: '🥃',
  zones: {
    work: { type: 'HoloLab', style: 'telegraph', angle: deg(115), frac: 0.62, span: deg(100), label: '📠 Telegraph Office' },
    research: { type: 'HoloRing', style: 'assay', angle: deg(-62), frac: 0.68, label: '⛏️ Assay Office' },
    social: { type: 'TikiBar', style: 'saloon', angle: deg(-6), frac: 0.8, facing: 'camera', label: '🥃 Saloon' },
    lounge: { type: 'Hammocks', style: 'ranch', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'landing', angle: deg(70), label: '🛶 Riverboat landing: waiting on you' },
    plaza: { type: 'Campfire', style: 'campfire' },
  },
  homes: { type: 'Shack', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'lantern' },
  gait: 'hop',
  accessory: 'cowboy',
  stateLabels: { thinking: 'Thinking (saloon)', waiting_on_user: 'Waiting on you (riverboat landing)', idle: 'Idle (hammock / shack)', stale: 'Asleep in the shack' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    // 'Water' = desert lake ringed by mesas (the old land look); 'Land' = high plateau cut by a red-rock canyon
    land: { label: 'Canyon + mesas', pond: true, canyon: true, plainY: 3.4, bankW: 2.2, colors: ['#c98a5a', '#b9774a', '#d49a66'], strata: ['#a8553a', '#c9774c', '#e0a070', '#b8603e', '#d8b07a'], hills: [0.3, 4], scatter: [['mesas', 34], ['saguaros', 90], ['rocks', 50]] },
    water: { kind: 'land', label: 'Desert lake + mesas', pond: true, colors: ['#d8b07a', '#c99e66', '#b88a56'], hills: [0.6, 6], scatter: [['mesas', 40], ['saguaros', 120], ['rocks', 40]] },
  },
  fog: { clear: [2.0, 5.6], tint: '#e8cfa8' },
};
