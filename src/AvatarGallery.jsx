// Dev preview: /?avgallery=pebble:brown,cloud:red,...&cols=5&ry=0.35 renders just the avatar bodies + eyes in a grid
// (used for the side-by-side screenshots against the real Grok Bot avatars).
import { Canvas } from '@react-three/fiber';
import { AvatarFigure } from './Blob.jsx';
export default function AvatarGallery() {
  const q = new URLSearchParams(location.search); const items = q.get('avgallery').split(',').map((s) => s.split(':'));
  const cols = +(q.get('cols') || items.length); const rows = Math.ceil(items.length / cols); const ry = +(q.get('ry') ?? 0.35); const S = 1.35;
  return (<div style={{ position: 'fixed', inset: 0, background: q.get('bg') || '#1f1f1f' }}>
    <Canvas orthographic camera={{ position: [0, 0.6, 10], zoom: Math.min(innerWidth / (cols * S), innerHeight / (rows * S)) * 0.95 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
      <ambientLight intensity={0.9} /><directionalLight position={[3, 5, 6]} intensity={1.6} /><directionalLight position={[-4, 2, 3]} intensity={0.5} />
      {items.map(([shape, color], i) => { const c = i % cols, r = Math.floor(i / cols);
        return <group key={i} position={[(c - (cols - 1) / 2) * S, ((rows - 1) / 2 - r) * S - 0.45, 0]} rotation={[0.12, ry, 0]}><AvatarFigure shape={shape} color={color} style={q.get('style') || 'avatar'} /></group>; })}
    </Canvas></div>);
}
