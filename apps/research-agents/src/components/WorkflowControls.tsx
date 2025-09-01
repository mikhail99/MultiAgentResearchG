import React from 'react';
import { ModelProvider } from '@shared/types';
import ControlPanel from '@shared/components/ControlPanel';

interface WorkflowControlsProps {
  // Control panel props
  topic: string;
  setTopic: (topic: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  onStart: () => void;
  onInterrupt: () => void;
  onExport: () => void;
  onExportJson: () => void;
  onCopyLink: () => void;
  onOpenTemplateModal: () => void;
  isLoading: boolean;
  iteration: number;
  modelProvider: ModelProvider;
  setModelProvider: (provider: ModelProvider) => void;
  localLlmUrl: string;
  setLocalLlmUrl: (url: string) => void;
  enableWebSearch: boolean;
  setEnableWebSearch: (enabled: boolean) => void;
  enableLocalSearch: boolean;
  setEnableLocalSearch: (enabled: boolean) => void;
  isRunComplete: boolean;
}

const WorkflowControls: React.FC<WorkflowControlsProps> = ({
  topic,
  setTopic,
  files,
  setFiles,
  onStart,
  onInterrupt,
  onExport,
  onExportJson,
  onCopyLink,
  onOpenTemplateModal,
  isLoading,
  iteration,
  modelProvider,
  setModelProvider,
  localLlmUrl,
  setLocalLlmUrl,
  enableWebSearch,
  setEnableWebSearch,
  enableLocalSearch,
  setEnableLocalSearch,
  isRunComplete,
}) => {
  return (
    <div className="space-y-6">
      <ControlPanel
        topic={topic}
        setTopic={setTopic}
        files={files}
        setFiles={setFiles}
        onStart={onStart}
        onInterrupt={onInterrupt}
        onExport={onExport}
        onExportJson={onExportJson}
        onCopyLink={onCopyLink}
        onOpenTemplateModal={onOpenTemplateModal}
        isLoading={isLoading}
        iteration={iteration}
        modelProvider={modelProvider}
        setModelProvider={setModelProvider}
        localLlmUrl={localLlmUrl}
        setLocalLlmUrl={setLocalLlmUrl}
        enableWebSearch={enableWebSearch}
        setEnableWebSearch={setEnableWebSearch}
        enableLocalSearch={enableLocalSearch}
        setEnableLocalSearch={setEnableLocalSearch}
        isRunComplete={isRunComplete}
      />
    </div>
  );
};

export default WorkflowControls;
