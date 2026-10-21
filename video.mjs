// demo video: slow orbit across all seven themes (virtual-time capture, ~real speed despite software GL).
// Start a test server first, e.g. DEMO=on DEMO_COUNT=12 AGENTS_DIR=/tmp/noagents EVENTS_DIR=/tmp/empty PORT=8788 node server.js
// usage: BASE=http://127.0.0.1:8788 node video.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const FPS = 24, SECS = 3;
const segs = [['tropical', 16.5, 'clear'], ['antarctica', 20.5, 'clear'], ['atlantis', 12, 'calm'], ['jungle', 18.4, 'clear'],
  ['moon', 11, 'meteors'], ['heaven', 17.6, 'rainbow'], ['hell', 21, 'eruption', 'land']];
// optional: node video.mjs <firstSegment> to resume a partial capture
const from = +(process.argv[2] || 0);
const dir = '/tmp/vframes'; if (!from) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); }
let f = from * FPS * SECS;
for (const [theme, hour, wx, sur = 'water'] of segs.slice(from)) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  await page.addInitScript(() => { let vt = 0; performance.now = () => vt; window.__vt = (ms) => { vt += ms; }; });
  await page.goto(`${BASE}/?theme=${theme}&hour=${hour}&weather=${wx}&surround=${sur}&ui=0`);
  await page.evaluate(() => window.__vt(9000)); await page.waitForTimeout(9000);
  const cdp = await page.context().newCDPSession(page);
  const N = FPS * SECS;
  for (let i = 0; i < N; i++) {
    const k = i / N;
    await page.evaluate(([k, ms]) => {
      window.__vt(ms); const L = window.__botsim.layout; const d = L.camDist * (1.02 - 0.12 * k);
      const az = 0.785 - 0.5 + k * 1.0; const el = 0.5;
      window.__botsim.cam([Math.cos(az) * d * Math.cos(el), d * Math.sin(el), Math.sin(az) * d * Math.cos(el)], [0, 0.5, 0]);
    }, [k, 1000 / FPS]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    fs.writeFileSync(`${dir}/f${String(f++).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'));
  }
  console.log('segment', theme, f); await page.close();
}
await browser.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/f%04d.jpg -vf "fade=in:0:8" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart shots/demo.mp4`);
console.log('video done');
