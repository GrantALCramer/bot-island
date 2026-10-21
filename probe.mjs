// quick single screenshot: node probe.mjs <name> <url> [waitMs] [js-to-eval-after-load] [extraWait]
import { chromium } from 'playwright-core';
const [name, url, wait = '7000', js, wait2 = '3000'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(BASE + url); await page.waitForTimeout(+wait);
if (js) { await page.addScriptTag({ path: "camto.js" }); await page.evaluate(js); await page.waitForTimeout(+wait2); }
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
await page.screenshot({ path: `shots/${name}.png` }); console.log('saved', name, 'fps~', fps);
await browser.close();
