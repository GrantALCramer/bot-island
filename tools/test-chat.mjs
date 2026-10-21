// End-to-end chat test (dev): headless browser sends from a bot card -> fake webhook receives it -> reply.sh -> UI.
// Needs: a test server (BASE, with the bot connected to the fake hook) and tools' fake receiver logging to HOOK_LOG.
// usage: BASE=http://127.0.0.1:8798 KEY=... BOT=pixel CHAT_DIR=/tmp/ct/chat HOOK_LOG=/tmp/ct/hook.log node tools/test-chat.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const { BASE, KEY = '', BOT = 'pixel', CHAT_DIR, HOOK_LOG } = process.env;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`${BASE}/?${KEY ? 'key=' + KEY + '&' : ''}select=${BOT}&hour=15&weather=clear`);
await page.waitForSelector('.chat textarea', { timeout: 30000 });
const before = fs.existsSync(HOOK_LOG) ? fs.readFileSync(HOOK_LOG, 'utf8').split('\n').filter(Boolean).length : 0;
const text = 'Hi from the island! What are you working on? 🌴';
await page.fill('.chat textarea', text); await page.click('.chat .cin button');
await page.waitForSelector('.msg.me', { timeout: 10000 });
await page.waitForFunction(() => /delivered/.test(document.querySelector('.msg.me:last-of-type .mm')?.textContent || ''), null, { timeout: 15000 });
ok(true, 'UI shows the sent message as delivered');
const lines = fs.readFileSync(HOOK_LOG, 'utf8').split('\n').filter(Boolean).slice(before).map((l) => JSON.parse(l));
const hit = lines.find((l) => l.body.includes('bot-island'));
ok(!!hit, 'fake webhook received a POST');
const body = JSON.parse(hit.body);
ok(body.source === 'bot-island' && body.bot === BOT && body.text === text && /^m-/.test(body.messageId) && !!body.ts, `payload ${JSON.stringify(body)}`);
ok(/^Bearer crsr_TESTKEY/.test(hit.headers.authorization || ''), `header authorization: Bearer ${(hit.headers.authorization || '').slice(7, 19)}…`);
ok(hit.headers['content-type'] === 'application/json', 'content-type application/json');
// the bot answers
execFileSync('./reply.sh', [BOT, body.messageId, 'Hey the user! Polishing the landing page, almost done. token=abc123 should be hidden'], { env: { ...process.env, BOTISLAND_CHAT_DIR: CHAT_DIR } });
await page.waitForSelector('.msg.them', { timeout: 10000 });
const reply = await page.textContent('.msg.them .mt');
ok(reply.includes('Polishing') && !reply.includes('abc123'), `reply shown in thread, secret redacted: "${reply}"`);
await page.waitForFunction(() => /replied/.test(document.querySelector('.msg.me .mm')?.textContent || ''), null, { timeout: 5000 });
ok(true, 'original message marked replied');
ok(await page.$('.bubble.say') !== null, 'speech bubble shown over the blob');
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/chat-thread.png' });
// unread badge: close the card, send another reply, roster should show a badge
await page.click('.card > .x');
execFileSync('./reply.sh', [BOT, body.messageId, 'PS: report is shipped 🎉'], { env: { ...process.env, BOTISLAND_CHAT_DIR: CHAT_DIR } });
await page.waitForSelector('.roster .ubadge', { timeout: 10000 });
ok(true, 'unread badge on the roster: ' + (await page.textContent('.roster .ubadge')));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/chat-unread.png' });
await browser.close();
