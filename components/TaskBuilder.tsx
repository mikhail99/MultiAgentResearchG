import React, { useState } from 'react';

export interface TaskSelection {
  task: string;
  dataSources: string[];
  outputFormat: string;
}

export interface TaskOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface DataSource {
  id: string;
  label: string;
  icon: string;
  category: string;
}

export interface OutputFormat {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface TaskBuilderProps {
  onTaskSelect: (selection: TaskSelection) => void;
  className?: string;
}

// Task options data
const taskOptions: TaskOption[] = [
  { id: 'search_papers', label: 'Search Papers', icon: '🔍', description: 'Find relevant research papers' },
  { id: 'write_report', label: 'Write a Report', icon: '📝', description: 'Generate comprehensive research reports' },
  { id: 'review_literature', label: 'Review Literature', icon: '📚', description: 'Conduct systematic literature reviews' },
  { id: 'analyse_data', label: 'Analyse Data', icon: '📊', description: 'Analyze research data and datasets' },
  { id: 'find_grants', label: 'Find Grants', icon: '💰', description: 'Discover funding opportunities' },
  { id: 'extract_data', label: 'Extract Data', icon: '📋', description: 'Extract structured data from papers' },
  { id: 'review_writing', label: 'Review my Writing', icon: '✏️', description: 'Get feedback on your writing' },
  { id: 'search_patents', label: 'Search Patents', icon: '🔬', description: 'Search patent databases' },
  { id: 'summarize_paper', label: 'Summarize Paper', icon: '📄', description: 'Create concise paper summaries' },
  { id: 'compare_studies', label: 'Compare Studies', icon: '⚖️', description: 'Compare multiple research studies' }
];

// Data sources
const dataSources: DataSource[] = [
  { id: 'deep_review', label: 'Deep Review', icon: '🔍', category: 'Search' },
  { id: 'arxiv', label: 'ArXiV', icon: '📚', category: 'Academic' },
  { id: 'pubmed', label: 'Pubmed', icon: '🏥', category: 'Medical' },
  { id: 'google_scholar', label: 'Google Scholar', icon: '🎓', category: 'Academic' },
  { id: 'grants_gov', label: 'Grants.gov', icon: '💰', category: 'Funding' },
  { id: 'clinical_trials', label: 'ClinicalTrials.gov', icon: '🧪', category: 'Medical' },
  { id: 'python_library', label: 'Python Library', icon: '🐍', category: 'Code' },
  { id: 'google_patents', label: 'Google Patents', icon: '🔬', category: 'Patents' },
  { id: 'semantic_scholar', label: 'Semantic Scholar', icon: '🧠', category: 'Academic' },
  { id: 'crossref', label: 'CrossRef', icon: '🔗', category: 'References' }
];

// Output formats
const outputFormats: OutputFormat[] = [
  { id: 'website', label: 'Website', icon: '🌐', description: 'Interactive web page' },
  { id: 'latex_manuscript', label: 'LaTeX Manuscript', icon: '📄', description: 'Academic paper format' },
  { id: 'data_visualisation', label: 'Data Visualisation', icon: '📊', description: 'Charts and graphs' },
  { id: 'ppt_presentation', label: 'PPT Presentation', icon: '📽️', description: 'PowerPoint slides' },
  { id: 'latex_poster', label: 'LaTeX Poster', icon: '🖼️', description: 'Academic poster' },
  { id: 'word_document', label: 'Word Document', icon: '📝', description: 'Microsoft Word format' },
  { id: 'pdf_report', label: 'PDF Report', icon: '📕', description: 'Portable document format' },
  { id: 'interactive_app', label: 'Interactive App', icon: '🎮', description: 'Dynamic application' },
  { id: 'markdown', label: 'Markdown', icon: '📝', description: 'Simple text format' },
  { id: 'json_data', label: 'JSON Data', icon: '📋', description: 'Structured data format' }
];

export default function TaskBuilder({ onTaskSelect, className = '' }: TaskBuilderProps) {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<string>('');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllDataSources, setShowAllDataSources] = useState(false);
  const [showAllFormats, setShowAllFormats] = useState(false);

  const visibleTasks = showAllTasks ? taskOptions : taskOptions.slice(0, 6);
  const visibleDataSources = showAllDataSources ? dataSources : dataSources.slice(0, 6);
  const visibleFormats = showAllFormats ? outputFormats : outputFormats.slice(0, 6);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
    updateSelection(taskId, selectedDataSources, selectedOutputFormat);
  };

  const handleDataSourceToggle = (sourceId: string) => {
    const newSources = selectedDataSources.includes(sourceId)
      ? selectedDataSources.filter(id => id !== sourceId)
      : [...selectedDataSources, sourceId];
    setSelectedDataSources(newSources);
    updateSelection(selectedTask, newSources, selectedOutputFormat);
  };

  const handleOutputFormatSelect = (formatId: string) => {
    setSelectedOutputFormat(formatId);
    updateSelection(selectedTask, selectedDataSources, formatId);
  };

  const updateSelection = (task: string, sources: string[], format: string) => {
    if (task && sources.length > 0 && format) {
      const taskSelection: TaskSelection = {
        task: taskOptions.find(t => t.id === task)?.label || task,
        dataSources: sources.map(id => dataSources.find(s => s.id === id)?.label || id),
        outputFormat: outputFormats.find(f => f.id === format)?.label || format
      };
      onTaskSelect(taskSelection);
    }
  };

  const getSelectedTaskLabel = () => taskOptions.find(t => t.id === selectedTask)?.label || '';
  const getSelectedDataSourcesLabels = () => selectedDataSources.map(id => dataSources.find(s => s.id === id)?.label || id);
  const getSelectedOutputFormatLabel = () => outputFormats.find(f => f.id === selectedOutputFormat)?.label || '';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          🎉 Build Your Research Task
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Select what you want to do, choose your data sources, and pick your output format
        </p>
      </div>

      {/* Task Builder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* I WANT TO Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-900 dark:text-white">I WANT TO</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskSelect(task.id)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  selectedTask === task.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{task.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{task.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{task.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {taskOptions.length > 6 && (
            <button
              onClick={() => setShowAllTasks(!showAllTasks)}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAllTasks ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>

        {/* USE Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-900 dark:text-white">USE</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleDataSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleDataSourceToggle(source.id)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  selectedDataSources.includes(source.id)
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{source.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{source.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{source.category}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {dataSources.length > 6 && (
            <button
              onClick={() => setShowAllDataSources(!showAllDataSources)}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAllDataSources ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>

        {/* MAKE A Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-900 dark:text-white">MAKE A</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleOutputFormatSelect(format.id)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  selectedOutputFormat === format.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{format.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{format.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{format.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {outputFormats.length > 6 && (
            <button
              onClick={() => setShowAllFormats(!showAllFormats)}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAllFormats ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedTask || selectedDataSources.length > 0 || selectedOutputFormat) && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your Task:</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedTask && (
              <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded mr-2 mb-1">
                {getSelectedTaskLabel()}
              </span>
            )}
            {selectedDataSources.length > 0 && (
              <div className="mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Using: </span>
                {getSelectedDataSourcesLabels().map((label, index) => (
                  <span key={index} className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs mr-1 mb-1">
                    {label}
                  </span>
                ))}
              </div>
            )}
            {selectedOutputFormat && (
              <div className="mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Output: </span>
                <span className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded text-xs">
                  {getSelectedOutputFormatLabel()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
