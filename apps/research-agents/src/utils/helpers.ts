import { AgentName } from '@shared/types';
import { DEFAULT_VALUES, EXPORT_CONSTANTS } from '../constants/app';

/**
 * Type guard for runtime type checking of agent names
 */
export const isValidAgentName = (value: string): value is AgentName => {
  return Object.values(AgentName).includes(value as AgentName);
};

/**
 * Format a topic string for use in filenames
 */
export const formatTopicForFilename = (topic: string): string => {
  return topic.replace(/\s+/g, EXPORT_CONSTANTS.TOPIC_SEPARATOR).toLowerCase();
};

/**
 * Generate a timestamp string suitable for filenames
 */
export const generateTimestamp = (): string => {
  return new Date().toISOString().replace(EXPORT_CONSTANTS.TIMESTAMP_REPLACE_PATTERN, EXPORT_CONSTANTS.TIMESTAMP_SEPARATOR);
};

/**
 * Create a unique thread ID for workflows
 */
export const createThreadId = (): string => {
  return `${DEFAULT_VALUES.WORKFLOW_THREAD_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a filename for exported runs
 */
export const createExportFilename = (topic: string, extension: string): string => {
  const formattedTopic = formatTopicForFilename(topic || 'session');
  const timestamp = generateTimestamp();
  return `${EXPORT_CONSTANTS.RUN_PREFIX}${formattedTopic}_${timestamp}${extension}`;
};

/**
 * Create initial iterations object for all agents
 */
export const createInitialIterations = (): Record<AgentName, number> =>
  Object.values(AgentName).reduce((acc, agent) => ({
    ...acc,
    [agent]: 0
  }), {} as Record<AgentName, number>);

/**
 * Create initial sent prompts object for all agents
 */
export const createInitialSentPrompts = (): Record<AgentName, string> =>
  Object.values(AgentName).reduce((acc, agent) => ({
    ...acc,
    [agent]: ''
  }), {} as Record<AgentName, string>);

/**
 * Check if all output arrays are empty
 */
export const isOutputsEmpty = (workflowState: any): boolean => (
  !workflowState ||
  (workflowState.searchResults.length === 0 &&
   workflowState.learnings.length === 0 &&
   workflowState.opportunityAnalyses.length === 0 &&
   workflowState.proposals.length === 0 &&
   workflowState.noveltyChecks.length === 0 &&
   workflowState.aggregations.length === 0)
);
