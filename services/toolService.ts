/**
 * Tool Service - Interface to FastAPI backend for agent tools
 * 
 * Provides a simple, consistent interface for all agent tools:
 * - Web search
 * - Local search  
 * - Save results
 * - Future tools...
 */

// Tool request/response interfaces
export interface ToolRequest {
  agent_name: string;    // "Researcher", "Generator", etc.
  task: string;          // "web_search", "local_search", "save_results"
  query: string;         // The actual search query or data to save
  metadata?: any;        // File paths, iteration number, etc.
  id?: string;          // Request tracking
}

export interface ToolResponse {
  result: string;        // Always just text back
  success: boolean;
  error?: string;
  metadata?: any;        // Optional additional data
}

// Configuration
const FASTAPI_BASE_URL = process.env.VITE_FASTAPI_URL || 'http://localhost:8000';
const TOOL_TIMEOUT = 30000; // 30 seconds

// Utility function to generate unique request IDs
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Core tool execution function
 */
export const callTool = async (
  agentName: string,
  task: string, 
  query: string,
  metadata?: any
): Promise<string> => {
  const requestId = generateRequestId();
  
  try {
    console.log(`🔧 Tool Call: ${agentName} -> ${task}`, { query: query.substring(0, 100) + '...' });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOOL_TIMEOUT);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/tool`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        agent_name: agentName,
        task,
        query,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          frontend_version: '1.0.0'
        },
        id: requestId
      } as ToolRequest),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ToolResponse = await response.json();
    
    if (result.success) {
      console.log(`✅ Tool Success: ${agentName} -> ${task}`);
      return result.result;
    } else {
      console.warn(`⚠️ Tool Error: ${agentName} -> ${task}:`, result.error);
      return `Tool execution failed: ${result.error}`;
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`⏰ Tool Timeout: ${agentName} -> ${task}`);
      return `Tool request timed out after ${TOOL_TIMEOUT/1000} seconds. Please try again.`;
    }
    
    console.error(`💥 Tool Connection Error: ${agentName} -> ${task}:`, error);
    return `Failed to connect to tool service: ${error.message}. Please check if the FastAPI server is running.`;
  }
};

/**
 * Specialized tool functions for different tasks
 */

export const webSearch = async (agentName: string, query: string, metadata?: any): Promise<string> => {
  return callTool(agentName, 'web_search', query, metadata);
};

export const localSearch = async (agentName: string, query: string, metadata?: any): Promise<string> => {
  return callTool(agentName, 'local_search', query, metadata);
};

export const saveResults = async (agentName: string, data: string, metadata?: any): Promise<string> => {
  return callTool(agentName, 'save_results', data, metadata);
};

/**
 * Research Agent specific tool execution
 * Executes multiple tools in parallel for efficiency
 */
export const executeResearcherTools = async (
  topic: string, 
  options: {
    includeWebSearch?: boolean;
    includeLocalSearch?: boolean;
    metadata?: any;
  } = {}
): Promise<{
  webResults?: string;
  localResults?: string;
  errors: string[];
}> => {
  const { 
    includeWebSearch = true, 
    includeLocalSearch = true, 
    metadata = {} 
  } = options;
  
  const promises: Promise<{type: string, result: string}>[] = [];
  
  if (includeWebSearch) {
    promises.push(
      webSearch('Researcher', topic, metadata)
        .then(result => ({ type: 'web', result }))
        .catch(error => ({ type: 'web', result: `Web search error: ${error.message}` }))
    );
  }
  
  if (includeLocalSearch) {
    promises.push(
      localSearch('Researcher', topic, metadata)
        .then(result => ({ type: 'local', result }))
        .catch(error => ({ type: 'local', result: `Local search error: ${error.message}` }))
    );
  }
  
  const results = await Promise.all(promises);
  const errors: string[] = [];
  
  let webResults: string | undefined;
  let localResults: string | undefined;
  
  results.forEach(({ type, result }) => {
    if (result.includes('error:') || result.includes('failed:') || result.includes('Failed to connect')) {
      errors.push(`${type}: ${result}`);
    } else {
      if (type === 'web') webResults = result;
      if (type === 'local') localResults = result;
    }
  });
  
  return { webResults, localResults, errors };
};

/**
 * Tool health check
 */
export const checkToolServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Format tool results for display in agent prompts
 */
export const formatToolResultsForPrompt = (webResults?: string, localResults?: string): string => {
  const sections: string[] = [];
  
  if (webResults && !webResults.includes('error:') && !webResults.includes('failed:')) {
    sections.push(`**Web Search Results:**\n${webResults}\n`);
  }
  
  if (localResults && !localResults.includes('error:') && !localResults.includes('failed:')) {
    sections.push(`**Local Search Results:**\n${localResults}\n`);
  }
  
  if (sections.length === 0) {
    return '**Tool Results:** No additional research data available.\n';
  }
  
  return sections.join('\n') + '\n**Instructions:** Use the above research data to enhance your analysis.\n';
};
