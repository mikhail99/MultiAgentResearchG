import { ProcessStatus, ModelProvider } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';
import { executeResearcherTools, formatToolResultsForPrompt } from '@shared/services/toolService';
import { generateContentStream } from '@shared/services';
import { KE_TEMPLATE } from '../workflowTemplates';

export interface KECallbacks {
  onStatus?: (status: ProcessStatus) => void;
  onStream?: (agent: ProcessStatus, chunk: string) => void;
  onPrompt?: (agent: ProcessStatus, prompt: string) => void;
}

export interface KERunOptions {
  question: string;
  modelProvider?: ModelProvider;
  localLlmUrl?: string;
  enableWebSearch?: boolean;
  enableLocalSearch?: boolean;
}

const getPrompt = (status: ProcessStatus) => {
  switch (status) {
    case ProcessStatus.SEARCHING: return KE_TEMPLATE.agentPrompts.Search;
    case ProcessStatus.LEARNING: return KE_TEMPLATE.agentPrompts.Learnings;
    case ProcessStatus.OPPORTUNITY_ANALYZING: return KE_TEMPLATE.agentPrompts['Opportunity Analysis'];
    case ProcessStatus.PROPOSING: return KE_TEMPLATE.agentPrompts.Proposer;
    case ProcessStatus.AGGREGATING: return KE_TEMPLATE.agentPrompts.Aggregator;
    default: return '';
  }
};

async function runNode(
  status: ProcessStatus,
  state: WorkflowState,
  question: string,
  cb?: KECallbacks
): Promise<string> {
  cb?.onStatus?.(status);

  let toolData = '';
  if (status === ProcessStatus.SEARCHING || status === ProcessStatus.CHECKING_NOVELTY) {
    try {
      const res = await executeResearcherTools(question, { includeWebSearch: true, includeLocalSearch: true });
      toolData = formatToolResultsForPrompt(res.webResults, res.localResults);
    } catch {
      toolData = '**Tool Results:** (tools unavailable)';
    }
  }

  const prompt = getPrompt(status)
    .replace('{topic}', question)
    .replace('{tool_results}', toolData)
    .replace('{researchSummary}', state.searchResults.join('\n\n'))
    .replace('{generatedAnalysis}', state.learnings.at(-1) ?? '')
    .replace('{opportunityAnalysis}', state.opportunityAnalyses.at(-1) ?? '')
    .replace('{proposal}', state.proposals.at(-1) ?? '')
    .replace('{noveltyAssessment}', state.noveltyChecks.at(-1) ?? '')
    .replace('{feedback}', state.feedback || '');

  cb?.onPrompt?.(status, prompt);

  let output = '';
  await generateContentStream(
    undefined as any,
    prompt,
    { provider: state.modelProvider as any, url: state.modelProvider === ModelProvider.LOCAL ? (state as any).localLlmUrl || KE_TEMPLATE.localLlmUrl : '' },
    (chunk) => {
      output += chunk;
      cb?.onStream?.(status, chunk);
    }
  );
  return output;
}

export async function runKnowledgeExtraction(
  options: KERunOptions,
  cb?: KECallbacks
): Promise<WorkflowState> {
  const state: WorkflowState = {
    topic: options.question,
    iteration: 1,
    modelProvider: options.modelProvider || ModelProvider.LOCAL,
    feedback: '',
    searchResults: [],
    learnings: [],
    opportunityAnalyses: [],
    proposals: [],
    noveltyChecks: [],
    aggregations: [],
    stylizedFacts: [],
    stylizedQuestions: [],
    toolResults: null,
    currentStep: ProcessStatus.IDLE,
    completedSteps: [],
    shouldRestart: false,
    restartFromStep: null,
    restartCount: 0,
    memoryNotes: [],
    memoryLinks: [],
    memoryEvolutionQueue: [],
    memoryStats: {
      totalNotes: 0,
      totalLinks: 0,
      lastEvolution: new Date().toISOString(),
      memoryQuality: 0,
    },
  };

  const fastSearch = await runNode(ProcessStatus.SEARCHING, state, options.question, cb);
  state.searchResults.push(fastSearch);
  state.completedSteps.push(ProcessStatus.SEARCHING);

  const [baseline, analyst, evaluator] = await Promise.all([
    runNode(ProcessStatus.LEARNING, state, options.question, cb),
    runNode(ProcessStatus.OPPORTUNITY_ANALYZING, state, options.question, cb),
    runNode(ProcessStatus.PROPOSING, state, options.question, cb),
  ]);
  state.learnings.push(baseline);
  state.opportunityAnalyses.push(analyst);
  state.proposals.push(evaluator);
  state.completedSteps.push(
    ProcessStatus.LEARNING,
    ProcessStatus.OPPORTUNITY_ANALYZING,
    ProcessStatus.PROPOSING
  );

  const synth = await runNode(ProcessStatus.AGGREGATING, state, options.question, cb);
  state.aggregations.push(synth);
  state.completedSteps.push(ProcessStatus.AGGREGATING);
  state.currentStep = ProcessStatus.AGGREGATING;

  return state;
}


