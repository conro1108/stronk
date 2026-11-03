// Screenshots of each view at phone size against a running dev server, with
// seeded history. `npm run dev` in one shell, then `npm run shot [baseUrl]`.
// Writes shots/*.png.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('pageerror:', e.message));

const snap = async (name, hash, full = false) => {
  await page.goto(`${base}/${hash}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${name}.png`, fullPage: full });
  console.log('shot', name);
};

await page.goto(`${base}/?seed=6`);
await snap('home', '#/', true);
await page.click('[data-act=start]');
await page.click('[data-act=check][data-l="0"][data-s="0"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/session.png' });
console.log('shot session');
await snap('lift', '#/lift/squat');
await snap('edit', '#/edit');
await snap('settings', '#/settings');
await browser.close();
