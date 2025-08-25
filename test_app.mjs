import { chromium } from 'playwright';

async function testApp() {
  console.log('🚀 Starting app testing...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test_initial.png' });
    console.log('📸 Initial screenshot saved');
    
    // Test 1: Check if app loads properly
    console.log('🔍 Test 1: App loading...');
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Test 2: Check if agents are visible
    console.log('🔍 Test 2: Agent visibility...');
    const searchAgent = await page.locator('text=Search').count();
    const learningsAgent = await page.locator('text=Learnings').count();
    const gapAnalysisAgent = await page.locator('text=Gap Analysis').count();
    
    console.log('👥 Agents found:', {
      search: searchAgent,
      learnings: learningsAgent,
      gapAnalysis: gapAnalysisAgent
    });
    
    // Test 3: Check if topic input exists
    console.log('🔍 Test 3: Topic input...');
    const topicInput = await page.locator('input[placeholder*="topic"], input[placeholder*="Topic"]').count();
    console.log('📝 Topic inputs found:', topicInput);
    
    // Test 4: Check if run button exists
    console.log('🔍 Test 4: Run button...');
    const runButton = await page.locator('button:has-text("Run"), button:has-text("Start")').count();
    console.log('▶️ Run buttons found:', runButton);
    
    // Test 5: Check if tools are available
    console.log('🔍 Test 5: Tool availability...');
    const webSearchToggle = await page.locator('input[type="checkbox"], label:has-text("Web Search")').count();
    const localSearchToggle = await page.locator('input[type="checkbox"], label:has-text("Local Search")').count();
    
    console.log('🔧 Tools found:', {
      webSearch: webSearchToggle,
      localSearch: localSearchToggle
    });
    
    // Test 6: Check if prompt editor is accessible
    console.log('🔍 Test 6: Prompt editor...');
    const promptButtons = await page.locator('button:has-text("Edit"), button:has-text("Prompt")').count();
    console.log('✏️ Prompt edit buttons found:', promptButtons);
    
    // Test 7: Check if status bar exists
    console.log('🔍 Test 7: Status bar...');
    const statusBar = await page.locator('[class*="status"], [class*="Status"]').count();
    console.log('📊 Status bar elements found:', statusBar);
    
    // Test 8: Check if iteration navigation exists
    console.log('🔍 Test 8: Iteration navigation...');
    const iterationButtons = await page.locator('button:has-text("1"), button:has-text("2"), button:has-text("3")').count();
    console.log('🔄 Iteration buttons found:', iterationButtons);
    
    console.log('✅ Basic UI tests completed');
    
    // Test 9: Try to run a simple workflow
    console.log('🔍 Test 9: Running workflow...');
    
    // Fill in topic
    const topicInputElement = await page.locator('input[placeholder*="topic"], input[placeholder*="Topic"]').first();
    if (await topicInputElement.count() > 0) {
      await topicInputElement.fill('test topic');
      console.log('📝 Topic filled');
      
      // Click run button
      const runButtonElement = await page.locator('button:has-text("Run"), button:has-text("Start")').first();
      if (await runButtonElement.count() > 0) {
        await runButtonElement.click();
        console.log('▶️ Run button clicked');
        
        // Wait a bit for any processing
        await page.waitForTimeout(2000);
        
        // Check if any output appeared
        const outputs = await page.locator('[class*="output"], [class*="result"], [class*="content"]').count();
        console.log('📤 Output elements found after run:', outputs);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test_final.png' });
    console.log('📸 Final screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test_error.png' });
  } finally {
    await browser.close();
  }
}

testApp().catch(console.error);
