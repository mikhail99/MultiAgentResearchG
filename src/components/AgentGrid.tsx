import React from 'react';
import { AgentName, ProcessStatus } from '../types';
import { WorkflowState } from '../types/workflow_LG';
import AgentCard from './AgentCard';

interface AgentConfig {
  name: AgentName;
  title: string;
  status: ProcessStatus;
  hasToolResults: boolean;
}

interface AgentGridProps {
  agentConfigs: AgentConfig[];
  workflowState: WorkflowState | null;
  toolServiceAvailable: boolean;
  status: ProcessStatus;
  selectedIterations: Record<AgentName, number>;
  sentPrompts: Record<AgentName, string>;
  onEditPrompt: (agent: AgentName) => void;
  onViewTaskProfile: (agent: AgentName) => void;
  onIterationSelect: (agentName: AgentName, iteration: number) => void;
  getAgentContent: (agentName: AgentName, workflowState: WorkflowState | null) => string;
  getAgentIterationCount: (agentName: AgentName, workflowState: WorkflowState | null) => number;
}

const AgentGrid: React.FC<AgentGridProps> = ({
  agentConfigs,
  workflowState,
  toolServiceAvailable,
  status,
  selectedIterations,
  sentPrompts,
  onEditPrompt,
  onViewTaskProfile,
  onIterationSelect,
  getAgentContent,
  getAgentIterationCount,
}) => {
  const renderAgentCard = (config: AgentConfig) => (
    <AgentCard
      key={config.name}
      title={config.title}
      content={getAgentContent(config.name, workflowState)}
      sentPrompt={sentPrompts[config.name] || ''}
      isLoading={status === config.status}
      agent={config.name}
      onEditPrompt={() => onEditPrompt(config.name)}
      onViewTaskProfile={() => onViewTaskProfile(config.name)}
      {...(config.hasToolResults && {
        toolResults: workflowState?.toolResults || null,
        toolServiceAvailable
      })}
      currentIteration={selectedIterations[config.name] || 0}
      totalIterations={getAgentIterationCount(config.name, workflowState)}
      onIterationSelect={(iteration: number) => onIterationSelect(config.name, iteration)}
    />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* First row - 5 agents */}
      {agentConfigs.slice(0, 5).map(renderAgentCard)}

      {/* Second row - remaining agents */}
      <div className="grid grid-cols-1">
        {agentConfigs.slice(5).map(renderAgentCard)}
      </div>
    </div>
  );
};

export default AgentGrid;

