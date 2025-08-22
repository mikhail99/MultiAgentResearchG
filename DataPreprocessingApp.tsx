import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, DownloadIcon, FileIcon, DatabaseIcon, SearchIcon, CheckIcon, XIcon } from './components/Icons';

// Types for the preprocessing app
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdf_url?: string;
  selected: boolean;
}

interface PreprocessingStatus {
  IDLE: 'IDLE';
  CRAWLING_WEB: 'CRAWLING_WEB';
  SELECTING_PAPERS: 'SELECTING_PAPERS';
  DOWNLOADING_PDFS: 'DOWNLOADING_PDFS';
  CONVERTING_TO_MARKDOWN: 'CONVERTING_TO_MARKDOWN';
  BUILDING_DBS: 'BUILDING_DBS';
  COMPLETE: 'COMPLETE';
  ERROR: 'ERROR';
}

type ProcessStatus = PreprocessingStatus[keyof PreprocessingStatus];

interface ProgressState {
  current: number;
  total: number;
  currentFile?: string;
  message: string;
}

interface PreprocessingConfig {
  description: string;
  maxPapers: number;
  chunkSize: number;
  chunkOverlap: number;
  crawlSources: string[];
  selectionCriteria: string;
}

// Mock API functions (replace with actual FastAPI calls)
const api = {
  async searchPapers(description: string, maxPapers: number): Promise<Paper[]> {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    return [
      {
        id: 'paper1',
        title: 'Multi-Agent Reasoning with Large Language Models',
        authors: ['Smith, J.', 'Johnson, A.'],
        abstract: 'This paper explores the use of large language models in multi-agent reasoning systems...',
        pdf_url: 'https://example.com/paper1.pdf',
        selected: false
      },
      {
        id: 'paper2',
        title: 'Chain of Thought Prompting for Complex Reasoning',
        authors: ['Brown, M.', 'Davis, R.'],
        abstract: 'We investigate chain of thought prompting as a method for improving reasoning...',
        pdf_url: 'https://example.com/paper2.pdf',
        selected: false
      },
      {
        id: 'paper3',
        title: 'Emergent Abilities in Large Language Models',
        authors: ['Wilson, K.', 'Taylor, L.'],
        abstract: 'This work examines emergent abilities that appear in large language models...',
        pdf_url: 'https://example.com/paper3.pdf',
        selected: false
      }
    ];
  },

  async startPreprocessing(config: PreprocessingConfig): Promise<{ taskId: string }> {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { taskId: 'task-123' };
  },

  async getProgress(taskId: string): Promise<ProgressState> {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      current: Math.floor(Math.random() * 10) + 1,
      total: 10,
      currentFile: 'paper_example.pdf',
      message: 'Processing papers...'
    };
  },

  async getStatus(taskId: string): Promise<ProcessStatus> {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const statuses: ProcessStatus[] = [
      'CRAWLING_WEB',
      'SELECTING_PAPERS',
      'DOWNLOADING_PDFS',
      'CONVERTING_TO_MARKDOWN',
      'BUILDING_DBS',
      'COMPLETE'
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
};

// Status Bar Component
const StatusBar: React.FC<{
  status: ProcessStatus;
  progress?: ProgressState;
}> = ({ status, progress }) => {
  const steps = [
    { id: 'CRAWLING_WEB', label: 'Crawl Web', icon: <SearchIcon /> },
    { id: 'SELECTING_PAPERS', label: 'Select Papers', icon: <CheckIcon /> },
    { id: 'DOWNLOADING_PDFS', label: 'Download PDFs', icon: <DownloadIcon /> },
    { id: 'CONVERTING_TO_MARKDOWN', label: 'Convert to Markdown', icon: <FileIcon /> },
    { id: 'BUILDING_DBS', label: 'Build DBs', icon: <DatabaseIcon /> }
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['CRAWLING_WEB', 'SELECTING_PAPERS', 'DOWNLOADING_PDFS', 'CONVERTING_TO_MARKDOWN', 'BUILDING_DBS'];
    const currentIndex = stepOrder.indexOf(status);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Data Preprocessing Pipeline
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {progress && `${progress.current}/${progress.total}`}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const isCompleted = stepStatus === 'completed';
          const isCurrent = stepStatus === 'current';
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center space-x-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400' : ''}
                `}>
                  {isCompleted ? <CheckIcon /> : step.icon}
                </div>
                <div className="text-sm">
                  <div className={`font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {step.label}
                  </div>
                  {isCurrent && progress?.currentFile && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {progress.currentFile}
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 transition-colors duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {progress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{progress.message}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Paper Card Component
const PaperCard: React.FC<{
  paper: Paper;
  onToggle: (id: string) => void;
}> = ({ paper, onToggle }) => {
  return (
    <div className={`
      border rounded-lg p-4 cursor-pointer transition-all duration-200
      ${paper.selected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 bg-white dark:bg-gray-800' 
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }
    `} onClick={() => onToggle(paper.id)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {paper.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {paper.authors.join(', ')}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {paper.abstract}
          </p>
        </div>
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center ml-3
          ${paper.selected 
            ? 'border-blue-500 bg-blue-500' 
            : 'border-gray-300 dark:border-gray-600'
          }
        `}>
          {paper.selected && <CheckIcon className="w-3 h-3 text-white" />}
        </div>
      </div>
    </div>
  );
};

// Configuration Panel Component
const ConfigurationPanel: React.FC<{
  config: PreprocessingConfig;
  onConfigChange: (config: PreprocessingConfig) => void;
  onStart: () => void;
  isLoading: boolean;
  selectedPapersCount: number;
}> = ({ config, onConfigChange, onStart, isLoading, selectedPapersCount }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Configuration
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paper Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => onConfigChange({ ...config, description: e.target.value })}
            placeholder="Describe the type of papers you want to find..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Papers
            </label>
            <input
              type="number"
              value={config.maxPapers}
              onChange={(e) => onConfigChange({ ...config, maxPapers: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              min="1"
              max="50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chunk Size
            </label>
            <input
              type="number"
              value={config.chunkSize}
              onChange={(e) => onConfigChange({ ...config, chunkSize: parseInt(e.target.value) || 1000 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              min="500"
              max="2000"
            />
          </div>
        </div>
        
                 <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               Chunk Overlap
             </label>
             <input
               type="number"
               value={config.chunkOverlap}
               onChange={(e) => onConfigChange({ ...config, chunkOverlap: parseInt(e.target.value) || 200 })}
               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
               min="0"
               max="500"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               Selection Criteria
             </label>
             <input
               type="text"
               value={config.selectionCriteria}
               onChange={(e) => onConfigChange({ ...config, selectionCriteria: e.target.value })}
               placeholder="relevance_score > 0.7"
               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
             />
           </div>
         </div>
         
         <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
             Crawl Sources
           </label>
           <div className="space-y-2">
             {['arxiv', 'pubmed', 'scholar', 'ieee', 'acm'].map(source => (
               <label key={source} className="flex items-center">
                 <input
                   type="checkbox"
                   checked={config.crawlSources.includes(source)}
                   onChange={(e) => {
                     if (e.target.checked) {
                       onConfigChange({ ...config, crawlSources: [...config.crawlSources, source] });
                     } else {
                       onConfigChange({ ...config, crawlSources: config.crawlSources.filter(s => s !== source) });
                     }
                   }}
                   className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                 />
                 <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{source}</span>
               </label>
             ))}
           </div>
         </div>
        
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onStart}
            disabled={isLoading || !config.description.trim() || selectedPapersCount === 0}
            className={`
              w-full py-2 px-4 rounded-md font-medium transition-colors
              ${isLoading || !config.description.trim() || selectedPapersCount === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {isLoading ? 'Processing...' : `Start Processing (${selectedPapersCount} papers)`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
export default function DataPreprocessingApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    return 'light';
  });

  const [status, setStatus] = useState<ProcessStatus>('IDLE');
  const [progress, setProgress] = useState<ProgressState | undefined>();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [config, setConfig] = useState<PreprocessingConfig>({
    description: '',
    maxPapers: 10,
    chunkSize: 1000,
    chunkOverlap: 200,
    crawlSources: ['arxiv', 'pubmed', 'scholar'],
    selectionCriteria: 'relevance_score > 0.7'
  });
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Theme management
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    (root as HTMLElement).style.colorScheme = theme;
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    
    // Debug logging
    console.log('Theme changed to:', theme);
    console.log('HTML classes:', root.className);
    console.log('Body classes:', document.body.className);
  }, [theme]);

  // Progress polling
  useEffect(() => {
    if (!taskId || status === 'COMPLETE' || status === 'ERROR') return;

    const interval = setInterval(async () => {
      try {
        const [newStatus, newProgress] = await Promise.all([
          api.getStatus(taskId),
          api.getProgress(taskId)
        ]);
        
        setStatus(newStatus);
        setProgress(newProgress);
        
        if (newStatus === 'COMPLETE') {
          clearInterval(interval);
        }
      } catch (err) {
        setError('Failed to get progress update');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [taskId, status]);

  const startCrawling = async () => {
    if (!config.description.trim()) {
      setError('Please enter a description to crawl for papers');
      return;
    }

    setStatus('CRAWLING_WEB');
    setError(null);
    
    try {
      const foundPapers = await api.searchPapers(config.description, config.maxPapers);
      setPapers(foundPapers);
      setStatus('IDLE');
    } catch (err) {
      setError('Failed to crawl web for papers');
      setStatus('ERROR');
    }
  };

  const togglePaper = (paperId: string) => {
    setSelectedPapers(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  };

  const startPreprocessing = async () => {
    if (selectedPapers.length === 0) {
      setError('Please select at least one paper');
      return;
    }

    setError(null);
    
    try {
      const result = await api.startPreprocessing(config);
      setTaskId(result.taskId);
      setStatus('CRAWLING_WEB');
    } catch (err) {
      setError('Failed to start preprocessing');
    }
  };

  const resetPipeline = () => {
    setStatus('IDLE');
    setProgress(undefined);
    setTaskId(null);
    setError(null);
  };

  const isLoading = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR';

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-300 dark:via-purple-400 dark:to-pink-400 flex items-center justify-center gap-3">
            <DatabaseIcon />
            Research Paper Pipeline
            <DownloadIcon />
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Crawl, select, download, and index research papers for your AI applications
          </p>
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute top-0 right-0 p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <ConfigurationPanel
              config={config}
              onConfigChange={setConfig}
              onStart={startPreprocessing}
              isLoading={isLoading}
              selectedPapersCount={selectedPapers.length}
            />
            
                         {!isLoading && papers.length === 0 && (
               <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                   Start Crawling
                 </h3>
                 <button
                   onClick={startCrawling}
                   disabled={!config.description.trim()}
                   className={`
                     w-full py-2 px-4 rounded-md font-medium transition-colors
                     ${!config.description.trim()
                       ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                       : 'bg-green-600 hover:bg-green-700 text-white'
                     }
                   `}
                 >
                   Start Crawling
                 </button>
               </div>
             )}
          </div>

          {/* Right Panel - Papers and Status */}
          <div className="lg:col-span-8 space-y-6">
            <StatusBar status={status} progress={progress} />
            
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-4 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  <XIcon />
                </button>
              </div>
            )}

            {status === 'COMPLETE' && (
              <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">Preprocessing completed successfully!</span>
                </div>
                <button
                  onClick={resetPipeline}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Start new pipeline
                </button>
              </div>
            )}

            {papers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Found Papers ({papers.length})
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPapers.length} selected
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {papers.map(paper => (
                    <PaperCard
                      key={paper.id}
                      paper={{
                        ...paper,
                        selected: selectedPapers.includes(paper.id)
                      }}
                      onToggle={togglePaper}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
