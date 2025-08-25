import { AgentName, ProcessStatus } from './types';

// LangGraph.js State Definition
export interface WorkflowState {
  // Topic and metadata
  topic: string;
  iteration: number;
  modelProvider: string;
  feedback: string;

  // Agent outputs (arrays for iterations)
  searchResults: string[];
  learnings: string[];
  opportunityAnalyses: string[];
  proposals: string[];
  noveltyChecks: string[];
  aggregations: string[];

  // Final outputs
  stylizedFacts: Array<{ fact: string; description: string }>;
  stylizedQuestions: string[];

  // Tool results
  toolResults: {
    webResults?: string;
    localResults?: string;
    errors: string[];
    timestamp: string;
  } | null;

  // Workflow control
  currentStep: ProcessStatus;
  completedSteps: ProcessStatus[];
  shouldRestart: boolean;
  restartFromStep: ProcessStatus | null;
  restartCount: number; // Track how many times Opportunity Analysis requested search restart
}

// Node-specific state updates
export interface NodeResult {
  output: string;
  toolResults?: WorkflowState['toolResults'];
  shouldRestart?: boolean;
  restartFromStep?: ProcessStatus;
}

// LangGraph.js Tool Definition
export interface WorkflowTool {
  name: string;
  description: string;
  schema: any; // Zod schema
  implementation: (input: any) => Promise<string>;
}

// Agent Configuration
export interface AgentConfig {
  name: AgentName;
  promptTemplate: string;
  tools?: WorkflowTool[];
  modelOptions?: {
    temperature?: number;
    maxTokens?: number;
  };
}

// Workflow Configuration
export interface WorkflowConfig {
  agents: Record<AgentName, AgentConfig>;
  maxRestarts: number;
  enableStreaming: boolean;
  enablePersistence: boolean;
}
