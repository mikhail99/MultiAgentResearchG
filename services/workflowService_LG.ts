// Browser-compatible workflow service (no LangGraph.js dependencies)
import { WorkflowState, NodeResult, AgentConfig } from '../types/workflow_LG';
import { AgentName, ProcessStatus, ModelProvider } from '../types';
import { generateContentStream } from './geminiService';
import { executeResearcherTools, formatToolResultsForPrompt } from './toolService';

// Initial state factory
export function createInitialState(topic: string, iteration: number = 1): WorkflowState {
  return {
    topic,
    iteration,
    modelProvider: ModelProvider.LOCAL,
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
  };
}

// Agent Node Implementations
export async function searchNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}): Promise<Partial<WorkflowState>> {
  console.log('🔍 Executing Search Node');

  // Update status immediately
  callbacks?.onStatus?.(ProcessStatus.SEARCHING);

  const config: AgentConfig = {
    name: AgentName.SEARCH,
    promptTemplate: `You are a specialist Search Agent. Your goal is to conduct a brief, high-level literature search on the user-provided topic.
- Use your internal knowledge and any provided tool search results to gather information.
- Identify the key themes, major debates, and core concepts related to the topic.
- The output should be a concise summary that will serve as the foundation for a more detailed analysis.
- Keep your response under 100 words.

Topic: {topic}

**Tool Results:** {tool_results}`,
  };

  // Execute tools if available
  let toolData = '';
  try {
    const results = await executeResearcherTools(state.topic, {
      includeWebSearch: true,
      includeLocalSearch: true,
    });
    toolData = formatToolResultsForPrompt(results.webResults, results.localResults);
  } catch (error) {
    toolData = '**Tool Results:** Tools unavailable for this research.';
  }

  // Build prompt
  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{tool_results}', toolData);

  // Generate content with streaming
  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.SEARCH,
      prompt,
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed, using fallback response:', error);
    // Fallback response when local LLM is not available
    const fallback = `Fallback search results for "${state.topic}":

Based on general knowledge about ${state.topic}, here are key themes and concepts:

1. **Core Definition**: ${state.topic} refers to AI systems capable of logical reasoning and decision-making.

2. **Key Applications**: Used in problem-solving, planning, and complex decision scenarios.

3. **Current Trends**: Integration with machine learning and neural networks for enhanced performance.

4. **Challenges**: Handling uncertainty, computational complexity, and real-world constraints.

**Tool Results:** ${toolData}

This is a fallback response generated when the local LLM service is unavailable. Please ensure Ollama is running with a compatible model (e.g., 'qwen3:4b').`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
  }

  return {
    searchResults: [...state.searchResults, output],
    currentStep: ProcessStatus.SEARCHING,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.SEARCHING), ProcessStatus.SEARCHING],
    toolResults: {
      webResults: toolData,
      localResults: '',
      errors: [],
      timestamp: new Date().toISOString(),
    },
  };
}

export async function learningsNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}): Promise<Partial<WorkflowState>> {
  console.log('📚 Executing Learnings Node');

  // Update status immediately
  callbacks?.onStatus?.(ProcessStatus.LEARNING);

  const searchResults = state.searchResults.join('\n\n');
  if (!searchResults.trim()) {
    const fallback = 'No search results available for analysis.';
    callbacks?.onStream?.(fallback);
    return {
      learnings: [...state.learnings, fallback],
      currentStep: ProcessStatus.LEARNING,
      completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING],
    };
  }

  const config: AgentConfig = {
    name: AgentName.LEARNINGS,
    promptTemplate: `You are an expert Learnings Agent. Your task is to generate Stylized Facts from the given topic.
- First, extract and create Stylized Facts based ONLY on the provided search results.
- Each fact should follow the format: "- Fact Name — Brief Description"
- If you have additional relevant facts from your training knowledge that would enhance the analysis, you may optionally include them after the search-based facts, clearly marking them as "Additional Facts:"
- If feedback is provided from a previous iteration, use it to guide and refine your facts.
- Keep your response under 100 words.

Topic: {topic}
Research Summary: {researchSummary}
Feedback: {feedback}`,
  };

  const prompt = config.promptTemplate
    .replace('{topic}', state.topic)
    .replace('{researchSummary}', searchResults)
    .replace('{feedback}', state.feedback);

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.LEARNINGS,
      prompt,
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed for learnings, using fallback:', error);
    const fallback = `Fallback analysis for "${state.topic}":

Based on the search results, I can identify several key themes:

1. **Research Foundation**: The search results provide a solid foundation for understanding ${state.topic}

2. **Key Insights**: Multiple perspectives and approaches are represented in the research

3. **Knowledge Gaps**: Some areas require deeper investigation and more recent studies

4. **Practical Applications**: Real-world implementation considerations and challenges

**Recommendation**: More research needed in emerging trends and recent developments.

This is a fallback analysis generated when the local LLM service is unavailable.`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
  }

  return {
    learnings: [...state.learnings, output],
    currentStep: ProcessStatus.LEARNING,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.LEARNING), ProcessStatus.LEARNING],
  };
}

export async function opportunityAnalysisNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  console.log('🎯 Executing Opportunity Analysis Node');

  // Update status immediately
  callbacks?.onStatus?.(ProcessStatus.OPPORTUNITY_ANALYZING);

  const learnings = state.learnings[state.learnings.length - 1] || '';
  if (!learnings.trim()) {
    const fallback = 'No learnings available for opportunity analysis.';
    callbacks?.onStream?.(fallback);
    return {
      opportunityAnalyses: [...state.opportunityAnalyses, fallback],
      currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
      completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.OPPORTUNITY_ANALYZING), ProcessStatus.OPPORTUNITY_ANALYZING],
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

  let output = '';
  let streamingContent = '';

  try {
    await generateContentStream(
      AgentName.OPPORTUNITY_ANALYSIS,
      prompt,
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed for opportunity analysis, using fallback:', error);
    const fallback = `Fallback opportunity analysis for "${state.topic}":

After reviewing the learnings, I recommend continuing with the current research direction:

**Assessment**: The learnings provide sufficient depth for meaningful analysis.

**Recommendation**: Proceed with proposal development using the current research foundation.

**No restart needed**: The available information is adequate for the next steps in the research process.

This is a fallback analysis generated when the local LLM service is unavailable.`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI for real-time display
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
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

  return {
    opportunityAnalyses: [...state.opportunityAnalyses, finalOutput],
    currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.OPPORTUNITY_ANALYZING), ProcessStatus.OPPORTUNITY_ANALYZING],
    shouldRestart,
    restartFromStep: shouldRestart ? ProcessStatus.SEARCHING : null,
    restartCount: newRestartCount,
  };
}

export async function proposerNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  console.log('💡 Executing Proposer Node');

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
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed for proposer, using fallback:', error);
    const fallback = `Fallback research proposal for "${state.topic}":

**Proposed Research Direction**:

1. **Problem Statement**: Address key challenges in ${state.topic} implementation and optimization

2. **Methodology**: Combine theoretical analysis with practical implementation approaches

3. **Expected Outcomes**: Improved understanding and new techniques for ${state.topic} applications

4. **Impact**: Contribute to the advancement of AI reasoning and decision-making systems

**Implementation Plan**:
- Conduct thorough literature review
- Develop proof-of-concept implementation
- Evaluate performance and limitations
- Identify areas for future research

This is a fallback proposal generated when the local LLM service is unavailable.`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI for real-time display
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
  }

  return {
    proposals: [...state.proposals, output],
    currentStep: ProcessStatus.PROPOSING,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.PROPOSING), ProcessStatus.PROPOSING],
  };
}

export async function noveltyCheckerNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  console.log('🔍 Executing Novelty Checker Node');

  // Update status immediately
  callbacks?.onStatus?.(ProcessStatus.CHECKING_NOVELTY);

  const proposal = state.proposals[state.proposals.length - 1] || '';

  // Use tools to check novelty
  let toolData = '';
  try {
    const results = await executeResearcherTools(proposal, {
      includeWebSearch: true,
      includeLocalSearch: true,
      metadata: { purpose: 'novelty_check' }
    });
    toolData = formatToolResultsForPrompt(results.webResults, results.localResults);
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
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed for novelty checker, using fallback:', error);
    const fallback = `Fallback novelty assessment for the proposed research:

**Novelty Analysis**:
The proposal appears to build upon existing work in ${state.topic} while potentially offering new perspectives or approaches.

**Similar Work**: Related research exists in the field, but this proposal may offer unique contributions.

**Recommendation**: The research direction is promising and warrants further investigation.

**Risk Assessment**: Moderate - builds on existing knowledge while exploring new applications.

This is a fallback assessment generated when the local LLM service is unavailable.`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI for real-time display
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
  }

  return {
    noveltyChecks: [...state.noveltyChecks, output],
    currentStep: ProcessStatus.CHECKING_NOVELTY,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.CHECKING_NOVELTY), ProcessStatus.CHECKING_NOVELTY],
  };
}

export async function aggregatorNode(state: WorkflowState, callbacks?: {
  onStatus?: (status: string) => void;
  onStream?: (chunk: string) => void;
}, prompts?: Record<string, string>): Promise<Partial<WorkflowState>> {
  console.log('📊 Executing Aggregator Node');

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
      { provider: ModelProvider.LOCAL, url: 'http://localhost:11434/v1/chat/completions' },
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
    console.warn('Local LLM failed for aggregator, using fallback:', error);
    const fallback = `# Final Research Report: ${state.topic}

## Executive Summary
This report synthesizes the research findings on ${state.topic} based on the analysis conducted.

## Key Findings
1. **Search Results**: Comprehensive research foundation established
2. **Learnings**: Multiple perspectives and approaches identified
3. **Gap Analysis**: Current research direction deemed appropriate
4. **Proposal**: Research plan developed with clear objectives
5. **Novelty Assessment**: Proposal shows promise for meaningful contributions

## Research Recommendations
- **Continue Current Direction**: The proposed research path is well-founded
- **Focus Areas**: Implementation, evaluation, and real-world application
- **Next Steps**: Develop detailed methodology and conduct pilot studies

## Conclusion
The research on ${state.topic} shows strong potential for advancing the field. The proposed approach combines solid theoretical foundations with practical considerations.

*This is a fallback report generated when the local LLM service is unavailable.*`;

    output = fallback;
    streamingContent = fallback;

    // Send fallback content to UI for real-time display
    if (callbacks?.onStream) {
      callbacks.onStream(fallback);
    }
  }

  return {
    aggregations: [...state.aggregations, output],
    currentStep: ProcessStatus.AGGREGATING,
    completedSteps: [...state.completedSteps.filter(s => s !== ProcessStatus.AGGREGATING), ProcessStatus.AGGREGATING],
  };
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

  const completed = requiredSteps.every(step => state.completedSteps.includes(step));
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
