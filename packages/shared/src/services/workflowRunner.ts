import { WorkflowTemplate } from '../types/workflowTemplates';
import { WorkflowState } from '../types/workflow_LG';
import { AgentName, ProcessStatus, LlmOptions } from '../types';
import { generateContentStream, generateContent } from './llmService';
import { executeResearcherTools, formatToolResultsForPrompt } from './toolService';
import { createInitialState, NodeCallbacks } from './workflowService_LG';

/**
 * Workflow Runner - Executes template-defined workflows with streaming callbacks
 * 
 * Features:
 * - Template-based workflow execution
 * - Streaming output support
 * - Tool integration
 * - Error handling and recovery
 */

export interface WorkflowRunnerCallbacks extends NodeCallbacks {
  onStepStart?: (step: ProcessStatus) => void;
  onStepComplete?: (step: ProcessStatus, output: string) => void;
  onWorkflowComplete?: (finalState: WorkflowState) => void;
  onWorkflowError?: (error: Error) => void;
}

export interface WorkflowRunnerOptions {
  enableStreaming?: boolean;
  maxIterations?: number;
  llmOptions?: LlmOptions;
}

export class WorkflowRunner {
  private template: WorkflowTemplate;
  private options: WorkflowRunnerOptions;
  private callbacks?: WorkflowRunnerCallbacks;
  private currentState: WorkflowState;

  constructor(template: WorkflowTemplate, options: WorkflowRunnerOptions = {}) {
    this.template = template;
    this.options = {
      enableStreaming: true,
      maxIterations: template.maxIterations || 3,
      ...options
    };
    this.currentState = createInitialState('', 1);
  }

  /**
   * Execute the workflow with the given topic
   */
  async run(topic: string, callbacks?: WorkflowRunnerCallbacks): Promise<WorkflowState> {
    this.callbacks = callbacks;
    this.currentState = createInitialState(topic, 1);
    
    try {
      // Execute steps in sequence as defined by the template
      // This is a simplified version - in a full implementation, 
      // you would parse the template.schedule and execute accordingly
      await this.executeStep(ProcessStatus.SEARCHING);
      await this.executeStep(ProcessStatus.LEARNING);
      await this.executeStep(ProcessStatus.OPPORTUNITY_ANALYZING);
      await this.executeStep(ProcessStatus.PROPOSING);
      await this.executeStep(ProcessStatus.CHECKING_NOVELTY);
      await this.executeStep(ProcessStatus.AGGREGATING);
      
      this.callbacks?.onWorkflowComplete?.(this.currentState);
      return this.currentState;
    } catch (error) {
      this.callbacks?.onWorkflowError?.(error as Error);
      throw error;
    }
  }

  /**
   * Execute a single step of the workflow
   */
  private async executeStep(step: ProcessStatus): Promise<void> {
    this.callbacks?.onStepStart?.(step);
    
    try {
      let output = '';
      
      // Get the prompt for this step from the template
      const agentName = this.getAgentNameForStep(step);
      const promptTemplate = this.template.agentPrompts[agentName];
      
      if (!promptTemplate) {
        throw new Error(`No prompt template found for agent: ${agentName}`);
      }
      
      // Execute tools if needed
      let toolData = '';
      if (this.shouldExecuteTools(step)) {
        try {
          const results = await executeResearcherTools(this.currentState.topic, {
            includeWebSearch: this.template.enableWebSearch,
            includeLocalSearch: this.template.enableLocalSearch,
          });
          toolData = formatToolResultsForPrompt(results.webResults, results.localResults);
        } catch (error) {
          toolData = '**Tool Results:** Tools unavailable for this research.';
        }
      }
      
      // Build the final prompt
      const prompt = this.buildPrompt(promptTemplate, toolData);
      
      // Track the sent prompt
      this.callbacks?.onPrompt?.(agentName, prompt);
      
      // Generate content with streaming if enabled
      if (this.options.enableStreaming) {
        await generateContentStream(
          agentName,
          prompt,
          this.getLlmOptions(),
          (chunk) => {
            output += chunk;
            this.callbacks?.onStream?.(chunk);
          }
        );
      } else {
        output = await generateContent(agentName, prompt, this.getLlmOptions());
        // Send the complete output as a single chunk
        this.callbacks?.onStream?.(output);
      }
      
      // Update state based on the step
      this.updateState(step, output);
      
      this.callbacks?.onStepComplete?.(step, output);
    } catch (error) {
      console.error(`❌ Workflow step ${step} failed:`, error);
      this.callbacks?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get the agent name for a given step
   */
  private getAgentNameForStep(step: ProcessStatus): AgentName {
    switch (step) {
      case ProcessStatus.SEARCHING: return AgentName.SEARCH;
      case ProcessStatus.LEARNING: return AgentName.LEARNINGS;
      case ProcessStatus.OPPORTUNITY_ANALYZING: return AgentName.OPPORTUNITY_ANALYSIS;
      case ProcessStatus.PROPOSING: return AgentName.PROPOSER;
      case ProcessStatus.CHECKING_NOVELTY: return AgentName.NOVELTY_CHECKER;
      case ProcessStatus.AGGREGATING: return AgentName.AGGREGATOR;
      default: throw new Error(`Unsupported workflow step: ${step}`);
    }
  }

  /**
   * Determine if tools should be executed for a given step
   */
  private shouldExecuteTools(step: ProcessStatus): boolean {
    // Typically only execute tools for search steps
    return step === ProcessStatus.SEARCHING;
  }

  /**
   * Build the final prompt by replacing placeholders
   */
  private buildPrompt(template: string, toolData: string): string {
    return template
      .replace('{topic}', this.currentState.topic)
      .replace('{tool_results}', toolData)
      .replace('{researchSummary}', this.currentState.searchResults.join('\n\n'))
      .replace('{generatedAnalysis}', this.currentState.learnings.at(-1) || '')
      .replace('{opportunityAnalysis}', this.currentState.opportunityAnalyses.at(-1) || '')
      .replace('{proposal}', this.currentState.proposals.at(-1) || '')
      .replace('{noveltyAssessment}', this.currentState.noveltyChecks.at(-1) || '')
      .replace('{feedback}', this.currentState.feedback || '');
  }

  /**
   * Get LLM options from template or defaults
   */
  private getLlmOptions(): LlmOptions {
    return this.options.llmOptions || {
      provider: this.template.modelProvider,
      url: this.template.localLlmUrl,
      model: 'qwen3:4b',
      temperature: 0.5
    };
  }

  /**
   * Update workflow state based on completed step
   */
  private updateState(step: ProcessStatus, output: string): void {
    switch (step) {
      case ProcessStatus.SEARCHING:
        this.currentState.searchResults.push(output);
        break;
      case ProcessStatus.LEARNING:
        this.currentState.learnings.push(output);
        break;
      case ProcessStatus.OPPORTUNITY_ANALYZING:
        this.currentState.opportunityAnalyses.push(output);
        break;
      case ProcessStatus.PROPOSING:
        this.currentState.proposals.push(output);
        break;
      case ProcessStatus.CHECKING_NOVELTY:
        this.currentState.noveltyChecks.push(output);
        break;
      case ProcessStatus.AGGREGATING:
        this.currentState.aggregations.push(output);
        break;
    }
    
    // Update completed steps
    if (!this.currentState.completedSteps.includes(step)) {
      this.currentState.completedSteps.push(step);
    }
    
    this.currentState.currentStep = step;
  }
}

/**
 * Factory function to create a workflow runner
 */
export function createWorkflowRunner(
  template: WorkflowTemplate,
  options?: WorkflowRunnerOptions
): WorkflowRunner {
  return new WorkflowRunner(template, options);
}

/**
 * Execute a workflow template directly
 */
export async function runWorkflow(
  template: WorkflowTemplate,
  topic: string,
  options?: WorkflowRunnerOptions,
  callbacks?: WorkflowRunnerCallbacks
): Promise<WorkflowState> {
  const runner = createWorkflowRunner(template, options);
  return runner.run(topic, callbacks);
}