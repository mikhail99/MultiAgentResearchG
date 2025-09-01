import { useState, useEffect } from 'react';
import { ModelProvider } from '../types';
import { checkToolServiceHealth } from '../services/toolService';

export interface ModelSettingsState {
  modelProvider: ModelProvider;
  localLlmUrl: string;
  toolServiceAvailable: boolean;
  enableWebSearch: boolean;
  enableLocalSearch: boolean;
}

export interface ModelSettingsActions {
  setModelProvider: (provider: ModelProvider) => void;
  setLocalLlmUrl: (url: string) => void;
  setToolServiceAvailable: (available: boolean) => void;
  setEnableWebSearch: (enabled: boolean) => void;
  setEnableLocalSearch: (enabled: boolean) => void;
}

export interface UseModelSettingsReturn {
  state: ModelSettingsState;
  actions: ModelSettingsActions;
}

export const useModelSettings = (): UseModelSettingsReturn => {
  const [modelProvider, setModelProvider] = useState<ModelProvider>(ModelProvider.LOCAL);
  const [localLlmUrl, setLocalLlmUrl] = useState<string>('http://localhost:11434/v1/chat/completions');
  const [toolServiceAvailable, setToolServiceAvailable] = useState<boolean>(false);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [enableLocalSearch, setEnableLocalSearch] = useState<boolean>(true);

  // Check tool service health on mount
  useEffect(() => {
    const checkTools = async () => {
      console.log('🔧 Checking tool service health...');
      const isAvailable = await checkToolServiceHealth();
      console.log('🔧 Tool service health result:', isAvailable);
      setToolServiceAvailable(isAvailable);
      if (!isAvailable) {
        console.warn('⚠️ Tool service not available. Research agent will run without tools.');
      } else {
        console.log('✅ Tool service is available and ready to use.');
      }
    };
    checkTools();
  }, []);

  const state: ModelSettingsState = {
    modelProvider,
    localLlmUrl,
    toolServiceAvailable,
    enableWebSearch,
    enableLocalSearch,
  };

  const actions: ModelSettingsActions = {
    setModelProvider,
    setLocalLlmUrl,
    setToolServiceAvailable,
    setEnableWebSearch,
    setEnableLocalSearch,
  };

  return { state, actions };
};