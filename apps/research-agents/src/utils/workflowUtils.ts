import { ProcessStatus, StylizedFact } from '@shared/types';

/**
 * Utility functions for workflow-related operations
 * Pure functions for workflow state management and validation
 */

/**
 * Determines if the workflow output is empty
 * @param workflowState - Current workflow state
 * @param stylizedFacts - Array of stylized facts
 * @param stylizedQuestions - Array of stylized questions
 * @returns True if all outputs are empty
 */
export const isWorkflowOutputEmpty = (
  workflowState: any, // TODO: Add proper WorkflowState type
  stylizedFacts: StylizedFact[],
  stylizedQuestions: string[]
): boolean => {
  if (!workflowState) return true;

  return (
    workflowState.searchResults.length === 0 &&
    workflowState.learnings.length === 0 &&
    workflowState.opportunityAnalyses.length === 0 &&
    workflowState.proposals.length === 0 &&
    workflowState.noveltyChecks.length === 0 &&
    workflowState.aggregations.length === 0 &&
    stylizedFacts.length === 0 &&
    stylizedQuestions.length === 0
  );
};

/**
 * Calculates if the workflow is currently loading
 * @param status - Current process status
 * @returns True if the workflow is in a loading state
 */
export const isWorkflowLoading = (status: ProcessStatus): boolean => {
  return status !== ProcessStatus.IDLE &&
         status !== ProcessStatus.FEEDBACK &&
         true; // No ERROR status in shared types; treat others as loading
};

/**
 * Determines if a workflow run is complete
 * @param status - Current process status
 * @param stylizedFacts - Array of stylized facts
 * @param stylizedQuestions - Array of stylized questions
 * @returns True if the workflow run is complete
 */
export const isWorkflowComplete = (
  status: ProcessStatus,
  stylizedFacts: StylizedFact[],
  stylizedQuestions: string[]
): boolean => {
  return status === ProcessStatus.FEEDBACK ||
         (stylizedFacts.length > 0 || stylizedQuestions.length > 0);
};

/**
 * Formats a topic string for use in filenames
 * @param topic - The topic string to format
 * @returns Formatted topic string safe for filenames
 */
export const formatTopicForFilename = (topic: string): string => {
  return topic.replace(/\s+/g, '_').toLowerCase();
};

/**
 * Generates a unique thread ID for workflow runs
 * @param prefix - Optional prefix for the thread ID
 * @returns Unique thread identifier string
 */
export const generateThreadId = (prefix = 'workflow'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
