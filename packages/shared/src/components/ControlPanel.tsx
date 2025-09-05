import React from 'react';
import { FileUploadIcon, StartIcon, ExportIcon, CopyIcon, SaveIcon } from './Icons';
import { ModelProvider } from '../types';

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" fill="currentColor" />
  </svg>
);

interface ControlPanelProps {
  topic: string;
  setTopic: (topic: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  onStart: () => void;
  onInterrupt?: () => void;
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
  toolServiceHealthy?: boolean;
  llmHealthy?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    topic, setTopic, files, setFiles, onStart, onInterrupt, onExport, onExportJson, onCopyLink, onOpenTemplateModal, isLoading, iteration,
    modelProvider, setModelProvider, localLlmUrl, setLocalLlmUrl, enableWebSearch, setEnableWebSearch, enableLocalSearch, setEnableLocalSearch, isRunComplete,
    toolServiceHealthy: toolHealthyProp, llmHealthy: llmHealthyProp
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const toolServiceHealthy = typeof toolHealthyProp === 'boolean' ? toolHealthyProp : true;
  const llmConfigured = !!localLlmUrl;
  const llmHealthy = typeof llmHealthyProp === 'boolean' ? llmHealthyProp : llmConfigured;

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${toolServiceHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <span className={`w-2 h-2 mr-1 rounded-full ${toolServiceHealthy ? 'bg-green-600' : 'bg-red-600'}`}></span>
            Tools
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${llmHealthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <span className={`w-2 h-2 mr-1 rounded-full ${llmHealthy ? 'bg-green-600' : 'bg-yellow-600'}`}></span>
            LLM
          </span>
        </div>
        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">
          Iteration: {iteration}
        </span>
      </div>
      
       <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          1. LLM Provider
        </label>
        <div className="flex rounded-md shadow-sm">
            <button
                disabled={true}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-l-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
                Gemini API (Disabled)
            </button>
            <button
                onClick={() => setModelProvider(ModelProvider.LOCAL)}
                disabled={isLoading || true}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${
                    modelProvider === ModelProvider.LOCAL ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
            >
                Local LLM
            </button>
        </div>
      </div>
      
      {modelProvider === ModelProvider.LOCAL && (
        <div className="animate-fade-in">
            <label htmlFor="local-llm-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Local OpenAI-Compatible URL
            </label>
            <input
                id="local-llm-url"
                type="text"
                value={localLlmUrl}
                onChange={(e) => setLocalLlmUrl(e.target.value)}
                placeholder="http://localhost:11434/v1/..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                disabled={isLoading}
            />
        </div>
      )}

      <div>
        <label htmlFor="topic-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          2. Analysis Topic
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your research topic here..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          3. Research Tools
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={(e) => setEnableWebSearch(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Web Search</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableLocalSearch}
              onChange={(e) => setEnableLocalSearch(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Local Search</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          3. Add Files (Optional)
        </label>
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-gray-50 dark:bg-gray-900 border-2 border-gray-400 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-500 dark:hover:border-gray-500 focus:outline-none">
          <FileUploadIcon />
          <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {files.length > 0 ? `${files.length} file(s) selected` : 'Drag & drop or click to upload'}
          </span>
          <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} disabled={isLoading} />
        </label>
        {files.length > 0 && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {files.map(file => <p key={file.name} className="truncate">- {file.name}</p>)}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          4. Templates (Optional)
        </label>
        <button
          onClick={onOpenTemplateModal}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg mr-2">📝</span>
          <span>Choose Template</span>
        </button>
      </div>

      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <button
          onClick={onStart}
          disabled={isLoading || !topic.trim()}
          className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <StartIcon />
          <span className="ml-2">{isLoading ? 'Processing...' : 'Start Analysis'}</span>
        </button>
        {onInterrupt && (
          <button
            onClick={onInterrupt}
            disabled={!isLoading}
            className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StopIcon />
            <span className="ml-2">Stop Analysis</span>
          </button>
        )}
        <button
          onClick={onExport}
          disabled={isLoading || !isRunComplete}
          className="w-full sm:w-auto flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExportIcon />
          <span className="ml-2">Export Run</span>
        </button>
        <div className="grid grid-cols-2 gap-2 sm:inline-flex sm:gap-2">
          <button
            onClick={onExportJson}
            disabled={isLoading || !isRunComplete}
            className="w-full sm:w-auto flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon />
            <span className="ml-2 text-sm">Export JSON</span>
          </button>
          <button
            onClick={onCopyLink}
            disabled={isLoading || !isRunComplete}
            className="w-full sm:w-auto flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CopyIcon />
            <span className="ml-2 text-sm">Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;