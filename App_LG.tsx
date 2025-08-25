import React, { useState, useEffect } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts, ToolResults } from './types';
import { generateContentStream, generateFacts, generateQuestions } from './services/geminiService';
import { checkToolServiceHealth } from './services/toolService';
import { initialPrompts } from './prompts';
import ControlPanel from './components/ControlPanel';
import StatusBar from './components/StatusBar';
import AgentCard from './components/AgentCard';
import FeedbackPanel from './components/FeedbackPanel';
import ResultsPanel from './components/ResultsPanel';
import PromptEditorModal from './components/PromptEditorModal';
import ErrorBoundary from './components/ErrorBoundary';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import WorkflowTemplateModal from './components/WorkflowTemplateModal';
import TaskProfileDialog from './components/TaskProfileDialog';
import { getAgentTaskProfile } from './components/agentTaskProfiles';
import { useWorkflowTemplates } from './hooks/useWorkflowTemplates';
import { WorkflowTemplate } from './types/workflowTemplates';
import { SunIcon, MoonIcon, HumanIcon, LoopIcon, SparklesIcon, AgentIcon } from './components/Icons';
import { WorkflowState } from './types/workflow_LG';
// Browser-compatible LangGraph service
import { langGraphService, WorkflowRunOptions } from './services/langgraphService_LG';
import { getAgentContent, getAgentIterationCount } from './services/workflowService_LG';

// Helper function to read file content
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Only read text-based files
    if (!file.type.startsWith('text/')) {
      resolve(`[Content of non-text file '${file.name}' was not read]`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

// Helper function to replace placeholders in prompts
const fillPromptTemplate = (template: string, data: Record<string, string>): string => {
  return Object.entries(data).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{${key}}`, 'g'), value || '--- ---');
  }, template);
};

// Incremental parsers for streaming facts/questions built on top of bullet lists
const parseFactsFromBuffer = (buffer: string): StylizedFact[] => {
  const lines = buffer.split(/\r?\n/);
  const facts: StylizedFact[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('-')) continue;
    const cleaned = line.replace(/^[-•]\s*/, '');
    const parts = cleaned.split(/\s[—:-]\s|:\s|\s—\s/);
    if (parts.length >= 2) {
      const [fact, ...rest] = parts;
      const description = rest.join(' ').trim();
      if (fact && description) facts.push({ fact: fact.trim(), description });
    }
  }
  const seen = new Set<string>();
  return facts.filter(f => {
    const key = `${f.fact}|||${f.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseQuestionsFromBuffer = (buffer: string): string[] => {
  const lines = buffer.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('-')) {
      const cleaned = line.replace(/^[-•]\s*/, '').trim();
      if (cleaned) out.push(cleaned);
    }
  }
  const seen = new Set<string>();
  return out.filter(q => (seen.has(q) ? false : (seen.add(q), true)));
};

export default function App_LG() {
  // Core state
  const [topic, setTopic] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [iteration, setIteration] = useState<number>(1);
  const [feedback, setFeedback] = useState<string>('');
  const [stylizedFacts, setStylizedFacts] = useState<StylizedFact[]>([]);
  const [stylizedQuestions, setStylizedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // LangGraph state
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState<boolean>(false);

  // Model and tool settings
  const [modelProvider, setModelProvider] = useState<ModelProvider>(ModelProvider.LOCAL);
  const [localLlmUrl, setLocalLlmUrl] = useState<string>('http://localhost:11434/v1/chat/completions');
  const [toolServiceAvailable, setToolServiceAvailable] = useState<boolean>(false);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [enableLocalSearch, setEnableLocalSearch] = useState<boolean>(true);

  // UI state
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(initialPrompts);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showTaskProfileDialog, setShowTaskProfileDialog] = useState<boolean>(false);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<{ agentName: AgentName; profile: any } | null>(null);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Template management
  const { templates, createTemplate, trackUsage, deleteTemplate, updateTemplate } = useWorkflowTemplates();

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check tool service health
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

  // LangGraph workflow handlers
  const runWorkflow_LG = async (currentFeedback = '') => {
    if (!topic.trim()) {
      setError("Please enter a topic to start the analysis.");
      return;
    }

    setIsWorkflowRunning(true);
    setError(null);

    try {
      const threadId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentThreadId(threadId);

      console.log(`🚀 Starting LangGraph workflow for topic: ${topic}`);

      // Set up streaming callback
      const onChunk = (chunk: Partial<WorkflowState>) => {
        console.log('📦 UI received chunk:', Object.keys(chunk));
        setWorkflowState(prev => {
          const newState = prev ? { ...prev, ...chunk } : chunk as WorkflowState;

          // Handle streaming content updates
          if (chunk.searchResults && chunk.searchResults.length > 0) {
            console.log('🔄 Streaming search content:', chunk.searchResults[0].substring(0, 100));
          }
          if (chunk.learnings && chunk.learnings.length > 0) {
            console.log('🔄 Streaming learnings content:', chunk.learnings[0].substring(0, 100));
          }
          if (chunk.opportunityAnalyses && chunk.opportunityAnalyses.length > 0) {
            console.log('🔄 Streaming opportunity analysis content:', chunk.opportunityAnalyses[0].substring(0, 100));
          }
          if (chunk.proposals && chunk.proposals.length > 0) {
            console.log('🔄 Streaming proposals content:', chunk.proposals[0].substring(0, 100));
          }
          if (chunk.noveltyChecks && chunk.noveltyChecks.length > 0) {
            console.log('🔄 Streaming novelty checks content:', chunk.noveltyChecks[0].substring(0, 100));
          }
          if (chunk.aggregations && chunk.aggregations.length > 0) {
            console.log('🔄 Streaming aggregations content:', chunk.aggregations[0].substring(0, 100));
          }

          console.log('📊 Updated workflow state:', {
            currentStep: newState.currentStep,
            completedSteps: newState.completedSteps?.length || 0,
            searchResultsCount: newState.searchResults?.length || 0,
            learningsCount: newState.learnings?.length || 0,
            opportunityAnalysesCount: newState.opportunityAnalyses?.length || 0,
            proposalsCount: newState.proposals?.length || 0,
            noveltyChecksCount: newState.noveltyChecks?.length || 0,
            aggregationsCount: newState.aggregations?.length || 0
          });

          return newState;
        });

        // Update status if provided in chunk
        if (chunk.currentStep) {
          console.log('🔄 Updating status to:', chunk.currentStep);
          setStatus(chunk.currentStep);
        }
      };

      const options: WorkflowRunOptions = {
        threadId,
        onChunk,
        config: {
          recursionLimit: 50,
        },
        prompts: agentPrompts,
      };

      const finalState = await langGraphService.startWorkflow(topic, options);

      setWorkflowState(finalState);
      setStatus(ProcessStatus.FEEDBACK);
      setIteration(finalState.iteration);

      console.log('✅ LangGraph workflow completed successfully');

    } catch (error) {
      console.error('❌ LangGraph workflow failed:', error);
      const errorMessage = `Error during LangGraph analysis: ${error instanceof Error ? error.message : String(error)}`;
      setError(errorMessage);
      setStatus(ProcessStatus.IDLE);
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  const handleRevision_LG = async () => {
    if (!feedback.trim()) {
      setError("Please provide feedback for the revision.");
      return;
    }

    if (!currentThreadId || !workflowState) {
      setError("No active workflow to continue.");
      return;
    }

    setIsWorkflowRunning(true);
    setError(null);

    try {
      console.log(`🔄 Continuing LangGraph workflow with feedback`);

      // Set up streaming callback
      const onChunk = (chunk: Partial<WorkflowState>) => {
        setWorkflowState(prev => prev ? { ...prev, ...chunk } : chunk as WorkflowState);
        setStatus(chunk.currentStep || status);
      };

      const options: WorkflowRunOptions = {
        onChunk,
        config: {
          recursionLimit: 50,
        },
        prompts: agentPrompts,
      };

      const finalState = await langGraphService.continueWorkflow(currentThreadId, feedback, options);

      setWorkflowState(finalState);
      setStatus(ProcessStatus.FEEDBACK);
      setIteration(finalState.iteration);

      console.log('✅ LangGraph workflow continued successfully');

    } catch (error) {
      console.error('❌ LangGraph workflow continuation failed:', error);
      const errorMessage = `Error continuing analysis: ${error instanceof Error ? error.message : String(error)}`;
      setError(errorMessage);
      setStatus(ProcessStatus.IDLE);
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  // Generate facts and questions (kept separate for now)
  const generateFactsAndQuestions = async () => {
    if (!workflowState) return;

    setStatus(ProcessStatus.GENERATING_FACTS);
    setStylizedFacts([]);

    const currentAggregation = workflowState.aggregations[workflowState.aggregations.length - 1] || '';

    if (currentAggregation) {
      const factsPrompt = `
        Based on the final report below, emit 5-7 stylized facts as a bullet list only.
        - Use the exact format "- Fact — Description" (em dash or colon are acceptable).
        - No section headers, no JSON, no commentary.
        Final Report:\n---\n${currentAggregation}\n---
      `;

      let factsBuffer = '';
      await generateContentStream(
        AgentName.LEARNINGS,
        factsPrompt,
        { provider: modelProvider, url: localLlmUrl },
        (chunk) => {
          factsBuffer += chunk;
          setStylizedFacts(parseFactsFromBuffer(factsBuffer));
        }
      );
    }

    setStatus(ProcessStatus.GENERATING_QUESTIONS);
    setStylizedQuestions([]);

    if (currentAggregation) {
      const questionsPrompt = `
        Based on the final report below, emit 5 insightful questions as a bullet list only.
        - Use the exact format "- question text".
        - No section headers, no JSON, no commentary.
        Final Report:\n---\n${currentAggregation}\n---
      `;

      let questionsBuffer = '';
      await generateContentStream(
        AgentName.LEARNINGS,
        questionsPrompt,
        { provider: modelProvider, url: localLlmUrl },
        (chunk) => {
          questionsBuffer += chunk;
          setStylizedQuestions(parseQuestionsFromBuffer(questionsBuffer));
        }
      );
    }

    setStatus(ProcessStatus.FEEDBACK);
  };

  // Event handlers
  const handleStart = () => {
    setIteration(1);
    setFeedback('');
    setWorkflowState(null);
    setCurrentThreadId(null);
    setStylizedFacts([]);
    setStylizedQuestions([]);
    setStatus(ProcessStatus.SEARCHING);
    runWorkflow_LG();
  };

  const handleRevision = () => {
    setIteration(prev => prev + 1);
    handleRevision_LG();
  };

  const handleOpenPromptEditor = (agent: AgentName) => {
    setEditingAgent(agent);
    setIsPromptEditorOpen(true);
  };

  const handleClosePromptEditor = () => {
    setIsPromptEditorOpen(false);
    setTimeout(() => setEditingAgent(null), 300);
  };

  const handleViewTaskProfile = (agentName: AgentName) => {
    const profile = getAgentTaskProfile(agentName);
    if (profile) {
      setSelectedAgentProfile({
        agentName,
        profile: {
          ...profile.taskProfile,
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

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    trackUsage(template.id);
    setAgentPrompts(template.agentPrompts);
    setModelProvider(template.modelProvider);
    setLocalLlmUrl(template.localLlmUrl);
    setEnableWebSearch(template.enableWebSearch);
    setEnableLocalSearch(template.enableLocalSearch);
    setTheme(template.theme);
    setIteration(template.maxIterations);
    setShowTemplateModal(false);
    console.log(`✅ Applied template: ${template.name}`);
  };

  const handleCreateTemplate = (name: string, description: string, category: WorkflowTemplate['category']) => {
    const templateId = createTemplate(name, description, category, {
      agentPrompts,
      modelProvider,
      localLlmUrl,
      enableWebSearch,
      enableLocalSearch,
      theme,
      iteration,
      completedSteps: workflowState?.completedSteps || []
    });
    console.log(`✅ Created template: ${name} (ID: ${templateId})`);
    return templateId;
  };

  // Helper functions
  const getAffectedSteps = (fromStep: ProcessStatus): string[] => {
    const allSteps = [
      { id: ProcessStatus.SEARCHING, label: 'Search' },
      { id: ProcessStatus.LEARNING, label: 'Learnings' },
      { id: ProcessStatus.OPPORTUNITY_ANALYZING, label: 'Opportunity Analysis' },
      { id: ProcessStatus.PROPOSING, label: 'Propose' },
      { id: ProcessStatus.CHECKING_NOVELTY, label: 'Novelty Check' },
      { id: ProcessStatus.AGGREGATING, label: 'Aggregate' },
      { id: ProcessStatus.GENERATING_FACTS, label: 'Facts' },
      { id: ProcessStatus.GENERATING_QUESTIONS, label: 'Questions' },
    ];

    const fromIndex = allSteps.findIndex(step => step.id === fromStep);
    if (fromIndex === -1) return [];

    return allSteps.slice(fromIndex).map(step => step.label);
  };

  // Export functions (adapted for LangGraph)
  const handleExportRun = () => {
    if (!workflowState) return;

    const formattedTopic = topic.replace(/\s+/g, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `run_${formattedTopic}_${timestamp}.md`;

    const factsText = stylizedFacts.length > 0
      ? stylizedFacts.map(f => `- **${f.fact}**: ${f.description}`).join('\n')
      : 'No stylized facts were generated.';

    const questionsText = stylizedQuestions.length > 0
      ? stylizedQuestions.map(q => `- ${q}`).join('\n')
      : 'No stylized questions were generated.';

    const content = `
# Multi-Agent Run Report (LangGraph)

- **Topic**: ${topic}
- **Iteration**: ${iteration}
- **Date**: ${new Date().toLocaleString()}
- **Model Provider**: ${modelProvider}
- **Framework**: LangGraph.js

---

## Agent Outputs

### Search Agent
**Output:**
${getAgentContent(workflowState, AgentName.SEARCH) || 'No search results'}

---

### Learnings Agent
**Output:**
${getAgentContent(workflowState, AgentName.LEARNINGS) || 'No learnings generated'}

---

### Opportunity Analysis Agent
**Output:**
${getAgentContent(workflowState, AgentName.OPPORTUNITY_ANALYSIS) || 'No opportunity analysis'}

---

### Proposer Agent
**Output:**
${getAgentContent(workflowState, AgentName.PROPOSER) || 'No proposal generated'}

---

### Novelty Checker Agent
**Output:**
${getAgentContent(workflowState, AgentName.NOVELTY_CHECKER) || 'No novelty check'}

---

### Aggregator Agent
**Output:**
${getAgentContent(workflowState, AgentName.AGGREGATOR) || 'No final report'}

---

## Human-in-the-Loop Feedback

\`\`\`
${iteration > 1 ? feedback : 'No feedback provided for the first iteration.'}
\`\`\`

---

## Final Results

### Stylized Facts
${factsText}

### Stylized Questions
${questionsText}

---

## LangGraph Workflow Stats

- **Thread ID**: ${currentThreadId || 'N/A'}
- **Completed Steps**: ${workflowState.completedSteps.join(', ') || 'None'}
- **Restart Count**: ${workflowState.iteration - 1}
- **Tool Service**: ${toolServiceAvailable ? 'Available' : 'Unavailable'}
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
  };

  const handleExportJson = () => {
    if (!workflowState) return;

    const snapshot = {
      v: 1,
      timestamp: new Date().toISOString(),
      topic,
      iteration,
      modelProvider,
      framework: 'LangGraph.js',
      threadId: currentThreadId,
      workflowState,
      stylizedFacts,
      stylizedQuestions,
    };

    const formattedTopic = (topic || 'session').replace(/\s+/g, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `run_${formattedTopic}_${timestamp}.json`;

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Computed values
  const isLoading = isWorkflowRunning;
  const llmOptions: LlmOptions = { provider: modelProvider, url: localLlmUrl };

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
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="absolute top-0 right-0 p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? <SunIcon /> : <MoonIcon />}
            </button>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <ControlPanel
                topic={topic}
                setTopic={setTopic}
                files={files}
                setFiles={setFiles}
                onStart={handleStart}
                onExport={handleExportRun}
                onExportJson={handleExportJson}
                onCopyLink={() => {}} // TODO: Implement link sharing
                onOpenTemplateModal={() => setShowTemplateModal(true)}
                isLoading={isLoading}
                iteration={iteration}
                modelProvider={modelProvider}
                setModelProvider={setModelProvider}
                localLlmUrl={localLlmUrl}
                setLocalLlmUrl={setLocalLlmUrl}
                enableWebSearch={enableWebSearch}
                setEnableWebSearch={setEnableWebSearch}
                enableLocalSearch={enableLocalSearch}
                setEnableLocalSearch={setEnableLocalSearch}
                isRunComplete={status === ProcessStatus.FEEDBACK || (stylizedFacts.length > 0 || stylizedQuestions.length > 0)}
              />
            </div>

            <div className="lg:col-span-9 space-y-6">
              <StatusBar
                status={status}
                completedSteps={workflowState?.completedSteps || []}
                onRestartFrom={() => {}} // TODO: Implement restart functionality
                hasFeedback={feedback.trim().length > 0}
              />

              {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AgentCard
                  title="Search Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.SEARCH) : ''}
                  sentPrompt="" // TODO: Track sent prompts in LangGraph
                  isLoading={status === ProcessStatus.SEARCHING}
                  agent={AgentName.SEARCH}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.SEARCH)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.SEARCH)}
                  toolResults={workflowState?.toolResults || null}
                  toolServiceAvailable={toolServiceAvailable}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.SEARCH)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.SEARCH)}
                  onIterationSelect={() => {}} // TODO: Implement iteration selection
                />

                <AgentCard
                  title="Learnings Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.LEARNINGS) : ''}
                  sentPrompt=""
                  isLoading={status === ProcessStatus.LEARNING}
                  agent={AgentName.LEARNINGS}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.LEARNINGS)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.LEARNINGS)}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.LEARNINGS)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.LEARNINGS)}
                  onIterationSelect={() => {}}
                />

                <AgentCard
                  title="Opportunity Analysis Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.OPPORTUNITY_ANALYSIS) : ''}
                  sentPrompt=""
                  isLoading={status === ProcessStatus.OPPORTUNITY_ANALYZING}
                  agent={AgentName.OPPORTUNITY_ANALYSIS}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.OPPORTUNITY_ANALYSIS)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.OPPORTUNITY_ANALYSIS)}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.OPPORTUNITY_ANALYSIS)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.OPPORTUNITY_ANALYSIS)}
                  onIterationSelect={() => {}}
                />

                <AgentCard
                  title="Proposer Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.PROPOSER) : ''}
                  sentPrompt=""
                  isLoading={status === ProcessStatus.PROPOSING}
                  agent={AgentName.PROPOSER}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.PROPOSER)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.PROPOSER)}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.PROPOSER)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.PROPOSER)}
                  onIterationSelect={() => {}}
                />

                <AgentCard
                  title="Novelty Checker Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.NOVELTY_CHECKER) : ''}
                  sentPrompt=""
                  isLoading={status === ProcessStatus.CHECKING_NOVELTY}
                  agent={AgentName.NOVELTY_CHECKER}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.NOVELTY_CHECKER)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.NOVELTY_CHECKER)}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.NOVELTY_CHECKER)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.NOVELTY_CHECKER)}
                  onIterationSelect={() => {}}
                />
              </div>

              <div className="grid grid-cols-1">
                <AgentCard
                  title="Aggregator Agent"
                  content={workflowState ? getAgentContent(workflowState, AgentName.AGGREGATOR) : ''}
                  sentPrompt=""
                  isLoading={status === ProcessStatus.AGGREGATING}
                  agent={AgentName.AGGREGATOR}
                  onEditPrompt={() => handleOpenPromptEditor(AgentName.AGGREGATOR)}
                  onViewTaskProfile={() => handleViewTaskProfile(AgentName.AGGREGATOR)}
                  currentIteration={getAgentIterationCount(workflowState, AgentName.AGGREGATOR)}
                  totalIterations={getAgentIterationCount(workflowState, AgentName.AGGREGATOR)}
                  onIterationSelect={() => {}}
                />
              </div>

              {status === ProcessStatus.FEEDBACK && (
                <FeedbackPanel
                  feedback={feedback}
                  setFeedback={setFeedback}
                  onRevision={handleRevision}
                  isLoading={isLoading}
                />
              )}

              {(stylizedFacts.length > 0 || stylizedQuestions.length > 0 || isLoading) && (
                <ResultsPanel
                  facts={stylizedFacts}
                  questions={stylizedQuestions}
                  isLoadingFacts={status === ProcessStatus.GENERATING_FACTS}
                  isLoadingQuestions={status === ProcessStatus.GENERATING_QUESTIONS}
                />
              )}
            </div>
          </main>
        </div>

        {/* Modals and Components */}
        <PromptEditorModal
          isOpen={isPromptEditorOpen}
          onClose={handleClosePromptEditor}
          prompts={agentPrompts}
          onSave={setAgentPrompts}
          llmOptions={llmOptions}
          initialAgent={editingAgent}
        />

        <WorkflowTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={handleSelectTemplate}
          currentPrompts={agentPrompts}
          currentSettings={{
            modelProvider,
            localLlmUrl,
            enableWebSearch,
            enableLocalSearch,
            theme,
            iteration,
            completedSteps: workflowState?.completedSteps || []
          }}
          templates={templates}
          onCreateTemplate={handleCreateTemplate}
          onDeleteTemplate={deleteTemplate}
        />

        <KeyboardShortcuts
          onStart={handleStart}
          onRevision={handleRevision}
          onExport={handleExportRun}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          isLoading={isLoading}
          hasCompletedRun={status === ProcessStatus.FEEDBACK || (stylizedFacts.length > 0 || stylizedQuestions.length > 0)}
          hasFeedback={feedback.trim().length > 0}
        />

        {showTaskProfileDialog && selectedAgentProfile && (
          <TaskProfileDialog
            isOpen={showTaskProfileDialog}
            onClose={handleCloseTaskProfileDialog}
            agentName={selectedAgentProfile.agentName}
            taskProfile={selectedAgentProfile.profile}
            agentDescription={selectedAgentProfile.profile.description}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
