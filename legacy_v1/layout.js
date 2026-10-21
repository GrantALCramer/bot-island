// Island layout (x, z). Camera looks from +x,+z. Work areas sit in the front arc, houses on the back arc.
export const ISLAND_R = 15;
export const HUB_R = 2.4;

export const WORKSHOP = { c: [-3.15, 5.45] };
export const DESK_SLOTS = [];
for (const row of [{ bz: -1.15, dz: -0.42 }, { bz: 0.75, dz: 1.18 }])
  for (const dx of [-1.8, -0.6, 0.6, 1.8])
    DESK_SLOTS.push({ pos: [WORKSHOP.c[0] + dx, WORKSHOP.c[1] + row.bz], desk: [WORKSHOP.c[0] + dx, WORKSHOP.c[1] + row.dz], face: 0 });

export const LIBRARY = { pos: [4.6, -5.6], rot: Math.PI / 4 };
const ln = [Math.sin(LIBRARY.rot), Math.cos(LIBRARY.rot)]; const lt = [ln[1], -ln[0]];
export const LIBRARY_SLOTS = [-1.5, -0.5, 0.5, 1.5].map((k) => ({ pos: [LIBRARY.pos[0] + ln[0] * 2.5 + lt[0] * k * 1.05, LIBRARY.pos[1] + ln[1] * 2.5 + lt[1] * k * 1.05], face: LIBRARY.rot }));

export const CAFE = { pos: [8.6, 2.6], rot: Math.atan2(-0.25, 1) };
const cn = [Math.sin(CAFE.rot), Math.cos(CAFE.rot)]; const ct = [cn[1], -cn[0]];
export const CAFE_TABLES = [-1.3, 0, 1.3].map((k) => [CAFE.pos[0] + cn[0] * 2.5 + ct[0] * k * 1.3, CAFE.pos[1] + cn[1] * 2.5 + ct[1] * k * 1.3]);
export const CAFE_SLOTS = CAFE_TABLES.flatMap(([x, z]) => [{ pos: [x - 0.55, z + 0.25], face: Math.PI / 2 }, { pos: [x + 0.55, z + 0.25], face: -Math.PI / 2 }]);

export const MAILBOX = { pos: [1.7, 4.6] };
export const MAIL_SLOTS = [[2.55, 4.85], [3.35, 5.35], [2.25, 5.75], [4.1, 5.85], [3.05, 6.3]].map((p) => ({ pos: p, face: -Math.PI / 2.3 }));

export const PLAZA_SLOTS = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 + 0.4; return { pos: [Math.cos(a) * 1.55, Math.sin(a) * 1.55], face: Math.PI / 4 }; });

export const LAMPS = [45, 135, 225, 315].map((d) => { const a = (d * Math.PI) / 180; return [Math.cos(a) * 3.4, Math.sin(a) * 3.4]; });

export function housePlacement(n) {
  const A0 = (150 * Math.PI) / 180, A1 = (285 * Math.PI) / 180, R = 11;
  return Array.from({ length: n }, (_, i) => {
    const a = n === 1 ? (A0 + A1) / 2 : A0 + ((A1 - A0) * i) / (n - 1);
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const rot = Math.atan2(-x, -z); const d = [Math.sin(rot), Math.cos(rot)]; const side = [d[1], -d[0]];
    return {
      pos: [x, z], rot, angle: a,
      idle: { pos: [x + d[0] * 1.75 + side[0] * 0.75, z + d[1] * 1.75 + side[1] * 0.75], face: rot },
      stale: { pos: [x + d[0] * 1.45, z + d[1] * 1.45], face: rot },
    };
  });
}

export const ZONE = { working: 'desk', error: 'desk', researching: 'library', thinking: 'cafe', waiting_on_user: 'mail', done: 'plaza', idle: 'home', stale: 'home' };
const ZONE_SLOTS = { desk: DESK_SLOTS, library: LIBRARY_SLOTS, cafe: CAFE_SLOTS, mail: MAIL_SLOTS, plaza: PLAZA_SLOTS };

// Assign each bot a target {pos:[x,z], face} without collisions.
export function assignTargets(bots, houses) {
  const used = {}; const out = {};
  bots.forEach((b, i) => {
    const zone = ZONE[b.state] || 'home';
    if (zone === 'home') { const h = houses[i]; out[b.id] = { ...(b.state === 'stale' ? h.stale : h.idle), zone }; return; }
    const slots = ZONE_SLOTS[zone]; const k = used[zone] = (used[zone] ?? -1) + 1;
    const s = slots[k % slots.length]; const ring = Math.floor(k / slots.length);
    out[b.id] = { pos: [s.pos[0] + ring * 0.5, s.pos[1] + ring * 0.5], face: s.face, zone, desk: s.desk };
  });
  return out;
}
