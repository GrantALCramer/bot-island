// Antarctica: snowy ice island in icy water. Igloo homes, ice-cave holo lab, ice-crystal research ring,
// cocoa hut, icebreaker dock, warming fire, aurora at night, penguins on the shore.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'antarctica', name: 'Antarctica', status: 'ready',
  description: 'Ice island: igloos, ice-cave holo lab, crystal ring, cocoa hut, icebreaker dock, aurora and penguins.',
  terrain: {
    component: 'BeachTerrain', top: 0.06, minR: 7.5, grassInset: 1.2, snow: true,
    rel: [[1.2, 0], [4, -1], [9, -2.8], [60, -4]],
    colors: { grass: '#f3f8fc', grass2: '#e2ecf4', sand: '#d7e6f0', wetSand: '#9fbdd2', path: '#c9dbe8', rock: '#6f7f90' },
  },
  water: { component: 'Ocean', level: -0.35, shallow: '#7fb6cf', mid: '#2f6a8f', deep: '#0d2b48', foam: '#f4fbff', waveAmp: 0.05, ice: true },
  sky: [
    [0, '#040a1c', '#0f1f3a', '#a9c4ff'], [5.5, '#0b1530', '#25365c', '#a9c4ff'], [6.6, '#3a4f86', '#f3b5a0', '#ffc8a0'],
    [7.6, '#6f9fd2', '#e9d6d4', '#ffe7cf'], [9, '#7fb0de', '#e4f0f8', '#fff8ee'], [13, '#76abe0', '#eaf4fb', '#ffffff'],
    [16.3, '#7aa6d6', '#f0e6e6', '#fff0dc'], [17.4, '#6c7fc0', '#ffc0a0', '#ffb889'], [18.2, '#3f4a90', '#e4889a', '#ff9a7a'],
    [19.0, '#1a2458', '#5d4f86', '#a9c4ff'], [20.5, '#08112a', '#18284a', '#a9c4ff'], [24, '#040a1c', '#0f1f3a', '#a9c4ff'],
  ],
  sun: { riseHour: 7, setHour: 18.3, setAzimuth: deg(225) },
  weathers: ['clear', 'snow', 'blizzard', 'fog'], defaultWeather: 'snow',
  wind: 0.6,
  vegetation: ['SnowPines', 'IceSpikes', 'IceFloes'],
  ambient: ['Aurora', 'Penguins'],
  fun: { hottub: { type: 'HotTub', style: 'heated', angle: deg(-120), frac: 0.6, label: '♨️ Heated Tub' }, snowball: { type: 'SnowFort', angle: deg(170), frac: 0.62, label: '❄️ Snow Fort' } },
  zones: {
    work: { type: 'HoloLab', style: 'ice', angle: deg(115), frac: 0.62, span: deg(100), label: '🧊 Ice-Cave Lab' },
    research: { type: 'HoloRing', style: 'crystal', angle: deg(-62), frac: 0.68, label: '🔭 Crystal Ring' },
    social: { type: 'TikiBar', style: 'cocoa', angle: deg(-6), frac: 0.8, facing: 'camera', label: '☕ Cocoa Hut' },
    lounge: { type: 'Hammocks', style: 'ice', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'ice', angle: deg(70), label: '🚩 Icebreaker: waiting on you' },
    plaza: { type: 'Campfire', style: 'warming' },
  },
  homes: { type: 'Igloo', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'ice' },
  gait: 'waddle',
  stateLabels: { thinking: 'Thinking (cocoa hut)', waiting_on_user: 'Waiting on you (icebreaker)', idle: 'Idle (fur hammock / igloo)', stale: 'Asleep in igloo' },
  props: { thinking: 'cocoa', researching: 'book' },
  surround: {
    water: { label: 'Icy sea' },
    land: { label: 'Snowfield + ice lead', pond: true, colors: ['#f4f9fc', '#e3edf5', '#d4e3ee'], hills: [0.8, 9], scatter: [['pines', 70], ['drifts', 80], ['iceRocks', 50], ['rocks', 20]] },
  },
  fog: { clear: [1.7, 4.6], tint: '#dbe9f4' },
};
