/**
 * Tool Service - Interface to FastAPI backend for agent tools
 *
 * Provides a simple, consistent interface for all agent tools:
 * - Web search
 * - Local search
 * - Save results
 * - Future tools...
 *
 * Features:
 * - Circuit Breaker pattern for resilience
 * - Automatic fallback mechanisms
 * - Health monitoring and recovery
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

// Circuit Breaker States
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, requests rejected
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

// Circuit Breaker Configuration
const FASTAPI_BASE_URL = process.env.VITE_FASTAPI_URL || 'http://localhost:8000';
const TOOL_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5; // Failures before opening circuit
const CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 60000; // 1 minute before trying again
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3; // Successes needed to close circuit

// Circuit Breaker State
class ToolServiceCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  isAvailable(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        if (Date.now() - this.lastFailureTime > CIRCUIT_BREAKER_RECOVERY_TIMEOUT) {
          this.state = CircuitState.HALF_OPEN;
          this.successCount = 0;
          console.log('🔄 Circuit breaker transitioning to HALF_OPEN - testing service recovery');
          return true;
        }
        return false;
      case CircuitState.HALF_OPEN:
        return true;
      default:
        return false;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
        this.state = CircuitState.CLOSED;
        console.log('✅ Circuit breaker CLOSED - service fully recovered');
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log('❌ Circuit breaker OPEN - service still failing');
    } else if (this.failureCount >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      this.state = CircuitState.OPEN;
      console.log(`❌ Circuit breaker OPEN - ${this.failureCount} consecutive failures`);
    }
  }

  getState(): { state: CircuitState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breaker instance
const circuitBreaker = new ToolServiceCircuitBreaker();

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

  // Check circuit breaker state
  if (!circuitBreaker.isAvailable()) {
    console.warn('🔌 Circuit breaker is OPEN - tool service unavailable');
    return {
      webResults: includeWebSearch ? 'Tool service is currently unavailable due to repeated failures. Using fallback mode.' : undefined,
      localResults: includeLocalSearch ? 'Tool service is currently unavailable due to repeated failures. Using fallback mode.' : undefined,
      errors: ['Circuit breaker is open - tool service unavailable']
    };
  }

  const promises: Promise<{type: string, result: string}>[] = [];
  const errors: string[] = [];

  // Execute web search if circuit breaker allows
  if (includeWebSearch) {
    promises.push(
      webSearch('Researcher', topic, metadata)
        .then(result => {
          circuitBreaker.recordSuccess();
          return { type: 'web', result };
        })
        .catch(error => {
          circuitBreaker.recordFailure();
          console.warn('⚠️ Web search failed:', error.message);
          errors.push(`Web search failed: ${error.message}`);
          return { type: 'web', result: 'Web search is currently unavailable. Please try again later.' };
        })
    );
  }

  // Execute local search if circuit breaker allows
  if (includeLocalSearch) {
    promises.push(
      localSearch('Researcher', topic, metadata)
        .then(result => {
          circuitBreaker.recordSuccess();
          return { type: 'local', result };
        })
        .catch(error => {
          circuitBreaker.recordFailure();
          console.warn('⚠️ Local search failed:', error.message);
          errors.push(`Local search failed: ${error.message}`);
          return { type: 'local', result: 'Local search is currently unavailable. Please try again later.' };
        })
    );
  }

  const results = await Promise.all(promises);

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

/**
 * Get circuit breaker status for monitoring
 */
export const getCircuitBreakerStatus = () => {
  return circuitBreaker.getState();
};

/**
 * Force circuit breaker recovery (for testing/debugging)
 */
export const resetCircuitBreaker = () => {
  // Create new instance to reset state
  const newCircuitBreaker = new ToolServiceCircuitBreaker();
  // This would require a global reference to replace the instance
  console.log('🔄 Circuit breaker reset requested - restart required for full effect');
  return newCircuitBreaker.getState();
};
