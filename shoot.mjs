// Headless verification: screenshots + ~15s demo video.
// Uses a throwaway scenario server (tools/scene.py) so shots are deterministic:
//   python3 tools/scene.py /tmp/scene && EVENTS_DIR=/tmp/scene DEMO=off PORT=8788 node server.js &
// usage: BASE=http://127.0.0.1:8788 node shoot.mjs [only-name|video]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const SCENE = process.env.SCENE || '/tmp/scene';
const only = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const W = { width: 1440, height: 900 };
const helper = fs.readFileSync(new URL('./camto.js', import.meta.url), 'utf8');
async function shot(name, url, js, wait = 14000) {
  if (only && only !== name) return;
  const page = await browser.newPage({ viewport: W });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.addInitScript(helper);
  await page.goto(BASE + url); await page.waitForTimeout(wait);
  if (js) { await page.evaluate(js); await page.waitForTimeout(4500); }
  await page.screenshot({ path: `shots/${name}.png` }); console.log('saved', name); await page.close();
}
const bedCam = (id) => `(() => { const p = __botsim.targets['${id}'].pos; const r = Math.hypot(p[0], p[2]); const ux = -p[0]/r, uz = -p[2]/r; __botsim.cam([p[0]+ux*4.6+uz*1.4, p[1]+3.6, p[2]+uz*4.6-ux*1.4], [p[0]-0.2*ux, p[1]+0.2, p[2]-0.2*uz]); })()`;
await shot('01-tropical-day-overview', '/?hour=11&weather=clear');
await shot('02-sunset', '/?hour=19.0&weather=clear');
await shot('03-night-campfire-torches-fireflies', '/?hour=22&weather=clear');
await shot('03b-night-campfire-closeup', '/?hour=22.5&weather=clear&ui=0', `__botsim.cam([6.5, 4.2, 7.5], [0, 0.6, 0])`);
await shot('04-bot-sleeping-in-bungalow', '/?hour=21.5&weather=clear&ui=0', bedCam('pebble'));
await shot('05-holo-screens-working-bot', '/?hour=20.5&weather=clear&ui=0', `__frame('pixel', 3.6, 1.9, 0, 1.0)`);
await shot('05b-holo-lab-day', '/?hour=14&weather=clear&ui=0', `__frame('bolt', 4.4, 2.6, 0.5, 0.9)`);
await shot('06-dock-waiting-bot-card', '/?hour=16.5&weather=clear&select=nova');
await shot('07-thunderstorm', '/?hour=17&weather=storm');
await shot('07b-rain', '/?hour=12&weather=rain');
await shot('08-theme-picker-atlantis-preview', '/?hour=13&theme=atlantis&settings=1');
await shot('08b-antarctica-preview', '/?hour=13&theme=antarctica&weather=snow');
await shot('08c-jungle-preview', '/?hour=17&theme=jungle');

if (!only || only === 'video') {
  // Deterministic virtual-time capture: each frame advances the 3D clock exactly 1/24 s, so the video plays at
  // real speed even though software GL renders ~2 fps. Bot state changes are scripted into the scene's event files.
  execSync(`python3 tools/scene.py ${SCENE}`); await new Promise((r) => setTimeout(r, 1500));
  const FPS = 24, SECS = 15, N = FPS * SECS;
  fs.rmSync('shots/frames', { recursive: true, force: true }); fs.mkdirSync('shots/frames', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  await page.addInitScript(() => {
    let vt = 0; performance.now = () => vt; window.__vt = (ms) => { vt += ms; };
  });
  await page.addInitScript(helper);
  await page.goto(BASE + '/?hour=18.1&weather=clear'); await page.waitForTimeout(9000);
  const script = { 12: ['Scout', 'working', 'Building the price dashboard'], 48: ['Nova', 'done', 'Posted the reply!'], 96: ['Sage', 'waiting_on_user', 'Approve the content calendar?'],
    150: ['Quill', 'idle', ''], 190: ['Bolt', 'error', 'Build failed: missing env var'], 230: ['Pixel', 'researching', 'Comparing hosting options'] };
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i < N; i++) {
    if (script[i]) { const [b, s, t] = script[i]; execSync(`python3 tools/scene.py ${SCENE} "${b}" ${s} "${t}"`); await page.waitForTimeout(700); }
    const k = i / N; const az = 0.785 - k * 0.9; const R = 37 - k * 7; const h = 17 - k * 3;
    await page.evaluate(([x, y, z, ms]) => { window.__vt(ms); window.__botsim.cam([x, y, z], [0, 0, 0]); }, [Math.cos(az) * R, h, Math.sin(az) * R, 1000 / FPS]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    fs.writeFileSync(`shots/frames/f${String(i).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'));
    if (i % 48 === 0) console.log('frame', i);
  }
  await page.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i shots/frames/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart shots/demo.mp4`);
  execSync(`ffmpeg -y -loglevel error -i shots/demo.mp4 -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=5" shots/demo.gif`);
  execSync(`python3 tools/scene.py ${SCENE}`);
  console.log('video done');
}
await browser.close();
