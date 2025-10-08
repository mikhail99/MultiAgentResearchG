import { useState, useEffect, useCallback } from 'react';
import { ProcessStatus, StylizedFact, ModelProvider } from '../types';
import { WorkflowState } from '../types/workflow_LG';
import { validateWorkflowState, sanitizeWorkflowState } from '../services/workflowService_LG';
import { STORAGE_KEYS, DEFAULT_VALUES } from '../constants';

// Data structure for saved runs (compatible with current App_LG.tsx)
export interface SavedRun {
  timestamp: string;
  topic: string;
  iteration: number;
  modelProvider: ModelProvider;
  researchSummary: string;
  generatedAnalysis: string;
  critique: string;
  proposal: string;
  noveltyAssessment: string;
  finalReport: string;
  stylizedFacts: StylizedFact[];
  stylizedQuestions: string[];
  completedSteps: ProcessStatus[];
  toolResults?: any;
  workflowState?: WorkflowState;
  currentThreadId?: string;
}

// Hook options interface
export interface UseSessionManagementOptions {
  onTopicChange: (topic: string) => void;
  onModelProviderChange: (provider: ModelProvider) => void;
  onWorkflowStateChange: (state: WorkflowState | null) => void;
  onCurrentThreadIdChange: (threadId: string | null) => void;
  onStylizedFactsChange: (facts: StylizedFact[]) => void;
  onStylizedQuestionsChange: (questions: string[]) => void;
  onStatusChange: (status: ProcessStatus) => void;
}

// Hook return interface
export interface UseSessionManagementReturn {
  // State
  showRestoreToast: boolean;
  showLinkToast: boolean;

  // Actions
  saveLastRun: () => void;
  tryGetSavedRun: () => SavedRun | null;
  restoreLastRun: () => void;
  dismissRestoreToast: () => void;
  handleCopyLinkToSession: () => Promise<void>;
  buildSessionSnapshot: () => SavedRun;
}

/**
 * Custom hook for session management
 * Handles autosave, restore-toast logic, and share-link generation
 */
export const useSessionManagement = (
  options: UseSessionManagementOptions,
  // Current state values
  topic: string,
  iteration: number,
  modelProvider: ModelProvider,
  workflowState: WorkflowState | null,
  currentThreadId: string | null,
  stylizedFacts: StylizedFact[],
  stylizedQuestions: string[],
  status: ProcessStatus
): UseSessionManagementReturn => {
  // Session management state
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [showLinkToast, setShowLinkToast] = useState(false);

  // Last run persistence
  const saveLastRun = useCallback(() => {
    try {
      const payload: SavedRun = {
        timestamp: new Date().toISOString(),
        topic,
        iteration,
        modelProvider,
        researchSummary: workflowState?.searchResults.join('\n\n') || '',
        generatedAnalysis: workflowState?.learnings[workflowState.learnings.length - 1] || '',
        critique: workflowState?.opportunityAnalyses[workflowState.opportunityAnalyses.length - 1] || '',
        proposal: workflowState?.proposals[workflowState.proposals.length - 1] || '',
        noveltyAssessment: workflowState?.noveltyChecks[workflowState.noveltyChecks.length - 1] || '',
        finalReport: workflowState?.aggregations[workflowState.aggregations.length - 1] || '',
        stylizedFacts,
        stylizedQuestions,
        completedSteps: workflowState?.completedSteps || [],
        toolResults: workflowState?.toolResults ?? undefined,
        workflowState: workflowState ?? undefined,
        currentThreadId: currentThreadId ?? undefined,
      };

      console.log('💾 Saving data:', {
        topic,
        hasResearchSummary: !!payload.researchSummary,
        hasGeneratedAnalysis: !!payload.generatedAnalysis,
        completedSteps: payload.completedSteps
      });

      localStorage.setItem(STORAGE_KEYS.LAST_RUN, JSON.stringify(payload));
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }, [topic, iteration, modelProvider, workflowState, currentThreadId, stylizedFacts, stylizedQuestions]);

  const tryGetSavedRun = useCallback((): SavedRun | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_RUN);
      console.log('💾 tryGetSavedRun:', { hasRawData: !!raw, rawLength: raw?.length });
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SavedRun;
      console.log('💾 Parsed saved data:', {
        hasTopic: !!parsed.topic,
        hasResearchSummary: !!parsed.researchSummary,
        hasGeneratedAnalysis: !!parsed.generatedAnalysis
      });

      return parsed;
    } catch (error) {
      console.error('❌ Error parsing saved data:', error);
      return null;
    }
  }, []);

  const restoreLastRun = useCallback(() => {
    const data = tryGetSavedRun();
    if (!data) return;

    // Validate and sanitize the workflow state before restoring
    let validatedWorkflowState = data.workflowState;
    if (validatedWorkflowState) {
      const validation = validateWorkflowState(validatedWorkflowState, { strict: false });
      if (!validation.isValid) {
        console.warn('⚠️ Invalid saved workflow state:', validation.errors);
        validatedWorkflowState = sanitizeWorkflowState(validatedWorkflowState);
        console.log('🔧 Saved state sanitized during restoration');
      }
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Saved workflow state warnings:', validation.warnings);
      }
    }

    options.onTopicChange(data.topic);
    options.onModelProviderChange(data.modelProvider);
    options.onWorkflowStateChange(validatedWorkflowState);
    options.onCurrentThreadIdChange(data.currentThreadId || null);
    options.onStylizedFactsChange(data.stylizedFacts || []);
    options.onStylizedQuestionsChange(data.stylizedQuestions || []);
    options.onStatusChange(ProcessStatus.FEEDBACK);
    setShowRestoreToast(false);

    console.log('✅ Restored session:', {
      topic: data.topic,
      iteration: data.iteration,
      hasWorkflowState: !!data.workflowState
    });
  }, [tryGetSavedRun, options]);

  const dismissRestoreToast = useCallback(() => {
    setShowRestoreToast(false);
  }, []);

  const buildSessionSnapshot = useCallback((): SavedRun => ({
    timestamp: new Date().toISOString(),
    topic,
    iteration,
    modelProvider,
    researchSummary: workflowState?.searchResults.join('\n\n') || '',
    generatedAnalysis: workflowState?.learnings[workflowState.learnings.length - 1] || '',
    critique: workflowState?.opportunityAnalyses[workflowState.opportunityAnalyses.length - 1] || '',
    proposal: workflowState?.proposals[workflowState.proposals.length - 1] || '',
    noveltyAssessment: workflowState?.noveltyChecks[workflowState.noveltyChecks.length - 1] || '',
    finalReport: workflowState?.aggregations[workflowState.aggregations.length - 1] || '',
    stylizedFacts,
    stylizedQuestions,
    completedSteps: workflowState?.completedSteps || [],
    toolResults: workflowState?.toolResults ?? undefined,
    workflowState: workflowState ?? undefined,
    currentThreadId: currentThreadId ?? undefined,
  }), [topic, iteration, modelProvider, workflowState, currentThreadId, stylizedFacts, stylizedQuestions]);

  const handleCopyLinkToSession = useCallback(async () => {
    try {
      const snapshot = buildSessionSnapshot();
      const encoded = encodeURIComponent(JSON.stringify(snapshot));
      const shareUrl = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowLinkToast(true);
      setTimeout(() => setShowLinkToast(false), DEFAULT_VALUES.TOAST_DURATION);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }, [buildSessionSnapshot]);

  // Auto-restore functionality
  useEffect(() => {
    // If a share link is provided, restore from URL hash
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      try {
        const encoded = window.location.hash.substring(3);
        const json = decodeURIComponent(encoded);
        const data = JSON.parse(json) as SavedRun;

        options.onTopicChange(data.topic || '');
        options.onModelProviderChange(data.modelProvider || ModelProvider.OLLAMA);
        options.onWorkflowStateChange(data.workflowState || null);
        options.onCurrentThreadIdChange(data.currentThreadId || null);
        options.onStylizedFactsChange(data.stylizedFacts || []);
        options.onStylizedQuestionsChange(data.stylizedQuestions || []);
        options.onStatusChange(ProcessStatus.FEEDBACK);

        // Optionally clear the hash to avoid repeated restores
        history.replaceState(null, '', window.location.pathname);
        return; // Skip autosave toast if we restored from hash
      } catch {
        // Ignore malformed hashes
      }
    }

    // On first load, if there's a saved run and current state is empty, offer restore
    const savedData = tryGetSavedRun();
    const hasSaved = !!savedData;
    const isOutputsEmpty = !workflowState ||
      (workflowState.searchResults.length === 0 &&
       workflowState.learnings.length === 0 &&
       workflowState.opportunityAnalyses.length === 0 &&
       workflowState.proposals.length === 0 &&
       workflowState.noveltyChecks.length === 0 &&
       workflowState.aggregations.length === 0 &&
       stylizedFacts.length === 0 &&
       stylizedQuestions.length === 0);

    console.log('🔄 Auto-restore check:', {
      hasSaved,
      topic: !!topic,
      isOutputsEmpty,
      savedDataKeys: savedData ? Object.keys(savedData) : null
    });

    if (hasSaved && !topic && isOutputsEmpty) {
      console.log('📋 Showing restore toast');
      setShowRestoreToast(true);
    } else {
      console.log('📋 Not showing restore toast:', {
        hasSaved,
        hasTopic: !!topic,
        isOutputsEmpty
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save when workflow completes
  useEffect(() => {
    if (status === ProcessStatus.FEEDBACK && workflowState) {
      saveLastRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, workflowState]);

  return {
    // State
    showRestoreToast,
    showLinkToast,

    // Actions
    saveLastRun,
    tryGetSavedRun,
    restoreLastRun,
    dismissRestoreToast,
    handleCopyLinkToSession,
    buildSessionSnapshot,
  };
};
