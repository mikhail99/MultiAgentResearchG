import { useState } from 'react';
import { WorkflowState } from '@shared/types/workflow_LG';

export interface LangGraphState {
  workflowState: WorkflowState | null;
  currentThreadId: string | null;
  isWorkflowRunning: boolean;
  isInterruptRequested: boolean;
}

export interface LangGraphActions {
  setWorkflowState: (state: WorkflowState | null) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  setIsWorkflowRunning: (running: boolean) => void;
  setIsInterruptRequested: (requested: boolean) => void;
  handleInterruptWorkflow: () => void;
}

export interface UseLangGraphStateReturn {
  state: LangGraphState;
  actions: LangGraphActions;
}

export const useLangGraphState = (): UseLangGraphStateReturn => {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState<boolean>(false);
  const [isInterruptRequested, setIsInterruptRequested] = useState(false);

  const handleInterruptWorkflow = () => {
    console.log('🛑 Interrupt requested by user');
    setIsInterruptRequested(true);
    setIsWorkflowRunning(false);
    setTimeout(() => {
      setIsInterruptRequested(false);
    }, 1000);
  };

  const state: LangGraphState = {
    workflowState,
    currentThreadId,
    isWorkflowRunning,
    isInterruptRequested,
  };

  const actions: LangGraphActions = {
    setWorkflowState,
    setCurrentThreadId,
    setIsWorkflowRunning,
    setIsInterruptRequested,
    handleInterruptWorkflow,
  };

  return { state, actions };
};
