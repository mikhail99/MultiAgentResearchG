/**
 * Application constants and configuration values
 * Centralized location for magic strings, numbers, and configuration
 */

// LocalStorage Keys
export const STORAGE_KEYS = {
  CUSTOM_PROMPTS: 'mars:customPrompts',
  THEME: 'theme',
  LAST_RUN: 'mars:lastRun',
} as const;

// Default Configuration Values
export const DEFAULT_CONFIG = {
  LOCAL_LLM_URL: 'http://localhost:11434/v1/chat/completions',
  MAX_PAPERS: 10,
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  SEARCH_TIMEOUT: 30000,
  EXPORT_FILENAME_PREFIX: 'run_',
} as const;

// File Extensions and Types
export const FILE_TYPES = {
  PDF: '.pdf',
  MARKDOWN: '.md',
  JSON: '.json',
} as const;

// UI Constants
export const UI_CONSTANTS = {
  TOAST_DURATION: 2000,
  DEBOUNCE_DELAY: 300,
  MAX_FILENAME_LENGTH: 100,
  PAGINATION_SIZE: 10,
} as const;

// Agent Names (for consistency)
export const AGENT_DISPLAY_NAMES = {
  SEARCH: 'Search Agent',
  LEARNINGS: 'Learnings Agent',
  OPPORTUNITY_ANALYSIS: 'Opportunity Analysis Agent',
  PROPOSER: 'Proposer Agent',
  NOVELTY_CHECKER: 'Novelty Checker Agent',
  AGGREGATOR: 'Aggregator Agent',
} as const;

// Export Templates
export const EXPORT_TEMPLATES = {
  MARKDOWN_HEADER: `# Multi-Agent Run Report (LangGraph)

- **Topic**: {topic}
- **Iteration**: {iteration}
- **Date**: {date}
- **Model Provider**: {modelProvider}
- **Framework**: LangGraph.js

---

## Agent Outputs
`,
  FACTS_PLACEHOLDER: 'No stylized facts were generated.',
  QUESTIONS_PLACEHOLDER: 'No stylized questions were generated.',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_TOPIC_LENGTH: 3,
  MAX_TOPIC_LENGTH: 200,
  MAX_FILES_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_ITERATION_COUNT: 100,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  EMPTY_TOPIC: 'Please enter a topic to start the analysis.',
  NETWORK_ERROR: 'Network connection failed. Please check your connection.',
  FILE_TOO_LARGE: 'File size exceeds maximum limit.',
  INVALID_FILE_TYPE: 'Unsupported file type.',
  WORKFLOW_FAILED: 'Workflow execution failed. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SESSION_SAVED: 'Session saved successfully',
  LINK_COPIED: 'Link copied to clipboard',
  EXPORT_COMPLETE: 'Export completed successfully',
  WORKFLOW_COMPLETE: 'Workflow completed successfully',
} as const;

// API Configuration
export const API_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 60000,
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  TRANSITION_DURATION: '300ms',
  DEFAULT_THEME: 'light' as const,
} as const;
