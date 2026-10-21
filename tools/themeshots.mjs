// usage: node tools/themeshots.mjs <theme> [only]   (preview server on BASE, default :8789)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8789'; const T = process.argv[2]; const only = process.argv[3]; const OUT = process.env.OUT || 'shots/themes';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const helper = fs.readFileSync(new URL('../camto.js', import.meta.url), 'utf8'); const errs = [];
async function shot(name, q, js, { phone = false, wait = 13000 } = {}) {
  if (only && !name.includes(only)) return;
  const ctx = await browser.newContext(phone ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${name}: pageerror ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') errs.push(`${name}: console ${m.text().slice(0, 200)}`); });
  await page.addInitScript(helper);
  await page.goto(`${BASE}/?theme=${T}&${q}`); await page.waitForTimeout(wait);
  if (js) { await page.evaluate(js); await page.waitForTimeout(5000); }
  const info = await page.evaluate(() => { const g = window.__botsim?.gl; return g ? { calls: g.info.render.calls, tris: g.info.render.triangles, geos: g.info.memory.geometries } : null; });
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
  await page.screenshot({ path: `${OUT}/${T}-${name}.png` }); console.log('saved', name, JSON.stringify(info), 'fps(swiftshader)', fps.toFixed(1)); await ctx.close();
}
const W0 = process.env.W0 || 'clear';
const act = (k) => `__botsim.activity('${k}')`;
const zcam = (key, d = 7, h = 4.5) => `(() => { const z = __botsim.layout?.zones?.['${key}']; const i = z.instances[0]; const ux = -Math.sin(i.rot || 0), uz = -Math.cos(i.rot || 0); __botsim.cam([i.x - ux * ${d} + uz * 2, (__botsim.layout.groundY(i.x, i.z)) + ${h}, i.z - uz * ${d} - ux * 2], [i.x, 0.8, i.z]); })()`;
await shot('desktop-day', `hour=11&weather=${W0}`);
await shot('desktop-night', `hour=22&weather=${W0}`);
await shot('desktop-sunset', `hour=19&weather=${W0}`);
await shot('desktop-weather', `hour=14&weather=${process.env.WX || 'rain'}`);
await shot('phone-day', `hour=12&weather=${W0}&lite=1`, null, { phone: true });
await shot('phone-night', `hour=22&weather=${W0}&lite=1`, null, { phone: true });
await shot('home-night', `hour=21.5&weather=${W0}&ui=0`, `__home(0, 6.5, 3.6)`);
await shot('work-day', `hour=14&weather=${W0}&ui=0`, zcam('work', 8, 5));
await shot('social-dusk', `hour=18.6&weather=${W0}&ui=0`, zcam('social', 7.5, 4));
await shot('dock-day', `hour=10&weather=${W0}&ui=0`, `(() => { const d = __botsim.layout.zones.waiting.instances[0]; __botsim.cam([d.ux * (d.to + 6) + d.px * 6, 5, d.uz * (d.to + 6) + d.pz * 6], [d.ux * d.to, 0.5, d.uz * d.to]); })()`);
for (const k of (process.env.FUN || '').split(',').filter(Boolean)) {
  const [zone, kind] = k.split(':');
  await shot(`fun-${zone}`, `hour=15&weather=${W0}&ui=0`, `(async () => { ${act(kind || zone)}; await new Promise((r) => setTimeout(r, 22000)); ${zcam(zone, 6.5, 4)}; })()`, { wait: 12000 });
}
console.log('ERRORS', errs.length ? '\n' + [...new Set(errs)].join('\n') : 'none');
await browser.close();
