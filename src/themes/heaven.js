// Heaven: an island of cloud in a pastel sky. Marble gazebo cloud cottages with fluffy cloud beds, marble temple lab
// with golden holo screens, floating book ring, nectar fountain lounge, pearly gates (the waiting spot), halo plaza.
// Sparkles and soft light rays; blobs get tiny halos and wings (the halo glows when they sleep).
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'heaven', name: 'Heaven', status: 'ready',
  description: 'Cloud island: marble gazebos with cloud beds, marble temple, floating books, nectar fountain, pearly gates.',
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.0,
    rel: [[1.4, 0], [4, -0.8], [9, -2], [60, -3]],
    colors: { grass: '#fdfaff', grass2: '#efe5fb', sand: '#f6e6c0', wetSand: '#e9cf98', path: '#f5dc8e', rock: '#e8e4f0' },
  },
  water: { component: 'Ocean', style: 'cloud', level: -0.6, shallow: '#ffffff', mid: '#e2d4f4', deep: '#b4b0ea', foam: '#ffffff', waveAmp: 0.22 },
  sky: [
    [0, '#2a2352', '#5a4a7a', '#c9b8ff'], [5, '#3a3266', '#7a5a8a', '#ffd6e8'], [6.2, '#7a8ad8', '#ffc9d6', '#ffd9a8'],
    [7.5, '#6fb0ff', '#ffd9ea', '#fff1d6'], [12, '#6db4ff', '#ffe2f0', '#fff8e8'], [16.8, '#78b2ff', '#ffdbe8', '#fff0d6'],
    [18.2, '#a08ae0', '#ffcf9a', '#ffcf8a'], [19.2, '#7a5ac0', '#ff9fb4', '#ffa880'], [20.4, '#3f3478', '#8a6a9a', '#c9b8ff'],
    [24, '#2a2352', '#5a4a7a', '#c9b8ff'],
  ],
  skyFx: { cloud: '#ffffff', cloudDark: '#d8cce8', ambient: 0.95 },
  sun: { riseHour: 6.2, setHour: 19.2, setAzimuth: deg(225) },
  weathers: ['clear', 'golden', 'rainbow', 'haze'], defaultWeather: 'clear',
  wind: 0.3,
  vegetation: ['CloudRim', 'GoldTrees'],
  ambient: ['Sparkles', 'HeavenRays'],
  fun: { hottub: { type: 'HotTub', style: 'cloud', angle: deg(-120), frac: 0.6, label: '☁️ Cloud Jacuzzi' }, harp: { type: 'HarpStage', angle: deg(170), frac: 0.62, label: '🎵 Harp Stage' } },
  zones: {
    work: { type: 'HoloLab', style: 'marble', angle: deg(115), frac: 0.62, span: deg(100), label: '🏛️ Marble Temple' },
    research: { type: 'HoloRing', style: 'books', angle: deg(-62), frac: 0.68, label: '📜 Book Ring' },
    social: { type: 'ClamLounge', style: 'fountain', angle: deg(-6), frac: 0.8, label: '⛲ Nectar Fountain' },
    lounge: { type: 'Hammocks', style: 'column', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'gates', angle: deg(70), label: '✨ Pearly gates: waiting on you' },
    plaza: { type: 'Campfire', style: 'halo' },
  },
  homes: { type: 'Gazebo', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'gold' },
  gait: 'hop',
  accessory: 'halo',
  stateLabels: { thinking: 'Thinking (nectar fountain)', waiting_on_user: 'Waiting on you (pearly gates)', idle: 'Idle (cloud hammock / gazebo)', stale: 'Asleep on a cloud' },
  props: { thinking: 'cup', researching: 'book' },
  surround: {
    water: { label: 'Cloud sea' },
    land: { label: 'Cloud bank', colors: ['#ffffff', '#f4ecff', '#fff4e0'], hills: [0.9, 7], scatter: [['cloudPuffs', 170], ['ruins', 25], ['goldTrees', 45]] },
  },
  fog: { clear: [2.2, 6], tint: '#fbeefa' },
};
