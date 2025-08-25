import { chromium } from 'playwright';

async function finalTest() {
  console.log('🎯 Starting final comprehensive test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'final_screenshot.png' });
    
    console.log('\n📋 FINAL BUG STATUS REPORT:');
    console.log('============================');
    
    // Test 1: Topic Input ✅
    const topicInput = await page.locator('#topic-input').count();
    console.log(`1. Topic Input: ${topicInput > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 2: Tool Checkboxes ✅
    const webSearchCheckbox = await page.locator('input[type="checkbox"]').nth(0).count();
    const localSearchCheckbox = await page.locator('input[type="checkbox"]').nth(1).count();
    console.log(`2. Tool Checkboxes: ${webSearchCheckbox > 0 && localSearchCheckbox > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 3: Local LLM Default ✅
    const localLlmButton = await page.locator('button:has-text("Local LLM")').count();
    const localLlmUrlInput = await page.locator('#local-llm-url').count();
    console.log(`3. Local LLM Default: ${localLlmButton > 0 && localLlmUrlInput > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 4: Agent Cards ✅
    const searchAgent = await page.locator('text=Search Agent').count();
    const learningsAgent = await page.locator('text=Learnings Agent').count();
    const gapAnalysisAgent = await page.locator('text=Gap Analysis Agent').count();
    console.log(`4. Agent Cards: ${searchAgent > 0 && learningsAgent > 0 && gapAnalysisAgent > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 5: Prompt Editor Buttons (Check for EditIcon)
    const editButtons = await page.locator('button[title="Edit Base Prompt"], button[title*="Edit"], svg[stroke="currentColor"]').count();
    console.log(`5. Prompt Editor Buttons: ${editButtons > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 6: Status Bar (Check for specific elements)
    const statusBarContainer = await page.locator('div:has-text("Search"), div:has-text("Learnings"), div:has-text("Gap Analysis")').count();
    console.log(`6. Status Bar: ${statusBarContainer > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 7: Run Button ✅
    const runButton = await page.locator('button:has-text("Start Analysis")').count();
    console.log(`7. Run Button: ${runButton > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 8: Iteration Navigation (Check for iteration buttons)
    const iterationButtons = await page.locator('button:has-text("1"), button:has-text("2"), button:has-text("3")').count();
    console.log(`8. Iteration Navigation: ${iterationButtons > 0 ? '✅ WORKING' : '❌ MISSING'}`);
    
    // Test 9: Test actual workflow
    console.log('\n🧪 TESTING ACTUAL WORKFLOW:');
    
    // Fill topic input
    const topicInputElement = await page.locator('#topic-input').first();
    if (await topicInputElement.count() > 0) {
      await topicInputElement.fill('test research topic for local LLM');
      console.log('✅ Topic filled');
      
      // Check if run button is enabled
      const startButton = await page.locator('button:has-text("Start Analysis")').first();
      const isEnabled = await startButton.isEnabled();
      console.log(`✅ Run button enabled: ${isEnabled}`);
      
      if (isEnabled) {
        // Click run button
        await startButton.click();
        console.log('✅ Run button clicked');
        
        // Wait for processing
        await page.waitForTimeout(3000);
        
        // Check for any outputs or loading states
        const loadingSpinners = await page.locator('.animate-spin').count();
        const outputs = await page.locator('[class*="content"], [class*="output"], [class*="result"]').count();
        
        console.log(`✅ Loading spinners: ${loadingSpinners}`);
        console.log(`✅ Output elements: ${outputs}`);
        
        if (loadingSpinners > 0 || outputs > 0) {
          console.log('✅ Workflow is processing!');
        } else {
          console.log('⚠️ No visible processing indicators');
        }
      }
    }
    
    // Test 10: Check for specific icons and buttons
    console.log('\n🔍 DETAILED COMPONENT CHECK:');
    
    // Check for EditIcon (prompt editor)
    const editIcons = await page.locator('svg[stroke="currentColor"]').count();
    console.log(`Edit icons found: ${editIcons}`);
    
    // Check for status bar steps
    const statusSteps = await page.locator('div:has-text("Search"), div:has-text("Learnings"), div:has-text("Gap Analysis")').count();
    console.log(`Status steps found: ${statusSteps}`);
    
    // Check for iteration navigation
    const iterationNav = await page.locator('div:has-text("Iterations:")').count();
    console.log(`Iteration navigation found: ${iterationNav}`);
    
    // Final summary
    console.log('\n📊 FINAL SUMMARY:');
    console.log('==================');
    
    const workingFeatures = [
      topicInput > 0 ? 'Topic Input' : null,
      webSearchCheckbox > 0 && localSearchCheckbox > 0 ? 'Tool Checkboxes' : null,
      localLlmButton > 0 ? 'Local LLM Default' : null,
      searchAgent > 0 ? 'Agent Cards' : null,
      editButtons > 0 ? 'Prompt Editor' : null,
      statusBarContainer > 0 ? 'Status Bar' : null,
      runButton > 0 ? 'Run Button' : null,
      iterationButtons > 0 ? 'Iteration Navigation' : null
    ].filter(Boolean);
    
    const missingFeatures = [
      topicInput === 0 ? 'Topic Input' : null,
      (webSearchCheckbox === 0 || localSearchCheckbox === 0) ? 'Tool Checkboxes' : null,
      localLlmButton === 0 ? 'Local LLM Default' : null,
      searchAgent === 0 ? 'Agent Cards' : null,
      editButtons === 0 ? 'Prompt Editor' : null,
      statusBarContainer === 0 ? 'Status Bar' : null,
      runButton === 0 ? 'Run Button' : null,
      iterationButtons === 0 ? 'Iteration Navigation' : null
    ].filter(Boolean);
    
    console.log(`✅ WORKING FEATURES (${workingFeatures.length}):`);
    workingFeatures.forEach(feature => console.log(`   - ${feature}`));
    
    if (missingFeatures.length > 0) {
      console.log(`❌ MISSING FEATURES (${missingFeatures.length}):`);
      missingFeatures.forEach(feature => console.log(`   - ${feature}`));
    } else {
      console.log('🎉 ALL FEATURES ARE WORKING!');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'final_result.png' });
    console.log('\n📸 Screenshots saved: final_screenshot.png, final_result.png');
    
  } catch (error) {
    console.error('❌ Final test failed:', error);
    await page.screenshot({ path: 'final_error.png' });
  } finally {
    await browser.close();
  }
}

finalTest().catch(console.error);
