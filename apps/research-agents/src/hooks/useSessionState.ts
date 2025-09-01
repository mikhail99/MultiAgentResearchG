import { useState } from 'react';

export interface SessionState {
  showRestoreToast: boolean;
  showLinkToast: boolean;
  showKnowledgeExtraction: boolean;
}

export interface SessionActions {
  setShowRestoreToast: (show: boolean) => void;
  setShowLinkToast: (show: boolean) => void;
  setShowKnowledgeExtraction: (show: boolean) => void;
  dismissRestoreToast: () => void;
  handleCopyLinkToSession: () => Promise<void>;
}

export interface UseSessionStateReturn {
  state: SessionState;
  actions: SessionActions;
}

export const useSessionState = (): UseSessionStateReturn => {
  const [showRestoreToast, setShowRestoreToast] = useState<boolean>(false);
  const [showLinkToast, setShowLinkToast] = useState<boolean>(false);
  const [showKnowledgeExtraction, setShowKnowledgeExtraction] = useState<boolean>(false);

  const dismissRestoreToast = () => setShowRestoreToast(false);

  const handleCopyLinkToSession = async () => {
    try {
      // This would need access to the full session snapshot
      // For now, creating a placeholder that copies a dummy link
      const dummyLink = `${window.location.origin}${window.location.pathname}#session-shared`;
      await navigator.clipboard.writeText(dummyLink);
      setShowLinkToast(true);
      setTimeout(() => setShowLinkToast(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const state: SessionState = {
    showRestoreToast,
    showLinkToast,
    showKnowledgeExtraction,
  };

  const actions: SessionActions = {
    setShowRestoreToast,
    setShowLinkToast,
    setShowKnowledgeExtraction,
    dismissRestoreToast,
    handleCopyLinkToSession,
  };

  return { state, actions };
};
