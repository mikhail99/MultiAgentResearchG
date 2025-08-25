// LangGraph.js with web environment support
import { StateGraph, START, END, Annotation } from "@langchain/langgraph/web";
import { WorkflowState } from '../types/workflow_LG';
import { ProcessStatus } from '../types';
import { createInitialState, shouldRestart, shouldContinue } from './workflowService_LG';

// Define proper LangGraph.js state using Annotations
const WorkflowStateAnnotation = Annotation.Root({
  topic: Annotation<string>({
    value: (x, y) => y ?? x ?? '',
  }),
  iteration: Annotation<number>({
    value: (x, y) => y ?? x ?? 1,
  }),
  modelProvider: Annotation<string>({
    value: (x, y) => y ?? x ?? 'LOCAL',
  }),
  feedback: Annotation<string>({
    value: (x, y) => y ?? x ?? '',
  }),
  searchResults: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  learnings: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  opportunityAnalyses: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  proposals: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  noveltyChecks: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  aggregations: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  stylizedFacts: Annotation<Array<{ fact: string; description: string }>>({
    value: (x, y) => y ?? x ?? [],
  }),
  stylizedQuestions: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  toolResults: Annotation<{
    webResults?: string;
    localResults?: string;
    errors: string[];
    timestamp: string;
  } | null>({
    value: (x, y) => y ?? x ?? null,
  }),
  currentStep: Annotation<string>({
    value: (x, y) => y ?? x ?? 'IDLE',
  }),
  completedSteps: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
  }),
  shouldRestart: Annotation<boolean>({
    value: (x, y) => y ?? x ?? false,
  }),
  restartFromStep: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
  }),
  restartCount: Annotation<number>({
    value: (x, y) => y ?? x ?? 0,
  }),
});

// Create the LangGraph.js StateGraph for web environments using proper Annotation pattern
async function createLangGraphWorkflow() {
  // Use the Annotation-defined state
  const workflow = new StateGraph(WorkflowStateAnnotation);

  // Import workflow nodes - using direct imports for web compatibility
  const {
    searchNode: searchNodeFn,
    learningsNode: learningsNodeFn,
    opportunityAnalysisNode: opportunityAnalysisNodeFn,
    proposerNode: proposerNodeFn,
    noveltyCheckerNode: noveltyCheckerNodeFn,
    aggregatorNode: aggregatorNodeFn
  } = await import('./workflowService_LG');

  const searchNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    return searchNodeFn(state as WorkflowState, callbacks);
  };

  const learningsNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    return learningsNodeFn(state as WorkflowState, callbacks);
  };

  const opportunityAnalysisNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    const prompts = (globalThis as any).__workflowPrompts;
    return opportunityAnalysisNodeFn(state as WorkflowState, callbacks, prompts);
  };

  const proposerNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    const prompts = (globalThis as any).__workflowPrompts;
    return proposerNodeFn(state as WorkflowState, callbacks, prompts);
  };

  const noveltyCheckerNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    const prompts = (globalThis as any).__workflowPrompts;
    return noveltyCheckerNodeFn(state as WorkflowState, callbacks, prompts);
  };

  const aggregatorNode = async (state: typeof WorkflowStateAnnotation.State) => {
    const callbacks = (globalThis as any).__langgraphCallbacks;
    const prompts = (globalThis as any).__workflowPrompts;
    return aggregatorNodeFn(state as WorkflowState, callbacks, prompts);
  };

  // Define node names as constants with proper typing
  const SEARCH_NODE = "search_node" as const;
  const LEARNINGS_NODE = "learnings_node" as const;
  const OPPORTUNITY_ANALYSIS_NODE = "opportunity_analysis_node" as const;
  const PROPOSER_NODE = "proposer_node" as const;
  const NOVELTY_CHECKER_NODE = "novelty_checker_node" as const;
  const AGGREGATOR_NODE = "aggregator_node" as const;

  // Add nodes to the graph
  workflow.addNode(SEARCH_NODE, searchNode);
  workflow.addNode(LEARNINGS_NODE, learningsNode);
  workflow.addNode(OPPORTUNITY_ANALYSIS_NODE, opportunityAnalysisNode);
  workflow.addNode(PROPOSER_NODE, proposerNode);
  workflow.addNode(NOVELTY_CHECKER_NODE, noveltyCheckerNode);
  workflow.addNode(AGGREGATOR_NODE, aggregatorNode);

  // Define edges using the typed constants with type assertions
  (workflow as any).addEdge(START, SEARCH_NODE);
  (workflow as any).addEdge(SEARCH_NODE, LEARNINGS_NODE);
  (workflow as any).addEdge(LEARNINGS_NODE, OPPORTUNITY_ANALYSIS_NODE);

  // Conditional edge for restart logic with 2-time limit
  (workflow as any).addConditionalEdges(OPPORTUNITY_ANALYSIS_NODE, (state: typeof WorkflowStateAnnotation.State) => {
    const workflowState = state as WorkflowState;
    // Only allow restart if we haven't exceeded the limit (max 2 restarts)
    const canRestart = workflowState.shouldRestart && workflowState.restartCount < 2;
    return canRestart ? SEARCH_NODE : PROPOSER_NODE;
  });

  (workflow as any).addEdge(PROPOSER_NODE, NOVELTY_CHECKER_NODE);
  (workflow as any).addEdge(NOVELTY_CHECKER_NODE, AGGREGATOR_NODE);
  (workflow as any).addEdge(AGGREGATOR_NODE, END);

  return workflow.compile();
}

// Create and cache the compiled workflow
let compiledWorkflow: any = null;

async function getCompiledWorkflow(callbacks?: { onStatus?: (status: string) => void; onStream?: (chunk: string) => void; prompts?: Record<string, string> }) {
  if (!compiledWorkflow || callbacks) {
    // Set the callbacks for the current execution
    if (callbacks) {
      (globalThis as any).__langgraphCallbacks = callbacks;
      // Set prompts if provided
      if (callbacks.prompts) {
        (globalThis as any).__workflowPrompts = callbacks.prompts;
      }
    }
    compiledWorkflow = await createLangGraphWorkflow();
  }

  return compiledWorkflow;
}

export interface WorkflowRunOptions {
  threadId?: string;
  onChunk?: (chunk: Partial<WorkflowState>) => void;
  config?: {
    recursionLimit?: number;
    maxRestarts?: number;
  };
  prompts?: Record<string, string>;
}

export class LangGraphWebService {
  private static instance: LangGraphWebService;

  static getInstance(): LangGraphWebService {
    if (!LangGraphWebService.instance) {
      LangGraphWebService.instance = new LangGraphWebService();
    }
    return LangGraphWebService.instance;
  }

  /**
   * Start a new workflow run (Using LangGraph.js web entrypoint)
   */
  async startWorkflow(
    topic: string,
    options: WorkflowRunOptions = {}
  ): Promise<WorkflowState> {
    const threadId = options.threadId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialState = createInitialState(topic);

    // Create workflow with callbacks for streaming and status updates
    let accumulatedSearchContent = '';
    let accumulatedLearningsContent = '';
    let accumulatedOpportunityContent = '';
    let accumulatedProposalContent = '';
    let accumulatedNoveltyContent = '';
    let accumulatedAggregationContent = '';
    let currentAgent = ProcessStatus.SEARCHING;

    const workflowCallbacks = {
      onStatus: (status: string) => {
        currentAgent = status as ProcessStatus;
        // Call the chunk callback with status update
        if (options.onChunk) {
          options.onChunk({ currentStep: status } as Partial<WorkflowState>);
        }
      },
      onStream: (chunk: string) => {
        // Handle streaming based on current agent
        if (chunk.includes('[STREAMING]')) {
          const cleanChunk = chunk.replace('[STREAMING] ', '');

          if (currentAgent === ProcessStatus.SEARCHING) {
            accumulatedSearchContent += cleanChunk;
            if (options.onChunk && accumulatedSearchContent.length > 0) {
              options.onChunk({
                searchResults: [accumulatedSearchContent],
                currentStep: ProcessStatus.SEARCHING,
              } as Partial<WorkflowState>);
            }
          } else if (currentAgent === ProcessStatus.LEARNING) {
            accumulatedLearningsContent += cleanChunk;
            if (options.onChunk && accumulatedLearningsContent.length > 0) {
              options.onChunk({
                learnings: [accumulatedLearningsContent],
                currentStep: ProcessStatus.LEARNING,
              } as Partial<WorkflowState>);
            }
          } else if (currentAgent === ProcessStatus.OPPORTUNITY_ANALYZING) {
            accumulatedOpportunityContent += cleanChunk;
            if (options.onChunk && accumulatedOpportunityContent.length > 0) {
              options.onChunk({
                opportunityAnalyses: [accumulatedOpportunityContent],
                currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
              } as Partial<WorkflowState>);
            }
          } else if (currentAgent === ProcessStatus.PROPOSING) {
            accumulatedProposalContent += cleanChunk;
            if (options.onChunk && accumulatedProposalContent.length > 0) {
              options.onChunk({
                proposals: [accumulatedProposalContent],
                currentStep: ProcessStatus.PROPOSING,
              } as Partial<WorkflowState>);
            }
          } else if (currentAgent === ProcessStatus.CHECKING_NOVELTY) {
            accumulatedNoveltyContent += cleanChunk;
            if (options.onChunk && accumulatedNoveltyContent.length > 0) {
              options.onChunk({
                noveltyChecks: [accumulatedNoveltyContent],
                currentStep: ProcessStatus.CHECKING_NOVELTY,
              } as Partial<WorkflowState>);
            }
          } else if (currentAgent === ProcessStatus.AGGREGATING) {
            accumulatedAggregationContent += cleanChunk;
            if (options.onChunk && accumulatedAggregationContent.length > 0) {
              options.onChunk({
                aggregations: [accumulatedAggregationContent],
                currentStep: ProcessStatus.AGGREGATING,
              } as Partial<WorkflowState>);
            }
          }
        }

        console.log(`📝 Streaming: ${chunk.substring(0, 100)}...`);
      }
    };

    const workflow = await getCompiledWorkflow({ ...workflowCallbacks, prompts: options.prompts });

    try {
      console.log(`🚀 Starting LangGraph.js workflow for topic: ${topic}`);

      // Stream the workflow execution
      const stream = await workflow.stream(
        initialState,
        {
          configurable: {
            thread_id: threadId,
          },
          streamMode: "values",
          recursionLimit: options.config?.recursionLimit || 50,
        }
      );

      let finalState = initialState;

      // Process the stream
      for await (const chunk of stream) {
        finalState = { ...finalState, ...chunk };

        // Call chunk callback if provided
        if (options.onChunk) {
          options.onChunk(chunk);
        }

        console.log(`📦 Workflow chunk: ${Object.keys(chunk).join(', ')}`);
      }

      console.log(`✅ LangGraph.js workflow completed for thread: ${threadId}`);
      return finalState;

    } catch (error) {
      console.error(`❌ LangGraph.js workflow failed for thread: ${threadId}`, error);
      throw error;
    }
  }

  /**
   * Continue a workflow with feedback (human-in-the-loop)
   */
  async continueWorkflow(
    threadId: string,
    feedback: string,
    options: WorkflowRunOptions = {}
  ): Promise<WorkflowState> {
    try {
      console.log(`🔄 Continuing workflow with feedback: ${threadId}`);

      // Get the current state from the workflow
      const currentState = await this.getWorkflowState(threadId);

      if (!currentState) {
        throw new Error(`No workflow state found for thread: ${threadId}`);
      }

      // Update state with feedback and increment iteration
      const updatedState = {
        ...currentState,
        feedback,
        iteration: currentState.iteration + 1,
      };

      // Create workflow with callbacks for streaming and status updates
      let accumulatedSearchContent = '';
      let accumulatedLearningsContent = '';
      let accumulatedOpportunityContent = '';
      let accumulatedProposalContent = '';
      let accumulatedNoveltyContent = '';
      let accumulatedAggregationContent = '';
      let currentAgent = ProcessStatus.SEARCHING;

      const workflowCallbacks = {
        onStatus: (status: string) => {
          currentAgent = status as ProcessStatus;
          if (options.onChunk) {
            options.onChunk({ currentStep: status } as Partial<WorkflowState>);
          }
        },
        onStream: (chunk: string) => {
          // Handle streaming based on current agent
          if (chunk.includes('[STREAMING]')) {
            const cleanChunk = chunk.replace('[STREAMING] ', '');

            if (currentAgent === ProcessStatus.SEARCHING) {
              accumulatedSearchContent += cleanChunk;
              if (options.onChunk && accumulatedSearchContent.length > 0) {
                options.onChunk({
                  searchResults: [accumulatedSearchContent],
                  currentStep: ProcessStatus.SEARCHING,
                } as Partial<WorkflowState>);
              }
            } else if (currentAgent === ProcessStatus.LEARNING) {
              accumulatedLearningsContent += cleanChunk;
              if (options.onChunk && accumulatedLearningsContent.length > 0) {
                options.onChunk({
                  learnings: [accumulatedLearningsContent],
                  currentStep: ProcessStatus.LEARNING,
                } as Partial<WorkflowState>);
              }
            } else if (currentAgent === ProcessStatus.OPPORTUNITY_ANALYZING) {
              accumulatedOpportunityContent += cleanChunk;
              if (options.onChunk && accumulatedOpportunityContent.length > 0) {
                options.onChunk({
                  opportunityAnalyses: [accumulatedOpportunityContent],
                  currentStep: ProcessStatus.OPPORTUNITY_ANALYZING,
                } as Partial<WorkflowState>);
              }
            } else if (currentAgent === ProcessStatus.PROPOSING) {
              accumulatedProposalContent += cleanChunk;
              if (options.onChunk && accumulatedProposalContent.length > 0) {
                options.onChunk({
                  proposals: [accumulatedProposalContent],
                  currentStep: ProcessStatus.PROPOSING,
                } as Partial<WorkflowState>);
              }
            } else if (currentAgent === ProcessStatus.CHECKING_NOVELTY) {
              accumulatedNoveltyContent += cleanChunk;
              if (options.onChunk && accumulatedNoveltyContent.length > 0) {
                options.onChunk({
                  noveltyChecks: [accumulatedNoveltyContent],
                  currentStep: ProcessStatus.CHECKING_NOVELTY,
                } as Partial<WorkflowState>);
              }
            } else if (currentAgent === ProcessStatus.AGGREGATING) {
              accumulatedAggregationContent += cleanChunk;
              if (options.onChunk && accumulatedAggregationContent.length > 0) {
                options.onChunk({
                  aggregations: [accumulatedAggregationContent],
                  currentStep: ProcessStatus.AGGREGATING,
                } as Partial<WorkflowState>);
              }
            }
          }

          console.log(`📝 Streaming: ${chunk.substring(0, 100)}...`);
        }
      };

      const workflow = await getCompiledWorkflow({ ...workflowCallbacks, prompts: options.prompts });

      console.log(`🔄 Continuing LangGraph.js workflow with feedback`);
      const stream = await workflow.stream(
        updatedState,
        {
          configurable: {
            thread_id: threadId,
          },
          streamMode: "values",
          recursionLimit: options.config?.recursionLimit || 50,
        }
      );

      let finalState = updatedState;

      // Process the stream
      for await (const chunk of stream) {
        finalState = { ...finalState, ...chunk };

        // Call chunk callback if provided
        if (options.onChunk) {
          options.onChunk(chunk);
        }

        console.log(`📦 Workflow continuation chunk: ${Object.keys(chunk).join(', ')}`);
      }

      console.log(`✅ LangGraph.js workflow continued for thread: ${threadId}`);
      return finalState;

    } catch (error) {
      console.error(`❌ LangGraph.js workflow continuation failed for thread: ${threadId}`, error);
      throw error;
    }
  }

  /**
   * Get current workflow state
   */
  async getWorkflowState(threadId: string): Promise<WorkflowState | null> {
    try {
      const workflow = await getCompiledWorkflow();
      // Use LangGraph.js state retrieval
      const state = await workflow.getState({
        configurable: { thread_id: threadId }
      });
      return state ? (state.values as WorkflowState) : null;
    } catch (error) {
      console.error(`❌ Failed to get workflow state for thread: ${threadId}`, error);
      return null;
    }
  }

  /**
   * Check if a workflow is currently running
   */
  isWorkflowRunning(threadId: string): boolean {
    // In browser environment, we can't easily track running state
    // This is a simplified implementation
    return false;
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(threadId: string): Promise<{
    isRunning: boolean;
    currentStep: string;
    completedSteps: string[];
    iteration: number;
  } | null> {
    const state = await this.getWorkflowState(threadId);
    if (!state) return null;

    return {
      isRunning: this.isWorkflowRunning(threadId),
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      iteration: state.iteration,
    };
  }
}

// Export singleton instance
export const langGraphService = LangGraphWebService.getInstance();

// Utility functions for state management
export function saveWorkflowSnapshot(state: WorkflowState, threadId: string): void {
  try {
    // Save to localStorage as backup
    const snapshot = {
      threadId,
      timestamp: new Date().toISOString(),
      state,
    };
    localStorage.setItem(`langgraph_snapshot_${threadId}`, JSON.stringify(snapshot));
    console.log(`💾 Saved workflow snapshot for thread: ${threadId}`);
  } catch (error) {
    console.error(`❌ Failed to save snapshot for thread: ${threadId}`, error);
  }
}

export function loadWorkflowSnapshot(threadId: string): WorkflowState | null {
  try {
    const snapshot = localStorage.getItem(`langgraph_snapshot_${threadId}`);
    if (!snapshot) return null;

    const parsed = JSON.parse(snapshot);
    console.log(`📂 Loaded workflow snapshot for thread: ${threadId}`);
    return parsed.state;
  } catch (error) {
    console.error(`❌ Failed to load snapshot for thread: ${threadId}`, error);
    return null;
  }
}

export function clearWorkflowSnapshot(threadId: string): void {
  try {
    localStorage.removeItem(`langgraph_snapshot_${threadId}`);
    console.log(`🗑️ Cleared workflow snapshot for thread: ${threadId}`);
  } catch (error) {
    console.error(`❌ Failed to clear snapshot for thread: ${threadId}`, error);
  }
}
