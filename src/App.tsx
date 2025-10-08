import React, { useState, useEffect } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts, ToolResults } from './types';
import { generateContentStream, generateFacts, generateQuestions } from './services/geminiService';
import { checkToolServiceHealth } from './services/toolService';
import { initialPrompts } from './constants/prompts';
import ControlPanel from './components/ControlPanel';
import StatusBar from './components/StatusBar';
import AgentCard from './components/AgentCard';
import AgentGrid from './components/AgentGrid';
import FeedbackPanel from './components/FeedbackPanel';
import ResultsPanel from './components/ResultsPanel';
import PromptEditorModal from './components/PromptEditorModal';
import ErrorBoundary from './components/ErrorBoundary';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import WorkflowTemplateModal from './components/WorkflowTemplateModal';
import TaskProfileDialog from './components/TaskProfileDialog';
import MemoryVisualization from './components/MemoryVisualization';
import MemoryTestApp from './components/MemoryTestApp';
import { getAgentTaskProfile } from './components/agentTaskProfiles';
import { useWorkflowTemplates } from './hooks/useWorkflowTemplates';
import { useTheme } from './hooks/useTheme';
import { useSessionManagement } from './hooks/useSessionManagement';
import { WorkflowTemplate } from './types/workflowTemplates';
import { SunIcon, MoonIcon, HumanIcon, LoopIcon, SparklesIcon, AgentIcon } from './components/Icons';
import { WorkflowState } from './types/workflow_LG';
import { createInitialState, validateWorkflowState, sanitizeWorkflowState } from './services/workflowService_LG';
// Browser-compatible LangGraph service
import { langGraphService, WorkflowRunOptions } from './services/langgraphService_LG';
import { getAgentContent } from './services/workflowService_LG';

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
  const [modelProvider, setModelProvider] = useState<ModelProvider>(ModelProvider.TRANSFORMERS);
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434/v1/chat/completions');
  const [toolServiceAvailable, setToolServiceAvailable] = useState<boolean>(false);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [enableLocalSearch, setEnableLocalSearch] = useState<boolean>(true);

  // Custom prompts persistence
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

  // Enhanced setAgentPrompts that saves to localStorage
  const setAgentPromptsWithPersistence = (newPrompts: AgentPrompts) => {
    setAgentPrompts(newPrompts);
    saveCustomPrompts(newPrompts);
  };

  // UI state
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(loadCustomPrompts);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showTaskProfileDialog, setShowTaskProfileDialog] = useState<boolean>(false);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<{ agentName: AgentName; profile: any } | null>(null);

  // Session management state
  const [showMemoryTestApp, setShowMemoryTestApp] = useState<boolean>(false);

  // Theme
  const { theme, toggleTheme } = useTheme();

  // Session management
  const sessionManagement = useSessionManagement(
    {
      onTopicChange: setTopic,
      onModelProviderChange: setModelProvider,
      onWorkflowStateChange: setWorkflowState,
      onCurrentThreadIdChange: setCurrentThreadId,
      onStylizedFactsChange: setStylizedFacts,
      onStylizedQuestionsChange: setStylizedQuestions,
      onStatusChange: setStatus,
    },
    topic,
    iteration,
    modelProvider,
    workflowState,
    currentThreadId,
    stylizedFacts,
    stylizedQuestions,
    status
  );

  // Template management
  const { templates, createTemplate, trackUsage, deleteTemplate, updateTemplate } = useWorkflowTemplates();

  // Helper functions for agent iterations
  const getCurrentIteration = (agentName: AgentName): number => {
    return selectedIterations[agentName] || 0;
  };

  const getAgentIterationCount = (agentName: AgentName): number => {
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

  const setIterationForAgent = (agentName: AgentName, iteration: number) => {
    setSelectedIterations(prev => ({
      ...prev,
      [agentName]: Math.max(0, Math.min(iteration, getAgentIterationCount(agentName) - 1))
    }));
  };

  const getAgentContent = (agentName: AgentName): string => {
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

  // Create bound functions for iteration selection
  const createIterationSelector = (agentName: AgentName) => (iteration: number) => {
    setIterationForAgent(agentName, iteration);
  };

  // Selective restart functionality
  const [restartChoice, setRestartChoice] = useState<'continue' | 'search' | 'proposal'>('continue');

  // Agent iteration navigation
  const [selectedIterations, setSelectedIterations] = useState<Record<AgentName, number>>({
    [AgentName.SEARCH]: 0,
    [AgentName.LEARNINGS]: 0,
    [AgentName.OPPORTUNITY_ANALYSIS]: 0,
    [AgentName.PROPOSER]: 0,
    [AgentName.NOVELTY_CHECKER]: 0,
    [AgentName.AGGREGATOR]: 0
  });

  // Sent prompt tracking for LangGraph
  const [sentPrompts, setSentPrompts] = useState<Record<AgentName, string>>({
    [AgentName.SEARCH]: '',
    [AgentName.LEARNINGS]: '',
    [AgentName.OPPORTUNITY_ANALYSIS]: '',
    [AgentName.PROPOSER]: '',
    [AgentName.NOVELTY_CHECKER]: '',
    [AgentName.AGGREGATOR]: ''
  });

  // Workflow interruption
  const [isInterruptRequested, setIsInterruptRequested] = useState(false);

  // Handle workflow interruption
  const handleInterruptWorkflow = () => {
    console.log('🛑 Interrupt requested by user');
    setIsInterruptRequested(true);
    setIsWorkflowRunning(false);
    setStatus(ProcessStatus.INTERRUPTING);

    // Reset interrupt flag after a short delay
    setTimeout(() => {
      setIsInterruptRequested(false);
      setStatus(ProcessStatus.INTERRUPTED);
      console.log('✅ Workflow interrupt completed');
    }, 1000);
  };



  // Reset sent prompts when starting new workflow
  const resetSentPrompts = () => {
    setSentPrompts({
      [AgentName.SEARCH]: '',
      [AgentName.LEARNINGS]: '',
      [AgentName.OPPORTUNITY_ANALYSIS]: '',
      [AgentName.PROPOSER]: '',
      [AgentName.NOVELTY_CHECKER]: '',
      [AgentName.AGGREGATOR]: ''
    });
  };


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
  const runWorkflow_LG = async (currentFeedback = '', startFromStep: ProcessStatus = ProcessStatus.SEARCHING) => {
    if (!topic.trim()) {
      setError("Please enter a topic to start the analysis.");
      return;
    }

    // Reset interrupt flag when starting new workflow
    setIsInterruptRequested(false);
    setIsWorkflowRunning(true);
    setError(null);

    try {
      const threadId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentThreadId(threadId);

      // Check for interrupt immediately after setup
      if (isInterruptRequested) {
        console.log('🛑 Workflow interrupted before starting');
        setIsWorkflowRunning(false);
        setStatus(ProcessStatus.INTERRUPTED);
        return;
      }

      console.log(`🚀 Starting LangGraph workflow for topic: ${topic} from step: ${startFromStep}`);

      // Create initial state based on startFromStep
      let initialState = createInitialState(topic, iteration);

      if (startFromStep === ProcessStatus.OPPORTUNITY_ANALYZING && workflowState) {
        // When restarting from proposal, preserve Search and Learnings from current state
        initialState = {
          ...initialState,
          searchResults: workflowState.searchResults,
          learnings: workflowState.learnings,
          completedSteps: [ProcessStatus.SEARCHING, ProcessStatus.LEARNING],
          currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
          feedback: currentFeedback
        };
      } else if (startFromStep === ProcessStatus.SEARCHING && workflowState && currentFeedback) {
        // When restarting from search with feedback, preserve existing search results and learnings
        initialState = {
          ...initialState,
          searchResults: workflowState.searchResults, // Keep existing search results
          learnings: workflowState.learnings, // Keep existing learnings
          completedSteps: [], // Start fresh from search
          currentStep: ProcessStatus.SEARCHING,
          feedback: currentFeedback
        };
      } else if (currentFeedback) {
        // Include feedback for revision workflows
        initialState = {
          ...initialState,
          feedback: currentFeedback
        };
      }

      // Set up streaming callback with validation and interrupt checking
      const onChunk = (chunk: Partial<WorkflowState>) => {
        // Check for interrupt request
        if (isInterruptRequested) {
                  console.log('🛑 Streaming interrupted due to user request');
        setIsWorkflowRunning(false);
        setStatus(ProcessStatus.INTERRUPTED);
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

        // Update status if provided in chunk
        if (chunk.currentStep) {
          setStatus(chunk.currentStep);
        }
      };

      const options: WorkflowRunOptions = {
        threadId,
        onChunk,
        onPrompt: (agentName: string, prompt: string) => {
          // Track the sent prompt for the agent
          setSentPrompts(prev => ({
            ...prev,
            [agentName as AgentName]: prompt
          }));
        },
        config: {
          recursionLimit: 50,
          llmOptions: llmOptions,
        },
        prompts: agentPrompts,
      };

      const finalState = await langGraphService.startWorkflow(topic, { ...options, initialState });

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

    // Reset interrupt flag when starting new revision
    setIsInterruptRequested(false);
    setIsWorkflowRunning(true);
    setError(null);

    // Reset sent prompts for the new revision
    resetSentPrompts();

    try {
      // Handle different restart choices
      if (restartChoice === 'search') {
        // Restart from Search - preserve existing results and add new ones
        console.log('🔄 Restarting from Search (preserving existing search results and learnings)');

        // Clear current results but preserve existing data for history
        if (workflowState) {
          setWorkflowState({
            ...workflowState,
            opportunityAnalyses: [], // Clear downstream results
            proposals: [],
            noveltyChecks: [],
            aggregations: [],
            completedSteps: workflowState.completedSteps.filter(step =>
              step === ProcessStatus.SEARCHING || step === ProcessStatus.LEARNING
            ),
            currentStep: ProcessStatus.SEARCHING
          });
        }

        setIteration(prev => prev + 1);
        await runWorkflow_LG(feedback, ProcessStatus.SEARCHING);
      } else if (restartChoice === 'proposal') {
        // Restart from Proposal - clear downstream results but keep Search and Learnings
        console.log('🔄 Restarting from Proposal (keeping Search + Learnings)');

        // Clear downstream results but keep history in workflow state
        if (workflowState) {
          setWorkflowState({
            ...workflowState,
            opportunityAnalyses: [], // Clear current but keep history
            proposals: [],
            noveltyChecks: [],
            aggregations: [],
            completedSteps: workflowState.completedSteps.filter(step =>
              step === ProcessStatus.SEARCHING || step === ProcessStatus.LEARNING
            ),
            currentStep: ProcessStatus.OPPORTUNITY_ANALYZING
          });
        }

        setIteration(prev => prev + 1);
        await runWorkflow_LG(feedback, ProcessStatus.OPPORTUNITY_ANALYZING);
      } else {
        // Continue normally - use existing workflow if available
        console.log('➡️ Continuing normally with feedback');

        if (currentThreadId && workflowState) {
          // Continue existing workflow
          const onChunk = (chunk: Partial<WorkflowState>) => {
            console.log('🧠 Workflow Chunk:', chunk);
            setWorkflowState(prev => {
              const newState = prev ? { ...prev, ...chunk } : chunk as WorkflowState;
              console.log('🧠 Updated Workflow State Memory:', {
                memoryNotes: newState.memoryNotes?.length,
                memoryLinks: newState.memoryLinks?.length,
                memoryStats: newState.memoryStats
              });
              return newState;
            });
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
        } else {
          // No existing workflow, start fresh
          await runWorkflow_LG(feedback);
        }
      }

      setStatus(ProcessStatus.FEEDBACK);

      console.log('✅ LangGraph workflow revision completed successfully');

    } catch (error) {
      console.error('❌ LangGraph workflow revision failed:', error);
      const errorMessage = `Error during revision: ${error instanceof Error ? error.message : String(error)}`;
      setError(errorMessage);
      setStatus(ProcessStatus.IDLE);
    } finally {
      setIsWorkflowRunning(false);
      // Reset restart choice
      setRestartChoice('continue');
    }
  };

  // Reset iteration selections when starting new workflow
  const resetIterationSelections = () => {
    setSelectedIterations({
      [AgentName.SEARCH]: 0,
      [AgentName.LEARNINGS]: 0,
      [AgentName.OPPORTUNITY_ANALYSIS]: 0,
      [AgentName.PROPOSER]: 0,
      [AgentName.NOVELTY_CHECKER]: 0,
      [AgentName.AGGREGATOR]: 0
    });
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
        modelProvider === ModelProvider.OLLAMA
          ? { provider: modelProvider, url: ollamaUrl }
          : { provider: modelProvider },
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
        modelProvider === ModelProvider.OLLAMA
          ? { provider: modelProvider, url: ollamaUrl }
          : { provider: modelProvider },
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
    resetIterationSelections(); // Reset iteration selections for new workflow
    resetSentPrompts(); // Reset sent prompts for new workflow
    runWorkflow_LG('', ProcessStatus.SEARCHING);
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
    setAgentPromptsWithPersistence(template.agentPrompts);
    setModelProvider(template.modelProvider);
    setEnableWebSearch(template.enableWebSearch);
    setEnableLocalSearch(template.enableLocalSearch);
    // Note: Theme is managed by useTheme hook, template theme application would need different approach
    setIteration(template.maxIterations);
    setShowTemplateModal(false);
    console.log(`✅ Applied template: ${template.name}`);
  };

  const handleCreateTemplate = (name: string, description: string, category: WorkflowTemplate['category']) => {
    const templateId = createTemplate(name, description, category, {
      agentPrompts, // This will include the current custom prompts
      modelProvider,
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
${getAgentContent(AgentName.SEARCH) || 'No search results'}

---

### Learnings Agent
**Output:**
${getAgentContent(AgentName.LEARNINGS) || 'No learnings generated'}

---

### Opportunity Analysis Agent
**Output:**
${getAgentContent(AgentName.OPPORTUNITY_ANALYSIS) || 'No opportunity analysis'}

---

### Proposer Agent
**Output:**
${getAgentContent(AgentName.PROPOSER) || 'No proposal generated'}

---

### Novelty Checker Agent
**Output:**
${getAgentContent(AgentName.NOVELTY_CHECKER) || 'No novelty check'}

---

### Aggregator Agent
**Output:**
${getAgentContent(AgentName.AGGREGATOR) || 'No final report'}

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
  const llmOptions: LlmOptions = modelProvider === ModelProvider.OLLAMA
    ? { provider: modelProvider, url: ollamaUrl }
    : { provider: modelProvider };

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
                onClick={() => setShowMemoryTestApp(true)}
                className="p-2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
                title="Open Memory Test Lab"
              >
                🧠
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'light' ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <ControlPanel
                topic={topic}
                setTopic={setTopic}
                files={files}
                setFiles={setFiles}
                onStart={handleStart}
                onInterrupt={handleInterruptWorkflow}
                onExport={handleExportRun}
                onExportJson={handleExportJson}
                onCopyLink={sessionManagement.handleCopyLinkToSession}
                onOpenTemplateModal={() => setShowTemplateModal(true)}
                isLoading={isLoading}
                iteration={iteration}
                modelProvider={modelProvider}
                setModelProvider={setModelProvider}
                ollamaUrl={ollamaUrl}
                setOllamaUrl={setOllamaUrl}
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

              <AgentGrid
                agentConfigs={[
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
                ]}
                workflowState={workflowState}
                toolServiceAvailable={toolServiceAvailable}
                status={status}
                selectedIterations={selectedIterations}
                sentPrompts={sentPrompts}
                onEditPrompt={handleOpenPromptEditor}
                onViewTaskProfile={handleViewTaskProfile}
                onIterationSelect={(agentName, iteration) => setIterationForAgent(agentName, iteration)}
                getAgentContent={getAgentContent}
                getAgentIterationCount={getAgentIterationCount}
              />

              {/* A-Mem Memory Visualization */}
              {workflowState?.memoryNotes && workflowState.memoryNotes.length > 0 && (
                <MemoryVisualization
                  memoryNotes={workflowState.memoryNotes}
                  memoryLinks={workflowState.memoryLinks || []}
                  memoryQuality={workflowState.memoryStats?.memoryQuality || 0}
                />
              )}

              {status === ProcessStatus.FEEDBACK && (
                <FeedbackPanel
                  feedback={feedback}
                  setFeedback={setFeedback}
                  onRevision={handleRevision_LG}
                  isLoading={isLoading}
                  restartChoice={restartChoice}
                  setRestartChoice={setRestartChoice}
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
            modelProvider,
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
          onToggleTheme={toggleTheme}
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

        {/* Memory Test App Modal */}
        {showMemoryTestApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full h-full max-w-7xl mx-4 my-4 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  🧠 A-Mem Memory Test Lab
                </h2>
                <button
                  onClick={() => setShowMemoryTestApp(false)}
                  className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                  title="Close Memory Test Lab"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <MemoryTestApp />
              </div>
            </div>
          </div>
        )}
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
