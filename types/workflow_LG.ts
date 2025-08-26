import { AgentName, ProcessStatus } from './types';

// State validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StateValidationOptions {
  strict?: boolean; // If true, warnings become errors
  checkArrays?: boolean; // Validate array contents
  checkCompletions?: boolean; // Validate completion states
}

// A-Mem Memory Note Interface
export interface MemoryNote {
  id: string;
  content: string;
  context: string;
  keywords: string[];
  tags: string[];
  embeddings?: number[];
  createdAt: string;
  updatedAt: string;
  agentName: string;
  iteration: number;
  links: MemoryLink[];
  metadata?: Record<string, any>;
}

// Memory Link Interface for A-Mem
export interface MemoryLink {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  strength: number; // 0-1 similarity/confidence score
  relationship: 'similar' | 'related' | 'follows' | 'contradicts' | 'supports';
  createdAt: string;
}

// Memory Evolution Action Interface
export interface MemoryEvolutionAction {
  action: 'strengthen' | 'update_context' | 'update_tags' | 'merge' | 'prune';
  targetNoteId: string;
  newContext?: string;
  newTags?: string[];
  mergeWithNoteId?: string;
  strengthDelta?: number;
}

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

  // A-Mem Agentic Memory System
  memoryNotes: MemoryNote[];
  memoryLinks: MemoryLink[];
  memoryEvolutionQueue: MemoryEvolutionAction[];
  memoryStats: {
    totalNotes: number;
    totalLinks: number;
    lastEvolution: string;
    memoryQuality: number; // 0-1 score based on connectivity and relevance
  };

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
