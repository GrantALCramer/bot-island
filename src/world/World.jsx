import { TERRAIN, WATER, VEGETATION, ZONES, HOMES, HOME_EXTRAS, AMBIENT } from './registry.js';
import { useWorld } from './env.js';
import { LandScatter } from './Surround.jsx';

const EMPTY = new Set();
// Renders whatever the active theme names. No theme-specific code here.
export default function World({ bots, targets, selected, onSelect }) {
  const { theme, layout } = useWorld();
  const Terrain = TERRAIN[theme.terrain.component]; const Water = theme.water && WATER[theme.water.component]; const Home = HOMES[theme.homes.type];
  const Extra = theme.homes.bridges && HOME_EXTRAS[theme.homes.type];
  const occ = new Set(); // station ids in use
  bots.forEach((b) => { const t = targets[b.id]; if (t?.station !== undefined) occ.add(t.station); });
  const waiting = bots.some((b) => b.state === 'waiting_on_user');
  return (<group>
    {Terrain && <Terrain />}
    {Water && <Water />}
    {layout.surround === 'land' && <LandScatter />}
    {theme.vegetation.map((v) => { const V = VEGETATION[v]; return V ? <V key={v} /> : null; })}
    {Object.entries(layout.zones).map(([key, z]) => { const Z = ZONES[z.type]; if (!Z) return null;
      const count = targets.__counts?.[key] || 0; // how many bots use it right now -> activity structures grow to seat them
      if (key === 'plaza') return <Z key={key} cfg={z.cfg} count={count} />;
      return z.instances.map((inst, j) => <Z key={`${key}-${inst.id}`} inst={inst} cfg={z.cfg} occupied={occ || EMPTY} waiting={waiting} primary={j === 0} count={z.instances.length === 1 ? count : 0} />); })}
    {Home && bots.map((b, i) => layout.homes[i] && <Home key={b.id} home={layout.homes[i]} bot={b} selected={selected === b.id} onSelect={onSelect} asleep={b.state === 'stale' && targets[b.id]?.zone === 'home'} inBed={targets[b.id]?.zone === 'home'} />)}
    {Extra && <Extra />}
    {theme.ambient.map((a) => { const A = AMBIENT[a]; return A ? <A key={a} /> : null; })}
  </group>);
}
