export enum ProcessStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  LEARNING = 'LEARNING',
  GAP_ANALYZING = 'GAP_ANALYZING',
  PROPOSING = 'PROPOSING',
  CHECKING_NOVELTY = 'CHECKING_NOVELTY',
  AGGREGATING = 'AGGREGATING',
  GENERATING_FACTS = 'GENERATING_FACTS',
  GENERATING_QUESTIONS = 'GENERATING_QUESTIONS',
  FEEDBACK = 'FEEDBACK'
}

export enum AgentName {
  SEARCH = 'Search',
  LEARNINGS = 'Learnings',
  GAP_ANALYSIS = 'Gap Analysis',
  PROPOSER = 'Proposer',
  NOVELTY_CHECKER = 'NoveltyChecker',
  AGGREGATOR = 'Aggregator'
}

export enum ModelProvider {
    GEMINI = 'GEMINI',
    LOCAL = 'LOCAL'
}

export interface StylizedFact {
  fact: string;
  description: string;
}

export interface AgentInput {
  researchSummary?: string;
  fileNames?: string;
  fileContents?: string;
  feedback?: string;
  generatedAnalysis?: string;
  critique?: string;
  proposal?: string;
}

export interface LlmOptions {
    provider: ModelProvider;
    url: string;
}

export type AgentPrompts = {
    [key in AgentName]: string;
};

// Tool-related types
export interface ToolResults {
  webResults?: string;
  localResults?: string;
  errors: string[];
  timestamp: string;
}

export interface AgentToolConfig {
  enableWebSearch: boolean;
  enableLocalSearch: boolean;
  toolServiceUrl: string;
}