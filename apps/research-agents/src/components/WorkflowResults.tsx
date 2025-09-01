import React from 'react';
import { ProcessStatus, StylizedFact } from '@shared/types';
import { WorkflowState } from '@shared/types/workflow_LG';
import FeedbackPanel from '@shared/components/FeedbackPanel';
import ResultsPanel from '@shared/components/ResultsPanel';

interface WorkflowResultsProps {
  // State
  status: ProcessStatus;
  workflowState: WorkflowState | null;
  stylizedFacts: StylizedFact[];
  stylizedQuestions: string[];
  feedback: string;
  setFeedback: (feedback: string) => void;
  restartChoice: 'continue' | 'search' | 'proposal';
  setRestartChoice: (choice: 'continue' | 'search' | 'proposal') => void;

  // Actions
  onRevision: () => void;
  isLoading: boolean;
}

const WorkflowResults: React.FC<WorkflowResultsProps> = ({
  status,
  workflowState: _workflowState,
  stylizedFacts,
  stylizedQuestions,
  feedback,
  setFeedback,
  restartChoice,
  setRestartChoice,
  onRevision,
  isLoading,
}) => {
  return (
    <>
      {/* Memory Visualization removed */}

      {/* Feedback Panel */}
      {status === ProcessStatus.FEEDBACK && (
        <FeedbackPanel
          feedback={feedback}
          setFeedback={setFeedback}
          onRevision={onRevision}
          isLoading={isLoading}
          restartChoice={restartChoice}
          setRestartChoice={setRestartChoice}
        />
      )}

      {/* Results Panel */}
      {(stylizedFacts.length > 0 || stylizedQuestions.length > 0 || isLoading) && (
        <ResultsPanel
          facts={stylizedFacts}
          questions={stylizedQuestions}
          isLoadingFacts={status === ProcessStatus.GENERATING_FACTS}
          isLoadingQuestions={status === ProcessStatus.GENERATING_QUESTIONS}
        />
      )}
    </>
  );
};

export default WorkflowResults;
