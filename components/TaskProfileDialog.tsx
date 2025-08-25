import React from 'react';
import TaskBuilder, { TaskSelection } from './TaskBuilder';

interface TaskProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  taskProfile: TaskSelection;
  agentDescription?: string;
}

export default function TaskProfileDialog({
  isOpen,
  onClose,
  agentName,
  taskProfile,
  agentDescription
}: TaskProfileDialogProps) {
  if (!isOpen) return null;

  const handleTaskSelect = (selection: TaskSelection) => {
    // Read-only mode - don't do anything
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Agent Task Profile: {agentName}
              </h2>
              {agentDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {agentDescription}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                📋 This agent is configured for:
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="mb-1"><strong>Task:</strong> {taskProfile.task}</div>
                <div className="mb-1"><strong>Data Sources:</strong> {taskProfile.dataSources.join(', ')}</div>
                <div><strong>Output Format:</strong> {taskProfile.outputFormat}</div>
              </div>
            </div>
          </div>

          {/* Task Builder in read-only mode */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 pointer-events-none rounded-lg"></div>
            <div className="relative z-0">
              <TaskBuilder
                onTaskSelect={handleTaskSelect}
                className="opacity-75"
              />
            </div>

            {/* Read-only overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium">
                🔒 Read-only view of agent configuration
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
