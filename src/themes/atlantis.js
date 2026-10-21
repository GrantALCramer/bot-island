// Atlantis: a sunken island on the sea floor. Glass-dome homes, bioluminescent holo lab, ancient pillar
// ring, coral café with clam seats, submarine dock, glowing vent plaza. Caustics, god rays, kelp, fish.
import tropical from './tropical.js';
const deg = (d) => (d * Math.PI) / 180;

export default {
  ...tropical,
  id: 'atlantis', name: 'Atlantis', status: 'ready',
  description: 'Sunken city: glass domes, bioluminescent lab, ancient pillars, clam lounge, submarine dock.',
  underwater: true,
  terrain: {
    component: 'BeachTerrain', top: 0.04, minR: 7.5, grassInset: 1.5, caustics: true,
    rel: [[2, -0.4], [8, -2.2], [16, -4.5], [60, -6]],
    colors: { grass: '#5aa58e', grass2: '#3f8a7c', sand: '#d8c9a0', wetSand: '#9a9a86', path: '#cbbd94', rock: '#5c6b78' },
  },
  water: null,
  sky: [
    [0, '#010a18', '#03243a', '#5fb7d6'], [5.5, '#021428', '#06344d', '#5fb7d6'], [7, '#0b4d73', '#127d8f', '#a7f0ff'],
    [12, '#0f6a99', '#1ba3b0', '#d8fbff'], [17.5, '#0c5a86', '#168f9f', '#bff4ff'], [19.5, '#04304e', '#0a5266', '#7fd6ea'],
    [21, '#021428', '#05304a', '#5fb7d6'], [24, '#010a18', '#03243a', '#5fb7d6'],
  ],
  sun: { riseHour: 6.6, setHour: 19, setAzimuth: deg(225) },
  weathers: ['calm', 'currents', 'plankton', 'murky'], defaultWeather: 'calm',
  wind: 0.4,
  vegetation: ['CoralGarden', 'Kelp', 'SeaRocks'],
  ambient: ['Bubbles', 'FishSchools', 'GodRays', 'Plankton'],
  fun: { bubblevent: { type: 'HotTub', style: 'vent', angle: deg(-120), frac: 0.6, label: '🫧 Bubble Vent' }, seahorse: { type: 'SeahorseRide', angle: deg(170), frac: 0.62, label: '🐴 Seahorse Carousel' } },
  zones: {
    work: { type: 'HoloLab', style: 'biolum', angle: deg(115), frac: 0.62, span: deg(100), label: '🪸 Biolum Lab' },
    research: { type: 'HoloRing', style: 'pillars', angle: deg(-62), frac: 0.68, label: '🏛️ Pillar Ring' },
    social: { type: 'ClamLounge', style: 'coral', angle: deg(-6), frac: 0.8, label: '🐚 Coral Café' },
    lounge: { type: 'Hammocks', style: 'kelp', angles: [deg(100), deg(338), deg(36)], frac: 0.95, span: deg(60) },
    waiting: { type: 'Dock', style: 'sub', angle: deg(70), deckY: 0.32, label: '🟡 Sub dock: waiting on you' },
    plaza: { type: 'Campfire', style: 'vent' },
  },
  homes: { type: 'GlassDome', center: deg(219), arc: deg(150), maxArc: deg(340) },
  lights: { torch: 'orb' },
  gait: 'swim',
  stateLabels: { thinking: 'Thinking (coral café)', waiting_on_user: 'Waiting on you (sub dock)', idle: 'Idle (kelp hammock / dome)', stale: 'Asleep in dome' },
  props: { thinking: 'pearl', researching: 'book' },
  surround: {
    water: { label: 'Abyss drop-off', rel: [[2, -0.4], [8, -2.2], [13, -7], [22, -26], [80, -40]] },
    land: { label: 'Seafloor plain', colors: ['#d8c9a0', '#c9b98e', '#9fb59a'], hills: [0.6, 6], scatter: [['coral', 110], ['kelp', 70], ['shells', 60], ['rocks', 40]] },
  },
  fog: { clear: [0.55, 2.3], tint: '#0f6a7a' },
};
