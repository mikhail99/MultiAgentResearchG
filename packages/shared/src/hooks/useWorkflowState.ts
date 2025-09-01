import { useState } from 'react';
import { ProcessStatus, StylizedFact } from '../types';

export interface WorkflowState {
  topic: string;
  files: File[];
  status: ProcessStatus;
  iteration: number;
  feedback: string;
  stylizedFacts: StylizedFact[];
  stylizedQuestions: string[];
  error: string | null;
}

export interface WorkflowActions {
  setTopic: (topic: string) => void;
  setFiles: (files: File[]) => void;
  setStatus: (status: ProcessStatus) => void;
  setIteration: (iteration: number) => void;
  setFeedback: (feedback: string) => void;
  setStylizedFacts: (facts: StylizedFact[]) => void;
  setStylizedQuestions: (questions: string[]) => void;
  setError: (error: string | null) => void;
}

export interface UseWorkflowStateReturn {
  state: WorkflowState;
  actions: WorkflowActions;
}

export const useWorkflowState = (): UseWorkflowStateReturn => {
  const [topic, setTopic] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [iteration, setIteration] = useState<number>(1);
  const [feedback, setFeedback] = useState<string>('');
  const [stylizedFacts, setStylizedFacts] = useState<StylizedFact[]>([]);
  const [stylizedQuestions, setStylizedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const state: WorkflowState = {
    topic,
    files,
    status,
    iteration,
    feedback,
    stylizedFacts,
    stylizedQuestions,
    error,
  };

  const actions: WorkflowActions = {
    setTopic,
    setFiles,
    setStatus,
    setIteration,
    setFeedback,
    setStylizedFacts,
    setStylizedQuestions,
    setError,
  };

  return { state, actions };
};