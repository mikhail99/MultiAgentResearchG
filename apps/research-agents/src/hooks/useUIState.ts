import { useState } from 'react';
import { AgentName, AgentPrompts } from '@shared/types';
import { initialPrompts } from '@shared/prompts';

export interface UIState {
  isPromptEditorOpen: boolean;
  editingAgent: AgentName | null;
  agentPrompts: AgentPrompts;
  showTemplateModal: boolean;
  selectedTemplate: any; // Keeping as any for now to match original type
  showTaskProfileDialog: boolean;
  selectedAgentProfile: { agentName: AgentName; profile: any } | null;
}

export interface UIActions {
  setIsPromptEditorOpen: (open: boolean) => void;
  setEditingAgent: (agent: AgentName | null) => void;
  setAgentPrompts: (prompts: AgentPrompts) => void;
  setAgentPromptsWithPersistence: (prompts: AgentPrompts) => void;
  setShowTemplateModal: (show: boolean) => void;
  setSelectedTemplate: (template: any) => void;
  setShowTaskProfileDialog: (show: boolean) => void;
  setSelectedAgentProfile: (profile: { agentName: AgentName; profile: any } | null) => void;
  handleOpenPromptEditor: (agent: AgentName) => void;
  handleClosePromptEditor: () => void;
  handleViewTaskProfile: (agentName: AgentName) => void;
  handleCloseTaskProfileDialog: () => void;
}

export interface UseUIStateReturn {
  state: UIState;
  actions: UIActions;
}

const CUSTOM_PROMPTS_KEY = 'mars:customPrompts';

// Load custom prompts from localStorage on initialization
const loadCustomPrompts = (): AgentPrompts => {
  try {
    const saved = localStorage.getItem(CUSTOM_PROMPTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('✅ Loaded custom prompts from localStorage');
      return { ...initialPrompts, ...parsed };
    }
  } catch (error) {
    console.warn('❌ Failed to load custom prompts:', error);
  }
  return initialPrompts;
};

// Save custom prompts to localStorage
const saveCustomPrompts = (prompts: AgentPrompts) => {
  try {
    localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(prompts));
    console.log('💾 Saved custom prompts to localStorage');
  } catch (error) {
    console.warn('❌ Failed to save custom prompts:', error);
  }
};

export const useUIState = (): UseUIStateReturn => {
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(loadCustomPrompts);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [, setSelectedTemplate] = useState<any>(null);
  const [showTaskProfileDialog, setShowTaskProfileDialog] = useState<boolean>(false);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<{ agentName: AgentName; profile: any } | null>(null);

  // Enhanced setAgentPrompts that saves to localStorage
  const setAgentPromptsWithPersistence = (newPrompts: AgentPrompts) => {
    setAgentPrompts(newPrompts);
    saveCustomPrompts(newPrompts);
  };

  // Event handlers
  const handleOpenPromptEditor = (agent: AgentName) => {
    setEditingAgent(agent);
    setIsPromptEditorOpen(true);
  };

  const handleClosePromptEditor = () => {
    setIsPromptEditorOpen(false);
    setTimeout(() => setEditingAgent(null), 300);
  };

  const handleViewTaskProfile = (agentName: AgentName) => {
    // This would need the getAgentTaskProfile function imported
    // For now, creating a placeholder
    const profile = { displayName: agentName, description: `${agentName} agent` };
    if (profile) {
      setSelectedAgentProfile({
        agentName,
        profile: {
          ...profile,
          displayName: profile.displayName,
          description: profile.description
        }
      });
      setShowTaskProfileDialog(true);
    }
  };

  const handleCloseTaskProfileDialog = () => {
    setShowTaskProfileDialog(false);
    setSelectedAgentProfile(null);
  };

  const state: UIState = {
    isPromptEditorOpen,
    editingAgent,
    agentPrompts,
    showTemplateModal,
    selectedTemplate: null, // Not exposing the setter value
    showTaskProfileDialog,
    selectedAgentProfile,
  };

  const actions: UIActions = {
    setIsPromptEditorOpen,
    setEditingAgent,
    setAgentPrompts,
    setAgentPromptsWithPersistence,
    setShowTemplateModal,
    setSelectedTemplate,
    setShowTaskProfileDialog,
    setSelectedAgentProfile,
    handleOpenPromptEditor,
    handleClosePromptEditor,
    handleViewTaskProfile,
    handleCloseTaskProfileDialog,
  };

  return { state, actions };
};
