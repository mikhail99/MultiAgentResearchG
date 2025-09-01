import { useState, useCallback } from 'react';
import { AgentName } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';

import { createInitialIterations, createInitialSentPrompts } from '../utils/helpers';

export interface TaskProfileWithDisplay {
  displayName: string;
  description: string;
  taskProfile: any;
}

export interface UseAgentManagementOptions {
  onOpenPromptEditor: (agent: AgentName) => void;
  onViewTaskProfile: (profile: TaskProfileWithDisplay) => void;
}

export interface UseAgentManagementReturn {
  // State
  selectedIterations: Record<AgentName, number>;
  sentPrompts: Record<AgentName, string>;

  // Actions
  getCurrentIteration: (agentName: AgentName) => number;
  getAgentIterationCount: (agentName: AgentName, workflowState: WorkflowState | null) => number;
  setIterationForAgent: (agentName: AgentName, iteration: number) => void;
  getAgentContent: (agentName: AgentName, workflowState: WorkflowState | null) => string;
  getAgentSentPrompt: (agentName: AgentName) => string;
  createIterationSelector: (agentName: AgentName) => (iteration: number) => void;
  resetIterationSelections: () => void;
  resetSentPrompts: () => void;
  updateSentPrompt: (agentName: string, prompt: string) => void;
}

export const useAgentManagement = (
  _options: UseAgentManagementOptions
): UseAgentManagementReturn => {
  // Agent iteration navigation
  const [selectedIterations, setSelectedIterations] = useState<Record<AgentName, number>>(createInitialIterations());

  // Sent prompt tracking for LangGraph
  const [sentPrompts, setSentPrompts] = useState<Record<AgentName, string>>(createInitialSentPrompts());



  // Helper functions for agent iterations
  const getCurrentIteration = useCallback((agentName: AgentName): number => {
    return selectedIterations[agentName] || 0;
  }, [selectedIterations]);

  const getAgentIterationCount = useCallback((agentName: AgentName, workflowState: WorkflowState | null): number => {
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
  }, []);

  const setIterationForAgent = useCallback((agentName: AgentName, iteration: number) => {
    setSelectedIterations(prev => ({
      ...prev,
      [agentName]: Math.max(0, Math.min(iteration, getAgentIterationCount(agentName, null) - 1))
    }));
  }, [getAgentIterationCount]);

  const getAgentContent = useCallback((agentName: AgentName, workflowState: WorkflowState | null): string => {
    if (!workflowState) return '';

    const iteration = getCurrentIteration(agentName);

    switch (agentName) {
      case AgentName.SEARCH:
        return workflowState.searchResults[iteration] || '';
      case AgentName.LEARNINGS:
        return workflowState.learnings[iteration] || '';
      case AgentName.OPPORTUNITY_ANALYSIS:
        return workflowState.opportunityAnalyses[iteration] || '';
      case AgentName.PROPOSER:
        return workflowState.proposals[iteration] || '';
      case AgentName.NOVELTY_CHECKER:
        return workflowState.noveltyChecks[iteration] || '';
      case AgentName.AGGREGATOR:
        return workflowState.aggregations[iteration] || '';
      default:
        return '';
    }
  }, [getCurrentIteration]);

  const getAgentSentPrompt = useCallback((agentName: AgentName): string => {
    return sentPrompts[agentName] || '';
  }, [sentPrompts]);

  // Create bound functions for iteration selection
  const createIterationSelector = useCallback((agentName: AgentName) => (iteration: number) => {
    setIterationForAgent(agentName, iteration);
  }, [setIterationForAgent]);



  // Update sent prompt
  const updateSentPrompt = useCallback((agentName: string, prompt: string) => {
    if (Object.values(AgentName).includes(agentName as AgentName)) {
      setSentPrompts(prev => ({
        ...prev,
        [agentName]: prompt
      }));
    }
  }, []);

  // Reset functions
  const resetIterationSelections = useCallback(() => {
    setSelectedIterations(createInitialIterations());
  }, []);

  const resetSentPrompts = useCallback(() => {
    setSentPrompts(createInitialSentPrompts());
  }, []);

  return {
    // State
    selectedIterations,
    sentPrompts,

    // Actions
    getCurrentIteration,
    getAgentIterationCount,
    setIterationForAgent,
    getAgentContent,
    getAgentSentPrompt,
    createIterationSelector,
    resetIterationSelections,
    resetSentPrompts,
    updateSentPrompt,
  };
};
