npm install @langchain/langgraph-sdk @langchain/core
Implementation Steps
1. Create Custom Hook
Create a new file src/hooks/useResearchWorkflow.ts:

tsx
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

export function useResearchWorkflow() {
  const thread = useStream<{ 
    messages: Message[];
    currentStep: string;
    completedSteps: string[];
  }>({
    apiUrl: "http://localhost:2024",
    assistantId: "research-workflow",
    reconnectOnMount: true,
  });

  return {
    ...thread,
    startWorkflow: (topic: string) => {
      thread.submit({ 
        messages: [{ type: "human", content: `Research topic: ${topic}` }] 
      });
    },
    provideFeedback: (feedback: string) => {
      thread.submit({ 
        messages: [{ type: "human", content: `Feedback: ${feedback}` }] 
      });
    }
  };
}
2. Update Agent Components
Modify src/components/AgentCard.tsx:

tsx
import React from 'react';
import { ProcessStatus } from '@shared/types';

interface AgentCardProps {
  agentName: string;
  status: ProcessStatus;
  content: string;
  isActive: boolean;
  isCompleted: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agentName,
  status,
  content,
  isActive,
}) => {
  return (
    <div className={`agent-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="agent-header">
        <h3>{agentName}</h3>
        <span className="status">{status}</span>
      </div>
      <div className="agent-content">
        {content}
      </div>
    </div>
  );
};

export default AgentCard;
3. Update Main Application Component
Modify src/App.tsx:

tsx
import { useResearchWorkflow } from './hooks/useResearchWorkflow';
import AgentCard from './components/AgentCard';

function App() {
  const {
    messages,
    isLoading,
    error,
    startWorkflow,
    provideFeedback
  } = useResearchWorkflow();

  // Render agents based on streamed messages
  const renderAgents = () => {
    // Parse messages to extract agent-specific content
    return messages.map((message, index) => {
      const agentInfo = parseAgentMessage(message);
      return (
        <AgentCard
          key={index}
          agentName={agentInfo.name}
          status={agentInfo.status}
          content={agentInfo.content}
          isActive={agentInfo.isActive}
          isCompleted={agentInfo.isCompleted}
        />
      );
    });
  };

  return (
    <div className="App">
      {error && <ErrorMessage error={error} />}
      {isLoading && <LoadingIndicator />}
      <div className="agents-grid">
        {renderAgents()}
      </div>
      <ControlPanel 
        onStart={startWorkflow}
        onFeedback={provideFeedback}
        disabled={isLoading}
      />
    </div>
  );
}
4. Backend Integration
Update your LangGraph Platform server to properly format messages for the frontend. The server should:

Send messages in the format expected by the useStream hook
Include agent-specific metadata in messages
Handle workflow state transitions properly