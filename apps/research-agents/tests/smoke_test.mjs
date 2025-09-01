import { chromium } from 'playwright';

async function smoke() {
  console.log('🚦 Smoke: research-agents');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });

    // Fill topic
    await page.fill('#topic-input', 'smoke test topic');

    // Start
    const startBtn = page.locator('button:has-text("Start Analysis")').first();
    await startBtn.click();

    // Wait a bit for streaming
    await page.waitForTimeout(4000);

    // Export JSON (wait for download)
    const exportJsonBtn = page.locator('button:has-text("Export JSON")').first();
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      exportJsonBtn.click()
    ]);
    const jsonName = await jsonDownload.suggestedFilename();
    console.log('✅ JSON download:', jsonName);

    // Export Markdown
    const exportMdBtn = page.locator('button:has-text("Export Run")').first();
    const [mdDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      exportMdBtn.click()
    ]);
    const mdName = await mdDownload.suggestedFilename();
    console.log('✅ MD download:', mdName);

    console.log('🎉 research-agents smoke passed');
  } catch (e) {
    console.error('❌ research-agents smoke failed:', e);
    await page.screenshot({ path: 'research_agents_smoke_error.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

smoke().catch(err => { console.error(err); process.exit(1); });
