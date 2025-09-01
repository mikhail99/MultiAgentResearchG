import { chromium } from 'playwright';

async function smoke() {
  console.log('🚦 Smoke: knowledge-extraction');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });

    // Fill topic
    await page.fill('input#topic-input, input[placeholder*="question"], input[placeholder*="topic"]', 'smoke test question');

    // Start
    const startBtn = page.locator('button:has-text("Start") , button:has-text("Start Analysis")').first();
    await startBtn.click();

    // Wait for streaming
    await page.waitForTimeout(4000);

    // Export JSON
    const exportJsonBtn = page.locator('button:has-text("Export JSON")').first();
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      exportJsonBtn.click()
    ]);
    console.log('✅ JSON download:', await jsonDownload.suggestedFilename());

    // Export MD
    const exportMdBtn = page.locator('button:has-text("Export Run"), button:has-text("Export")').first();
    const [mdDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      exportMdBtn.click()
    ]);
    console.log('✅ MD download:', await mdDownload.suggestedFilename());

    console.log('🎉 knowledge-extraction smoke passed');
  } catch (e) {
    console.error('❌ knowledge-extraction smoke failed:', e);
    await page.screenshot({ path: 'ke_smoke_error.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

smoke().catch(err => { console.error(err); process.exit(1); });
