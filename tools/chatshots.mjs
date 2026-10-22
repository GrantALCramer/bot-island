import { chromium } from 'playwright-core';
const B = 'http://127.0.0.1:8789'; const O = process.env.OUT || 'shots';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const errs = [];
async function shot(name, q, prefs, { w = 1280, h = 800, mobile = false, wait = 9000, scheme = 'light', reduce = 'no-preference', act } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}), colorScheme: scheme, reducedMotion: reduce });
  await ctx.addInitScript((p) => { localStorage.setItem('botisland.chatPrefs', JSON.stringify(p)); if(!sessionStorage.getItem('x')){localStorage.removeItem('botisland.chatPop');sessionStorage.setItem('x',1);} }, prefs);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await p.goto(`${B}/?${q}`); await p.waitForTimeout(wait); if (act) await act(p);
  await p.screenshot({ path: `${O}/${name}.png` }); console.log('saved', name); return { ctx, p };
}
const base = { look: 'light', contrast: false, botColors: true, textPct: 100, frame: 'off', holiday: 'halloween' };
const close = async (r) => r.ctx.close();
await close(await shot('pop-light', 'theme=tropical&chatpop=pixel', base));
await close(await shot('pop-dark', 'theme=tropical&chatpop=pixel', { ...base, look: 'dark' }));
await close(await shot('pop-auto-systemdark', 'theme=tropical&chatpop=pixel', { ...base, look: 'auto' }, { scheme: 'dark' }));
await close(await shot('pop-highcontrast', 'theme=tropical&chatpop=pixel', { ...base, contrast: true, frame: 'theme' }));
await close(await shot('pop-highcontrast-dark', 'theme=tropical&chatpop=pixel', { ...base, contrast: true, look: 'dark' }));
await close(await shot('pop-text200', 'theme=tropical&chatpop=pixel', { ...base, textPct: 200 }));
await close(await shot('pop-mobile', 'theme=tropical&chatpop=pixel', { ...base, frame: 'theme' }, { w: 412, h: 860, mobile: true }));
for (const t of ['tropical', 'moon', 'haunted', 'west', 'sakura']) await close(await shot('frame-theme-' + t, `theme=${t}&chatpop=pixel`, { ...base, frame: 'theme' }));
for (const [d, n] of [['2026-12-31', 'newyear'], ['2026-10-31', 'halloween'], ['2026-12-20', 'christmas'], ['2026-02-17', 'lunarny'], ['2026-07-04', 'july4']]) await close(await shot('frame-holiday-' + n, `theme=tropical&chatpop=pixel&date=${d}`, { ...base, frame: 'holiday' }));
await close(await shot('frame-pick-stpatricks-dark', 'theme=tropical&chatpop=pixel', { ...base, frame: 'pick', holiday: 'stpatricks', look: 'dark' }));
// interaction checks: Escape, back, focus trap, drag/resize persistence
{ const r = await shot('tmp', 'theme=tropical&chatpop=pixel', base); const p = r.p;
  const f0 = await p.evaluate(() => document.activeElement?.tagName + ':' + document.activeElement?.getAttribute('aria-label'));
  for (let i = 0; i < 25; i++) await p.keyboard.press('Tab'); const inside = await p.evaluate(() => !!document.activeElement.closest('.cpwin'));
  const t = await p.locator('.cptitle h2').boundingBox(); await p.mouse.move(t.x + 20, t.y + 5); await p.mouse.down(); await p.mouse.move(t.x - 80, t.y - 40, { steps: 5 }); await p.mouse.up();
  const rz = await p.locator('.cpresize').boundingBox(); await p.mouse.move(rz.x + 10, rz.y + 10); await p.mouse.down(); await p.mouse.move(rz.x - 100, rz.y - 60, { steps: 5 }); await p.mouse.up();
  const geo = await p.evaluate(() => localStorage.getItem('botisland.chatPop'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); const afterEsc = await p.locator('.cpwin').count();
  await p.locator('.cpexp').first().click().catch(() => {}); // card may not be open (chatpop param) - open via param again
  await p.goto(`${B}/?theme=tropical&chatpop=pixel`); await p.waitForTimeout(6000); const g2 = await p.locator('.cpwin').boundingBox();
  await p.goBack(); await p.waitForTimeout(800); const afterBack = await p.locator('.cpwin').count();
  console.log(JSON.stringify({ initialFocus: f0, focusStaysInside: inside, savedGeo: geo, reopenedGeo: g2, closedByEscape: afterEsc === 0, closedByBack: afterBack === 0 }));
  await r.ctx.close(); }
// reduced motion: animation none
{ const r = await shot('frame-reduced-motion', 'theme=haunted&chatpop=pixel', { ...base, frame: 'theme' }, { reduce: 'reduce' });
  console.log('anim under reduced motion:', await r.p.evaluate(() => getComputedStyle(document.querySelector('.cpframe .fr span')).animationName)); await r.ctx.close(); }
// expand button in card
{ const r = await shot('card-expand-button', 'theme=tropical', base, { act: async (p) => { await p.locator('button.row',{hasText:'Pixel'}).first().click(); await p.waitForTimeout(1500); } });
  const n = await r.p.locator('.cpexp').count(); if (n) { await r.p.locator('.cpexp').click(); await r.p.screenshot({path:`${O}/card-expand-opened.png`}); await r.p.waitForTimeout(600); } console.log('expand button:', n, 'opens pop:', await r.p.locator('.cpwin').count()); await r.ctx.close(); }
// hats
for (const [n, q] of [['hats-before-after', 'hatgallery&mode=both&hats=tophat,crown,beanie&zoom=72'], ['hats-before-after-2', 'hatgallery&mode=both&hats=party,flower,cap&zoom=72'], ['hats-after-squashed', 'hatgallery&mode=after&squash&zoom=70']]) await close(await shot(n, q, base, { w: 1800, h: 900, wait: 5000 }));
console.log('errors', errs); await b.close();
