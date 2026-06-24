import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:14399/#channel');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/channel-page.png', fullPage: false });
// open new team modal
try {
  await page.click('#chan-new-btn');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/channel-newteam.png', fullPage: false });
} catch (e) { console.log('no new btn', e.message); }
await browser.close();
