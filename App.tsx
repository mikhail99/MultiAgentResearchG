import React, { useState, useEffect } from 'react';
import { AgentName, ProcessStatus, StylizedFact, ModelProvider, LlmOptions, AgentPrompts } from './types';
import { generateContentStream, generateFacts, generateQuestions } from './services/geminiService';
import { initialPrompts } from './prompts';
import ControlPanel from './components/ControlPanel';
import StatusBar from './components/StatusBar';
import AgentCard from './components/AgentCard';
import FeedbackPanel from './components/FeedbackPanel';
import ResultsPanel from './components/ResultsPanel';
import PromptEditorModal from './components/PromptEditorModal';
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
  const [finalReport, setFinalReport] = useState<string>('');
  const [aggregatorSentPrompt, setAggregatorSentPrompt] = useState<string>('');

  const [stylizedFacts, setStylizedFacts] = useState<StylizedFact[]>([]);
  const [stylizedQuestions, setStylizedQuestions] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  
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
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const clearOutputs = () => {
    setResearchSummary('');
    setResearcherSentPrompt('');
    setGeneratedAnalysis('');
    setGeneratorSentPrompt('');
    setCritique('');
    setEvaluatorSentPrompt('');
    setProposal('');
    setProposerSentPrompt('');
    setFinalReport('');
    setAggregatorSentPrompt('');
    setStylizedFacts([]);
    setStylizedQuestions([]);
    setError(null);
  };

  const handleOpenPromptEditor = (agent: AgentName) => {
    setEditingAgent(agent);
    setIsPromptEditorOpen(true);
  };

  const handleClosePromptEditor = () => {
    setIsPromptEditorOpen(false);
    setTimeout(() => setEditingAgent(null), 300);
  };
  
  const runWorkflow = async (currentFeedback = '') => {
    const fileNames = files.map(f => f.name).join(', ') || 'No files provided';
    const fileContents = (await Promise.all(files.map(readFileContent))).join('\n\n---\n\n');

    const llmOptions: LlmOptions = { provider: modelProvider, url: localLlmUrl };
    
    const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 250));

    try {
      // 1. Researcher
      setStatus(ProcessStatus.RESEARCHING);
      setResearchSummary('');
      const researcherPrompt = fillPromptTemplate(agentPrompts.Researcher, { topic });
      setResearcherSentPrompt(researcherPrompt);
      const researchResult = await generateContentStream(AgentName.RESEARCHER, researcherPrompt, llmOptions, (chunk) => setResearchSummary(prev => prev + chunk));
      await simulateDelay();

      // 2. Generator
      setStatus(ProcessStatus.GENERATING);
      setGeneratedAnalysis('');
      const generatorPrompt = fillPromptTemplate(agentPrompts.Generator, { topic, researchSummary: researchResult, fileNames, fileContents, feedback: currentFeedback });
      setGeneratorSentPrompt(generatorPrompt);
      const analysisResult = await generateContentStream(AgentName.GENERATOR, generatorPrompt, llmOptions, (chunk) => setGeneratedAnalysis(prev => prev + chunk));
      await simulateDelay();

      // 3. Evaluator
      setStatus(ProcessStatus.EVALUATING);
      setCritique('');
      const evaluatorPrompt = fillPromptTemplate(agentPrompts.Evaluator, { topic, generatedAnalysis: analysisResult });
      setEvaluatorSentPrompt(evaluatorPrompt);
      const critiqueResult = await generateContentStream(AgentName.EVALUATOR, evaluatorPrompt, llmOptions, (chunk) => setCritique(prev => prev + chunk));
      await simulateDelay();

      // 4. Proposer
      setStatus(ProcessStatus.PROPOSING);
      setProposal('');
      const proposerPrompt = fillPromptTemplate(agentPrompts.Proposer, { topic, generatedAnalysis: analysisResult, critique: critiqueResult });
      setProposerSentPrompt(proposerPrompt);
      const proposalResult = await generateContentStream(AgentName.PROPOSER, proposerPrompt, llmOptions, (chunk) => setProposal(prev => prev + chunk));
      await simulateDelay();
      
      // 5. Aggregator
      setStatus(ProcessStatus.AGGREGATING);
      setFinalReport('');
      const aggregatorPrompt = fillPromptTemplate(agentPrompts.Aggregator, { topic, researchSummary: researchResult, generatedAnalysis: analysisResult, critique: critiqueResult, proposal: proposalResult, feedback: currentFeedback, fileContents });
      setAggregatorSentPrompt(aggregatorPrompt);
      const finalReportResult = await generateContentStream(AgentName.AGGREGATOR, aggregatorPrompt, llmOptions, (chunk) => setFinalReport(prev => prev + chunk));
      await simulateDelay();

      // 6. Generate Facts
      setStatus(ProcessStatus.GENERATING_FACTS);
      const facts = await generateFacts(finalReportResult, llmOptions);
      setStylizedFacts(facts);
      await simulateDelay();

      // 7. Generate Questions
      setStatus(ProcessStatus.GENERATING_QUESTIONS);
      const questions = await generateQuestions(finalReportResult, llmOptions);
      setStylizedQuestions(questions);

      // 8. Ready for Feedback
      setStatus(ProcessStatus.FEEDBACK);
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
    setStatus(ProcessStatus.RESEARCHING);
    
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


  const isLoading = status !== ProcessStatus.IDLE && status !== ProcessStatus.FEEDBACK;
  const llmOptions: LlmOptions = { provider: modelProvider, url: localLlmUrl };

  return (
    <>
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
              <StatusBar status={status} />
              
              {error && <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-4 rounded-lg">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AgentCard title="Researcher Agent" content={researchSummary} sentPrompt={researcherSentPrompt} isLoading={status === ProcessStatus.RESEARCHING} agent={AgentName.RESEARCHER} onEditPrompt={() => handleOpenPromptEditor(AgentName.RESEARCHER)} />
                  <AgentCard title="Generator Agent" content={generatedAnalysis} sentPrompt={generatorSentPrompt} isLoading={status === ProcessStatus.GENERATING} agent={AgentName.GENERATOR} onEditPrompt={() => handleOpenPromptEditor(AgentName.GENERATOR)} />
                  <AgentCard title="Evaluator Agent" content={critique} sentPrompt={evaluatorSentPrompt} isLoading={status === ProcessStatus.EVALUATING} agent={AgentName.EVALUATOR} onEditPrompt={() => handleOpenPromptEditor(AgentName.EVALUATOR)} />
                  <AgentCard title="Proposer Agent" content={proposal} sentPrompt={proposerSentPrompt} isLoading={status === ProcessStatus.PROPOSING} agent={AgentName.PROPOSER} onEditPrompt={() => handleOpenPromptEditor(AgentName.PROPOSER)} />
              </div>
               <div className="grid grid-cols-1">
                  <AgentCard title="Aggregator Agent" content={finalReport} sentPrompt={aggregatorSentPrompt} isLoading={status === ProcessStatus.AGGREGATING} agent={AgentName.AGGREGATOR} onEditPrompt={() => handleOpenPromptEditor(AgentName.AGGREGATOR)} />
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
      </div>
      <PromptEditorModal
        isOpen={isPromptEditorOpen}
        onClose={handleClosePromptEditor}
        prompts={agentPrompts}
        onSave={setAgentPrompts}
        llmOptions={llmOptions}
        initialAgent={editingAgent}
      />
    </>
  );
}