// Holiday windows for decorative chat frames. All local dates; movable feasts computed or from short tables.
const D = (y, m, d) => new Date(y, m - 1, d);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function easter(y) { // Anonymous Gregorian computus
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; return D(y, month, day);
}
const nthWeekday = (y, m, wd, n) => { const first = D(y, m, 1); return D(y, m, 1 + ((wd - first.getDay() + 7) % 7) + 7 * (n - 1)); };
// tables (first day): Lunar New Year, Diwali (main day), Hanukkah (first full day)
const LNY = { 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] };
const DIWALI = { 2025: [10, 20], 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5], 2030: [10, 26], 2031: [11, 14], 2032: [11, 2], 2033: [10, 22], 2034: [11, 10], 2035: [10, 30] };
const HANUKKAH = { 2025: [12, 15], 2026: [12, 5], 2027: [12, 25], 2028: [12, 13], 2029: [12, 2], 2030: [12, 21], 2031: [12, 10], 2032: [11, 28], 2033: [12, 17], 2034: [12, 7], 2035: [12, 26] };
const fromTable = (t, y) => (t[y] ? D(y, t[y][0], t[y][1]) : null);

export const HOLIDAYS = [
  { id: 'newyear', name: "New Year's", icon: '🎆', win: (y) => [D(y - 1, 12, 31), D(y, 1, 2)], win2: (y) => [D(y, 12, 31), D(y + 1, 1, 2)] },
  { id: 'lunarny', name: 'Lunar New Year', icon: '🧧', win: (y) => { const d = fromTable(LNY, y); return d && [addDays(d, -2), addDays(d, 7)]; } },
  { id: 'valentines', name: "Valentine's Day", icon: '💘', win: (y) => [D(y, 2, 10), D(y, 2, 14)] },
  { id: 'stpatricks', name: "St. Patrick's Day", icon: '☘️', win: (y) => [D(y, 3, 14), D(y, 3, 17)] },
  { id: 'easter', name: 'Easter', icon: '🐣', win: (y) => { const e = easter(y); return [addDays(e, -7), addDays(e, 1)]; } },
  { id: 'earthday', name: 'Earth Day', icon: '🌍', win: (y) => [D(y, 4, 20), D(y, 4, 22)] },
  { id: 'july4', name: '4th of July', icon: '🎇', win: (y) => [D(y, 7, 1), D(y, 7, 5)] },
  { id: 'halloween', name: 'Halloween', icon: '🎃', win: (y) => [D(y, 10, 20), D(y, 10, 31)] },
  { id: 'diwali', name: 'Diwali', icon: '🪔', win: (y) => { const d = fromTable(DIWALI, y); return d && [addDays(d, -2), addDays(d, 2)]; } },
  { id: 'thanksgiving', name: 'Thanksgiving', icon: '🦃', win: (y) => { const t = nthWeekday(y, 11, 4, 4); return [addDays(t, -3), addDays(t, 1)]; } },
  { id: 'hanukkah', name: 'Hanukkah', icon: '🕎', win: (y) => { const d = fromTable(HANUKKAH, y); return d && [addDays(d, -1), addDays(d, 7)]; } },
  { id: 'christmas', name: 'Christmas', icon: '🎄', win: (y) => [D(y, 12, 10), D(y, 12, 26)] },
];
const inWin = (w, t) => w && t >= w[0].getTime() && t <= w[1].getTime() + 86399999;
// the holiday whose window contains `date` (earlier entries win on overlap, e.g. Hanukkah over Christmas), or null
export function holidayFor(date = new Date()) {
  const y = date.getFullYear(), t = date.getTime();
  for (const h of HOLIDAYS) if (inWin(h.win(y), t) || (h.win2 && inWin(h.win2(y), t))) return h;
  return null;
}
export const _easter = easter; export const _thanksgiving = (y) => nthWeekday(y, 11, 4, 4);
