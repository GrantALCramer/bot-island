// usage: node tools/holidayshots.mjs [ids...]  -> /workspace/wf-holiday/map-<id>.png (preview server on :8789)
import { chromium } from 'playwright-core';
const B = process.env.BASE || 'http://127.0.0.1:8789'; const O = process.env.OUT || '/workspace/wf-holiday';
const ALL = { newyear: 'tropical&hour=22', valentines: 'tropical&hour=17', stpatricks: 'tropical&hour=12', easter: 'tropical&hour=11', july4: 'tropical&hour=21.5', thanksgiving: 'tropical&hour=16', hanukkah: 'tropical&hour=19.5', lunarny: 'tropical&hour=18', diwali: 'tropical&hour=20' };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ALL);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const errs = [];
for (const id of ids) { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(id + ': ' + e.message));
  await p.goto(`${B}/?season=${id}&weather=clear&theme=${ALL[id]}`); await p.waitForTimeout(+process.env.WAIT || 12000);
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r((n / 3).toFixed(1)); }; requestAnimationFrame(f); }));
  await p.screenshot({ path: `${O}/map-${id}.png` }); console.log('saved', id, 'fps(swiftshader)', fps); await ctx.close(); }
console.log('errors', errs); await b.close();
