// usage: node tools/shots.mjs jobs.json   jobs: [{ out, q, js?, phone?, wait? }]  (preview server on BASE, default :8789)
// Saves each PNG, prints draw stats + any console/page errors.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8789'; const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const helper = fs.readFileSync(new URL('../camto.js', import.meta.url), 'utf8'); const errs = [];
for (const j of jobs) {
  const ctx = await browser.newContext(j.phone ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); const name = j.out.split('/').pop();
  page.on('pageerror', (e) => errs.push(`${name}: pageerror ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') errs.push(`${name}: console ${m.text().slice(0, 200)}`); });
  if (j.init) await page.addInitScript(j.init);
  await page.addInitScript(helper); await page.goto(`${BASE}/?${j.q}`); await page.waitForTimeout(j.wait ?? 13000);
  if (j.js) { try { await page.evaluate(j.js); } catch (e) { errs.push(`${name}: js ${e.message.slice(0, 160)}`); } await page.waitForTimeout(j.after ?? 5000); }
  const info = await page.evaluate(() => { const g = window.__botsim?.gl; return g ? { calls: g.info.render.calls, tris: g.info.render.triangles, frame: g.info.render.frame, fps: window.__fps } : null; });
  await page.screenshot({ path: j.out }); console.log('saved', j.out, JSON.stringify(info)); await ctx.close();
}
console.log('ERRORS', errs.length ? '\n' + errs.join('\n') : 'none'); await browser.close();
