import { useState, useCallback } from 'react';
import { ProcessStatus, AgentPrompts, LlmOptions } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';
import { DEFAULT_VALUES } from '../constants/app';
import { createInitialState, validateWorkflowState, sanitizeWorkflowState } from '@shared/services/workflowService_LG';
import { langGraphService, WorkflowRunOptions } from '@shared/services/langgraphService_LG';
import { isValidAgentName } from '../utils/helpers';

export interface UseWorkflowOptions {
  onError: (error: string) => void;
  onStatusChange: (status: ProcessStatus) => void;
  onWorkflowStateChange: (state: WorkflowState | null) => void;
  onCurrentThreadIdChange: (threadId: string | null) => void;
  onSentPromptsChange: (agentName: string, prompt: string) => void;
}

export interface UseWorkflowReturn {
  // State
  isWorkflowRunning: boolean;
  currentThreadId: string | null;
  iteration: number;
  restartChoice: 'continue' | 'search' | 'proposal';
  isInterruptRequested: boolean;
  workflowState: WorkflowState | null;

  // Actions
  runWorkflow: (topic: string, feedback?: string, startFromStep?: ProcessStatus) => Promise<void>;
  handleRevision: () => Promise<void>;
  handleInterrupt: () => void;
  setIteration: (iteration: number) => void;
  setRestartChoice: (choice: 'continue' | 'search' | 'proposal') => void;
  resetSentPrompts: () => void;
}

export const useWorkflow = (
  options: UseWorkflowOptions,
  agentPrompts: AgentPrompts,
  llmOptions: LlmOptions
): UseWorkflowReturn => {
  // Workflow state
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [iteration, setIteration] = useState(1);
  const [restartChoice, setRestartChoice] = useState<'continue' | 'search' | 'proposal'>('continue');
  const [isInterruptRequested, setIsInterruptRequested] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);

  // Create thread ID helper
  const createThreadId = useCallback((): string => {
    return `${DEFAULT_VALUES.WORKFLOW_THREAD_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Reset sent prompts helper
  const resetSentPrompts = useCallback(() => {
    // This will be handled by the parent component
    // as it manages the sentPrompts state
  }, []);

  // Workflow interruption handler
  const handleInterrupt = useCallback(() => {
    console.log('🛑 Interrupt requested by user');
    setIsInterruptRequested(true);
    setIsWorkflowRunning(false);
    options.onError('Workflow interrupted by user');

    // Reset interrupt flag after a short delay
    setTimeout(() => {
      setIsInterruptRequested(false);
      options.onError('Workflow interrupt completed');
      console.log('✅ Workflow interrupt completed');
    }, DEFAULT_VALUES.INTERRUPT_TIMEOUT);
  }, [options]);

  // Main workflow runner
  const runWorkflow = useCallback(async (
    topic: string,
    feedback = '',
    startFromStep: ProcessStatus = ProcessStatus.SEARCHING
  ) => {
    if (!topic.trim()) {
      options.onError("Please enter a topic to start the analysis.");
      return;
    }

    // Reset interrupt flag when starting new workflow
    setIsInterruptRequested(false);
    setIsWorkflowRunning(true);
    options.onError('');

    try {
      const threadId = createThreadId();
      setCurrentThreadId(threadId);
      options.onCurrentThreadIdChange(threadId);

      // Check for interrupt immediately after setup
      if (isInterruptRequested) {
        console.log('🛑 Workflow interrupted before starting');
        setIsWorkflowRunning(false);
        options.onStatusChange(ProcessStatus.INTERRUPTED);
        return;
      }

      console.log(`🚀 Starting LangGraph workflow for topic: ${topic} from step: ${startFromStep}`);

      // Create initial state based on startFromStep
      let initialState = createInitialState(topic, iteration);

      if (startFromStep === ProcessStatus.OPPORTUNITY_ANALYZING && feedback) {
        // When restarting from proposal, preserve Search and Learnings from current state
        // This would need to be passed in or managed differently
      } else if (startFromStep === ProcessStatus.SEARCHING && feedback) {
        // When restarting from search with feedback, preserve existing search results and learnings
        initialState = {
          ...initialState,
          feedback
        };
      } else if (feedback) {
        // Include feedback for revision workflows
        initialState = {
          ...initialState,
          feedback: feedback
        };
      }

      // Set up streaming callback with validation and interrupt checking
      const onChunk = (chunk: Partial<WorkflowState>) => {
        // Check for interrupt request
        if (isInterruptRequested) {
          console.log('🛑 Streaming interrupted due to user request');
          setIsWorkflowRunning(false);
          options.onError('Workflow interrupted by user');
          return; // Stop processing this chunk
        }

        setWorkflowState(prev => {
          const newState = prev ? { ...prev, ...chunk } : chunk as WorkflowState;

          // Validate state after each update
          const validation = validateWorkflowState(newState, { strict: false });
          if (!validation.isValid) {
            console.warn('⚠️ Invalid workflow state detected:', validation.errors);
            // Sanitize the state to prevent corruption
            const sanitizedState = sanitizeWorkflowState(newState);
            console.log('🔧 State sanitized automatically');
            return sanitizedState;
          }

          if (validation.warnings.length > 0) {
            console.warn('⚠️ Workflow state warnings:', validation.warnings);
          }

          return newState;
        });
      };

      const workflowOptions: WorkflowRunOptions = {
        threadId,
        onChunk,
        onPrompt: (agentName: string, prompt: string) => {
          // Track the sent prompt for the agent
          if (isValidAgentName(agentName)) {
            options.onSentPromptsChange(agentName, prompt);
          }
        },
        config: {
          recursionLimit: DEFAULT_VALUES.WORKFLOW_RECURSION_LIMIT,
        },
        prompts: agentPrompts,
      };

      const finalState = await langGraphService.startWorkflow(topic, { ...workflowOptions, initialState });

      setWorkflowState(finalState);
      options.onWorkflowStateChange(finalState);
      options.onCurrentThreadIdChange(threadId);
      console.log('✅ Workflow completed successfully');

      console.log('✅ LangGraph workflow completed successfully');

    } catch (error) {
      console.error('❌ LangGraph workflow failed:', error);
      const errorMessage = `Error during LangGraph analysis: ${error instanceof Error ? error.message : String(error)}`;
      options.onError(errorMessage);
      console.log('❌ Workflow failed');
    } finally {
      setIsWorkflowRunning(false);
    }
  }, [options, agentPrompts, llmOptions, iteration, createThreadId, isInterruptRequested]);

  // Revision handler
  const handleRevision = useCallback(async () => {
    // This is a complex function that would need to be implemented
    // For now, we'll provide a placeholder
    console.log('Revision handling would go here');
    // The full implementation would be moved here from the original component
  }, [options, agentPrompts]);

  return {
    // State
    isWorkflowRunning,
    currentThreadId,
    iteration,
    restartChoice,
    isInterruptRequested,
    workflowState,

    // Actions
    runWorkflow,
    handleRevision,
    handleInterrupt,
    setIteration,
    setRestartChoice,
    resetSentPrompts,
  };
};
