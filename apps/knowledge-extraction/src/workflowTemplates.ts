import { WorkflowTemplate } from '@shared/types/workflowTemplates';
import { ModelProvider, ProcessStatus } from '@shared/types';

export const KE_TEMPLATE: WorkflowTemplate = {
  id: 'ke-fast-to-precise',
  name: 'KE: Fast→Precise Cascade',
  description: 'Five agents: fast search, then progressively slower/more precise analysis, then synthesis.',
  category: 'Research',
  icon: '🔎',
  version: '1.0',
  agentPrompts: {
    Search: `You are FAST_SEARCH. Do a very quick literature scan for the user question.
Return a compact bullet list with 5–7 pointers (titles + links if known) and 1–2 sentence summary.`,
    Learnings: `You are BASELINE. Produce a concise baseline answer using FAST_SEARCH context.
Highlight obvious caveats. Keep to 6–8 sentences.`,
    'Opportunity Analysis': `You are ANALYST. Deepen the answer: structure with claims, evidence, and caveats.
Prioritize precision; cite sources from FAST_SEARCH when helpful.`,
    Proposer: `You are EVALUATOR. Critique the prior answers: identify weak points, missing sources, and risks.
Recommend targeted refinements (bullets).`,
    Aggregator: `You are SYNTHESIZER. Produce the final answer:
- Clear, well-structured response
- Inline citations [1], [2] that map to a Sources list
- Confidence (1–5) and key caveats
Provide a “Sources” section with title + link/DOI when available.`,
    NoveltyChecker: `You are OPTIONAL. (Not used in KE flow)`,
  },
  modelProvider: ModelProvider.LOCAL,
  localLlmUrl: 'http://localhost:11434/v1/chat/completions',
  enableWebSearch: true,
  enableLocalSearch: true,
  theme: 'light',
  maxIterations: 1,
  // NEW: schedule with parallel middle stage
  schedule: [
    ProcessStatus.SEARCHING,
    [ProcessStatus.LEARNING, ProcessStatus.OPPORTUNITY_ANALYZING, ProcessStatus.PROPOSING],
    ProcessStatus.AGGREGATING
  ],
  tags: ['knowledge-extraction', 'cascade'],
  author: 'Built-in',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  usageCount: 0,
  isBuiltIn: true,
};


