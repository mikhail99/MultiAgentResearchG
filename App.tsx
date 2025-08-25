import React, { useState, useEffect } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts, ToolResults, AgentStates } from './types';
import { generateContentStream, generateFacts, generateQuestions } from './services/geminiService';
import { executeResearcherTools, formatToolResultsForPrompt, checkToolServiceHealth } from './services/toolService';
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


export default function App() {
  const [topic, setTopic] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [iteration, setIteration] = useState<number>(1);
  const [feedback, setFeedback] = useState<string>('');
  
  const [modelProvider, setModelProvider] = useState<ModelProvider>(ModelProvider.LOCAL);
  const [localLlmUrl, setLocalLlmUrl] = useState<string>('http://localhost:11434/v1/chat/completions');
  
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(initialPrompts);

  // Agent states with iteration support
  const [agentStates, setAgentStates] = useState<AgentStates>({
    searchResults: [],
    learnings: [],
    gapAnalyses: [],
    proposals: [],
    noveltyChecks: [],
    aggregations: [],
    userFeedback: []
  });

  // Legacy sent prompts (single values, not iterated)
  const [researcherSentPrompt, setResearcherSentPrompt] = useState<string>('');
  const [generatorSentPrompt, setGeneratorSentPrompt] = useState<string>('');
  const [evaluatorSentPrompt, setEvaluatorSentPrompt] = useState<string>('');
  const [proposerSentPrompt, setProposerSentPrompt] = useState<string>('');
  const [noveltyCheckerSentPrompt, setNoveltyCheckerSentPrompt] = useState<string>('');
  const [aggregatorSentPrompt, setAggregatorSentPrompt] = useState<string>('');

  const [stylizedFacts, setStylizedFacts] = useState<StylizedFact[]>([]);
  const [stylizedQuestions, setStylizedQuestions] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState<boolean>(false);
  const [showLinkToast, setShowLinkToast] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<ProcessStatus[]>([]);
  const [showRestartConfirm, setShowRestartConfirm] = useState<boolean>(false);
  const [restartFromStep, setRestartFromStep] = useState<ProcessStatus | null>(null);

  // Template-related state
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  // Tool-related state
  const [toolResults, setToolResults] = useState<ToolResults | null>(null);
  const [toolServiceAvailable, setToolServiceAvailable] = useState<boolean>(false);
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [enableLocalSearch, setEnableLocalSearch] = useState<boolean>(true);

  // Task Profile Dialog state
  const [showTaskProfileDialog, setShowTaskProfileDialog] = useState<boolean>(false);
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<{ agentName: AgentName; profile: any } | null>(null);

  // Gap Analysis restart tracking
  const [searchRestartCount, setSearchRestartCount] = useState<number>(0);
  const [maxSearchRestarts] = useState<number>(3);

  // Iteration selection for each agent
  const [selectedIterations, setSelectedIterations] = useState<Record<AgentName, number>>({
    [AgentName.SEARCH]: 0,
    [AgentName.LEARNINGS]: 0,
    [AgentName.GAP_ANALYSIS]: 0,
    [AgentName.PROPOSER]: 0,
    [AgentName.NOVELTY_CHECKER]: 0,
    [AgentName.AGGREGATOR]: 0
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Ensure Tailwind's class-based dark mode toggles reliably
    root.classList.toggle('dark', theme === 'dark');
    // Help native form controls match theme in some browsers
    (root as HTMLElement).style.colorScheme = theme;
    // Also toggle on body for components that might scope styles there
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Template management
  const {
    templates,
    isLoading: templatesLoading,
    createTemplate,
    trackUsage,
    deleteTemplate,
    updateTemplate
  } = useWorkflowTemplates();

  // Check tool service health on load
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

  // --- Autosave / Restore last run ---
  type SavedRun = {
    timestamp: string;
    topic: string;
    iteration: number;
    modelProvider: ModelProvider;
    researchSummary: string;
    researcherSentPrompt: string;
    generatedAnalysis: string;
    generatorSentPrompt: string;
    critique: string;
    evaluatorSentPrompt: string;
    proposal: string;
    proposerSentPrompt: string;
    noveltyAssessment: string;
    noveltyCheckerSentPrompt: string;
    finalReport: string;
    aggregatorSentPrompt: string;
    stylizedFacts: StylizedFact[];
    stylizedQuestions: string[];
    completedSteps: ProcessStatus[];
    toolResults?: ToolResults;
  };

  const LAST_RUN_KEY = 'mars:lastRun';

  const saveLastRun = () => {
    try {
      const payload: SavedRun = {
        timestamp: new Date().toISOString(),
        topic,
        iteration,
        modelProvider,
        researchSummary: agentStates.searchResults.join('\n\n'),
        researcherSentPrompt,
        generatedAnalysis: agentStates.learnings[agentStates.learnings.length - 1] || '',
        generatorSentPrompt,
        critique: agentStates.gapAnalyses[agentStates.gapAnalyses.length - 1] || '',
        evaluatorSentPrompt,
        proposal: agentStates.proposals[agentStates.proposals.length - 1] || '',
        proposerSentPrompt,
        noveltyAssessment: agentStates.noveltyChecks[agentStates.noveltyChecks.length - 1] || '',
        noveltyCheckerSentPrompt,
        finalReport: agentStates.aggregations[agentStates.aggregations.length - 1] || '',
        aggregatorSentPrompt,
        stylizedFacts,
        stylizedQuestions,
        completedSteps,
        toolResults,
      };
      console.log('💾 Saving data:', {
        topic,
        hasResearchSummary: !!payload.researchSummary,
        hasGeneratedAnalysis: !!payload.generatedAnalysis,
        completedSteps: payload.completedSteps
      });
      localStorage.setItem(LAST_RUN_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  };

  const tryGetSavedRun = (): SavedRun | null => {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
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
  };

  // Helper function to determine completed steps based on current state (for backward compatibility)
  const deriveCompletedSteps = (data: Partial<SavedRun>): ProcessStatus[] => {
    const steps: ProcessStatus[] = [];
    if (data.researchSummary) steps.push(ProcessStatus.SEARCHING);
    if (data.generatedAnalysis) steps.push(ProcessStatus.LEARNING);
    if (data.critique) steps.push(ProcessStatus.GAP_ANALYZING);
    if (data.proposal) steps.push(ProcessStatus.PROPOSING);
    if (data.noveltyAssessment) steps.push(ProcessStatus.CHECKING_NOVELTY);
    if (data.finalReport) steps.push(ProcessStatus.AGGREGATING);
    if (data.stylizedFacts && data.stylizedFacts.length > 0) steps.push(ProcessStatus.GENERATING_FACTS);
    if (data.stylizedQuestions && data.stylizedQuestions.length > 0) steps.push(ProcessStatus.GENERATING_QUESTIONS);
    if (steps.length > 0) steps.push(ProcessStatus.FEEDBACK);
    return steps;
  };

  const isOutputsEmpty = () => (
    agentStates.searchResults.length === 0 &&
    agentStates.learnings.length === 0 &&
    agentStates.gapAnalyses.length === 0 &&
    agentStates.proposals.length === 0 &&
    agentStates.noveltyChecks.length === 0 &&
    agentStates.aggregations.length === 0 &&
    stylizedFacts.length === 0 &&
    stylizedQuestions.length === 0
  );

  useEffect(() => {
    // If a share link is provided, restore from URL hash
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      try {
        const encoded = window.location.hash.substring(3);
        const json = decodeURIComponent(encoded);
        const data = JSON.parse(json) as SavedRun & { v?: number };
        setTopic(data.topic || '');
        setIteration(data.iteration || 1);
        setModelProvider(data.modelProvider || ModelProvider.LOCAL);

        // Restore agent states from saved data
        setAgentStates({
          searchResults: data.researchSummary ? [data.researchSummary] : [],
          learnings: data.generatedAnalysis ? [data.generatedAnalysis] : [],
          gapAnalyses: data.critique ? [data.critique] : [],
          proposals: data.proposal ? [data.proposal] : [],
          noveltyChecks: data.noveltyAssessment ? [data.noveltyAssessment] : [],
          aggregations: data.finalReport ? [data.finalReport] : [],
          userFeedback: []
        });

        // Restore legacy sent prompts
        setResearcherSentPrompt(data.researcherSentPrompt || '');
        setGeneratorSentPrompt(data.generatorSentPrompt || '');
        setEvaluatorSentPrompt(data.evaluatorSentPrompt || '');
        setProposerSentPrompt(data.proposerSentPrompt || '');
        setNoveltyCheckerSentPrompt(data.noveltyCheckerSentPrompt || '');
        setAggregatorSentPrompt(data.aggregatorSentPrompt || '');
        setStylizedFacts(data.stylizedFacts || []);
        setStylizedQuestions(data.stylizedQuestions || []);
        setCompletedSteps(data.completedSteps || deriveCompletedSteps(data));
        setToolResults(data.toolResults || null);
        setStatus(ProcessStatus.FEEDBACK);
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
    const outputsEmpty = isOutputsEmpty();

    console.log('🔄 Auto-restore check:', {
      hasSaved,
      topic: !!topic,
      outputsEmpty,
      savedDataKeys: savedData ? Object.keys(savedData) : null
    });

    if (hasSaved && !topic && outputsEmpty) {
      console.log('📋 Showing restore toast');
      setShowRestoreToast(true);
    } else {
      console.log('📋 Not showing restore toast:', {
        hasSaved,
        hasTopic: !!topic,
        outputsEmpty
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Persist once a run completes
    if (status === ProcessStatus.FEEDBACK) {
      saveLastRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const restoreLastRun = () => {
    const data = tryGetSavedRun();
    if (!data) return;

    setTopic(data.topic);
    setIteration(data.iteration);
    setModelProvider(data.modelProvider);

    // Restore agent states from saved data
    setAgentStates({
      searchResults: data.researchSummary ? [data.researchSummary] : [],
      learnings: data.generatedAnalysis ? [data.generatedAnalysis] : [],
      gapAnalyses: data.critique ? [data.critique] : [],
      proposals: data.proposal ? [data.proposal] : [],
      noveltyChecks: data.noveltyAssessment ? [data.noveltyAssessment] : [],
      aggregations: data.finalReport ? [data.finalReport] : [],
      userFeedback: []
    });

    // Restore legacy sent prompts
    setResearcherSentPrompt(data.researcherSentPrompt || '');
    setGeneratorSentPrompt(data.generatorSentPrompt || '');
    setEvaluatorSentPrompt(data.evaluatorSentPrompt || '');
    setProposerSentPrompt(data.proposerSentPrompt || '');
    setNoveltyCheckerSentPrompt(data.noveltyCheckerSentPrompt || '');
    setAggregatorSentPrompt(data.aggregatorSentPrompt || '');

    setStylizedFacts(data.stylizedFacts || []);
    setStylizedQuestions(data.stylizedQuestions || []);
    setCompletedSteps(data.completedSteps || deriveCompletedSteps(data));
    setToolResults(data.toolResults || null);
    setStatus(ProcessStatus.FEEDBACK);
    setShowRestoreToast(false);
  };

  const dismissRestoreToast = () => setShowRestoreToast(false);

  const clearOutputs = () => {
    // Reset agent states
    setAgentStates({
      searchResults: [],
      learnings: [],
      gapAnalyses: [],
      proposals: [],
      noveltyChecks: [],
      aggregations: [],
      userFeedback: []
    });

    // Reset legacy sent prompts
    setResearcherSentPrompt('');
    setGeneratorSentPrompt('');
    setEvaluatorSentPrompt('');
    setProposerSentPrompt('');
    setNoveltyCheckerSentPrompt('');
    setAggregatorSentPrompt('');

    // Reset other state
    setStylizedFacts([]);
    setStylizedQuestions([]);
    setCompletedSteps([]);
    setToolResults(null);
    setError(null);
    setSearchRestartCount(0); // Reset restart count

    // Reset iteration selections
    setSelectedIterations({
      [AgentName.SEARCH]: 0,
      [AgentName.LEARNINGS]: 0,
      [AgentName.GAP_ANALYSIS]: 0,
      [AgentName.PROPOSER]: 0,
      [AgentName.NOVELTY_CHECKER]: 0,
      [AgentName.AGGREGATOR]: 0
    });
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

  // Helper functions for agent states and iterations
  const getCurrentIteration = (agentName: AgentName): number => {
    return selectedIterations[agentName] || 0;
  };

  const getAgentContent = (agentName: AgentName): string => {
    const iteration = getCurrentIteration(agentName);
    switch (agentName) {
      case AgentName.SEARCH:
        return agentStates.searchResults[iteration] || '';
      case AgentName.LEARNINGS:
        return agentStates.learnings[iteration] || '';
      case AgentName.GAP_ANALYSIS:
        return agentStates.gapAnalyses[iteration] || '';
      case AgentName.PROPOSER:
        return agentStates.proposals[iteration] || '';
      case AgentName.NOVELTY_CHECKER:
        return agentStates.noveltyChecks[iteration] || '';
      case AgentName.AGGREGATOR:
        return agentStates.aggregations[iteration] || '';
      default:
        return '';
    }
  };

  const getAgentIterationCount = (agentName: AgentName): number => {
    const count = (() => {
      switch (agentName) {
        case AgentName.SEARCH:
          return agentStates.searchResults.length;
        case AgentName.LEARNINGS:
          return agentStates.learnings.length;
        case AgentName.GAP_ANALYSIS:
          return agentStates.gapAnalyses.length;
        case AgentName.PROPOSER:
          return agentStates.proposals.length;
        case AgentName.NOVELTY_CHECKER:
          return agentStates.noveltyChecks.length;
        case AgentName.AGGREGATOR:
          return agentStates.aggregations.length;
        default:
          return 0;
      }
    })();

    console.log(`🔢 ${agentName} iteration count: ${count}`);
    return count;
  };

  const setIterationForAgent = (agentName: AgentName, iteration: number) => {
    setSelectedIterations(prev => ({
      ...prev,
      [agentName]: Math.max(0, Math.min(iteration, getAgentIterationCount(agentName) - 1))
    }));
  };
  
  const runWorkflow = async (currentFeedback = '', startFromStep: ProcessStatus = ProcessStatus.SEARCHING) => {
    console.log('🚀 Starting workflow from step:', startFromStep);
    console.log('📊 Current agentStates:', {
      searchResults: agentStates.searchResults.length,
      learnings: agentStates.learnings.length,
      gapAnalyses: agentStates.gapAnalyses.length,
      proposals: agentStates.proposals.length,
      noveltyChecks: agentStates.noveltyChecks.length,
      aggregations: agentStates.aggregations.length
    });

    // Prevent concurrent execution
    if (status !== ProcessStatus.IDLE && status !== ProcessStatus.FEEDBACK) {
      console.log('⚠️ Workflow already running, current status:', status);
      return;
    }

    const fileNames = files.map(f => f.name).join(', ') || 'No files provided';
    const fileContents = (await Promise.all(files.map(readFileContent))).join('\n\n---\n\n');

    const llmOptions: LlmOptions = { provider: modelProvider, url: localLlmUrl };
    
    const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 250));

    // Define step order for comparisons
    const stepOrder = [
      ProcessStatus.SEARCHING,
      ProcessStatus.LEARNING,
      ProcessStatus.GAP_ANALYZING,
      ProcessStatus.PROPOSING,
      ProcessStatus.CHECKING_NOVELTY,
      ProcessStatus.AGGREGATING,
      ProcessStatus.GENERATING_FACTS,
      ProcessStatus.GENERATING_QUESTIONS,
      ProcessStatus.FEEDBACK
    ];

    const getStepIndex = (step: ProcessStatus) => stepOrder.indexOf(step);
    const shouldRunStep = (step: ProcessStatus) => getStepIndex(step) >= getStepIndex(startFromStep);

    // Clear completed steps when starting fresh
    if (startFromStep === ProcessStatus.SEARCHING) {
      setCompletedSteps([]);
    }

    try {
      // Ensure we're in a running state
      setStatus(startFromStep);

      // 1. Search (with tools)
      console.log('🔍 Checking Search step:', shouldRunStep(ProcessStatus.SEARCHING));
      if (shouldRunStep(ProcessStatus.SEARCHING)) {
        console.log('🔎 Executing Search step...');
        setStatus(ProcessStatus.SEARCHING);

        // Execute research tools if available
        let toolData = '';
        console.log('🔧 Tool service available:', toolServiceAvailable);
        console.log('🔧 Web search enabled:', enableWebSearch);
        console.log('🔧 Local search enabled:', enableLocalSearch);

        if (toolServiceAvailable) {
          console.log('🔧 Executing research tools...');
          try {
            const results = await executeResearcherTools(topic, {
              includeWebSearch: enableWebSearch,
              includeLocalSearch: enableLocalSearch,
              metadata: { iteration, modelProvider }
            });
            
            // Store tool results
            setToolResults({
              webResults: results.webResults,
              localResults: results.localResults,
              errors: results.errors,
              timestamp: new Date().toISOString()
            });

            console.log('🔧 Tool results received:', {
              hasWebResults: !!results.webResults,
              hasLocalResults: !!results.localResults,
              webResultsLength: results.webResults?.length || 0,
              localResultsLength: results.localResults?.length || 0,
              errorCount: results.errors.length
            });

            // Format for prompt
            toolData = formatToolResultsForPrompt(results.webResults, results.localResults);
            console.log('🔧 Formatted tool data length:', toolData.length);
            console.log('🔧 Formatted tool data preview:', toolData.substring(0, 200) + '...');

            if (results.errors.length > 0) {
              console.warn('⚠️ Tool errors:', results.errors);
            }
          } catch (error) {
            console.error('💥 Tool execution failed:', error);
            toolData = '**Tool Results:** Tools unavailable for this research.\n';
          }
        } else {
          console.log('🔧 Tool service not available, using fallback');
          toolData = '**Tool Results:** Tool service not available. Proceeding with knowledge-based research.\n';
        }
        
        // Build enhanced prompt with tool results
        const researcherPrompt = fillPromptTemplate(agentPrompts[AgentName.SEARCH], { 
          topic,
          tool_results: toolData
        });
        setResearcherSentPrompt(researcherPrompt);
        
        // Start with empty result in the array for streaming
        setAgentStates(prev => ({
          ...prev,
          searchResults: [...prev.searchResults, '']
        }));

        let currentIndex = agentStates.searchResults.length;
        await generateContentStream(AgentName.SEARCH, researcherPrompt, llmOptions, (chunk) => {
          // Update the current result in real-time
          setAgentStates(prev => {
            const newSearchResults = [...prev.searchResults];
            if (newSearchResults.length > currentIndex) {
              newSearchResults[currentIndex] += chunk;
            } else {
              newSearchResults.push(chunk);
              currentIndex = newSearchResults.length - 1;
            }
            return { ...prev, searchResults: newSearchResults };
          });
        });

        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.SEARCHING), ProcessStatus.SEARCHING]);

        console.log('✅ Search step completed, results summary:', {
          totalResults: agentStates.searchResults.length,
          lastResultLength: agentStates.searchResults[agentStates.searchResults.length - 1]?.length || 0
        });

        await simulateDelay();
      }

      // 2. Learnings
      console.log('🔍 Checking Learnings step:', shouldRunStep(ProcessStatus.LEARNING));
      if (shouldRunStep(ProcessStatus.LEARNING)) {
        console.log('📚 Executing Learnings step...');
        setStatus(ProcessStatus.LEARNING);

        // Get current search results with validation
        const currentSearchResults = agentStates.searchResults.join('\n\n');

        console.log('📚 Learnings Agent Debug:', {
          searchResultsCount: agentStates.searchResults.length,
          searchResultsLengths: agentStates.searchResults.map(r => r.length),
          currentSearchResultsLength: currentSearchResults.length,
          lastSearchResult: agentStates.searchResults[agentStates.searchResults.length - 1]?.substring(0, 100) + '...'
        });

        if (!currentSearchResults.trim()) {
          console.warn('⚠️ No search results available for Learnings agent');
          // Create a fallback with the topic to allow the workflow to continue
          const fallbackSearchResults = `Fallback: No search results available. Please research the topic "${topic}" from your knowledge base.`;
          const learningsPrompt = fillPromptTemplate(agentPrompts[AgentName.LEARNINGS], {
            topic,
            researchSummary: fallbackSearchResults,
            fileNames,
            fileContents,
            feedback: currentFeedback
          });
          setGeneratorSentPrompt(learningsPrompt);
        } else {
          const learningsPrompt = fillPromptTemplate(agentPrompts[AgentName.LEARNINGS], {
            topic,
            researchSummary: currentSearchResults,
            fileNames,
            fileContents,
            feedback: currentFeedback
          });
          setGeneratorSentPrompt(learningsPrompt);
        }

        // Build the learnings prompt
        const learningsPrompt = fillPromptTemplate(agentPrompts[AgentName.LEARNINGS], {
          topic,
          researchSummary: currentSearchResults,
          fileNames,
          fileContents,
          feedback: currentFeedback
        });
        setGeneratorSentPrompt(learningsPrompt);

        // Start with empty result in the array for streaming
        setAgentStates(prev => ({
          ...prev,
          learnings: [...prev.learnings, '']
        }));

        let learningsIndex = agentStates.learnings.length;
        await generateContentStream(AgentName.LEARNINGS, learningsPrompt, llmOptions, (chunk) => {
          // Update the current result in real-time
          setAgentStates(prev => {
            const newLearnings = [...prev.learnings];
            if (newLearnings.length > learningsIndex) {
              newLearnings[learningsIndex] += chunk;
            } else {
              newLearnings.push(chunk);
              learningsIndex = newLearnings.length - 1;
            }
            return { ...prev, learnings: newLearnings };
          });
        });

        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING]);
        await simulateDelay();
      }

      // 3. Gap Analysis
      console.log('🔍 Checking Gap Analysis step:', {
        shouldRunStep: shouldRunStep(ProcessStatus.GAP_ANALYZING),
        currentStep: status,
        completedSteps,
        stepOrderIndex: getStepIndex(status),
        gapAnalysisIndex: getStepIndex(ProcessStatus.GAP_ANALYZING)
      });

      if (shouldRunStep(ProcessStatus.GAP_ANALYZING)) {
        console.log('🎯 Starting Gap Analysis step...');
        setStatus(ProcessStatus.GAP_ANALYZING);

        // Get current learnings with validation
        const currentLearnings = agentStates.learnings[agentStates.learnings.length - 1] || '';

        console.log('🔍 Gap Analysis Debug:', {
          learningsLength: agentStates.learnings.length,
          currentLearningsLength: currentLearnings.length,
          lastLearnings: agentStates.learnings[agentStates.learnings.length - 1],
          completedSteps: completedSteps,
          searchResultsCount: agentStates.searchResults.length
        });

        // Determine which learnings to use
        let learningsToUse = currentLearnings;

        if (!currentLearnings.trim()) {
          console.warn('⚠️ No current learnings available for Gap Analysis. Learnings array:', agentStates.learnings);
          console.warn('⚠️ This might indicate the Learnings step didn\'t complete properly.');

          // Try to get learnings from the previous iteration if available
          const previousLearnings = agentStates.learnings.length > 1 ?
            agentStates.learnings[agentStates.learnings.length - 2] : '';

          if (previousLearnings && previousLearnings.trim()) {
            console.log('🔄 Using previous learnings as fallback');
            learningsToUse = previousLearnings;
          } else {
            console.warn('⚠️ No fallback learnings available, creating mock learnings for Gap Analysis');
            // Create mock learnings to allow Gap Analysis to proceed
            learningsToUse = 'Mock learnings: Previous analysis steps did not complete successfully. Please review the search results and provide feedback.';
          }
        }

        console.log('📝 Creating Gap Analysis prompt...');
        const gapAnalysisPrompt = fillPromptTemplate(agentPrompts[AgentName.GAP_ANALYSIS], {
          topic,
          generatedAnalysis: learningsToUse
        });
        console.log('📝 Gap Analysis prompt created, length:', gapAnalysisPrompt.length);
        setEvaluatorSentPrompt(gapAnalysisPrompt);

        // Start with empty result in the array for streaming
        console.log('📝 Initializing Gap Analysis streaming...');
        setAgentStates(prev => ({
          ...prev,
          gapAnalyses: [...prev.gapAnalyses, '']
        }));

        let gapIndex = agentStates.gapAnalyses.length;
        let gapAnalysisResult = '';
        console.log('🤖 Calling generateContentStream for Gap Analysis...');

        try {
          // Add timeout to prevent infinite hanging
          const streamingPromise = generateContentStream(AgentName.GAP_ANALYSIS, gapAnalysisPrompt, llmOptions, (chunk) => {
            console.log('📦 Gap Analysis received chunk, length:', chunk.length);
            gapAnalysisResult += chunk;
            // Update the current result in real-time
            setAgentStates(prev => {
              const newGapAnalyses = [...prev.gapAnalyses];
              if (newGapAnalyses.length > gapIndex) {
                newGapAnalyses[gapIndex] += chunk;
              } else {
                newGapAnalyses.push(chunk);
                gapIndex = newGapAnalyses.length - 1;
              }
              return { ...prev, gapAnalyses: newGapAnalyses };
            });
          });

          // Timeout after 30 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Gap Analysis streaming timeout after 30 seconds')), 30000);
          });

          await Promise.race([streamingPromise, timeoutPromise]);
        } catch (error) {
          console.error('❌ Gap Analysis streaming error:', error);
          // Set a fallback message if streaming fails
          const fallbackResult = `Gap Analysis: Unable to analyze learnings due to streaming error. ${error.message || 'Unknown error'}`;
          setAgentStates(prev => ({
            ...prev,
            gapAnalyses: [...prev.gapAnalyses, fallbackResult]
          }));
          gapAnalysisResult = fallbackResult; // Update the result variable for decision logic
        }

        console.log('✅ Gap Analysis streaming completed, result length:', gapAnalysisResult.length);
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.GAP_ANALYZING), ProcessStatus.GAP_ANALYZING]);
        await simulateDelay();

        // Gap Analysis Decision Logic
        console.log('🎯 Gap Analysis Result:', gapAnalysisResult);

        // More robust restart detection
        const lowerResult = gapAnalysisResult.toLowerCase();
        const restartKeywords = ['research_again', 'restart', 'search again', 'new search', 'insufficient data', 'need more research', 'research more'];

        const shouldRestartSearch = restartKeywords.some(keyword => lowerResult.includes(keyword)) ||
                                   (lowerResult.includes('research') && searchRestartCount < maxSearchRestarts);

        console.log('🎯 Restart Analysis:', {
          gapAnalysisResult: gapAnalysisResult.substring(0, 200) + '...',
          shouldRestartSearch,
          searchRestartCount,
          maxSearchRestarts,
          keywordsFound: restartKeywords.filter(keyword => lowerResult.includes(keyword))
        });

        if (shouldRestartSearch && searchRestartCount < maxSearchRestarts) {
          console.log(`🔄 Gap Analysis recommends restarting search (${searchRestartCount + 1}/${maxSearchRestarts})`);
          setSearchRestartCount(prev => prev + 1);

          // Clear current learnings and gap analysis for restart (but keep in history)
          setAgentStates(prev => ({
            ...prev,
            learnings: [],
            gapAnalyses: []
          }));

          // Restart from searching step
          setTimeout(() => runWorkflow(currentFeedback, ProcessStatus.SEARCHING), 500);
          return; // Exit current workflow execution
        } else if (searchRestartCount >= maxSearchRestarts) {
          console.log(`⚠️ Maximum search restarts (${maxSearchRestarts}) reached, continuing with current results`);
        }
      }

      // 4. Proposer
      if (shouldRunStep(ProcessStatus.PROPOSING)) {
        setStatus(ProcessStatus.PROPOSING);

        // Get current learnings and gap analysis with validation
        const currentLearnings = agentStates.learnings[agentStates.learnings.length - 1] || '';
        const currentGapAnalysis = agentStates.gapAnalyses[agentStates.gapAnalyses.length - 1] || '';

        console.log('💡 Proposer Agent Debug:', {
          learningsCount: agentStates.learnings.length,
          currentLearningsLength: currentLearnings.length,
          gapAnalysesCount: agentStates.gapAnalyses.length,
          currentGapAnalysisLength: currentGapAnalysis.length
        });

        if (!currentLearnings.trim()) {
          console.warn('⚠️ No learnings available for Proposer agent');
        }

        if (!currentGapAnalysis.trim()) {
          console.warn('⚠️ No gap analysis available for Proposer agent');
        }

        const proposerPrompt = fillPromptTemplate(agentPrompts[AgentName.PROPOSER], {
          topic,
          generatedAnalysis: currentLearnings || 'No learnings available',
          critique: currentGapAnalysis || 'No gap analysis available'
        });
        setProposerSentPrompt(proposerPrompt);

        // Start with empty result in the array for streaming
        setAgentStates(prev => ({
          ...prev,
          proposals: [...prev.proposals, '']
        }));

        let proposalIndex = agentStates.proposals.length;
        await generateContentStream(AgentName.PROPOSER, proposerPrompt, llmOptions, (chunk) => {
          // Update the current result in real-time
          setAgentStates(prev => {
            const newProposals = [...prev.proposals];
            if (newProposals.length > proposalIndex) {
              newProposals[proposalIndex] += chunk;
            } else {
              newProposals.push(chunk);
              proposalIndex = newProposals.length - 1;
            }
            return { ...prev, proposals: newProposals };
          });
        });

        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.PROPOSING), ProcessStatus.PROPOSING]);
        await simulateDelay();
      }

      // 5. Novelty Checker
      if (shouldRunStep(ProcessStatus.CHECKING_NOVELTY)) {
        setStatus(ProcessStatus.CHECKING_NOVELTY);

        // Get current proposal
        const currentProposal = agentStates.proposals[agentStates.proposals.length - 1] || '';

        // Execute search tools for novelty checking
        let noveltyToolData = '';
        if (toolServiceAvailable) {
          console.log('🔧 Executing novelty check tools...');
          try {
            const results = await executeResearcherTools(currentProposal, {
              includeWebSearch: enableWebSearch,
              includeLocalSearch: enableLocalSearch,
              metadata: { iteration, modelProvider, purpose: 'novelty_check' }
            });

            // Format for prompt
            noveltyToolData = formatToolResultsForPrompt(results.webResults, results.localResults);

            if (results.errors.length > 0) {
              console.warn('⚠️ Novelty check tool errors:', results.errors);
            }
          } catch (error) {
            console.error('💥 Novelty check tool execution failed:', error);
            noveltyToolData = '**Tool Results:** Tools unavailable for novelty check.\n';
          }
        } else {
          noveltyToolData = '**Tool Results:** Tool service not available for novelty check.\n';
        }

        const noveltyCheckerPrompt = fillPromptTemplate(agentPrompts[AgentName.NOVELTY_CHECKER], {
          proposal: currentProposal,
          tool_results: noveltyToolData
        });
        setNoveltyCheckerSentPrompt(noveltyCheckerPrompt);

        // Start with empty result in the array for streaming
        setAgentStates(prev => ({
          ...prev,
          noveltyChecks: [...prev.noveltyChecks, '']
        }));

        let noveltyIndex = agentStates.noveltyChecks.length;
        await generateContentStream(AgentName.NOVELTY_CHECKER, noveltyCheckerPrompt, llmOptions, (chunk) => {
          // Update the current result in real-time
          setAgentStates(prev => {
            const newNoveltyChecks = [...prev.noveltyChecks];
            if (newNoveltyChecks.length > noveltyIndex) {
              newNoveltyChecks[noveltyIndex] += chunk;
            } else {
              newNoveltyChecks.push(chunk);
              noveltyIndex = newNoveltyChecks.length - 1;
            }
            return { ...prev, noveltyChecks: newNoveltyChecks };
          });
        });

        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.CHECKING_NOVELTY), ProcessStatus.CHECKING_NOVELTY]);
        await simulateDelay();
      }
      
      // 6. Aggregator
      if (shouldRunStep(ProcessStatus.AGGREGATING)) {
        setStatus(ProcessStatus.AGGREGATING);

        // Get current states
        const currentSearchResults = agentStates.searchResults.join('\n\n');
        const currentLearnings = agentStates.learnings[agentStates.learnings.length - 1] || '';
        const currentGapAnalysis = agentStates.gapAnalyses[agentStates.gapAnalyses.length - 1] || '';
        const currentProposal = agentStates.proposals[agentStates.proposals.length - 1] || '';
        const currentNoveltyCheck = agentStates.noveltyChecks[agentStates.noveltyChecks.length - 1] || '';

        const aggregatorPrompt = fillPromptTemplate(agentPrompts[AgentName.AGGREGATOR], {
          topic,
          researchSummary: currentSearchResults,
          generatedAnalysis: currentLearnings,
          critique: currentGapAnalysis,
          proposal: currentProposal,
          noveltyAssessment: currentNoveltyCheck,
          feedback: currentFeedback,
          fileContents
        });
        setAggregatorSentPrompt(aggregatorPrompt);

        // Start with empty result in the array for streaming
        setAgentStates(prev => ({
          ...prev,
          aggregations: [...prev.aggregations, '']
        }));

        let aggregatorIndex = agentStates.aggregations.length;
        await generateContentStream(AgentName.AGGREGATOR, aggregatorPrompt, llmOptions, (chunk) => {
          // Update the current result in real-time
          setAgentStates(prev => {
            const newAggregations = [...prev.aggregations];
            if (newAggregations.length > aggregatorIndex) {
              newAggregations[aggregatorIndex] += chunk;
            } else {
              newAggregations.push(chunk);
              aggregatorIndex = newAggregations.length - 1;
            }
            return { ...prev, aggregations: newAggregations };
          });
        });

        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.AGGREGATING), ProcessStatus.AGGREGATING]);
        await simulateDelay();
      }

      // 6. Generate Facts (reusing shared stream)
      if (shouldRunStep(ProcessStatus.GENERATING_FACTS)) {
        setStatus(ProcessStatus.GENERATING_FACTS);
        setStylizedFacts([]);
        let factsBuffer = '';
        // Get current aggregation
        const currentAggregation = agentStates.aggregations[agentStates.aggregations.length - 1] || '';

        const factsPrompt = `
          Based on the final report below, emit 5-7 stylized facts as a bullet list only.\n
          - Use the exact format "- Fact — Description" (em dash or colon are acceptable).\n
          - No section headers, no JSON, no commentary.\n
          Final Report:\n---\n${currentAggregation}\n---
        `;
        await generateContentStream(AgentName.LEARNINGS, factsPrompt, llmOptions, (chunk) => {
          factsBuffer += chunk;
          setStylizedFacts(parseFactsFromBuffer(factsBuffer));
        });
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.GENERATING_FACTS), ProcessStatus.GENERATING_FACTS]);
        await simulateDelay();
      }

      // 7. Generate Questions (reusing shared stream)
      if (shouldRunStep(ProcessStatus.GENERATING_QUESTIONS)) {
        setStatus(ProcessStatus.GENERATING_QUESTIONS);
        setStylizedQuestions([]);
        let questionsBuffer = '';
        // Get current aggregation
        const currentAggregation = agentStates.aggregations[agentStates.aggregations.length - 1] || '';

        const questionsPrompt = `
          Based on the final report below, emit 5 insightful questions as a bullet list only.\n
          - Use the exact format "- question text".\n
          - No section headers, no JSON, no commentary.\n
          Final Report:\n---\n${currentAggregation}\n---
        `;
        await generateContentStream(AgentName.LEARNINGS, questionsPrompt, llmOptions, (chunk) => {
          questionsBuffer += chunk;
          setStylizedQuestions(parseQuestionsFromBuffer(questionsBuffer));
        });
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.GENERATING_QUESTIONS), ProcessStatus.GENERATING_QUESTIONS]);
      }

      // 8. Ready for Feedback
      setStatus(ProcessStatus.FEEDBACK);
      setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.FEEDBACK), ProcessStatus.FEEDBACK]);
    } catch (e) {
      console.error(e);
      const errorMessage = `Error during analysis: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      setStatus(ProcessStatus.IDLE);
    }
  };

  const startAnalysis = (currentFeedback = '') => {
     if (!topic.trim()) {
      setError("Please enter a topic to start the analysis.");
      return;
    }
    if (modelProvider === ModelProvider.LOCAL && !localLlmUrl.trim()) {
      setError("Please enter a valid URL for the local LLM endpoint.");
      return;
    }
    clearOutputs();
    setFeedback('');
    setStatus(ProcessStatus.SEARCHING);
    
    setTimeout(() => runWorkflow(currentFeedback), 100);
  };

  const handleStart = () => {
    setIteration(1);
    startAnalysis();
  };
  
  const handleRevision = () => {
    if(!feedback.trim()){
      setError("Please provide feedback for the revision.");
      return;
    }
    setIteration(prev => prev + 1);
    startAnalysis(feedback);
  };

  const handleExportRun = () => {
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
# Multi-Agent Run Report

- **Topic**: ${topic}
- **Iteration**: ${iteration}
- **Date**: ${new Date().toLocaleString()}
- **Model Provider**: ${modelProvider}

---

## Agent Outputs

### Search Agent
**Sent Prompt:**
\`\`\`
${researcherSentPrompt}
\`\`\`
**Output:**
${agentStates.searchResults.join('\n\n---\n\n') || 'No search results'}

---

### Learnings Agent
**Sent Prompt:**
\`\`\`
${generatorSentPrompt}
\`\`\`
**Output:**
${agentStates.learnings[agentStates.learnings.length - 1] || 'No learnings generated'}

---

### Gap Analysis Agent
**Sent Prompt:**
\`\`\`
${evaluatorSentPrompt}
\`\`\`
**Output:**
${agentStates.gapAnalyses[agentStates.gapAnalyses.length - 1] || 'No gap analysis'}

---

### Proposer Agent
**Sent Prompt:**
\`\`\`
${proposerSentPrompt}
\`\`\`
**Output:**
${agentStates.proposals[agentStates.proposals.length - 1] || 'No proposal generated'}

---

### Novelty Checker Agent
**Sent Prompt:**
\`\`\`
${noveltyCheckerSentPrompt}
\`\`\`
**Output:**
${agentStates.noveltyChecks[agentStates.noveltyChecks.length - 1] || 'No novelty check'}

---

### Aggregator Agent
**Sent Prompt:**
\`\`\`
${aggregatorSentPrompt}
\`\`\`
**Output:**
${agentStates.aggregations[agentStates.aggregations.length - 1] || 'No final report'}

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

  const buildSessionSnapshot = () => ({
    v: 1,
    timestamp: new Date().toISOString(),
    topic,
    iteration,
    modelProvider,
    researchSummary: agentStates.searchResults.join('\n\n'),
    researcherSentPrompt,
    generatedAnalysis: agentStates.learnings[agentStates.learnings.length - 1] || '',
    generatorSentPrompt,
    critique: agentStates.gapAnalyses[agentStates.gapAnalyses.length - 1] || '',
    evaluatorSentPrompt,
    proposal: agentStates.proposals[agentStates.proposals.length - 1] || '',
    proposerSentPrompt,
    noveltyAssessment: agentStates.noveltyChecks[agentStates.noveltyChecks.length - 1] || '',
    noveltyCheckerSentPrompt,
    finalReport: agentStates.aggregations[agentStates.aggregations.length - 1] || '',
    aggregatorSentPrompt,
    stylizedFacts,
    stylizedQuestions,
    completedSteps,
    toolResults,
    agentStates, // Include full agent states for iteration support
  });

  const handleExportJson = () => {
    const snapshot = buildSessionSnapshot();
    const formattedTopic = (snapshot.topic || 'session').replace(/\s+/g, '_').toLowerCase();
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

  const handleCopyLinkToSession = async () => {
    try {
      const snapshot = buildSessionSnapshot();
      const encoded = encodeURIComponent(JSON.stringify(snapshot));
      const shareUrl = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowLinkToast(true);
      setTimeout(() => setShowLinkToast(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const handleRestartFrom = (stepId: ProcessStatus) => {
    setRestartFromStep(stepId);
    setShowRestartConfirm(true);
  };

  const confirmRestart = () => {
    if (restartFromStep) {
      runWorkflow(feedback, restartFromStep);
    }
    setShowRestartConfirm(false);
    setRestartFromStep(null);
  };

  const cancelRestart = () => {
    setShowRestartConfirm(false);
    setRestartFromStep(null);
  };

  // Template functions
  const handleOpenTemplateModal = () => {
    setShowTemplateModal(true);
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    trackUsage(template.id);

    // Apply template settings
    setAgentPrompts(template.agentPrompts);
    setModelProvider(template.modelProvider);
    setLocalLlmUrl(template.localLlmUrl);
    setEnableWebSearch(template.enableWebSearch);
    setEnableLocalSearch(template.enableLocalSearch);
    setTheme(template.theme);
    setIteration(template.maxIterations);

    // Close modal and show success
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
      completedSteps
    });
    console.log(`✅ Created template: ${name} (ID: ${templateId})`);
    return templateId;
  };

  const getAffectedSteps = (fromStep: ProcessStatus): string[] => {
    const allSteps = [
      { id: ProcessStatus.SEARCHING, label: 'Search' },
      { id: ProcessStatus.LEARNING, label: 'Learnings' },
      { id: ProcessStatus.GAP_ANALYZING, label: 'Gap Analysis' },
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


  const isLoading = status !== ProcessStatus.IDLE && status !== ProcessStatus.FEEDBACK;
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
                Human-in-the-Loop
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
                  onCopyLink={handleCopyLinkToSession}
                  onOpenTemplateModal={handleOpenTemplateModal}
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
                completedSteps={completedSteps}
                onRestartFrom={handleRestartFrom}
                hasFeedback={feedback.trim().length > 0}
              />
              
              {error && <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-4 rounded-lg">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AgentCard
                    title="Search Agent"
                    content={getAgentContent(AgentName.SEARCH)}
                    sentPrompt={researcherSentPrompt}
                    isLoading={status === ProcessStatus.SEARCHING}
                    agent={AgentName.SEARCH}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.SEARCH)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.SEARCH)}
                    toolResults={toolResults}
                    toolServiceAvailable={toolServiceAvailable}
                    currentIteration={getCurrentIteration(AgentName.SEARCH)}
                    totalIterations={getAgentIterationCount(AgentName.SEARCH)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.SEARCH, iteration)}
                  />
                  <AgentCard
                    title="Learnings Agent"
                    content={getAgentContent(AgentName.LEARNINGS)}
                    sentPrompt={generatorSentPrompt}
                    isLoading={status === ProcessStatus.LEARNING}
                    agent={AgentName.LEARNINGS}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.LEARNINGS)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.LEARNINGS)}
                    currentIteration={getCurrentIteration(AgentName.LEARNINGS)}
                    totalIterations={getAgentIterationCount(AgentName.LEARNINGS)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.LEARNINGS, iteration)}
                  />
                  <AgentCard
                    title="Gap Analysis Agent"
                    content={getAgentContent(AgentName.GAP_ANALYSIS)}
                    sentPrompt={evaluatorSentPrompt}
                    isLoading={status === ProcessStatus.GAP_ANALYZING}
                    agent={AgentName.GAP_ANALYSIS}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.GAP_ANALYSIS)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.GAP_ANALYSIS)}
                    currentIteration={getCurrentIteration(AgentName.GAP_ANALYSIS)}
                    totalIterations={getAgentIterationCount(AgentName.GAP_ANALYSIS)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.GAP_ANALYSIS, iteration)}
                  />
                  <AgentCard
                    title="Proposer Agent"
                    content={getAgentContent(AgentName.PROPOSER)}
                    sentPrompt={proposerSentPrompt}
                    isLoading={status === ProcessStatus.PROPOSING}
                    agent={AgentName.PROPOSER}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.PROPOSER)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.PROPOSER)}
                    currentIteration={getCurrentIteration(AgentName.PROPOSER)}
                    totalIterations={getAgentIterationCount(AgentName.PROPOSER)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.PROPOSER, iteration)}
                  />
                  <AgentCard
                    title="Novelty Checker Agent"
                    content={getAgentContent(AgentName.NOVELTY_CHECKER)}
                    sentPrompt={noveltyCheckerSentPrompt}
                    isLoading={status === ProcessStatus.CHECKING_NOVELTY}
                    agent={AgentName.NOVELTY_CHECKER}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.NOVELTY_CHECKER)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.NOVELTY_CHECKER)}
                    currentIteration={getCurrentIteration(AgentName.NOVELTY_CHECKER)}
                    totalIterations={getAgentIterationCount(AgentName.NOVELTY_CHECKER)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.NOVELTY_CHECKER, iteration)}
                  />
              </div>
               <div className="grid grid-cols-1">
                  <AgentCard
                    title="Aggregator Agent"
                    content={getAgentContent(AgentName.AGGREGATOR)}
                    sentPrompt={aggregatorSentPrompt}
                    isLoading={status === ProcessStatus.AGGREGATING}
                    agent={AgentName.AGGREGATOR}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.AGGREGATOR)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.AGGREGATOR)}
                    currentIteration={getCurrentIteration(AgentName.AGGREGATOR)}
                    totalIterations={getAgentIterationCount(AgentName.AGGREGATOR)}
                    onIterationSelect={(iteration) => setIterationForAgent(AgentName.AGGREGATOR, iteration)}
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

        {/* Components outside main container */}
        {showRestoreToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
            <p className="text-sm font-semibold">Restore last session?</p>
            <p className="text-xs text-gray-300 mt-1">A previous run was found from local storage. You can restore it now.</p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={restoreLastRun} className="px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs">Restore</button>
              <button onClick={dismissRestoreToast} className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-xs">Dismiss</button>
            </div>
          </div>
        </div>
      )}
      {showLinkToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 text-sm">
            Link copied to clipboard
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartConfirm && restartFromStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Restart Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                This will restart the analysis from <strong>{restartFromStep.replace('_', ' ').toLowerCase()}</strong> onwards.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                <strong>Steps that will be rerun:</strong> {getAffectedSteps(restartFromStep).join(' → ')}
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelRestart}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestart}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Restart from {restartFromStep.replace('_', ' ').toLowerCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PromptEditorModal
        isOpen={isPromptEditorOpen}
        onClose={handleClosePromptEditor}
        prompts={agentPrompts}
        onSave={setAgentPrompts}
        llmOptions={llmOptions}
        initialAgent={editingAgent}
      />

      {/* Workflow Template Modal */}
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
          completedSteps
        }}
        templates={templates}
        onCreateTemplate={handleCreateTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onStart={handleStart}
        onRevision={handleRevision}
        onExport={handleExportRun}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        isLoading={isLoading}
        hasCompletedRun={status === ProcessStatus.FEEDBACK || (stylizedFacts.length > 0 || stylizedQuestions.length > 0)}
        hasFeedback={feedback.trim().length > 0}
      />

      {/* Task Profile Dialog */}
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