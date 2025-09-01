import { chromium } from 'playwright';

async function smoke() {
  console.log('🚦 Smoke: data-preprocessing');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });

    // Basic UI presence
    await page.screenshot({ path: 'dp_initial.png' });

    // Try to find header and a button
    const header = await page.locator('text=Research Collections').count();
    const buttonCount = await page.locator('button').count();
    console.log('Header found:', header > 0, 'Buttons:', buttonCount);

    console.log('🎉 data-preprocessing smoke passed');
  } catch (e) {
    console.error('❌ data-preprocessing smoke failed:', e);
    await page.screenshot({ path: 'dp_smoke_error.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

smoke().catch(err => { console.error(err); process.exit(1); });
