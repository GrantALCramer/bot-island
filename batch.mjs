// batch screenshots: node batch.mjs list.json   (list: [{name, url, wait, js, wait2, w, h}])
import { chromium } from 'playwright-core';
import fs from 'fs';
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const s of list) {
  const page = await browser.newPage({ viewport: { width: s.w || 1280, height: s.h || 800 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log(s.name, 'console:', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log(s.name, 'pageerror:', e.message));
  const t0 = Date.now();
  await page.goto(BASE + s.url); await page.waitForTimeout(s.wait ?? 10000);
  if (s.js) { await page.addScriptTag({ path: 'camto.js' }); await page.evaluate(s.js); await page.waitForTimeout(s.wait2 ?? 4000); }
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(n / 1.5); }; requestAnimationFrame(f); }));
  await page.evaluate(() => new Promise((r) => { const gl = window.__botsim?.gl; if (gl) { gl.info.autoReset = false; gl.info.reset(); } requestAnimationFrame(() => requestAnimationFrame(r)); }));
  const info = await page.evaluate(() => { const L = window.__botsim?.layout; const i = window.__botsim?.gl?.info; return L ? `R=${L.R} ext=${L.extent.toFixed(1)} n=${L.n} calls=${i?.render.calls} tris=${i?.render.triangles}` : ''; });
  await page.screenshot({ path: `shots/${s.name}.png` }); console.log('saved', s.name, 'fps~', fps.toFixed(1), info, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await page.close();
}
await browser.close();
