import React from 'react';
import { FileUploadIcon, StartIcon, ExportIcon, CopyIcon, SaveIcon } from './Icons';
import { ModelProvider } from '../types';

interface ControlPanelProps {
  topic: string;
  setTopic: (topic: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  onStart: () => void;
  onExport: () => void;
  onExportJson: () => void;
  onCopyLink: () => void;
  isLoading: boolean;
  iteration: number;
  modelProvider: ModelProvider;
  setModelProvider: (provider: ModelProvider) => void;
  localLlmUrl: string;
  setLocalLlmUrl: (url: string) => void;
  isRunComplete: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    topic, setTopic, files, setFiles, onStart, onExport, onExportJson, onCopyLink, isLoading, iteration, 
    modelProvider, setModelProvider, localLlmUrl, setLocalLlmUrl, isRunComplete
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-lg space-y-6 sticky top-8">
      <div className="flex items-center justify-end">
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
                onClick={() => setModelProvider(ModelProvider.GEMINI)}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${
                    modelProvider === ModelProvider.GEMINI ? 'bg-blue-600 text-white z-10 ring-2 ring-blue-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
            >
                Gemini API
            </button>
            <button
                onClick={() => setModelProvider(ModelProvider.LOCAL)}
                disabled={isLoading}
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
          placeholder="e.g., 'The future of renewable energy'"
          className="w-full bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          disabled={isLoading}
        />
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

      <div className="space-y-3">
        <button
          onClick={onStart}
          disabled={isLoading || !topic.trim()}
          className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <StartIcon />
          <span className="ml-2">{isLoading ? 'Processing...' : 'Start Analysis'}</span>
        </button>
        <button
          onClick={onExport}
          disabled={isLoading || !isRunComplete}
          className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExportIcon />
          <span className="ml-2">Export Run</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportJson}
            disabled={isLoading || !isRunComplete}
            className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon />
            <span className="ml-2 text-sm">Export JSON</span>
          </button>
          <button
            onClick={onCopyLink}
            disabled={isLoading || !isRunComplete}
            className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
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