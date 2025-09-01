import { chromium } from 'playwright';

async function comprehensiveTest() {
  console.log('🚀 Starting comprehensive app testing...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('domcontentloaded');
    
    // Take initial screenshot
    await page.screenshot({ path: 'comprehensive_initial.png' });
    console.log('📸 Initial screenshot saved');
    
    // Test 1: Check if topic input exists (bug: no topic input found)
    console.log('\n🔍 BUG TEST 1: Topic Input Missing');
    const topicInputs = await page.locator('#topic-input, input[placeholder*="topic"], input[placeholder*="Topic"], input[placeholder*="research"], textarea[placeholder*="topic"]').count();
    console.log('📝 Topic inputs found:', topicInputs);
    
    if (topicInputs === 0) {
      console.log('❌ BUG CONFIRMED: No topic input found!');
      // Look for any input fields
      const allInputs = await page.locator('input, textarea').count();
      console.log('🔍 Total input fields found:', allInputs);
      
      // Check for any text areas
      const textAreas = await page.locator('textarea').count();
      console.log('📄 Text areas found:', textAreas);
    }
    
    // Test 2: Check if tools are available (bug: tools not working)
    console.log('\n🔍 BUG TEST 2: Tools Not Available');
    const webSearchCheckbox = await page.locator('input[type="checkbox"][id*="web"], input[type="checkbox"][name*="web"], label:has-text("Web Search") input').count();
    const localSearchCheckbox = await page.locator('input[type="checkbox"][id*="local"], input[type="checkbox"][name*="local"], label:has-text("Local Search") input').count();
    
    console.log('🔧 Tool checkboxes found:', {
      webSearch: webSearchCheckbox,
      localSearch: localSearchCheckbox
    });
    
    if (webSearchCheckbox === 0 && localSearchCheckbox === 0) {
      console.log('❌ BUG CONFIRMED: No tool checkboxes found!');
    }
    
    // Test 3: Check if prompt editor is accessible (bug: prompt changes not saved)
    console.log('\n🔍 BUG TEST 3: Prompt Editor Missing');
    const promptEditButtons = await page.locator('button:has-text("Edit"), button:has-text("Prompt"), button:has-text("⚙️"), button:has-text("Settings")').count();
    console.log('✏️ Prompt edit buttons found:', promptEditButtons);
    
    if (promptEditButtons === 0) {
      console.log('❌ BUG CONFIRMED: No prompt editor buttons found!');
    }
    
    // Test 4: Check if status bar exists (bug: status bar not working)
    console.log('\n🔍 BUG TEST 4: Status Bar Missing');
    const statusElements = await page.locator('[class*="status"], [class*="Status"], [class*="progress"], [class*="Progress"]').count();
    console.log('📊 Status elements found:', statusElements);
    
    if (statusElements === 0) {
      console.log('❌ BUG CONFIRMED: No status bar elements found!');
    }
    
    // Test 5: Check if iteration navigation exists (bug: iteration history not working)
    console.log('\n🔍 BUG TEST 5: Iteration Navigation Missing');
    const iterationElements = await page.locator('button:has-text("1"), button:has-text("2"), button:has-text("3"), [class*="iteration"], [class*="Iteration"]').count();
    console.log('🔄 Iteration elements found:', iterationElements);
    
    if (iterationElements === 0) {
      console.log('❌ BUG CONFIRMED: No iteration navigation found!');
    }
    
    // Test 6: Check if run button exists and works
    console.log('\n🔍 BUG TEST 6: Run Button Functionality');
    const runButtons = await page.locator('button:has-text("Run"), button:has-text("Start"), button:has-text("Execute")').count();
    console.log('▶️ Run buttons found:', runButtons);
    
    if (runButtons === 0) {
      console.log('❌ BUG CONFIRMED: No run buttons found!');
    } else {
      // Try to find a topic input or any input to fill
      const anyInput = await page.locator('input, textarea').first();
      if (await anyInput.count() > 0) {
        await anyInput.fill('test research topic');
        console.log('📝 Filled test topic');
        
        // Try to click run button
        const runButton = await page.locator('button:has-text("Run"), button:has-text("Start"), button:has-text("Execute")').first();
        await runButton.click();
        console.log('▶️ Clicked run button');
        
        // Wait for any processing
        await page.waitForTimeout(3000);
        
        // Check if any output appeared
        const outputs = await page.locator('[class*="output"], [class*="result"], [class*="content"], [class*="response"]').count();
        console.log('📤 Output elements found after run:', outputs);
        
        if (outputs === 0) {
          console.log('❌ BUG CONFIRMED: No outputs appeared after running workflow!');
        }
      }
    }
    
    // Test 7: Check for agent data flow (bug: agents not getting info from previous agent)
    console.log('\n🔍 BUG TEST 7: Agent Data Flow');
    
    // Look for agent cards or sections
    const agentCards = await page.locator('[class*="agent"], [class*="Agent"], [class*="card"], [class*="Card"]').count();
    console.log('🎴 Agent cards found:', agentCards);
    
    // Look for any content areas that might show agent outputs
    const contentAreas = await page.locator('[class*="content"], [class*="output"], [class*="result"], [class*="response"], [class*="body"]').count();
    console.log('📄 Content areas found:', contentAreas);
    
    // Test 8: Check for any error messages or console errors
    console.log('\n🔍 BUG TEST 8: Error Detection');
    
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any errors
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors detected:', consoleErrors);
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Test 9: Check for any network errors
    console.log('\n🔍 BUG TEST 9: Network Issues');
    
    const networkErrors = [];
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`${response.url()} - ${response.status()}`);
      }
    });
    
    // Reload page to catch network errors
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    if (networkErrors.length > 0) {
      console.log('❌ Network errors detected:', networkErrors);
    } else {
      console.log('✅ No network errors detected');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'comprehensive_final.png' });
    console.log('📸 Final screenshot saved');
    
    // Generate bug report
    console.log('\n📋 COMPREHENSIVE BUG REPORT:');
    console.log('================================');
    
    const bugs = [];
    if (topicInputs === 0) bugs.push('❌ No topic input field found');
    if (webSearchCheckbox === 0 && localSearchCheckbox === 0) bugs.push('❌ No tool checkboxes (web/local search) found');
    if (promptEditButtons === 0) bugs.push('❌ No prompt editor buttons found');
    if (statusElements === 0) bugs.push('❌ No status bar elements found');
    if (iterationElements === 0) bugs.push('❌ No iteration navigation found');
    if (runButtons === 0) bugs.push('❌ No run buttons found');
    if (agentCards === 0) bugs.push('❌ No agent cards/sections found');
    if (contentAreas === 0) bugs.push('❌ No content output areas found');
    
    if (bugs.length === 0) {
      console.log('✅ No major UI bugs detected');
    } else {
      console.log('🚨 BUGS FOUND:');
      bugs.forEach(bug => console.log(bug));
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Check if topic input field exists and is properly rendered');
    console.log('2. Verify tool checkboxes are present and functional');
    console.log('3. Ensure prompt editor modal/buttons are accessible');
    console.log('4. Confirm status bar is rendering correctly');
    console.log('5. Test iteration navigation functionality');
    console.log('6. Verify agent data flow between steps');
    console.log('7. Check if prompt changes persist across sessions');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'comprehensive_error.png' });
  } finally {
    await browser.close();
  }
}

comprehensiveTest().catch(console.error);
