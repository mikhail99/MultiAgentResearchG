// Browser-compatible workflow service (no LangGraph.js dependencies)
import { WorkflowState, NodeResult, AgentConfig, ValidationResult, StateValidationOptions } from '../types/workflow_LG';
import { AgentName, ProcessStatus, ModelProvider } from '../types';
import { generateContentStream } from './geminiService';
import { executeResearcherTools, formatToolResultsForPrompt } from './toolService';
import { amemService } from './amemService';

// Standard node callback interface for consistent LangGraphJS integration
export interface NodeCallbacks {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
  onPrompt?: (agentName: string, prompt: string) => void;
  onError?: (error: Error) => void;
  llmOptions?: { provider: ModelProvider; url?: string };
}

// Initial state factory
export function createInitialState(topic: string, iteration: number = 1): WorkflowState {
  return {
    topic,
    iteration,
    modelProvider: ModelProvider.TRANSFORMERS,
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

    // A-Mem Agentic Memory System
    memoryNotes: [],
    memoryLinks: [],
    memoryEvolutionQueue: [],
    memoryStats: {
      totalNotes: 0,
      totalLinks: 0,
      lastEvolution: new Date().toISOString(),
      memoryQuality: 0,
    },

    currentStep: ProcessStatus.IDLE,
    completedSteps: [],
    shouldRestart: false,
    restartFromStep: null,
    restartCount: 0,
  };
}

// Memory-enabled helper function
async function processWithMemory(
  state: WorkflowState,
  agentName: AgentName,
  output: string
): Promise<Partial<WorkflowState>> {
  console.log(`🧠 Processing ${agentName} output through A-Mem...`);
  console.log(`🧠 Current State Memory:`, {
    existingNotes: state.memoryNotes?.length || 0,
    existingLinks: state.memoryLinks?.length || 0,
    existingNotesIds: state.memoryNotes?.map(n => `${n.agentName}:${n.id}`) || []
  });

  try {
    // Step 1: Note Construction
    const memoryNote = await amemService.constructNote(
      agentName,
      output,
      state.topic,
      state.iteration,
      state.modelProvider as ModelProvider
    );

    console.log(`🧠 Created memory note:`, {
      id: memoryNote.id,
      agent: memoryNote.agentName,
      contentLength: memoryNote.content.length
    });

    // Step 2: Link Generation
    const safeExistingNotes = Array.isArray(state.memoryNotes) ? state.memoryNotes : [];
    const newLinks = await amemService.generateLinks(
      memoryNote,
      safeExistingNotes,
      state.modelProvider as ModelProvider
    );

    console.log(`🧠 Generated links:`, newLinks.length);

    // Step 3: Memory Evolution (if there are connected notes)
    let evolutionActions: any[] = [];
    if (newLinks.length > 0) {
      const connectedNoteIds = newLinks.map(link => link.targetNoteId);
      const connectedNotes = safeExistingNotes.filter(note =>
        connectedNoteIds.includes(note.id)
      );

      evolutionActions = await amemService.evolveMemories(
        memoryNote,
        connectedNotes,
        state.modelProvider as ModelProvider
      );
    }

    // Apply evolution actions to get updated state
    const evolvedState = amemService.applyEvolutionActions(state, evolutionActions);

    console.log(`🧠 Final memory state:`, {
      totalNotes: (evolvedState.memoryNotes || []).length + 1, // +1 for new note
      totalLinks: (evolvedState.memoryLinks || []).length + newLinks.length,
      newNote: memoryNote.id
    });

    return {
      ...evolvedState,
      memoryNotes: [...(evolvedState.memoryNotes || []), memoryNote],
      memoryLinks: [...(evolvedState.memoryLinks || []), ...newLinks],
      memoryEvolutionQueue: [...(evolvedState.memoryEvolutionQueue || []), ...evolutionActions],
    };

  } catch (error) {
    console.error('❌ A-Mem processing failed:', error);

    // Return original state with minimal memory update
    const fallbackNote = {
      id: `mem_fallback_${Date.now()}`,
      content: output,
      context: `Agent ${agentName} output for topic: ${state.topic}`,
      keywords: [agentName, state.topic],
      tags: [agentName, 'research'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentName,
      iteration: state.iteration,
      links: [],
      metadata: { error: 'A-Mem processing failed' }
    };

    return {
      ...state,
      memoryNotes: [...(state.memoryNotes || []), fallbackNote],
    };
  }
}

// Agent Node Implementations
export async function searchNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.SEARCHING);

  const promptTemplate = prompts?.[AgentName.SEARCH] || `You are a specialist Search Agent. Your goal is to conduct a brief, high-level literature search on the user-provided topic.
- Use your internal knowledge and any provided tool search results to gather information.
- Identify the key themes, major debates, and core concepts related to the topic.
- The output should be a concise summary that will serve as the foundation for a more detailed analysis.
- Keep your response under 100 words.

Topic: {topic}

**Tool Results:** {tool_results}`;

  const config: AgentConfig = {
    name: AgentName.SEARCH,
    promptTemplate,
  };

  // Execute tools if available
  let toolData = '';
  try {
    const results = await executeResearcherTools(state.topic, {
      includeWebSearch: true,
      includeArxivSearch: true,
    });
    toolData = formatToolResultsForPrompt(results.webResults, results.arxivResults);
  } catch (error) {
    toolData = '**Tool Results:** Tools unavailable for this research.';
  }

  // Build prompt
  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{tool_results}', toolData);

  // Track the sent prompt
  callbacks?.onPrompt?.(AgentName.SEARCH, prompt);

  // Generate content with streaming
  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.SEARCH,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed:', error);
    throw new Error(`Failed to generate search results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    // Process output through A-Mem system
    const memoryResult = await processWithMemory(state, AgentName.SEARCH, output);

    // Stream memory updates if callback is available
    if (callbacks?.onStream && memoryResult.memoryNotes && memoryResult.memoryNotes.length > 0) {
      callbacks.onStream(`[MEMORY_UPDATE] ${JSON.stringify({
        memoryNotes: memoryResult.memoryNotes,
        memoryLinks: memoryResult.memoryLinks,
        memoryStats: memoryResult.memoryStats
      })}`);
    }

    return {
      ...memoryResult,
      searchResults: [...(memoryResult.searchResults || state.searchResults), output],
      currentStep: ProcessStatus.SEARCHING,
      completedSteps: [...(memoryResult.completedSteps || state.completedSteps || []).filter(s => s !== ProcessStatus.SEARCHING), ProcessStatus.SEARCHING],
      toolResults: {
        webResults: toolData,
        localResults: '',
        errors: [],
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('❌ Search Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      searchResults: [...state.searchResults, `Error during search: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.SEARCHING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.SEARCHING), ProcessStatus.SEARCHING],
      toolResults: {
        webResults: '',
        localResults: '',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function learningsNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.LEARNING);

  const searchResults = state.searchResults.join('\n\n');
  if (!searchResults.trim()) {
    const fallback = 'No search results available for analysis.';
    callbacks?.onStream?.(fallback);
    return {
      learnings: [...state.learnings, fallback],
      currentStep: ProcessStatus.LEARNING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING],
    };
  }

  const promptTemplate = prompts?.[AgentName.LEARNINGS] || `You are an expert Learnings Agent. Your task is to generate Stylized Facts from the given topic.
- First, extract and create Stylized Facts based ONLY on the provided search results.
- Each fact should follow the format: "- Fact Name — Brief Description"
- If you have additional relevant facts from your training knowledge that would enhance the analysis, you may optionally include them after the search-based facts, clearly marking them as "Additional Facts:"
- If feedback is provided from a previous iteration, use it to guide and refine your facts.
- Keep your response under 100 words.

Topic: {topic}
Research Summary: {researchSummary}
Feedback: {feedback}`;

  const config: AgentConfig = {
    name: AgentName.LEARNINGS,
    promptTemplate,
  };

  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{researchSummary}', searchResults)
    .replace('{feedback}', state.feedback);

  // Track the sent prompt
  callbacks?.onPrompt?.(AgentName.LEARNINGS, prompt);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.LEARNINGS,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed for learnings:', error);
    throw new Error(`Failed to generate learnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    // Process output through A-Mem system
    const memoryResult = await processWithMemory(state, AgentName.LEARNINGS, output);

    // Stream memory updates if callback is available
    if (callbacks?.onStream && memoryResult.memoryNotes && memoryResult.memoryNotes.length > 0) {
      callbacks.onStream(`[MEMORY_UPDATE] ${JSON.stringify({
        memoryNotes: memoryResult.memoryNotes,
        memoryLinks: memoryResult.memoryLinks,
        memoryStats: memoryResult.memoryStats
      })}`);
    }

    return {
      ...memoryResult,
      learnings: [...(memoryResult.learnings || state.learnings), output],
      currentStep: ProcessStatus.LEARNING,
      completedSteps: [...(memoryResult.completedSteps || state.completedSteps || []).filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING],
    };
  } catch (error) {
    console.error('❌ Learnings Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      learnings: [...state.learnings, `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.LEARNING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING],
    };
  }
}

export async function opportunityAnalysisNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.OPPORTUNITY_ANALYZING);

  // Get the most recent learnings, or combine all learnings if available
  let learnings = '';
  if (state.learnings.length > 0) {
    const lastLearning = state.learnings[state.learnings.length - 1];
    if (lastLearning && lastLearning.trim()) {
      learnings = lastLearning;
    } else {
      // If last learning is empty, try to use all previous learnings
      const validLearnings = (state.learnings || []).filter(l => l && l.trim());
      if (validLearnings.length > 0) {
        learnings = validLearnings.join('\n\n---\n\n');
      }
    }
  }

  if (!learnings.trim()) {
    const fallback = 'No learnings available for opportunity analysis. The workflow may need to restart from an earlier step.';
    console.warn('⚠️ Opportunity Analysis: No valid learnings found, using fallback');
    callbacks?.onStream?.(fallback);
    return {
      opportunityAnalyses: [...state.opportunityAnalyses, fallback],
      currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.OPPORTUNITY_ANALYZING), ProcessStatus.OPPORTUNITY_ANALYZING],
      shouldRestart: true, // Force restart if no learnings available
      restartFromStep: ProcessStatus.SEARCHING,
      restartCount: state.restartCount,
    };
  }

  const promptTemplate = prompts?.[AgentName.OPPORTUNITY_ANALYSIS] || `You are an Opportunity Analysis Agent. Your role is to analyze the learnings and identify opportunities or areas needing more research by generating Stylized Questions.
- First, generate Stylized Questions based ONLY on the provided search results and learnings/facts.
- Each question should follow the format: "- Question text"
- If you have additional relevant questions from your training knowledge that would enhance the analysis, you may optionally include them after the search-based questions, clearly marking them as "Additional Questions:"
- Examine the provided learnings for completeness, depth, and quality
- Identify specific gaps in knowledge, methodology, or understanding
- Assess whether the current research is sufficient or if additional search is needed
- Make a clear recommendation: either "CONTINUE" (sufficient research) or "RESEARCH_AGAIN" (needs more research)
- If recommending "RESEARCH_AGAIN", specify what additional aspects need to be researched
- Keep your response under 100 words.

Your analysis should include:
1. **Gap Assessment**: What information is missing or inadequate?
2. **Recommendation**: "CONTINUE" or "RESEARCH_AGAIN" with justification
3. **Research Focus**: If recommending more research, specify what to focus on

**Important**: You can request search restart up to 2 times maximum. After that, you must recommend "CONTINUE" even if you feel more research is needed.

Topic: {topic}
Learnings to Analyze:
---
{generatedAnalysis}
---`;

  const config: AgentConfig = {
    name: AgentName.OPPORTUNITY_ANALYSIS,
    promptTemplate,
  };

  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{generatedAnalysis}', learnings);

  // Track the sent prompt
  callbacks?.onPrompt?.(AgentName.OPPORTUNITY_ANALYSIS, prompt);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.OPPORTUNITY_ANALYSIS,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed for opportunity analysis:', error);
    throw new Error(`Failed to generate opportunity analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Analyze output for restart keywords, but respect the 2-time limit
  const lowerOutput = output.toLowerCase();
  const restartKeywords = ['research_again', 'restart', 'search again', 'new search', 'insufficient data', 'need more research'];
  const wantsToRestart = restartKeywords.some(keyword => lowerOutput.includes(keyword));

  // Only allow restart if we haven't exceeded the limit (max 2 restarts)
  const shouldRestart = wantsToRestart && state.restartCount < 2;
  const newRestartCount = shouldRestart ? state.restartCount + 1 : state.restartCount;

  // If restart was requested but denied due to limit, modify the output to inform the user
  let finalOutput = output;
  if (wantsToRestart && !shouldRestart) {
    finalOutput = output + '\n\n[Note: Restart request denied - maximum of 2 search restarts reached. Proceeding with current research.]';
  }

    // Process output through A-Mem system
    const memoryResult = await processWithMemory(state, AgentName.OPPORTUNITY_ANALYSIS, finalOutput);

    return {
      ...memoryResult,
      opportunityAnalyses: [...(memoryResult.opportunityAnalyses || state.opportunityAnalyses), finalOutput],
      currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
      completedSteps: [...(memoryResult.completedSteps || state.completedSteps || []).filter(s => s !== ProcessStatus.OPPORTUNITY_ANALYZING), ProcessStatus.OPPORTUNITY_ANALYZING],
      shouldRestart,
      restartFromStep: shouldRestart ? ProcessStatus.SEARCHING : null,
      restartCount: newRestartCount,
    };
  } catch (error) {
    console.error('❌ Opportunity Analysis Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      opportunityAnalyses: [...state.opportunityAnalyses, `Error during opportunity analysis: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.OPPORTUNITY_ANALYZING), ProcessStatus.OPPORTUNITY_ANALYZING],
      shouldRestart: true, // Force restart on error to allow recovery
      restartFromStep: ProcessStatus.SEARCHING,
      restartCount: state.restartCount,
    };
  }
}

export async function proposerNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.PROPOSING);

  const learnings = state.learnings[state.learnings.length - 1] || '';
  const opportunityAnalysis = state.opportunityAnalyses[state.opportunityAnalyses.length - 1] || '';

  const promptTemplate = prompts?.[AgentName.PROPOSER] || `You are a Proposer Agent. Based on the learnings and opportunity analysis, propose research directions.

Topic: {topic}
Generated Analysis: {generatedAnalysis}
Opportunity Analysis: {opportunityAnalysis}

Propose specific research ideas or directions. Keep your response under 100 words.`;

  const config: AgentConfig = {
    name: AgentName.PROPOSER,
    promptTemplate,
  };

  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{generatedAnalysis}', learnings)
    .replace('{opportunityAnalysis}', opportunityAnalysis);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.PROPOSER,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed for proposer:', error);
    throw new Error(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    return {
      proposals: [...state.proposals, output],
      currentStep: ProcessStatus.PROPOSING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.PROPOSING), ProcessStatus.PROPOSING],
    };
  } catch (error) {
    console.error('❌ Proposer Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      proposals: [...state.proposals, `Error during proposal generation: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.PROPOSING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.PROPOSING), ProcessStatus.PROPOSING],
    };
  }
}

export async function noveltyCheckerNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.CHECKING_NOVELTY);

  const proposal = state.proposals[state.proposals.length - 1] || '';

  // Use tools to check novelty
  let toolData = '';
  try {
    const results = await executeResearcherTools(proposal, {
      includeWebSearch: true,
      includeArxivSearch: true,
      metadata: { purpose: 'novelty_check' }
    });
    toolData = formatToolResultsForPrompt(results.webResults, results.arxivResults);
  } catch (error) {
    toolData = '**Tool Results:** Tools unavailable for novelty check.';
  }

  const promptTemplate = prompts?.[AgentName.NOVELTY_CHECKER] || `You are a Novelty Checker Agent. Assess the novelty of the proposed research.

Proposal: {proposal}
Tool Results: {tool_results}

Assess whether this proposal is novel and identify similar existing work. Keep your response under 100 words.`;

  const config: AgentConfig = {
    name: AgentName.NOVELTY_CHECKER,
    promptTemplate,
  };

  const prompt = config.promptTemplate
    .replace('{proposal}', proposal)
    .replace('{tool_results}', toolData);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.NOVELTY_CHECKER,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed for novelty checker:', error);
    throw new Error(`Failed to generate novelty check: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    return {
      noveltyChecks: [...state.noveltyChecks, output],
      currentStep: ProcessStatus.CHECKING_NOVELTY,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.CHECKING_NOVELTY), ProcessStatus.CHECKING_NOVELTY],
    };
  } catch (error) {
    console.error('❌ Novelty Checker Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      noveltyChecks: [...state.noveltyChecks, `Error during novelty check: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.CHECKING_NOVELTY,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.CHECKING_NOVELTY), ProcessStatus.CHECKING_NOVELTY],
    };
  }
}

export async function aggregatorNode(state: WorkflowState, callbacks?: NodeCallbacks, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  try {
    // Update status immediately
    callbacks?.onStatus?.(ProcessStatus.AGGREGATING);

  const promptTemplate = prompts?.[AgentName.AGGREGATOR] || `You are an Aggregator Agent. Synthesize all the analysis into a final research report.

Topic: {topic}
Research Summary: {researchSummary}
Learnings: {learnings}
Opportunity Analysis: {opportunityAnalysis}
Proposal: {proposal}
Novelty Assessment: {noveltyAssessment}
Feedback: {feedback}

Create a comprehensive final report. Keep your response under 100 words.`;

  const config: AgentConfig = {
    name: AgentName.AGGREGATOR,
    promptTemplate,
  };

  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{researchSummary}', state.searchResults.join('\n\n'))
    .replace('{learnings}', state.learnings[state.learnings.length - 1] || '')
    .replace('{opportunityAnalysis}', state.opportunityAnalyses[state.opportunityAnalyses.length - 1] || '')
    .replace('{proposal}', state.proposals[state.proposals.length - 1] || '')
    .replace('{noveltyAssessment}', state.noveltyChecks[state.noveltyChecks.length - 1] || '')
    .replace('{feedback}', state.feedback);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.AGGREGATOR,
      prompt,
      callbacks?.llmOptions || { provider: ModelProvider.TRANSFORMERS },
      (chunk) => {
        output += chunk;
        streamingContent += chunk;

        // Send partial content to UI for real-time display
        if (callbacks?.onStream) {
          callbacks.onStream(`[STREAMING] ${chunk}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ LLM generation failed for aggregator:', error);
    throw new Error(`Failed to generate final report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    return {
      aggregations: [...state.aggregations, output],
      currentStep: ProcessStatus.AGGREGATING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.AGGREGATING), ProcessStatus.AGGREGATING],
    };
  } catch (error) {
    console.error('❌ Aggregator Node execution failed:', error);
    callbacks?.onError?.(error as Error);

    // Return a safe fallback state
    return {
      aggregations: [...state.aggregations, `Error during final report generation: ${error instanceof Error ? error.message : 'Unknown error'}`],
      currentStep: ProcessStatus.AGGREGATING,
      completedSteps: [...(state.completedSteps || []).filter(s => s !== ProcessStatus.AGGREGATING), ProcessStatus.AGGREGATING],
    };
  }
}

// Routing Functions for LangGraph.js conditional edges
export function shouldRestart(state: WorkflowState): string {
  // Only allow restart if we haven't exceeded the limit (max 2 restarts)
  const canRestart = state.shouldRestart && state.restartCount < 2;
  return canRestart ? 'search_node' : 'proposer_node';
}

export function shouldContinue(state: WorkflowState): string {
  // Check if all steps are completed
  const requiredSteps = [
    ProcessStatus.SEARCHING,
    ProcessStatus.LEARNING,
    ProcessStatus.OPPORTUNITY_ANALYZING,
    ProcessStatus.PROPOSING,
    ProcessStatus.CHECKING_NOVELTY,
    ProcessStatus.AGGREGATING,
  ];

  const completed = requiredSteps.every(step => (state.completedSteps || []).includes(step));
  return completed ? 'END' : 'continue';
}

// Create the workflow graph
export function createWorkflowGraph() {
  // This is now handled in langgraphService_LG.ts with the web entrypoint
  throw new Error('Use createLangGraphWorkflow() from langgraphService_LG.ts instead');
}

// Helper function to get current iteration data
export function getAgentContent(state: WorkflowState | null, agentName: AgentName): string {
  if (!state) return '';

  switch (agentName) {
    case AgentName.SEARCH:
      return state.searchResults[state.searchResults.length - 1] || '';
    case AgentName.LEARNINGS:
      return state.learnings[state.learnings.length - 1] || '';
    case AgentName.OPPORTUNITY_ANALYSIS:
      return state.opportunityAnalyses[state.opportunityAnalyses.length - 1] || '';
    case AgentName.PROPOSER:
      return state.proposals[state.proposals.length - 1] || '';
    case AgentName.NOVELTY_CHECKER:
      return state.noveltyChecks[state.noveltyChecks.length - 1] || '';
    case AgentName.AGGREGATOR:
      return state.aggregations[state.aggregations.length - 1] || '';
    default:
      return '';
  }
}

export function getAgentIterationCount(state: WorkflowState | null, agentName: AgentName): number {
  if (!state) return 0;

  switch (agentName) {
    case AgentName.SEARCH:
      return state.searchResults.length;
    case AgentName.LEARNINGS:
      return state.learnings.length;
    case AgentName.OPPORTUNITY_ANALYSIS:
      return state.opportunityAnalyses.length;
    case AgentName.PROPOSER:
      return state.proposals.length;
    case AgentName.NOVELTY_CHECKER:
      return state.noveltyChecks.length;
    case AgentName.AGGREGATOR:
      return state.aggregations.length;
    default:
      return 0;
  }
}

// State Validation Functions

/**
 * Comprehensive workflow state validation
 */
export function validateWorkflowState(
  state: WorkflowState | null,
  options: StateValidationOptions = {}
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!state) {
    result.isValid = false;
    result.errors.push('State is null or undefined');
    return result;
  }

  // Basic field validation
  if (!state.topic || typeof state.topic !== 'string' || state.topic.trim().length === 0) {
    result.errors.push('Topic is required and must be a non-empty string');
    result.isValid = false;
  }

  if (typeof state.iteration !== 'number' || state.iteration < 1) {
    result.errors.push('Iteration must be a positive number');
    result.isValid = false;
  }

  if (!state.modelProvider || typeof state.modelProvider !== 'string') {
    result.errors.push('Model provider is required');
    result.isValid = false;
  }

  // Array validation
  if (options.checkArrays !== false) {
    validateArray(state.searchResults, 'searchResults', result);
    validateArray(state.learnings, 'learnings', result);
    validateArray(state.opportunityAnalyses, 'opportunityAnalyses', result);
    validateArray(state.proposals, 'proposals', result);
    validateArray(state.noveltyChecks, 'noveltyChecks', result);
    validateArray(state.aggregations, 'aggregations', result);
    validateArray(state.completedSteps, 'completedSteps', result);

    // A-Mem memory fields validation
    validateArray(state.memoryNotes || [], 'memoryNotes', result);
    validateArray(state.memoryLinks || [], 'memoryLinks', result);
    validateArray(state.memoryEvolutionQueue || [], 'memoryEvolutionQueue', result);
  }

  // Completion state validation
  if (options.checkCompletions !== false) {
    validateCompletionState(state, result);
  }

  // Workflow logic validation
  validateWorkflowLogic(state, result);

  // Convert warnings to errors if strict mode
  if (options.strict && result.warnings.length > 0) {
    result.errors.push(...result.warnings);
    result.warnings = [];
    result.isValid = result.errors.length === 0;
  }

  return result;
}

/**
 * Validate array fields for proper structure
 */
function validateArray(array: any[], fieldName: string, result: ValidationResult): void {
  if (!Array.isArray(array)) {
    result.errors.push(`${fieldName} must be an array`);
    result.isValid = false;
    return;
  }

  // Check for null/undefined elements
  const invalidElements = array.filter((item, index) => {
    if (item === null || item === undefined) {
      result.warnings.push(`${fieldName}[${index}] is null or undefined`);
      return true;
    }
    return false;
  });

  // Check for empty strings in critical arrays
  if (['searchResults', 'learnings'].includes(fieldName)) {
    const emptyStrings = array.filter((item, index) => typeof item === 'string' && item.trim().length === 0);
    if (emptyStrings.length > 0) {
      result.warnings.push(`${fieldName} contains ${emptyStrings.length} empty strings`);
    }
  }
}

/**
 * Validate completion state consistency
 */
function validateCompletionState(state: WorkflowState, result: ValidationResult): void {
  // Check for logical completion order
  const hasSearch = (state.completedSteps || []).includes(ProcessStatus.SEARCHING);
  const hasLearnings = (state.completedSteps || []).includes(ProcessStatus.LEARNING);
  const hasOpportunity = (state.completedSteps || []).includes(ProcessStatus.OPPORTUNITY_ANALYZING);

  if (hasLearnings && !hasSearch) {
    result.warnings.push('Learnings completed but search not completed');
  }

  if (hasOpportunity && (!hasSearch || !hasLearnings)) {
    result.warnings.push('Opportunity analysis completed but prerequisites not completed');
  }

  // Check for data consistency
  if (hasSearch && state.searchResults.length === 0) {
    result.warnings.push('Search completed but no search results found');
  }

  if (hasLearnings && state.learnings.length === 0) {
    result.warnings.push('Learnings completed but no learnings generated');
  }
}

/**
 * Validate workflow logic and state transitions
 */
function validateWorkflowLogic(state: WorkflowState, result: ValidationResult): void {
  // Check restart count limits
  if (state.restartCount > 2) {
    result.warnings.push(`Restart count (${state.restartCount}) exceeds recommended limit of 2`);
  }

  // Check for restart without search results
  if (state.shouldRestart && state.searchResults.length === 0) {
    result.warnings.push('Restart requested but no search results available');
  }

  // Check for inconsistent current step
  if (state.currentStep === ProcessStatus.IDLE && (state.completedSteps || []).length > 0) {
    result.warnings.push('Workflow is idle but has completed steps');
  }

  // Check for missing required transitions
  const expectedOrder = [
    ProcessStatus.SEARCHING,
    ProcessStatus.LEARNING,
    ProcessStatus.OPPORTUNITY_ANALYZING
  ];

  for (let i = 0; i < expectedOrder.length - 1; i++) {
    const currentStep = expectedOrder[i];
    const nextStep = expectedOrder[i + 1];

    if ((state.completedSteps || []).includes(nextStep) && !(state.completedSteps || []).includes(currentStep)) {
      result.warnings.push(`${nextStep} completed but ${currentStep} was not`);
    }
  }
}

/**
 * Sanitize and repair workflow state
 */
export function sanitizeWorkflowState(state: WorkflowState): WorkflowState {
  const sanitized = { ...state };

  // Remove null/undefined from arrays
  sanitized.searchResults = state.searchResults?.filter(item => item != null) || [];
  sanitized.learnings = state.learnings?.filter(item => item != null) || [];
  sanitized.opportunityAnalyses = state.opportunityAnalyses?.filter(item => item != null) || [];
  sanitized.proposals = state.proposals?.filter(item => item != null) || [];
  sanitized.noveltyChecks = state.noveltyChecks?.filter(item => item != null) || [];
  sanitized.aggregations = state.aggregations?.filter(item => item != null) || [];
  sanitized.completedSteps = state.completedSteps?.filter(step => step != null) || [];

  // Ensure topic is trimmed
  sanitized.topic = state.topic?.trim() || '';

  // Ensure iteration is valid
  sanitized.iteration = Math.max(1, Math.floor(state.iteration || 1));

  // Cap restart count
  sanitized.restartCount = Math.min(2, Math.max(0, state.restartCount || 0));

  // Initialize A-Mem memory fields if they don't exist (for backward compatibility)
  sanitized.memoryNotes = state.memoryNotes || [];
  sanitized.memoryLinks = state.memoryLinks || [];
  sanitized.memoryEvolutionQueue = state.memoryEvolutionQueue || [];
  sanitized.memoryStats = state.memoryStats || {
    totalNotes: 0,
    totalLinks: 0,
    lastEvolution: new Date().toISOString(),
    memoryQuality: 0,
  };

  return sanitized;
}
