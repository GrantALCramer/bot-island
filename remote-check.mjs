import { chromium } from 'playwright-core';
import fs from 'fs';
const K = fs.readFileSync(process.env.BOTISLAND_KEY_FILE || '.access-key', 'utf8').trim();
const B = 'http://127.0.0.1:8797';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
// locked page
let ctx = await browser.newContext({ viewport: { width: 900, height: 500 } }); let p = await ctx.newPage();
let r = await p.goto(B + '/'); console.log('no key ->', r.status()); await p.screenshot({ path: 'shots/locked-401.png' }); await ctx.close();
// desktop with key
ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); p = await ctx.newPage();
const wsOk = []; p.on('websocket', (w) => { w.on('framereceived', () => wsOk.push(1)); });
r = await p.goto(B + '/?key=' + K); console.log('with key -> final', r.status(), 'url has key?', p.url().includes('key='));
console.log('cookie', (await ctx.cookies()).map((c) => `${c.name} httpOnly=${c.httpOnly} sameSite=${c.sameSite} expires=${new Date(c.expires * 1000).toISOString().slice(0, 10)}`));
await p.waitForTimeout(14000);
console.log('ws frames received', wsOk.length, '| title panel:', (await p.textContent('.title')).replace(/\s+/g, ' '));
await p.screenshot({ path: 'shots/remote-check.png' }); await ctx.close();
// phone (iPhone-ish) with key
ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
p = await ctx.newPage(); await p.goto(B + '/?key=' + K); await p.waitForTimeout(14000);
await p.screenshot({ path: 'shots/mobile-check.png' });
// touch orbit: one-finger drag via CDP touch events
const cdp = await ctx.newCDPSession(p);
const before = await p.evaluate(() => window.__botsim?.camera?.position.toArray().map((v) => +v.toFixed(2)));
const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
await tp('touchStart', 200, 420); for (let i = 1; i <= 8; i++) { await tp('touchMove', 200 - i * 15, 420); await p.waitForTimeout(80); } await tp('touchEnd');
await p.waitForTimeout(2500);
const after = await p.evaluate(() => window.__botsim?.camera?.position.toArray().map((v) => +v.toFixed(2)));
console.log('touch orbit camera', JSON.stringify(before), '->', JSON.stringify(after));
await p.tap('.roster .ph'); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/mobile-roster.png' }); await p.tap('.roster .ph');
await p.tap('.gear'); await p.waitForTimeout(2000);
console.log('lite toggle:', await p.textContent('.settings label:last-of-type'), '| checked', await p.isChecked('.settings label:last-of-type input'));
await p.screenshot({ path: 'shots/mobile-settings.png' });
await browser.close();
