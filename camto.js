// helper injected by probe/shoot: frame a bot from in front. usage in page: __frame(id, dist, height, side)
window.__frame = (id, dist = 4, h = 2.4, side = 0, lookY = 0.7) => {
  const t = window.__botsim.targets[id]; const p = t.pos; const f = (t.face || 0) + side;
  const cx = p[0] + Math.sin(f) * dist, cz = p[2] + Math.cos(f) * dist;
  window.__botsim.cam([cx, p[1] + h, cz], [p[0], p[1] + lookY, p[2]]);
};
// frame home #i (layout order = bot order) from its front door
window.__home = (i, dist = 6, h = 4, side = 0, lookY = 0.8) => {
  const L = window.__botsim.layout; const hm = L.homes[i]; const f = hm.rot + side;
  const y = (hm.type === 'Bungalow' ? 0 : L.groundY(hm.x, hm.z)) + hm.floor;
  window.__botsim.cam([hm.x + Math.sin(f) * dist, y + h, hm.z + Math.cos(f) * dist], [hm.x, y + lookY, hm.z]);
};
window.__sleeper = () => Math.max(0, window.__botsim.bots.findIndex((b) => b.state === 'stale'));
