/**
 * Application constants for the Multi-Agent Research Assistant
 */

export const STORAGE_KEYS = {
  CUSTOM_PROMPTS: 'mars:customPrompts',
  LAST_RUN: 'mars:lastRun',
} as const;

export const DEFAULT_VALUES = {
  LLM_URL: 'http://localhost:11434/v1/chat/completions',
  WORKFLOW_THREAD_PREFIX: 'workflow_',
  INTERRUPT_TIMEOUT: 1000,
  TOAST_DURATION: 2000,
  WORKFLOW_RECURSION_LIMIT: 50,
} as const;

export const EXPORT_CONSTANTS = {
  TOPIC_SEPARATOR: '_',
  TIMESTAMP_SEPARATOR: '-',
  TIMESTAMP_REPLACE_PATTERN: /[:.]/g,
  MARKDOWN_EXTENSION: '.md',
  JSON_EXTENSION: '.json',
  RUN_PREFIX: 'run_',
} as const;

export const UI_CONSTANTS = {
  MODAL_CLOSE_DELAY: 300,
  SHARE_LINK_PREFIX: '#s=',
} as const;
