// Debug script to test search tool integration
import { checkToolServiceHealth, executeResearcherTools, formatToolResultsForPrompt } from './services/toolService.ts';

async function debugSearchTool() {
  console.log('🔍 Debugging search tool integration...');

  try {
    // 1. Check tool service health
    console.log('\n1. Checking tool service health...');
    const isHealthy = await checkToolServiceHealth();
    console.log('✅ Tool service health:', isHealthy);

    if (!isHealthy) {
      console.log('❌ Tool service is not healthy. Check if FastAPI server is running.');
      return;
    }

    // 2. Test with different search queries
    const testQueries = [
      'multi-agent reasoning',
      'LLM agents',
      'reasoning agents'
    ];

    for (const query of testQueries) {
      console.log(`\n2. Testing query: "${query}"`);

      const results = await executeResearcherTools(query, {
        includeWebSearch: true,
        includeLocalSearch: true
      });

      console.log(`✅ Local search results length: ${results.localResults?.length || 0} characters`);
      console.log(`✅ Web search results length: ${results.webResults?.length || 0} characters`);
      console.log(`⚠️ Errors: ${results.errors.length}`);

      // 3. Test formatting
      console.log('\n3. Testing result formatting...');
      const formatted = formatToolResultsForPrompt(results.webResults, results.localResults);
      console.log(`✅ Formatted data length: ${formatted.length} characters`);
      console.log('📝 Formatted data preview:');
      console.log(formatted.substring(0, 300) + (formatted.length > 300 ? '...' : ''));

      if (formatted.includes('**Tool Results:** No additional research data available')) {
        console.log('⚠️ Warning: No useful tool results found');
      }
    }

    console.log('\n✅ Search tool debugging completed successfully');

  } catch (error) {
    console.error('❌ Debug script failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugSearchTool();
