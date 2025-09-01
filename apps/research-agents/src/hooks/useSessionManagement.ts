import { useState, useEffect, useCallback } from 'react';
import { ProcessStatus, StylizedFact, ModelProvider } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';
import { STORAGE_KEYS, DEFAULT_VALUES } from '../constants/app';

export interface SavedRun {
  v: number; // Version number for data format
  timestamp: string;
  topic: string;
  iteration: number;
  modelProvider: string;
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

export interface UseSessionManagementOptions {
  onTopicChange: (topic: string) => void;
  onModelProviderChange: (provider: ModelProvider) => void;
  onWorkflowStateChange: (state: WorkflowState | null) => void;
  onCurrentThreadIdChange: (threadId: string | null) => void;
  onStylizedFactsChange: (facts: StylizedFact[]) => void;
  onStylizedQuestionsChange: (questions: string[]) => void;
  onStatusChange: (status: ProcessStatus) => void;
  onShowRestoreToast: (show: boolean) => void;
}

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

export const useSessionManagement = (
  options: UseSessionManagementOptions,
  // Current state values
  topic: string,
  iteration: number,
  modelProvider: string,
  workflowState: WorkflowState | null,
  currentThreadId: string | null,
  stylizedFacts: StylizedFact[],
  stylizedQuestions: string[],
  status: ProcessStatus
): UseSessionManagementReturn => {
  // Session management state
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [showLinkToast, setShowLinkToast] = useState(false);

  // Last run persistence uses STORAGE_KEYS.LAST_RUN
  const saveLastRun = useCallback(() => {
    try {
      const payload: SavedRun = {
        v: 1,
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
      const workflowError = {
        message: error instanceof Error ? error.message : String(error),
        code: 'SAVE_FAILED',
        timestamp: new Date(),
        context: { action: 'saveLastRun', topic }
      };
      console.error('❌ Error saving data:', workflowError.message);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error parsing saved data:', errorMessage);
      return null;
    }
  }, []);

  const restoreLastRun = useCallback(() => {
    const data = tryGetSavedRun();
    if (!data) return;

    options.onTopicChange(data.topic);
    options.onModelProviderChange(data.modelProvider as ModelProvider);
    options.onWorkflowStateChange(data.workflowState || null);
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
    v: 1,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to copy link:', errorMessage);
    }
  }, [buildSessionSnapshot]);

  // Auto-restore functionality
  useEffect(() => {
    // If a share link is provided, restore from URL hash
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      try {
        const encoded = window.location.hash.substring(3);
        const json = decodeURIComponent(encoded);
        const data = JSON.parse(json) as SavedRun & { v?: number };

        options.onTopicChange(data.topic || '');
        options.onModelProviderChange((data.modelProvider || 'LOCAL') as ModelProvider);
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
