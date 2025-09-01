# Research Agents Tests

This directory contains comprehensive test suites for the research-agents application.

## Test Files

### `comprehensive_test.mjs`
**Purpose:** End-to-end UI testing with Playwright
**Tests:**
- Topic input field presence and functionality
- Tool checkboxes (Web Search, Local Search)
- Prompt editor accessibility
- Status bar functionality
- Run button and workflow execution
- Agent data flow between steps
- Error detection and console logging
- Network error detection

**Run:** `node comprehensive_test.mjs` (requires running app on port 5175)

### `critical_tests.mjs`
**Purpose:** Critical functionality testing (state management, restart logic, error recovery)
**Tests:**
- State validation and sanitization
- Restart logic and workflow interruption
- Streaming state integrity
- Error recovery mechanisms
- Session management and persistence
- Circuit breaker logic
- Prompt persistence across sessions
- Workflow interruption handling

**Run:**
- Browser: `window.runCriticalTests()`
- Node.js: `node critical_tests.mjs`

### `final_test.mjs`
**Purpose:** Final comprehensive test suite
**Tests:**
- Complete feature checklist validation
- Actual workflow execution testing
- Component presence verification
- Integration testing

**Run:** `node final_test.mjs` (requires running app on port 5175)

## Test Categories

### 🧪 UI Tests
- Component presence and accessibility
- User interaction flows
- Visual element verification

### 🔧 Functional Tests
- State management
- Workflow execution
- Error handling
- Data persistence

### 🚀 Integration Tests
- End-to-end workflows
- Multi-step agent interactions
- Real-world usage scenarios

## Running Tests

### Prerequisites
1. Install dependencies: `pnpm install`
2. Start the app: `pnpm dev:research-agents`
3. Ensure app is running on port 5175

### Test Execution
```bash
# Run comprehensive UI tests
cd apps/research-agents/tests
node comprehensive_test.mjs

# Run critical functionality tests
node critical_tests.mjs

# Run final validation tests
node final_test.mjs
```

### Browser Testing
For `critical_tests.mjs`, you can also run tests in the browser:
1. Open browser dev tools
2. Load the test file
3. Run `window.runCriticalTests()`

## Test Results

All tests generate detailed reports including:
- ✅ Working features
- ❌ Missing/broken features
- 📸 Screenshots (for UI tests)
- 📊 Performance metrics
- 🔧 Recommended fixes

## Contributing

When adding new tests:
1. Follow the existing naming convention
2. Include comprehensive documentation
3. Add both positive and negative test cases
4. Generate screenshots for UI tests
5. Test error conditions and edge cases
