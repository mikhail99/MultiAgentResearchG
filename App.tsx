import React, { useState, useEffect } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts, ToolResults } from './types';
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
  
  const [modelProvider, setModelProvider] = useState<ModelProvider>(ModelProvider.GEMINI);
  const [localLlmUrl, setLocalLlmUrl] = useState<string>('http://localhost:11434/v1/chat/completions');
  
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentName | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>(initialPrompts);

  const [researchSummary, setResearchSummary] = useState<string>('');
  const [researcherSentPrompt, setResearcherSentPrompt] = useState<string>('');
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string>('');
  const [generatorSentPrompt, setGeneratorSentPrompt] = useState<string>('');
  const [critique, setCritique] = useState<string>('');
  const [evaluatorSentPrompt, setEvaluatorSentPrompt] = useState<string>('');
  const [proposal, setProposal] = useState<string>('');
  const [proposerSentPrompt, setProposerSentPrompt] = useState<string>('');
  const [noveltyAssessment, setNoveltyAssessment] = useState<string>('');
  const [noveltyCheckerSentPrompt, setNoveltyCheckerSentPrompt] = useState<string>('');
  const [finalReport, setFinalReport] = useState<string>('');
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
      const isAvailable = await checkToolServiceHealth();
      setToolServiceAvailable(isAvailable);
      if (!isAvailable) {
        console.warn('⚠️ Tool service not available. Research agent will run without tools.');
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
        researchSummary,
        researcherSentPrompt,
        generatedAnalysis,
        generatorSentPrompt,
        critique,
        evaluatorSentPrompt,
        proposal,
        proposerSentPrompt,
        noveltyAssessment,
        noveltyCheckerSentPrompt,
        finalReport,
        aggregatorSentPrompt,
        stylizedFacts,
        stylizedQuestions,
        completedSteps,
        toolResults,
      };
      localStorage.setItem(LAST_RUN_KEY, JSON.stringify(payload));
    } catch {}
  };

  const tryGetSavedRun = (): SavedRun | null => {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedRun;
    } catch {
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
    !researchSummary && !generatedAnalysis && !critique && !proposal && !noveltyAssessment && !finalReport && stylizedFacts.length === 0 && stylizedQuestions.length === 0
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
        setModelProvider(data.modelProvider || ModelProvider.GEMINI);
        setResearchSummary(data.researchSummary || '');
        setResearcherSentPrompt(data.researcherSentPrompt || '');
        setGeneratedAnalysis(data.generatedAnalysis || '');
        setGeneratorSentPrompt(data.generatorSentPrompt || '');
        setCritique(data.critique || '');
        setEvaluatorSentPrompt(data.evaluatorSentPrompt || '');
        setProposal(data.proposal || '');
        setProposerSentPrompt(data.proposerSentPrompt || '');
        setNoveltyAssessment(data.noveltyAssessment || '');
        setNoveltyCheckerSentPrompt(data.noveltyCheckerSentPrompt || '');
        setFinalReport(data.finalReport || '');
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
    const hasSaved = !!tryGetSavedRun();
    if (hasSaved && !topic && isOutputsEmpty()) {
      setShowRestoreToast(true);
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
    setResearchSummary(data.researchSummary);
    setResearcherSentPrompt(data.researcherSentPrompt);
    setGeneratedAnalysis(data.generatedAnalysis);
    setGeneratorSentPrompt(data.generatorSentPrompt);
    setCritique(data.critique);
    setEvaluatorSentPrompt(data.evaluatorSentPrompt);
    setProposal(data.proposal);
    setProposerSentPrompt(data.proposerSentPrompt);
    setNoveltyAssessment(data.noveltyAssessment || '');
    setNoveltyCheckerSentPrompt(data.noveltyCheckerSentPrompt || '');
    setFinalReport(data.finalReport);
    setAggregatorSentPrompt(data.aggregatorSentPrompt);
    setStylizedFacts(data.stylizedFacts || []);
    setStylizedQuestions(data.stylizedQuestions || []);
    setCompletedSteps(data.completedSteps || deriveCompletedSteps(data));
    setToolResults(data.toolResults || null);
    setStatus(ProcessStatus.FEEDBACK);
    setShowRestoreToast(false);
  };

  const dismissRestoreToast = () => setShowRestoreToast(false);

  const clearOutputs = () => {
    setResearchSummary('');
    setResearcherSentPrompt('');
    setGeneratedAnalysis('');
    setGeneratorSentPrompt('');
    setCritique('');
    setEvaluatorSentPrompt('');
    setProposal('');
    setProposerSentPrompt('');
    setNoveltyAssessment('');
    setNoveltyCheckerSentPrompt('');
    setFinalReport('');
    setAggregatorSentPrompt('');
    setStylizedFacts([]);
    setStylizedQuestions([]);
    setCompletedSteps([]);
    setToolResults(null);
    setError(null);
    setSearchRestartCount(0); // Reset restart count
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
  
  const runWorkflow = async (currentFeedback = '', startFromStep: ProcessStatus = ProcessStatus.SEARCHING) => {
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
      let researchResult = researchSummary;
      let analysisResult = generatedAnalysis;
      let critiqueResult = critique;
      let proposalResult = proposal;
      let noveltyAssessmentResult = noveltyAssessment;
      let finalReportResult = finalReport;

      // 1. Search (with tools)
      if (shouldRunStep(ProcessStatus.SEARCHING)) {
        setStatus(ProcessStatus.SEARCHING);
        setResearchSummary('');
        
        // Execute research tools if available
        let toolData = '';
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
            
            // Format for prompt
            toolData = formatToolResultsForPrompt(results.webResults, results.localResults);
            
            if (results.errors.length > 0) {
              console.warn('⚠️ Tool errors:', results.errors);
            }
          } catch (error) {
            console.error('💥 Tool execution failed:', error);
            toolData = '**Tool Results:** Tools unavailable for this research.\n';
          }
        } else {
          toolData = '**Tool Results:** Tool service not available. Proceeding with knowledge-based research.\n';
        }
        
        // Build enhanced prompt with tool results
        const researcherPrompt = fillPromptTemplate(agentPrompts[AgentName.SEARCH], { 
          topic,
          tool_results: toolData
        });
        setResearcherSentPrompt(researcherPrompt);
        
        researchResult = await generateContentStream(AgentName.SEARCH, researcherPrompt, llmOptions, (chunk) => setResearchSummary(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.SEARCHING), ProcessStatus.SEARCHING]);
        await simulateDelay();
      }

      // 2. Learnings
      if (shouldRunStep(ProcessStatus.LEARNING)) {
        setStatus(ProcessStatus.LEARNING);
        setGeneratedAnalysis('');
        const generatorPrompt = fillPromptTemplate(agentPrompts[AgentName.LEARNINGS], { topic, researchSummary: researchResult, fileNames, fileContents, feedback: currentFeedback });
        setGeneratorSentPrompt(generatorPrompt);
        analysisResult = await generateContentStream(AgentName.LEARNINGS, generatorPrompt, llmOptions, (chunk) => setGeneratedAnalysis(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING]);
        await simulateDelay();
      }

      // 3. Gap Analysis
      if (shouldRunStep(ProcessStatus.GAP_ANALYZING)) {
        setStatus(ProcessStatus.GAP_ANALYZING);
        setCritique('');
        const evaluatorPrompt = fillPromptTemplate(agentPrompts[AgentName.GAP_ANALYSIS], { topic, generatedAnalysis: analysisResult });
        setEvaluatorSentPrompt(evaluatorPrompt);
        critiqueResult = await generateContentStream(AgentName.GAP_ANALYSIS, evaluatorPrompt, llmOptions, (chunk) => setCritique(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.GAP_ANALYZING), ProcessStatus.GAP_ANALYZING]);
        await simulateDelay();

        // Gap Analysis Decision Logic
        const shouldRestartSearch = critiqueResult.toLowerCase().includes('research_again') ||
                                   critiqueResult.toLowerCase().includes('restart') ||
                                   (critiqueResult.toLowerCase().includes('research') && searchRestartCount < maxSearchRestarts);

        if (shouldRestartSearch && searchRestartCount < maxSearchRestarts) {
          console.log(`🔄 Gap Analysis recommends restarting search (${searchRestartCount + 1}/${maxSearchRestarts})`);
          setSearchRestartCount(prev => prev + 1);

          // Reset learnings and gap analysis for restart
          setGeneratedAnalysis('');
          setCritique('');

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
        setProposal('');
        const proposerPrompt = fillPromptTemplate(agentPrompts.Proposer, { topic, generatedAnalysis: analysisResult, critique: critiqueResult });
        setProposerSentPrompt(proposerPrompt);
        proposalResult = await generateContentStream(AgentName.PROPOSER, proposerPrompt, llmOptions, (chunk) => setProposal(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.PROPOSING), ProcessStatus.PROPOSING]);
        await simulateDelay();
      }

      // 5. Novelty Checker
      if (shouldRunStep(ProcessStatus.CHECKING_NOVELTY)) {
        setStatus(ProcessStatus.CHECKING_NOVELTY);
        setNoveltyAssessment('');
        
        // Execute search tools for novelty checking
        let noveltyToolData = '';
        if (toolServiceAvailable) {
          console.log('🔧 Executing novelty check tools...');
          try {
            const results = await executeResearcherTools(proposalResult, {
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
        
        const noveltyCheckerPrompt = fillPromptTemplate(agentPrompts.NoveltyChecker, { 
          proposal: proposalResult,
          tool_results: noveltyToolData
        });
        setNoveltyCheckerSentPrompt(noveltyCheckerPrompt);
        noveltyAssessmentResult = await generateContentStream(AgentName.NOVELTY_CHECKER, noveltyCheckerPrompt, llmOptions, (chunk) => setNoveltyAssessment(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.CHECKING_NOVELTY), ProcessStatus.CHECKING_NOVELTY]);
        await simulateDelay();
      }
      
      // 6. Aggregator
      if (shouldRunStep(ProcessStatus.AGGREGATING)) {
        setStatus(ProcessStatus.AGGREGATING);
        setFinalReport('');
        const aggregatorPrompt = fillPromptTemplate(agentPrompts.Aggregator, { topic, researchSummary: researchResult, generatedAnalysis: analysisResult, critique: critiqueResult, proposal: proposalResult, noveltyAssessment: noveltyAssessmentResult, feedback: currentFeedback, fileContents });
        setAggregatorSentPrompt(aggregatorPrompt);
        finalReportResult = await generateContentStream(AgentName.AGGREGATOR, aggregatorPrompt, llmOptions, (chunk) => setFinalReport(prev => prev + chunk));
        setCompletedSteps(prev => [...prev.filter(s => s !== ProcessStatus.AGGREGATING), ProcessStatus.AGGREGATING]);
        await simulateDelay();
      }

      // 6. Generate Facts (reusing shared stream)
      if (shouldRunStep(ProcessStatus.GENERATING_FACTS)) {
        setStatus(ProcessStatus.GENERATING_FACTS);
        setStylizedFacts([]);
        let factsBuffer = '';
        const factsPrompt = `
          Based on the final report below, emit 5-7 stylized facts as a bullet list only.\n
          - Use the exact format "- Fact — Description" (em dash or colon are acceptable).\n
          - No section headers, no JSON, no commentary.\n
          Final Report:\n---\n${finalReportResult}\n---
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
        const questionsPrompt = `
          Based on the final report below, emit 5 insightful questions as a bullet list only.\n
          - Use the exact format "- question text".\n
          - No section headers, no JSON, no commentary.\n
          Final Report:\n---\n${finalReportResult}\n---
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

### Researcher Agent
**Sent Prompt:**
\`\`\`
${researcherSentPrompt}
\`\`\`
**Output:**
${researchSummary}

---

### Generator Agent
**Sent Prompt:**
\`\`\`
${generatorSentPrompt}
\`\`\`
**Output:**
${generatedAnalysis}

---

### Evaluator Agent
**Sent Prompt:**
\`\`\`
${evaluatorSentPrompt}
\`\`\`
**Output:**
${critique}

---

### Proposer Agent
**Sent Prompt:**
\`\`\`
${proposerSentPrompt}
\`\`\`
**Output:**
${proposal}

---

### Novelty Checker Agent
**Sent Prompt:**
\`\`\`
${noveltyCheckerSentPrompt}
\`\`\`
**Output:**
${noveltyAssessment}

---

### Aggregator Agent
**Sent Prompt:**
\`\`\`
${aggregatorSentPrompt}
\`\`\`
**Output:**
${finalReport}

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
    researchSummary,
    researcherSentPrompt,
    generatedAnalysis,
    generatorSentPrompt,
    critique,
    evaluatorSentPrompt,
    proposal,
    proposerSentPrompt,
    noveltyAssessment,
    noveltyCheckerSentPrompt,
    finalReport,
    aggregatorSentPrompt,
    stylizedFacts,
    stylizedQuestions,
    completedSteps,
    toolResults,
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
                    content={researchSummary}
                    sentPrompt={researcherSentPrompt}
                    isLoading={status === ProcessStatus.SEARCHING}
                    agent={AgentName.SEARCH}
                    onEditPrompt={() => handleOpenPromptEditor(AgentName.SEARCH)}
                    onViewTaskProfile={() => handleViewTaskProfile(AgentName.SEARCH)}
                    toolResults={toolResults}
                    toolServiceAvailable={toolServiceAvailable}
                  />
                  <AgentCard title="Learnings Agent" content={generatedAnalysis} sentPrompt={generatorSentPrompt} isLoading={status === ProcessStatus.LEARNING} agent={AgentName.LEARNINGS} onEditPrompt={() => handleOpenPromptEditor(AgentName.LEARNINGS)} onViewTaskProfile={() => handleViewTaskProfile(AgentName.LEARNINGS)} />
                  <AgentCard title="Gap Analysis Agent" content={critique} sentPrompt={evaluatorSentPrompt} isLoading={status === ProcessStatus.GAP_ANALYZING} agent={AgentName.GAP_ANALYSIS} onEditPrompt={() => handleOpenPromptEditor(AgentName.GAP_ANALYSIS)} onViewTaskProfile={() => handleViewTaskProfile(AgentName.GAP_ANALYSIS)} />
                  <AgentCard title="Proposer Agent" content={proposal} sentPrompt={proposerSentPrompt} isLoading={status === ProcessStatus.PROPOSING} agent={AgentName.PROPOSER} onEditPrompt={() => handleOpenPromptEditor(AgentName.PROPOSER)} onViewTaskProfile={() => handleViewTaskProfile(AgentName.PROPOSER)} />
                  <AgentCard title="Novelty Checker Agent" content={noveltyAssessment} sentPrompt={noveltyCheckerSentPrompt} isLoading={status === ProcessStatus.CHECKING_NOVELTY} agent={AgentName.NOVELTY_CHECKER} onEditPrompt={() => handleOpenPromptEditor(AgentName.NOVELTY_CHECKER)} onViewTaskProfile={() => handleViewTaskProfile(AgentName.NOVELTY_CHECKER)} />
              </div>
               <div className="grid grid-cols-1">
                  <AgentCard title="Aggregator Agent" content={finalReport} sentPrompt={aggregatorSentPrompt} isLoading={status === ProcessStatus.AGGREGATING} agent={AgentName.AGGREGATOR} onEditPrompt={() => handleOpenPromptEditor(AgentName.AGGREGATOR)} onViewTaskProfile={() => handleViewTaskProfile(AgentName.AGGREGATOR)} />
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