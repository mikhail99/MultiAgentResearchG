import { useState } from 'react';
import { AgentName } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';

export interface AgentNavigationState {
  selectedIterations: Record<AgentName, number>;
  sentPrompts: Record<AgentName, string>;
  restartChoice: 'continue' | 'search' | 'proposal';
}

export interface AgentNavigationActions {
  setSelectedIterations: React.Dispatch<React.SetStateAction<Record<AgentName, number>>>;
  setSentPrompts: React.Dispatch<React.SetStateAction<Record<AgentName, string>>>;
  setRestartChoice: (choice: 'continue' | 'search' | 'proposal') => void;
  getCurrentIteration: (agentName: AgentName) => number;
  getAgentIterationCount: (agentName: AgentName, workflowState: WorkflowState | null) => number;
  setIterationForAgent: (agentName: AgentName, iteration: number, workflowState: WorkflowState | null) => void;
  getAgentContent: (agentName: AgentName, workflowState: WorkflowState | null) => string;
  getAgentSentPrompt: (agentName: AgentName) => string;
  resetSentPrompts: () => void;
  resetIterationSelections: () => void;
  createIterationSelector: (agentName: AgentName) => (iteration: number) => void;
}

export interface UseAgentNavigationReturn {
  state: AgentNavigationState;
  actions: AgentNavigationActions;
}

const initialSelectedIterations: Record<AgentName, number> = {
  [AgentName.SEARCH]: 0,
  [AgentName.LEARNINGS]: 0,
  [AgentName.OPPORTUNITY_ANALYSIS]: 0,
  [AgentName.PROPOSER]: 0,
  [AgentName.NOVELTY_CHECKER]: 0,
  [AgentName.AGGREGATOR]: 0
};

const initialSentPrompts: Record<AgentName, string> = {
  [AgentName.SEARCH]: '',
  [AgentName.LEARNINGS]: '',
  [AgentName.OPPORTUNITY_ANALYSIS]: '',
  [AgentName.PROPOSER]: '',
  [AgentName.NOVELTY_CHECKER]: '',
  [AgentName.AGGREGATOR]: ''
};

export const useAgentNavigation = (): UseAgentNavigationReturn => {
  const [selectedIterations, setSelectedIterations] = useState<Record<AgentName, number>>(initialSelectedIterations);
  const [sentPrompts, setSentPrompts] = useState<Record<AgentName, string>>(initialSentPrompts);
  const [restartChoice, setRestartChoice] = useState<'continue' | 'search' | 'proposal'>('continue');

  const getCurrentIteration = (agentName: AgentName): number => {
    return selectedIterations[agentName] || 0;
  };

  const getAgentIterationCount = (agentName: AgentName, workflowState: WorkflowState | null): number => {
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

  const setIterationForAgent = (agentName: AgentName, iteration: number, workflowState: WorkflowState | null) => {
    setSelectedIterations(prev => ({
      ...prev,
      [agentName]: Math.max(0, Math.min(iteration, getAgentIterationCount(agentName, workflowState) - 1))
    }));
  };

  const getAgentContent = (agentName: AgentName, workflowState: WorkflowState | null): string => {
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
  };

  const getAgentSentPrompt = (agentName: AgentName): string => {
    return sentPrompts[agentName] || '';
  };

  const resetSentPrompts = () => {
    setSentPrompts(initialSentPrompts);
  };

  const resetIterationSelections = () => {
    setSelectedIterations(initialSelectedIterations);
  };

  const createIterationSelector = (agentName: AgentName) => (iteration: number) => {
    setIterationForAgent(agentName, iteration, null); // workflowState will need to be passed when called
  };

  const state: AgentNavigationState = {
    selectedIterations,
    sentPrompts,
    restartChoice,
  };

  const actions: AgentNavigationActions = {
    setSelectedIterations,
    setSentPrompts,
    setRestartChoice,
    getCurrentIteration,
    getAgentIterationCount,
    setIterationForAgent,
    getAgentContent,
    getAgentSentPrompt,
    resetSentPrompts,
    resetIterationSelections,
    createIterationSelector,
  };

  return { state, actions };
};
