import { AgentName } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';

/**
 * Utility functions for agent-related operations
 * Pure functions that don't depend on React state
 */

/**
 * Gets the current iteration for a specific agent
 * @param agentName - The name of the agent
 * @param selectedIterations - Current iteration selections for all agents
 * @returns The current iteration number for the agent
 */
export const getCurrentIteration = (
  agentName: AgentName,
  selectedIterations: Record<AgentName, number>
): number => {
  return selectedIterations[agentName] || 0;
};

/**
 * Gets the total number of iterations available for a specific agent
 * @param agentName - The name of the agent
 * @param workflowState - Current workflow state containing agent results
 * @returns The total number of iterations available for the agent
 */
export const getAgentIterationCount = (
  agentName: AgentName,
  workflowState: WorkflowState | null
): number => {
  if (!workflowState) return 0;

  switch (agentName) {
    case AgentName.SEARCH:
      return workflowState.searchResults.length;
    case AgentName.LEARNINGS:
      return workflowState.learnings.length;
    case AgentName.OPPORTUNITY_ANALYSIS:
      return workflowState.opportunityAnalyses.length;
    case AgentName.PROPOSER:
      return workflowState.proposals.length;
    case AgentName.NOVELTY_CHECKER:
      return workflowState.noveltyChecks.length;
    case AgentName.AGGREGATOR:
      return workflowState.aggregations.length;
    default:
      return 0;
  }
};

/**
 * Gets the content for a specific agent at a specific iteration
 * @param agentName - The name of the agent
 * @param workflowState - Current workflow state containing agent results
 * @param iteration - The iteration to retrieve (defaults to current)
 * @returns The content string for the specified agent and iteration
 */
export const getAgentContent = (
  agentName: AgentName,
  workflowState: WorkflowState | null,
  iteration?: number
): string => {
  if (!workflowState) return '';

  const targetIteration = iteration ?? getCurrentIteration(agentName, {});

  switch (agentName) {
    case AgentName.SEARCH:
      return workflowState.searchResults[targetIteration] || '';
    case AgentName.LEARNINGS:
      return workflowState.learnings[targetIteration] || '';
    case AgentName.OPPORTUNITY_ANALYSIS:
      return workflowState.opportunityAnalyses[targetIteration] || '';
    case AgentName.PROPOSER:
      return workflowState.proposals[targetIteration] || '';
    case AgentName.NOVELTY_CHECKER:
      return workflowState.noveltyChecks[targetIteration] || '';
    case AgentName.AGGREGATOR:
      return workflowState.aggregations[targetIteration] || '';
    default:
      return '';
  }
};

/**
 * Calculates the safe iteration bounds for an agent
 * @param iteration - The requested iteration
 * @param agentName - The name of the agent
 * @param workflowState - Current workflow state
 * @returns The clamped iteration within valid bounds
 */
export const clampIteration = (
  iteration: number,
  agentName: AgentName,
  workflowState: WorkflowState | null
): number => {
  const maxIteration = Math.max(0, getAgentIterationCount(agentName, workflowState) - 1);
  return Math.max(0, Math.min(iteration, maxIteration));
};
