import { chromium } from 'playwright';

async function debugTest() {
  console.log('🔍 Starting debug test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'debug_screenshot.png' });
    
    // Debug: Check all input elements
    console.log('\n🔍 DEBUG: All input elements');
    const allInputs = await page.locator('input').all();
    console.log('Total inputs found:', allInputs.length);
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      console.log(`Input ${i + 1}:`, { placeholder, id, type });
    }
    
    // Debug: Check for topic input specifically
    console.log('\n🔍 DEBUG: Topic input search');
    const topicInputById = await page.locator('#topic-input').count();
    const topicInputByPlaceholder = await page.locator('input[placeholder*="topic"]').count();
    const topicInputByPlaceholder2 = await page.locator('input[placeholder*="Analysis Topic"]').count();
    
    console.log('Topic input by ID (#topic-input):', topicInputById);
    console.log('Topic input by placeholder (topic):', topicInputByPlaceholder);
    console.log('Topic input by placeholder (Analysis Topic):', topicInputByPlaceholder2);
    
    // Debug: Check ControlPanel
    console.log('\n🔍 DEBUG: ControlPanel');
    const controlPanel = await page.locator('[class*="ControlPanel"], [class*="control-panel"]').count();
    console.log('ControlPanel elements found:', controlPanel);
    
    // Debug: Check for specific text
    console.log('\n🔍 DEBUG: Text content');
    const analysisTopicText = await page.locator('text=Analysis Topic').count();
    const researchToolsText = await page.locator('text=Research Tools').count();
    const webSearchText = await page.locator('text=Web Search').count();
    const localSearchText = await page.locator('text=Local Search').count();
    
    console.log('"Analysis Topic" text found:', analysisTopicText);
    console.log('"Research Tools" text found:', researchToolsText);
    console.log('"Web Search" text found:', webSearchText);
    console.log('"Local Search" text found:', localSearchText);
    
    // Debug: Check for checkboxes
    console.log('\n🔍 DEBUG: Checkboxes');
    const allCheckboxes = await page.locator('input[type="checkbox"]').count();
    console.log('Total checkboxes found:', allCheckboxes);
    
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i];
      const id = await checkbox.getAttribute('id');
      const name = await checkbox.getAttribute('name');
      const checked = await checkbox.isChecked();
      console.log(`Checkbox ${i + 1}:`, { id, name, checked });
    }
    
    // Debug: Check for buttons
    console.log('\n🔍 DEBUG: Buttons');
    const allButtons = await page.locator('button').count();
    console.log('Total buttons found:', allButtons);
    
    const runButtons = await page.locator('button:has-text("Run"), button:has-text("Start"), button:has-text("Execute")').all();
    console.log('Run buttons found:', runButtons.length);
    
    for (let i = 0; i < runButtons.length; i++) {
      const button = runButtons[i];
      const text = await button.textContent();
      const disabled = await button.isDisabled();
      console.log(`Run button ${i + 1}:`, { text: text?.trim(), disabled });
    }
    
    // Debug: Check for agent cards
    console.log('\n🔍 DEBUG: Agent cards');
    const searchAgent = await page.locator('text=Search Agent').count();
    const learningsAgent = await page.locator('text=Learnings Agent').count();
    const gapAnalysisAgent = await page.locator('text=Gap Analysis Agent').count();
    
    console.log('Search Agent found:', searchAgent);
    console.log('Learnings Agent found:', learningsAgent);
    console.log('Gap Analysis Agent found:', gapAnalysisAgent);
    
    // Debug: Check for status bar
    console.log('\n🔍 DEBUG: Status bar');
    const statusBar = await page.locator('[class*="status"], [class*="Status"], [class*="progress"], [class*="Progress"]').count();
    console.log('Status bar elements found:', statusBar);
    
    // Debug: Check for prompt editor buttons
    console.log('\n🔍 DEBUG: Prompt editor');
    const editButtons = await page.locator('button:has-text("Edit"), button:has-text("⚙️"), button:has-text("Settings")').count();
    console.log('Edit buttons found:', editButtons);
    
    // Try to find the topic input and fill it
    console.log('\n🔍 DEBUG: Trying to fill topic input');
    const topicInput = await page.locator('#topic-input').first();
    if (await topicInput.count() > 0) {
      await topicInput.fill('test topic');
      console.log('✅ Topic input filled successfully');
      
      // Check if run button is now enabled
      const runButton = await page.locator('button:has-text("Start Analysis")').first();
      if (await runButton.count() > 0) {
        const isEnabled = await runButton.isEnabled();
        console.log('Run button enabled after filling topic:', isEnabled);
        
        if (isEnabled) {
          await runButton.click();
          console.log('✅ Run button clicked successfully');
          
          // Wait for any processing
          await page.waitForTimeout(2000);
          
          // Check for outputs
          const outputs = await page.locator('[class*="output"], [class*="result"], [class*="content"]').count();
          console.log('Output elements found after run:', outputs);
        }
      }
    } else {
      console.log('❌ Topic input not found by ID');
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    await page.screenshot({ path: 'debug_error.png' });
  } finally {
    await browser.close();
  }
}

debugTest().catch(console.error);
