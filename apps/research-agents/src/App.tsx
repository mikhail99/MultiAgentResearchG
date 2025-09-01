import { useState, useEffect, useCallback } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts } from '@shared/types';
import { WorkflowTemplate } from '@shared/types/workflowTemplates';
import { createExportFilename } from './utils/helpers';

// Custom hooks
import { useTheme } from './hooks/useTheme';
import { useWorkflow, UseWorkflowOptions } from './hooks/useWorkflow';
import { useAgentManagement, UseAgentManagementOptions, TaskProfileWithDisplay } from './hooks/useAgentManagement';
import { useSessionManagement, UseSessionManagementOptions } from './hooks/useSessionManagement';
import { useModelSettings } from './hooks/useModelSettings';
import { useWorkflowTemplates } from '@shared/hooks/useWorkflowTemplates';

import { initialPrompts } from '@shared/prompts';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import KeyboardShortcuts from '@shared/components/KeyboardShortcuts';
import WorkflowTemplateModal from '@shared/components/WorkflowTemplateModal';
import PromptEditorModal from '@shared/components/PromptEditorModal';
import StatusBar from '@shared/components/StatusBar';
import KnowledgeExtractionDialog from '@memory-system/components/KnowledgeExtractionDialog';
// getAgentTaskProfile is now handled by useAgentManagement hook
import { SunIcon, MoonIcon, HumanIcon, LoopIcon, SparklesIcon, AgentIcon } from '@shared/components/Icons';

// Refactored components
import AgentGrid from './components/AgentGrid';
import WorkflowControls from './components/WorkflowControls';
import WorkflowResults from './components/WorkflowResults';

// Type guard isValidAgentName is imported from utils/helpers

// TaskProfileWithDisplay is imported from useAgentManagement hook

// WorkflowError interface removed - using string error messages

export default function App_LG() {
  // Core state - topic, files, feedback, and results
  const [topic, setTopic] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [stylizedFacts, setStylizedFacts] = useState<StylizedFact[]>([]);
  const [stylizedQuestions, setStylizedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(initialPrompts);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showKnowledgeExtraction, setShowKnowledgeExtraction] = useState<boolean>(false);

  // Theme
  const { theme, setTheme } = useTheme();

  // Template management
  const { templates, createTemplate, trackUsage } = useWorkflowTemplates();

  // Model settings hook
  const { state: modelSettings, actions: modelActions } = useModelSettings();

  // Load custom prompts from localStorage on initialization
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customPrompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ Loaded custom prompts from localStorage');
        setAgentPrompts({ ...initialPrompts, ...parsed });
      }
    } catch (error) {
      console.warn('❌ Failed to load custom prompts:', error);
    }
  }, []);

  // Save custom prompts to localStorage
  const saveCustomPrompts = useCallback((prompts: AgentPrompts) => {
    try {
      localStorage.setItem('customPrompts', JSON.stringify(prompts));
      console.log('💾 Saved custom prompts to localStorage');
    } catch (error) {
      console.warn('❌ Failed to save custom prompts:', error);
    }
  }, []);

  // Enhanced setAgentPrompts that saves to localStorage
  const setAgentPromptsWithPersistence = useCallback((newPrompts: AgentPrompts) => {
    setAgentPrompts(newPrompts);
    saveCustomPrompts(newPrompts);
  }, [saveCustomPrompts]);

  // Workflow hook options
  const workflowOptions: UseWorkflowOptions = {
    onError: setError,
    onStatusChange: (_status) => {
      // Status changes are handled internally by the hook
    },
    onWorkflowStateChange: (_state) => {
      // Workflow state is managed internally by the hook
    },
    onCurrentThreadIdChange: (_threadId) => {
      // Thread ID is managed internally by the hook
    },
    onSentPromptsChange: (agentName: string, prompt: string) => {
      agentManagement.updateSentPrompt(agentName, prompt);
    },
  };

  // Agent management hook options
  const agentManagementOptions: UseAgentManagementOptions = {
    onOpenPromptEditor: (agent: AgentName) => {
      setEditingAgent(agent);
      setIsPromptEditorOpen(true);
    },
    onViewTaskProfile: (profile: TaskProfileWithDisplay) => {
      // This will be handled by the agent management hook
      console.log('View task profile:', profile);
    },
  };

  // Session management hook options
  const sessionManagementOptions: UseSessionManagementOptions = {
    onTopicChange: setTopic,
    onModelProviderChange: (provider: ModelProvider) => {
      modelActions.setModelProvider(provider);
    },
    onWorkflowStateChange: () => {},
    onCurrentThreadIdChange: () => {},
    onStylizedFactsChange: setStylizedFacts,
    onStylizedQuestionsChange: setStylizedQuestions,
    onStatusChange: () => {},
    onShowRestoreToast: () => {},
  };

  // Initialize hooks
  const agentManagement = useAgentManagement(agentManagementOptions);

  const workflow = useWorkflow(workflowOptions, agentPrompts, {
    provider: modelSettings.modelProvider,
    url: modelSettings.localLlmUrl
  });

  const sessionManagement = useSessionManagement(
    sessionManagementOptions,
    topic,
    workflow.iteration,
    modelSettings.modelProvider,
    workflow.workflowState,
    workflow.currentThreadId,
    stylizedFacts,
    stylizedQuestions,
    ProcessStatus.IDLE // This should come from workflow hook
  );

  // Update sent prompts when they change
  useEffect(() => {
    if (agentManagement.sentPrompts) {
      // Update any sent prompts from the agent management hook
    }
  }, [agentManagement.sentPrompts]);

  // Restart choice for workflow revisions
  const [restartChoice, setRestartChoice] = useState<'continue' | 'search' | 'proposal'>('continue');

  // Handle workflow interruption using the workflow hook
  const handleInterruptWorkflow = useCallback(() => {
    workflow.handleInterrupt();
  }, [workflow]);

  // Reset sent prompts using agent management hook
  const resetSentPrompts = useCallback(() => {
    agentManagement.resetSentPrompts();
  }, [agentManagement]);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Session management functions are now handled by useSessionManagement hook
  const handleCopyLinkToSession = useCallback(async () => {
    await sessionManagement.handleCopyLinkToSession();
  }, [sessionManagement]);



  // Workflow handlers using the workflow hook
  const runWorkflow = useCallback(async (currentFeedback = '', startFromStep: ProcessStatus = ProcessStatus.SEARCHING) => {
    if (!topic.trim()) {
      setError("Please enter a topic to start the analysis.");
      return;
    }

    // Reset agent iterations for new workflow
    agentManagement.resetIterationSelections();
    resetSentPrompts();

    await workflow.runWorkflow(topic, currentFeedback, startFromStep);
  }, [topic, workflow, agentManagement, resetSentPrompts]);

  const handleRevision = useCallback(async () => {
    if (!feedback.trim()) {
      setError("Please provide feedback for the revision.");
      return;
    }

    // Reset sent prompts for the new revision
    resetSentPrompts();

    try {
      // Handle different restart choices
      if (restartChoice === 'search') {
        console.log('🔄 Restarting from Search (preserving existing search results and learnings)');
        await workflow.runWorkflow(topic, feedback, ProcessStatus.SEARCHING);
      } else if (restartChoice === 'proposal') {
        console.log('🔄 Restarting from Proposal (keeping Search + Learnings)');
        await workflow.runWorkflow(topic, feedback, ProcessStatus.OPPORTUNITY_ANALYZING);
      } else {
        // Continue normally - use existing workflow if available
        console.log('➡️ Continuing normally with feedback');
        await workflow.handleRevision();
      }

      console.log('✅ Workflow revision completed successfully');
    } catch (error) {
      console.error('❌ Workflow revision failed:', error);
      const errorMessage = `Error during revision: ${error instanceof Error ? error.message : String(error)}`;
      setError(errorMessage);
    } finally {
      // Reset restart choice
      setRestartChoice('continue');
    }
  }, [feedback, resetSentPrompts, restartChoice, workflow, topic]);

  // Event handlers
  const handleStart = useCallback(() => {
    setFeedback('');
    setStylizedFacts([]);
    setStylizedQuestions([]);
    agentManagement.resetIterationSelections();
    resetSentPrompts();
    runWorkflow('', ProcessStatus.SEARCHING);
  }, [agentManagement, resetSentPrompts, runWorkflow]);

  const handleOpenPromptEditor = useCallback((agent: AgentName) => {
    setEditingAgent(agent);
    setIsPromptEditorOpen(true);
  }, []);

  const handleClosePromptEditor = useCallback(() => {
    setIsPromptEditorOpen(false);
    setTimeout(() => setEditingAgent(null), 300); // UI_CONSTANTS.MODAL_CLOSE_DELAY
  }, []);





  const handleSelectTemplate = useCallback((template: WorkflowTemplate) => {
    trackUsage(template.id);
    setAgentPromptsWithPersistence(template.agentPrompts);
    modelActions.setModelProvider(template.modelProvider);
    modelActions.setLocalLlmUrl(template.localLlmUrl);
    modelActions.setEnableWebSearch(template.enableWebSearch);
    modelActions.setEnableLocalSearch(template.enableLocalSearch);
    setTheme(template.theme);
    setShowTemplateModal(false);
    console.log(`✅ Applied template: ${template.name}`);
  }, [trackUsage, setAgentPromptsWithPersistence, modelActions, setTheme]);

  const handleCreateTemplate = useCallback((name: string, description: string, category: WorkflowTemplate['category']) => {
    const templateId = createTemplate(name, description, category, {
      agentPrompts,
      modelProvider: modelSettings.modelProvider,
      localLlmUrl: modelSettings.localLlmUrl,
      enableWebSearch: modelSettings.enableWebSearch,
      enableLocalSearch: modelSettings.enableLocalSearch,
      theme,
      iteration: workflow.iteration,
      completedSteps: workflow.workflowState?.completedSteps || []
    });
    console.log(`✅ Created template: ${name} (ID: ${templateId})`);
    return templateId;
  }, [createTemplate, agentPrompts, modelSettings, theme, workflow]);

  // Export functions using hooks
  const handleExportRun = useCallback(() => {
    if (!workflow.workflowState) return;

    const fileName = createExportFilename(topic, '.md');

    const factsText = stylizedFacts.length > 0
      ? stylizedFacts.map(f => `- **${f.fact}**: ${f.description}`).join('\n')
      : 'No stylized facts were generated.';

    const questionsText = stylizedQuestions.length > 0
      ? stylizedQuestions.map(q => `- ${q}`).join('\n')
      : 'No stylized questions were generated.';

    const content = `
# Multi-Agent Run Report (LangGraph)

- **Topic**: ${topic}
- **Iteration**: ${workflow.iteration}
- **Date**: ${new Date().toLocaleString()}
- **Model Provider**: ${modelSettings.modelProvider}
- **Framework**: LangGraph.js

---

## Agent Outputs

### Search Agent
**Output:**
${agentManagement.getAgentContent(AgentName.SEARCH, workflow.workflowState) || 'No search results'}

---

### Learnings Agent
**Output:**
${agentManagement.getAgentContent(AgentName.LEARNINGS, workflow.workflowState) || 'No learnings generated'}

---

### Opportunity Analysis Agent
**Output:**
${agentManagement.getAgentContent(AgentName.OPPORTUNITY_ANALYSIS, workflow.workflowState) || 'No opportunity analysis'}

---

### Proposer Agent
**Output:**
${agentManagement.getAgentContent(AgentName.PROPOSER, workflow.workflowState) || 'No proposal generated'}

---

### Novelty Checker Agent
**Output:**
${agentManagement.getAgentContent(AgentName.NOVELTY_CHECKER, workflow.workflowState) || 'No novelty check'}

---

### Aggregator Agent
**Output:**
${agentManagement.getAgentContent(AgentName.AGGREGATOR, workflow.workflowState) || 'No final report'}

---

## Human-in-the-Loop Feedback

\`\`\`
${workflow.iteration > 1 ? feedback : 'No feedback provided for the first iteration.'}
\`\`\`

---

## Final Results

### Stylized Facts
${factsText}

### Stylized Questions
${questionsText}

---

## LangGraph Workflow Stats

- **Thread ID**: ${workflow.currentThreadId || 'N/A'}
- **Completed Steps**: ${workflow.workflowState.completedSteps.join(', ') || 'None'}
- **Restart Count**: ${workflow.workflowState.iteration - 1}
- **Tool Service**: ${modelSettings.toolServiceAvailable ? 'Available' : 'Unavailable'}
    `;

    const blob = new Blob([content.trim()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [workflow, topic, agentManagement, stylizedFacts, stylizedQuestions, feedback, modelSettings]);

  const handleExportJson = useCallback(() => {
    if (!workflow.workflowState) return;

    const snapshot = {
      v: 1,
      timestamp: new Date().toISOString(),
      topic,
      iteration: workflow.iteration,
      modelProvider: modelSettings.modelProvider,
      framework: 'LangGraph.js',
      threadId: workflow.currentThreadId,
      workflowState: workflow.workflowState,
      stylizedFacts,
      stylizedQuestions,
    };

    const fileName = createExportFilename(topic || 'session', '.json');

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [workflow, topic, modelSettings, stylizedFacts, stylizedQuestions]);

  // Agent configurations for data-driven rendering
  const agentConfigs = [
    {
      name: AgentName.SEARCH,
      title: "Search Agent",
      status: ProcessStatus.SEARCHING,
      hasToolResults: true,
    },
    {
      name: AgentName.LEARNINGS,
      title: "Learnings Agent",
      status: ProcessStatus.LEARNING,
      hasToolResults: false,
    },
    {
      name: AgentName.OPPORTUNITY_ANALYSIS,
      title: "Opportunity Analysis Agent",
      status: ProcessStatus.OPPORTUNITY_ANALYZING,
      hasToolResults: false,
    },
    {
      name: AgentName.PROPOSER,
      title: "Proposer Agent",
      status: ProcessStatus.PROPOSING,
      hasToolResults: false,
    },
    {
      name: AgentName.NOVELTY_CHECKER,
      title: "Novelty Checker Agent",
      status: ProcessStatus.CHECKING_NOVELTY,
      hasToolResults: false,
    },
    {
      name: AgentName.AGGREGATOR,
      title: "Aggregator Agent",
      status: ProcessStatus.AGGREGATING,
      hasToolResults: false,
    },
  ];

  // Computed values
  const isLoading = workflow.isWorkflowRunning;
  const llmOptions: LlmOptions = {
    provider: modelSettings.modelProvider,
    url: modelSettings.localLlmUrl
  };

  // Check if run is complete
  const isRunComplete = workflow.workflowState?.completedSteps.includes(ProcessStatus.FEEDBACK) ||
    (stylizedFacts.length > 0 || stylizedQuestions.length > 0);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8 relative">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 dark:from-green-300 dark:via-blue-400 dark:to-purple-500 flex items-center justify-center gap-3">
              <AgentIcon />
              Multi-Agent Research Assistant
              <SparklesIcon />
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <HumanIcon />
              LangGraph.js Edition
              <LoopIcon />
            </p>
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={() => setShowKnowledgeExtraction(true)}
                className="p-2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
                title="Extract Knowledge from Papers"
              >
                🧠
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'light' ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Workflow Controls */}
            <div className="lg:col-span-3">
              <WorkflowControls
              topic={topic}
              setTopic={setTopic}
              files={files}
              setFiles={setFiles}
              onStart={handleStart}
              onInterrupt={handleInterruptWorkflow}
              onExport={handleExportRun}
              onExportJson={handleExportJson}
              onCopyLink={handleCopyLinkToSession}
              onOpenTemplateModal={() => setShowTemplateModal(true)}
              isLoading={isLoading}
              iteration={workflow.iteration}
              modelProvider={ModelProvider.LOCAL} // Temporary placeholder
              setModelProvider={() => {}} // Temporary placeholder
              localLlmUrl={'http://localhost:11434/v1/chat/completions'} // Temporary placeholder
              setLocalLlmUrl={() => {}} // Temporary placeholder
              enableWebSearch={true} // Temporary placeholder
              setEnableWebSearch={() => {}} // Temporary placeholder
              enableLocalSearch={true} // Temporary placeholder
              setEnableLocalSearch={() => {}} // Temporary placeholder
              isRunComplete={isRunComplete}
              />
            </div>

            {/* Status Bar and Agent Grid and Workflow Results */}
            <div className="lg:col-span-9 space-y-6">
              <StatusBar
                status={ProcessStatus.IDLE} // This should come from workflow hook
                completedSteps={workflow.workflowState?.completedSteps || []}
                onRestartFrom={() => {}} // TODO: Implement restart functionality
                hasFeedback={feedback.trim().length > 0}
              />

              {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <AgentGrid
                agentConfigs={agentConfigs}
                workflowState={workflow.workflowState}
                toolServiceAvailable={false} // Temporary placeholder
                status={ProcessStatus.IDLE} // This should come from workflow hook
                selectedIterations={agentManagement.selectedIterations}
                sentPrompts={agentManagement.sentPrompts}
                onEditPrompt={handleOpenPromptEditor}
                onViewTaskProfile={(agentName) => {
                  // Task profile viewing is handled by the hook
                  console.log('View task profile for:', agentName);
                }}
                onIterationSelect={(agentName, iteration) => {
                  agentManagement.setIterationForAgent(agentName, iteration);
                }}
                getAgentContent={(agentName, workflowState) =>
                  agentManagement.getAgentContent(agentName, workflowState)
                }
                getAgentIterationCount={(agentName, workflowState) =>
                  agentManagement.getAgentIterationCount(agentName, workflowState)
                }
              />

              <WorkflowResults
                status={ProcessStatus.FEEDBACK} // Temporary placeholder
                workflowState={workflow.workflowState}
                stylizedFacts={stylizedFacts}
                stylizedQuestions={stylizedQuestions}
                feedback={feedback}
                setFeedback={setFeedback}
                restartChoice={restartChoice}
                setRestartChoice={setRestartChoice}
                onRevision={handleRevision}
                isLoading={isLoading}
              />
            </div>
          </main>
        </div>

        {/* Modals and Components */}
        <PromptEditorModal
          isOpen={isPromptEditorOpen}
          onClose={handleClosePromptEditor}
          prompts={agentPrompts}
          onSave={setAgentPromptsWithPersistence}
          llmOptions={llmOptions}
          initialAgent={editingAgent}
        />

        <WorkflowTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={handleSelectTemplate}
          currentPrompts={agentPrompts}
          currentSettings={{
            modelProvider: modelSettings.modelProvider,
            localLlmUrl: modelSettings.localLlmUrl,
            enableWebSearch: modelSettings.enableWebSearch,
            enableLocalSearch: modelSettings.enableLocalSearch,
            theme,
            iteration: workflow.iteration,
            completedSteps: workflow.workflowState?.completedSteps || []
          }}
          templates={templates}
          onCreateTemplate={handleCreateTemplate}
          onDeleteTemplate={(templateId) => {
            // This should be implemented
            console.log('Delete template:', templateId);
          }}
        />

        <KeyboardShortcuts
          onStart={handleStart}
          onRevision={handleRevision}
          onExport={handleExportRun}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          isLoading={isLoading}
          hasCompletedRun={isRunComplete}
          hasFeedback={feedback.trim().length > 0}
        />

        {/* TaskProfileDialog temporarily disabled until hook integration is complete */}

        {/* Knowledge Extraction Dialog */}
        <KnowledgeExtractionDialog
          open={showKnowledgeExtraction}
          onOpenChange={setShowKnowledgeExtraction}
          llmOptions={{ provider: modelSettings.modelProvider, url: modelSettings.localLlmUrl }}
          paperContent={files.length > 0 ? undefined : undefined}
          paperMetadata={files.length > 0 ? {
            id: `paper_${Date.now()}`,
            title: files[0]?.name || 'Research Paper',
            authors: ['Unknown'],
            publicationDate: new Date().toISOString().split('T')[0]
          } : undefined}
        />
      </div>

      {/* Session Management Toasts */}
      {sessionManagement.showRestoreToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
            <p className="text-sm font-semibold">Restore last session?</p>
            <p className="text-xs text-gray-300 mt-1">A previous run was found from local storage. You can restore it now.</p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={sessionManagement.restoreLastRun} className="px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs">Restore</button>
              <button onClick={sessionManagement.dismissRestoreToast} className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {sessionManagement.showLinkToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 text-sm">
            Link copied to clipboard
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}