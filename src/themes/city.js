// City (modern metro): a harbor island downtown. Brick + glass townhouses with lit windows and rooftop water
// tanks, a glass-walled office lab, a server-room research ring, a corner café, a train stop with a commuter train,
// a fountain plaza, rooftop pool + basketball court, mid-rise blocks with busy rooftops, street lamps, planter
// trees, hydrants, parked cars, and a downtown street grid all around.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'city', name: 'City', status: 'ready',
  description: 'Downtown block: townhouses, glass office lab, server room, café, train stop, fountain plaza, rooftops, street grid.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.3,
    rel: [[1.2, 0], [2.4, -0.6], [3.0, -2.6], [60, -4.5]],
    colors: { grass: '#7fa36a', grass2: '#6f955e', sand: '#bdb8ad', wetSand: '#8f8a80', path: '#5a5d64', rock: '#7a7d84' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#4f8f9a', mid: '#2f6a80', deep: '#173a55', foam: '#e8f0f4', waveAmp: 0.05 },
  sky: [
    [0, '#0b0f24', '#2a2a48', '#b4c4ff'], [4.8, '#0f1430', '#33335a', '#b4c4ff'], [5.8, '#30386e', '#e09a7e', '#ffb37a'],
    [6.8, '#5a8fd0', '#ffd9b8', '#ffdcb0'], [8, '#4f8fd8', '#cfe4f4', '#fff3df'], [12, '#4a8ae0', '#d6eaf8', '#ffffff'],
    [16.5, '#5a8fd8', '#e4e8ef', '#fff1d6'], [17.8, '#6a7fc8', '#ffcf9a', '#ffd08a'], [18.6, '#6a5fae', '#ff9a6c', '#ff9c55'],
    [19.2, '#46387e', '#ff7a6a', '#ff7046'], [19.8, '#2a2560', '#b45a80', '#ff6a50'], [20.6, '#141838', '#4a3a6a', '#b4c4ff'],
    [24, '#0b0f24', '#2a2a48', '#b4c4ff'],
  ],
  skyFx: { nightLight: ['#ffb27a', 0.6] },
  weathers: ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'], defaultWeather: 'clear',
  wind: 0.6,
  vegetation: ['CityBlocks', 'StreetProps'],
  ambient: ['CityGrid'],
  fun: {
    hottub: { type: 'HotTub', style: 'rooftop', angle: deg(-120), frac: 0.6, label: '🏊 Rooftop Pool' },
    volleyball: { type: 'Volleyball', style: 'hoops', angle: deg(170), frac: 0.62, label: '🏀 Basketball Court' },
  },
  funEmojis: { volleyball: ['🏀', '🙌', '😤', '💪', '🔥'], hottub: ['🏊', '😎', '🍹', '🌇'] },
  actLabels: { campfire: 'Evening at the fountain', stroll: 'Stroll to the train stop', stargaze: 'City lights from the platform' },
  drink: '☕',
  zones: {
    work: { type: 'HoloLab', style: 'office', angle: deg(115), frac: 0.62, span: deg(100), label: '🏢 Office Lab' },
    research: { type: 'HoloRing', style: 'servers', angle: deg(-62), frac: 0.68, label: '🗄️ Server Room' },
    social: { type: 'TikiBar', style: 'cafe', angle: deg(-6), frac: 0.8, facing: 'camera', label: '☕ Corner Café' },
    lounge: { type: 'Hammocks', style: 'lamppost', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'train', angle: deg(70), label: '🚆 Train stop: waiting on you' },
    plaza: { type: 'Campfire', style: 'fountain' },
  },
  homes: { type: 'Townhouse', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'streetlamp' },
  gait: 'hop',
  stateLabels: { thinking: 'Thinking (café)', waiting_on_user: 'Waiting on you (train stop)', idle: 'Idle (park hammock / home)', stale: 'Asleep at home' },
  props: { thinking: 'cup', researching: 'book' },
  // no water: the island sits in a flat downtown street grid (CityGrid); the only surround option
  surround: {
    land: { label: 'Downtown street grid', grid: true, colors: ['#55585e', '#5d6066', '#4f5258'], hills: [0, 0] },
  },

  fog: { clear: [2.0, 5.6], tint: '#c9c4cf' },
  camera: { dir: [1, 0.6, 1], fov: 45 },
};
