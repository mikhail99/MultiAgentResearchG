import { AgentName, StylizedFact } from '@shared/types';

/**
 * Utility functions for data formatting and export
 * Handles conversion of internal data structures to various output formats
 */

/**
 * Formats a topic string for use in filenames
 * @param topic - The topic string to format
 * @returns Formatted topic string safe for filenames
 */
export const formatTopicForFilename = (topic: string): string => {
  return topic.replace(/\s+/g, '_').toLowerCase();
};

/**
 * Generates a timestamp string safe for filenames
 * @returns Formatted timestamp string
 */
export const formatTimestampForFilename = (): string => {
  return new Date().toISOString().replace(/[:.]/g, '-');
};

/**
 * Formats stylized facts as markdown text
 * @param facts - Array of stylized facts
 * @returns Formatted markdown string
 */
export const formatFactsAsMarkdown = (facts: StylizedFact[]): string => {
  if (facts.length === 0) {
    return 'No stylized facts were generated.';
  }

  return facts.map(f => `- **${f.fact}**: ${f.description}`).join('\n');
};

/**
 * Formats stylized questions as markdown text
 * @param questions - Array of questions
 * @returns Formatted markdown string
 */
export const formatQuestionsAsMarkdown = (questions: string[]): string => {
  if (questions.length === 0) {
    return 'No stylized questions were generated.';
  }

  return questions.map(q => `- ${q}`).join('\n');
};

/**
 * Formats agent content as markdown
 * @param agentName - Name of the agent
 * @param content - Agent's output content
 * @returns Formatted markdown section
 */
export const formatAgentContentAsMarkdown = (agentName: string, content: string): string => {
  return `### ${agentName}
**Output:**
${content || 'No output generated'}

---`;
};

/**
 * Creates a complete markdown report for a workflow run
 * @param params - Parameters for the report
 * @returns Complete markdown report
 */
export interface MarkdownReportParams {
  topic: string;
  iteration: number;
  modelProvider: string;
  agentContents: Record<string, string>;
  factsText: string;
  questionsText: string;
  currentThreadId?: string;
  workflowState?: any; // TODO: Add proper type
}

export const generateMarkdownReport = (params: MarkdownReportParams): string => {
  const {
    topic,
    iteration,
    modelProvider,
    agentContents,
    factsText,
    questionsText,
    currentThreadId,
    workflowState
  } = params;

  return `
# Multi-Agent Run Report (LangGraph)

- **Topic**: ${topic}
- **Iteration**: ${iteration}
- **Date**: ${new Date().toLocaleString()}
- **Model Provider**: ${modelProvider}
- **Framework**: LangGraph.js

---

## Agent Outputs

${Object.entries(agentContents)
  .map(([agentName, content]) => formatAgentContentAsMarkdown(agentName, content))
  .join('\n\n')}

---

## Human-in-the-Loop Feedback

\`\`\`
No feedback provided for this iteration.
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
- **Completed Steps**: ${workflowState?.completedSteps?.join(', ') || 'None'}
- **Restart Count**: ${iteration - 1}
- **Workflow State**: ${workflowState ? 'Active' : 'Inactive'}
  `.trim();
};

/**
 * Creates a JSON export of the workflow session
 * @param params - Parameters for the JSON export
 * @returns Formatted JSON data
 */
export interface JsonExportParams {
  topic: string;
  iteration: number;
  modelProvider: string;
  workflowState: any; // TODO: Add proper type
  stylizedFacts: StylizedFact[];
  stylizedQuestions: string[];
  currentThreadId?: string;
}

export const generateJsonExport = (params: JsonExportParams): object => {
  const {
    topic,
    iteration,
    modelProvider,
    workflowState,
    stylizedFacts,
    stylizedQuestions,
    currentThreadId
  } = params;

  return {
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
};
