import { AgentPrompts, ModelProvider, ProcessStatus } from './index';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Research' | 'Technical' | 'Creative' | 'Business' | 'Custom';
  icon: string;
  version: string;

  // Core configuration - matches current app structure
  agentPrompts: AgentPrompts;
  modelProvider: ModelProvider;
  localLlmUrl: string;
  enableWebSearch: boolean;
  enableLocalSearch: boolean;
  theme: 'light' | 'dark';
  maxIterations: number;

  // Workflow state to restore
  completedSteps?: ProcessStatus[];
  iteration?: number;

  // Metadata
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isBuiltIn: boolean;
}

// Predefined template categories
export const TEMPLATE_CATEGORIES = {
  RESEARCH: 'Research',
  TECHNICAL: 'Technical',
  CREATIVE: 'Creative',
  BUSINESS: 'Business',
  CUSTOM: 'Custom'
} as const;

// Template usage context
export interface TemplateUsage {
  templateId: string;
  usedAt: string;
  success: boolean;
  feedback?: string;
  duration: number;
}

// Template sharing
export interface TemplateShare {
  templateId: string;
  sharedBy: string;
  sharedWith: string[];
  shareUrl: string;
  expiresAt?: string;
}
