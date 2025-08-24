import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, DownloadIcon, FileIcon, DatabaseIcon, SearchIcon, CheckIcon, XIcon, SparklesIcon, HumanIcon, LoopIcon, FileUploadIcon } from './components/Icons';

// Types for the preprocessing app
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdf_url?: string;
  selected: boolean;
  collections: string[]; // Multiple collections per paper
  suggestedCollections?: string[]; // AI-suggested collections
}

interface Collection {
  id: string;
  name: string;
  description: string;
  paperCount: number;
  color: string;
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
        selected: false,
        collections: [],
        suggestedCollections: ['1', '2'] // AI suggests ML and NLP collections
      },
      {
        id: 'paper2',
        title: 'Chain of Thought Prompting for Complex Reasoning',
        authors: ['Brown, M.', 'Davis, R.'],
        abstract: 'We investigate chain of thought prompting as a method for improving reasoning...',
        pdf_url: 'https://example.com/paper2.pdf',
        selected: false,
        collections: [],
        suggestedCollections: ['2'] // AI suggests NLP collection
      },
      {
        id: 'paper3',
        title: 'Emergent Abilities in Large Language Models',
        authors: ['Wilson, K.', 'Taylor, L.'],
        abstract: 'This work examines emergent abilities that appear in large language models...',
        pdf_url: 'https://example.com/paper3.pdf',
        selected: false,
        collections: [],
        suggestedCollections: ['1', '3'] // AI suggests ML and Computer Vision
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
  },

  async getCollectionSuggestions(paperIds: string[]): Promise<{ [paperId: string]: string[] }> {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate AI suggestions based on paper abstracts
    const suggestions: { [paperId: string]: string[] } = {};
    paperIds.forEach(paperId => {
      // Mock AI logic: different suggestions based on paper ID
      if (paperId === 'paper1') {
        suggestions[paperId] = ['1', '2']; // ML and NLP
      } else if (paperId === 'paper2') {
        suggestions[paperId] = ['2']; // NLP only
      } else if (paperId === 'paper3') {
        suggestions[paperId] = ['1', '3']; // ML and Computer Vision
      } else {
        suggestions[paperId] = ['1']; // Default to ML
      }
    });
    return suggestions;
  }
};

// Status Bar Component
const StatusBar: React.FC<{
  status: ProcessStatus;
  progress?: ProgressState;
}> = ({ status, progress }) => {
  const steps = [
    { id: 'CRAWLING_WEB', label: 'Web Crawling', icon: <SearchIcon />, description: 'Search for new papers' },
    { id: 'SELECTING_PAPERS', label: 'Paper Selection', icon: <CheckIcon />, description: 'Review and select papers' },
    { id: 'DOWNLOADING_PDFS', label: 'PDF Download', icon: <DownloadIcon />, description: 'Download selected PDFs' },
    { id: 'CONVERTING_TO_MARKDOWN', label: 'PDF to Markdown', icon: <FileIcon />, description: 'Convert PDFs to text' },
    { id: 'BUILDING_DBS', label: 'Database Building', icon: <DatabaseIcon />, description: 'Create vector databases' }
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['IDLE', 'CRAWLING_WEB', 'SELECTING_PAPERS', 'DOWNLOADING_PDFS', 'CONVERTING_TO_MARKDOWN', 'BUILDING_DBS', 'COMPLETE'];
    const currentIndex = stepOrder.indexOf(status);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    if (status === 'ERROR') return 'error';
    return 'pending';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DatabaseIcon />
          Research Pipeline Status
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR' && progress && `${progress.current}/${progress.total}`}
        </div>
      </div>
      
      <div className="flex items-center justify-between space-x-6">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const isCompleted = stepStatus === 'completed';
          const isCurrent = stepStatus === 'current';
          const isError = stepStatus === 'error';
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2 flex-1">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
                  ${isError ? 'bg-red-500 text-white' : ''}
                  ${!isCompleted && !isCurrent && !isError ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400' : ''}
                `}>
                  {isCompleted ? <CheckIcon /> : step.icon}
                </div>

                <div className="text-center">
                  <h3 className={`font-medium text-sm ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {step.label}
                  </h3>
                  {isCurrent && progress?.currentFile && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                      {progress.currentFile}
                    </div>
                  )}
                </div>

                {isCurrent && progress && (
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{progress.message}</span>
                      <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className="flex-shrink-0">
                <div className={`
                    w-8 h-0.5 transition-colors duration-300 mt-6
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                `} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {status === 'COMPLETE' && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <CheckIcon />
            <span className="ml-2 font-medium text-green-800 dark:text-green-200">
              Pipeline completed successfully!
            </span>
          </div>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <XIcon />
            <span className="ml-2 font-medium text-red-800 dark:text-red-200">
              Pipeline encountered an error
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Collection Selector Component
const CollectionSelector: React.FC<{
  collections: Collection[];
  selectedCollection: string;
  onSelectCollection: (collectionId: string) => void;
  onAddCollection: (name: string, description: string) => void;
}> = ({ collections, selectedCollection, onSelectCollection, onAddCollection }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAddCollection = () => {
    if (newName.trim() && newDescription.trim()) {
      onAddCollection(newName.trim(), newDescription.trim());
      setNewName('');
      setNewDescription('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <DatabaseIcon />
        Select Collection
      </h3>

      <div className="space-y-4">
        {/* Collection Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose Collection
          </label>
          <select
            value={selectedCollection}
            onChange={(e) => onSelectCollection(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a collection...</option>
            {collections.map(collection => (
              <option key={collection.id} value={collection.id}>
                {collection.name} - {collection.description}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Collection */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            + Add New Collection
          </button>
        ) : (
          <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-600 rounded-md">
            <input
              type="text"
              placeholder="Collection name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              placeholder="Collection description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCollection}
                disabled={!newName.trim() || !newDescription.trim()}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                Add Collection
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};





// Workflow Component - Main UI for the step-by-step process
const WorkflowComponent: React.FC<{
  selectedCollection: Collection | null;
  papers: Paper[];
  searchResults: Paper[];
  selectedPapers: string[];
  onTogglePaper: (paperId: string) => void;
  onSearchPapers: () => void;
  onDownloadPapers: () => void;
  onConvertPapers: () => void;
  onUploadPapers: (files: FileList) => void;
  isSearching: boolean;
  isDownloading: boolean;
  isConverting: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}> = ({
  selectedCollection,
  papers,
  searchResults,
  selectedPapers,
  onTogglePaper,
  onSearchPapers,
  onDownloadPapers,
  onConvertPapers,
  onUploadPapers,
  isSearching,
  isDownloading,
  isConverting,
  searchTerm = '',
  onSearchChange
}) => {
  const approvedPapers = papers.filter(p => selectedPapers.includes(p.id));

  if (!selectedCollection) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <SearchIcon />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Select a Collection First
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose a collection from the panel above to start working with papers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Search Papers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <SearchIcon />
          Step 1: Search Papers
        </h3>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`Search papers related to: ${selectedCollection.description}`}
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={onSearchPapers}
            disabled={isSearching || !searchTerm.trim()}
            className={`
              px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2
              ${isSearching || !searchTerm.trim()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Found {searchResults.length} papers:
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {searchResults.map(paper => {
                // Check if this paper is selected in the main papers array
                const isSelected = (selectedPapers as unknown as string[]).includes(paper.id);

                return (
                  <div key={paper.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onTogglePaper(paper.id)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {paper.authors.join(', ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                        {paper.abstract}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Download Approved Papers */}
      {selectedPapers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DownloadIcon />
            Step 2: Download Papers ({selectedPapers.length} approved)
          </h3>

          <button
            onClick={onDownloadPapers}
            disabled={isDownloading}
            className={`
              w-full py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2
              ${isDownloading
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }
            `}
          >
            <DownloadIcon />
            {isDownloading ? 'Downloading...' : `Download ${selectedPapers.length} PDFs`}
          </button>
        </div>
      )}

      {/* Step 3: Convert to Markdown */}
      {approvedPapers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileIcon />
            Step 3: Convert & Summarize ({approvedPapers.length} papers)
          </h3>

          <button
            onClick={onConvertPapers}
            disabled={isConverting}
            className={`
              w-full py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2
              ${isConverting
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
              }
            `}
          >
            <FileIcon />
            {isConverting ? 'Converting...' : `Convert to Markdown & Summarize`}
          </button>
        </div>
      )}

      {/* Manual Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileUploadIcon />
          Or Upload Your Own PDFs
        </h3>

        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <FileUploadIcon />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Drop your PDF files here, or click to browse
          </p>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadPapers(e.target.files);
              }
              e.target.value = '';
            }}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
          >
            Choose Files
          </label>
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
  const [collections, setCollections] = useState<Collection[]>([
    { id: '1', name: 'Machine Learning', description: 'ML research papers', paperCount: 0, color: 'bg-blue-500' },
    { id: '2', name: 'NLP', description: 'Natural Language Processing', paperCount: 0, color: 'bg-green-500' },
    { id: '3', name: 'Computer Vision', description: 'CV research papers', paperCount: 0, color: 'bg-purple-500' }
  ]);
  // Workflow state
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Paper[]>([]);

  // Processing states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);

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
    // This function is no longer needed in collection-centric approach
    // Each collection handles its own processing
    console.log('Processing is now handled per collection');
  };







  // Collection-centric functions
  const addPapersToCollection = async (collectionId: string, files: FileList) => {
    // Convert files to papers (mock implementation)
    const newPapers: Paper[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPapers.push({
        id: `uploaded-${Date.now()}-${i}`,
        title: file.name.replace('.pdf', ''),
        authors: ['Unknown Author'],
        abstract: 'Uploaded PDF - abstract not available',
        pdf_url: URL.createObjectURL(file),
        selected: false,
        collections: [collectionId]
      });
    }

    setPapers(prev => [...prev, ...newPapers]);

    // Update collection paper count
    setCollections(prev => prev.map(collection =>
      collection.id === collectionId
        ? { ...collection, paperCount: collection.paperCount + newPapers.length }
        : collection
    ));
  };

  const removePaperFromCollection = (collectionId: string, paperId: string) => {
    const paper = papers.find(p => p.id === paperId);
    if (!paper) return;

    // Remove collection from paper
    const updatedCollections = paper.collections.filter(c => c !== collectionId);
    setPapers(prev => prev.map(p =>
      p.id === paperId
        ? { ...p, collections: updatedCollections }
        : p
    ));

    // Update collection paper count
    setCollections(prev => prev.map(collection =>
      collection.id === collectionId
        ? { ...collection, paperCount: Math.max(0, collection.paperCount - 1) }
        : collection
    ));
  };

  const processCollection = async (collectionId: string) => {
    // This is now handled by the convertPapers function in the workflow
    console.log('Processing collection:', collectionId);
  };

  const addCollection = (name: string, description: string) => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name,
      description,
      paperCount: 0,
      color: `bg-${['blue', 'green', 'purple', 'red', 'yellow', 'indigo', 'pink'][Math.floor(Math.random() * 7)]}-500`
    };
    setCollections(prev => [...prev, newCollection]);
  };

  // Workflow functions
  const searchPapers = async () => {
    if (!searchTerm.trim() || !selectedCollection) return;

    setIsSearching(true);
    try {
      const results = await api.searchPapers(searchTerm, 20);
      setSearchResults(results);

      // Add results to main papers list if they don't exist, or update existing ones
      const newPapers = results.map(paper => ({
        ...paper,
        selected: false,
        collections: [] // Will be assigned when approved
      }));

      setPapers(prev => {
        const updatedPapers = [...prev];
        newPapers.forEach(newPaper => {
          const existingIndex = updatedPapers.findIndex(p => p.id === newPaper.id);
          if (existingIndex >= 0) {
            // Update existing paper
            updatedPapers[existingIndex] = {
              ...updatedPapers[existingIndex],
              ...newPaper
            };
          } else {
            // Add new paper
            updatedPapers.push(newPaper);
          }
        });
        return updatedPapers;
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const downloadPapers = async () => {
    const approvedPapers = papers.filter(p => selectedPapers.includes(p.id));
    if (approvedPapers.length === 0) return;

    setIsDownloading(true);
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark papers as downloaded
      setPapers(prev => prev.map(paper =>
        approvedPapers.find(s => s.id === paper.id)
          ? { ...paper, pdf_url: paper.pdf_url || '#' }
          : paper
      ));
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const convertPapers = async () => {
    const approvedPapers = papers.filter(p => p.selected);
    if (approvedPapers.length === 0) return;

    setIsConverting(true);
    try {
      // Simulate conversion process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Assign converted papers to selected collection
      const collection = collections.find(c => c.id === selectedCollection);
      if (collection) {
        // Update papers to assign to collection
        setPapers(prev => prev.map(paper =>
          approvedPapers.find(s => s.id === paper.id)
            ? { ...paper, collections: [selectedCollection] }
            : paper
        ));

        // Update collection paper count
        setCollections(prev => prev.map(collection =>
          collection.id === selectedCollection
            ? { ...collection, paperCount: collection.paperCount + approvedPapers.length }
            : collection
        ));
      }
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const uploadPapers = (files: FileList) => {
    // Convert files to papers
    const newPapers: Paper[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPapers.push({
        id: `uploaded-${Date.now()}-${i}`,
        title: file.name.replace('.pdf', ''),
        authors: ['Unknown Author'],
        abstract: 'Uploaded PDF - abstract not available',
        pdf_url: URL.createObjectURL(file),
        selected: true,
        collections: selectedCollection ? [selectedCollection] : []
      });
    }

    setPapers(prev => [...prev, ...newPapers]);

    if (selectedCollection) {
      // Update collection paper count
      setCollections(prev => prev.map(collection =>
        collection.id === selectedCollection
          ? { ...collection, paperCount: collection.paperCount + newPapers.length }
          : collection
      ));
    }
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-300 dark:via-purple-400 dark:to-pink-400 flex items-center justify-center gap-3">
            <DatabaseIcon />
              Research Collections
              <SparklesIcon />
          </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <HumanIcon />
              Organize and process your research papers by topic
              <LoopIcon />
            </p>

                        <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'light' ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
        </header>

                  {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Collection Selector */}
          <div className="lg:col-span-4 space-y-6">
            <CollectionSelector
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={setSelectedCollection}
              onAddCollection={addCollection}
            />
          </div>

          {/* Right Panel - Workflow */}
          <div className="lg:col-span-8">
            <WorkflowComponent
              selectedCollection={collections.find(c => c.id === selectedCollection) || null}
              papers={papers}
              searchResults={searchResults}
              selectedPapers={selectedPapers}
              onTogglePaper={togglePaper}
              onSearchPapers={searchPapers}
              onDownloadPapers={downloadPapers}
              onConvertPapers={convertPapers}
              onUploadPapers={uploadPapers}
              isSearching={isSearching}
              isDownloading={isDownloading}
              isConverting={isConverting}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
