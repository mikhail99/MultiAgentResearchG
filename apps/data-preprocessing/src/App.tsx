import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, DownloadIcon, FileIcon, DatabaseIcon, SearchIcon, CheckIcon, XIcon, SparklesIcon, HumanIcon, LoopIcon, FileUploadIcon } from '@shared/components/Icons';
import ResultsPanel from '@shared/components/ResultsPanel';
import { StylizedFact } from '@shared/types';

// Types for the paper preparation workflow
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdf_url?: string;
  selected: boolean;
  collections: string[]; // Multiple collections per paper
  suggestedCollections?: string[]; // AI-suggested collections
  // New fields for paper preparation workflow
  summary?: string;
  markdown?: string;
  processingStatus?: 'found' | 'organized' | 'approved' | 'downloaded' | 'converted' | 'summarized' | 'in_memory_graph';
  memoryGraphId?: string;
  // Result metadata for previews
  downloadPath?: string;
  markdownLineCount?: number;
  summaryWordCount?: number;
  processingTime?: number;
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
  FINDING_PAPERS: 'FINDING_PAPERS';
  REVIEW_AND_APPROVE: 'REVIEW_AND_APPROVE';
  DOWNLOADING_PDFS: 'DOWNLOADING_PDFS';
  CONVERTING_TO_MARKDOWN: 'CONVERTING_TO_MARKDOWN';
  GENERATING_SUMMARIES: 'GENERATING_SUMMARIES';
  UPDATING_MEMORY_GRAPH: 'UPDATING_MEMORY_GRAPH';
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

// Interface for storing step results
interface StepResults {
  downloadResults?: { [paperId: string]: { path: string; size: number; downloadTime: number } };
  conversionResults?: { [paperId: string]: { lineCount: number; preview: string; conversionTime: number } };
  summaryResults?: { [paperId: string]: { wordCount: number; preview: string; summaryTime: number } };
  memoryResults?: { [paperId: string]: { nodeId: string; insertTime: number } };
}

// Enhanced API functions for paper preparation workflow
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
        suggestedCollections: ['1', '2'], // AI suggests ML and NLP collections
        processingStatus: 'found'
      },
      {
        id: 'paper2',
        title: 'Chain of Thought Prompting for Complex Reasoning',
        authors: ['Brown, M.', 'Davis, R.'],
        abstract: 'We investigate chain of thought prompting as a method for improving reasoning...',
        pdf_url: 'https://example.com/paper2.pdf',
        selected: false,
        collections: [],
        suggestedCollections: ['2'], // AI suggests NLP collection
        processingStatus: 'found'
      },
      {
        id: 'paper3',
        title: 'Emergent Abilities in Large Language Models',
        authors: ['Wilson, K.', 'Taylor, L.'],
        abstract: 'This work examines emergent abilities that appear in large language models...',
        pdf_url: 'https://example.com/paper3.pdf',
        selected: false,
        collections: [],
        suggestedCollections: ['1', '3'], // AI suggests ML and Computer Vision
        processingStatus: 'found'
      }
    ];
  },

  async organizePapersIntoCollections(papers: Paper[]): Promise<Paper[]> {
    // Mock AI agent that organizes papers into collections
    await new Promise(resolve => setTimeout(resolve, 1500));
    return papers.map(paper => ({
      ...paper,
      collections: paper.suggestedCollections || ['1'],
      processingStatus: 'organized' as const
    }));
  },

  async downloadPapers(paperIds: string[]): Promise<{ [paperId: string]: { path: string; size: number; downloadTime: number } }> {
    // Mock implementation - replace with actual download logic
    await new Promise(resolve => setTimeout(resolve, 3000));
    const results: { [paperId: string]: { path: string; size: number; downloadTime: number } } = {};
    paperIds.forEach(id => {
      results[id] = {
        path: `/path/to/downloaded/${id}.pdf`,
        size: Math.floor(Math.random() * 5000) + 1000, // KB
        downloadTime: Math.floor(Math.random() * 2000) + 500 // ms
      };
    });
    return results;
  },

  async convertToMarkdown(paperIds: string[]): Promise<{ [paperId: string]: { content: string; lineCount: number; preview: string; conversionTime: number } }> {
    // Mock implementation - replace with actual conversion logic
    await new Promise(resolve => setTimeout(resolve, 2500));
    const results: { [paperId: string]: { content: string; lineCount: number; preview: string; conversionTime: number } } = {};
    paperIds.forEach(id => {
      const lineCount = Math.floor(Math.random() * 500) + 100;
      const content = `# Paper ${id}\n\n## Abstract\n\nThis paper presents novel approaches to...\n\n## Introduction\n\nRecent advances in machine learning have shown...\n\n## Methodology\n\nOur approach consists of three main components...`;
      results[id] = {
        content,
        lineCount,
        preview: content.split('\n').slice(0, 5).join('\n') + '\n...',
        conversionTime: Math.floor(Math.random() * 3000) + 1000
      };
    });
    return results;
  },

  async generateSummaries(paperIds: string[]): Promise<{ [paperId: string]: { summary: string; wordCount: number; preview: string; summaryTime: number } }> {
    // Mock implementation - replace with actual AI summarization
    await new Promise(resolve => setTimeout(resolve, 4000));
    const results: { [paperId: string]: { summary: string; wordCount: number; preview: string; summaryTime: number } } = {};
    paperIds.forEach(id => {
      const summary = `This paper presents a comprehensive analysis of modern approaches to artificial intelligence and machine learning. The authors introduce novel methodologies for improving model performance and discuss the implications of their findings for future research. Key contributions include: (1) A new training algorithm that reduces computational complexity by 40%, (2) Empirical validation on multiple benchmark datasets showing significant improvements, and (3) Theoretical analysis proving convergence guarantees under specific conditions.`;
      const wordCount = summary.split(' ').length;
      results[id] = {
        summary,
        wordCount,
        preview: summary.split(' ').slice(0, 30).join(' ') + '...',
        summaryTime: Math.floor(Math.random() * 5000) + 2000
      };
    });
    return results;
  },

  async insertIntoMemoryGraph(papers: Paper[]): Promise<{ [paperId: string]: { nodeId: string; insertTime: number } }> {
    // Mock implementation - replace with actual memory graph insertion
    await new Promise(resolve => setTimeout(resolve, 2000));
    const results: { [paperId: string]: { nodeId: string; insertTime: number } } = {};
    papers.forEach(paper => {
      results[paper.id] = {
        nodeId: `memory_node_${paper.id}_${Date.now()}`,
        insertTime: Math.floor(Math.random() * 1500) + 500
      };
    });
    return results;
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
      'FINDING_PAPERS',
      'REVIEW_AND_APPROVE',
      'DOWNLOADING_PDFS',
      'CONVERTING_TO_MARKDOWN',
      'GENERATING_SUMMARIES',
      'UPDATING_MEMORY_GRAPH',
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

// Enhanced Status Bar Component for Paper Preparation Workflow
const StatusBar: React.FC<{
  status: ProcessStatus;
  progress?: ProgressState;
}> = ({ status, progress }) => {
  const steps = [
    { id: 'FINDING_PAPERS', label: 'Finding Papers', icon: <div className="w-6 h-6"><SearchIcon /></div>, description: 'AI agent searches for interesting papers' },
    { id: 'REVIEW_AND_APPROVE', label: 'Review & Approve', icon: <div className="w-6 h-6"><HumanIcon /></div>, description: 'Review AI organization and approve papers' },
    { id: 'DOWNLOADING_PDFS', label: 'Downloading Papers', icon: <div className="w-6 h-6"><DownloadIcon /></div>, description: 'Download approved PDFs' },
    { id: 'CONVERTING_TO_MARKDOWN', label: 'Converting to Markdown', icon: <div className="w-6 h-6"><FileIcon /></div>, description: 'Convert PDFs to markdown format' },
    { id: 'GENERATING_SUMMARIES', label: 'Generating Summaries', icon: <div className="w-6 h-6"><SparklesIcon /></div>, description: 'AI generates paper summaries' },
    { id: 'UPDATING_MEMORY_GRAPH', label: 'Updating Memory Graph', icon: <div className="w-6 h-6"><LoopIcon /></div>, description: 'Insert papers into graph-based memory' }
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = [
      'IDLE', 
      'FINDING_PAPERS', 
      'REVIEW_AND_APPROVE', 
      'DOWNLOADING_PDFS', 
      'CONVERTING_TO_MARKDOWN', 
      'GENERATING_SUMMARIES', 
      'UPDATING_MEMORY_GRAPH', 
      'COMPLETE'
    ];
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
          <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
            <DatabaseIcon />
          </div>
          Paper Preparation Pipeline
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
                  {isCompleted ? (
                    <div className="w-4 h-4 text-white">
                      <CheckIcon />
                    </div>
                  ) : (
                    step.icon
                  )}
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
            <div className="w-5 h-5 text-green-600 dark:text-green-400">
              <CheckIcon />
            </div>
            <span className="ml-2 font-medium text-green-800 dark:text-green-200">
              Pipeline completed successfully!
            </span>
          </div>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <XIcon />
            </div>
            <span className="ml-2 font-medium text-red-800 dark:text-red-200">
              Pipeline encountered an error
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Paper Results Panel using shared components
const PaperResultsPanel: React.FC<{
  title: string;
  papers: Paper[];
  results: any;
  resultType: 'download' | 'conversion' | 'summary' | 'memory';
  isLoading: boolean;
}> = ({ title, papers, results, resultType, isLoading }) => {
  if (!results || Object.keys(results).length === 0) return null;

  // Transform paper results into format compatible with ResultsPanel
  const facts: StylizedFact[] = [];
  const questions: string[] = [];

  papers.forEach(paper => {
    const result = results[paper.id];
    if (!result) return;

    const paperTitle = paper.title.length > 50 ? `${paper.title.substring(0, 50)}...` : paper.title;

    switch (resultType) {
      case 'download':
        facts.push({
          fact: `Downloaded: ${paperTitle}`,
          description: `Size: ${(result.size / 1024).toFixed(1)} MB | Time: ${result.downloadTime}ms | Path: ${result.path}`
        });
        break;
      case 'conversion':
        facts.push({
          fact: `Converted: ${paperTitle}`,
          description: `Lines: ${result.lineCount} | Time: ${result.conversionTime}ms`
        });
        // Add preview as a "question" to show in second panel
        questions.push(`Preview for "${paperTitle}": ${result.preview}`);
        break;
      case 'summary':
        facts.push({
          fact: `Summarized: ${paperTitle}`,
          description: `Words: ${result.wordCount} | Time: ${result.summaryTime}ms`
        });
        // Add summary content as a "question" to show in second panel
        questions.push(`Summary for "${paperTitle}": ${result.preview}`);
        break;
      case 'memory':
        facts.push({
          fact: `Inserted: ${paperTitle}`,
          description: `Node ID: ${result.nodeId} | Time: ${result.insertTime}ms`
        });
        break;
    }
  });

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        {resultType === 'download' && <div className="w-6 h-6"><DownloadIcon /></div>}
        {resultType === 'conversion' && <div className="w-6 h-6"><FileIcon /></div>}
        {resultType === 'summary' && <div className="w-6 h-6"><SparklesIcon /></div>}
        {resultType === 'memory' && <div className="w-6 h-6"><LoopIcon /></div>}
        {title}
      </h3>
      <ResultsPanel
        facts={facts}
        questions={questions}
        isLoadingFacts={isLoading}
        isLoadingQuestions={isLoading && (resultType === 'conversion' || resultType === 'summary')}
      />
    </div>
  );
};

// File Upload Component
const FileUploadSection: React.FC<{
  onUploadPapers: (files: FileList) => void;
  selectedCollection: Collection | null;
}> = ({ onUploadPapers, selectedCollection }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
          <FileUploadIcon />
        </div>
        Upload PDF Files
      </h3>
      
      {!selectedCollection ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
            <DatabaseIcon />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select a collection first to upload files
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload PDF files to the "{selectedCollection.name}" collection
          </p>
          <input
            type="file"
            multiple
            accept=".pdf"
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
            className="block w-full px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 mx-auto mb-3 text-gray-400 group-hover:text-blue-500">
              <FileUploadIcon />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-blue-500">
              Drop PDF files here or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Multiple files supported
            </p>
          </label>
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
        <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
          <DatabaseIcon />
        </div>
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





// Enhanced Workflow Component with User Approval Step
const WorkflowComponent: React.FC<{
  selectedCollection: Collection | null;
  papers: Paper[];
  searchResults: Paper[];
  selectedPapers: string[];
  status: ProcessStatus;
  progress?: ProgressState;
  collections: Collection[];
  stepResults: StepResults;
  onTogglePaper: (paperId: string) => void;
  onSearchPapers: () => void;
  onApproveSelectedPapers: () => void;
  isSearching: boolean;
  isOrganizing: boolean;
  isAwaitingApproval: boolean;
  isDownloading: boolean;
  isConverting: boolean;
  isSummarizing: boolean;
  isUpdatingMemory: boolean;
  error: string | null;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}> = ({
  selectedCollection,
  papers,
  searchResults,
  selectedPapers,
  status,
  progress,
  collections,
  stepResults,
  onTogglePaper,
  onSearchPapers,
  onApproveSelectedPapers,
  isSearching,
  isOrganizing,
  isAwaitingApproval,
  isDownloading,
  isConverting,
  isSummarizing,
  isUpdatingMemory,
  error,
  searchTerm = '',
  onSearchChange
}) => {
  const organizedPapers = papers.filter(p => p.processingStatus === 'organized');

  if (!selectedCollection) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400 flex items-center justify-center">
          <SearchIcon />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Select a Collection First
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose a collection from the panel above to start the paper preparation workflow
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <StatusBar status={status} progress={progress} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <XIcon />
            </div>
            <span className="ml-2 font-medium text-red-800 dark:text-red-200">
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Step 1: Search Papers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
              <SearchIcon />
            </div>
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
              {isSearching ? (
                <>
                  <div className="w-5 h-5 animate-spin">
                    <LoopIcon />
                  </div>
                  Searching...
                </>
              ) : (
                <>
                  <div className="w-5 h-5">
                    <SearchIcon />
                  </div>
                  Start Workflow
                </>
              )}
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            This will trigger the complete AI workflow: search → review & approve → download → convert → summarize → memory graph
          </div>
        </div>

      {/* Step 2: Review & Approve Papers */}
      {(status === 'REVIEW_AND_APPROVE' || organizedPapers.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
              <HumanIcon />
            </div>
            Step 2: Review & Approve Papers
            {isOrganizing && (
              <div className="w-5 h-5 text-blue-500 animate-spin">
                <LoopIcon />
              </div>
            )}
            {isAwaitingApproval && selectedPapers.length > 0 && (
              <div className="w-6 h-6 text-yellow-500">
                <SparklesIcon />
              </div>
            )}
          </h3>

          {isOrganizing ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin">
                <LoopIcon />
              </div>
              <p className="text-gray-600 dark:text-gray-400">AI is organizing papers into collections...</p>
            </div>
          ) : organizedPapers.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  AI has organized {organizedPapers.length} papers. Review and select which ones to approve for processing.
                </p>
                {selectedPapers.length > 0 && (
                  <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                    {selectedPapers.length} papers selected.
                  </p>
                )}
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {organizedPapers.map(paper => {
                  const isSelected = selectedPapers.includes(paper.id);
                  return (
                    <div key={paper.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onTogglePaper(paper.id)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {paper.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {paper.authors.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                          {paper.abstract}
                        </p>
                        {paper.suggestedCollections && paper.suggestedCollections.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {paper.suggestedCollections.map(collectionId => {
                              const collection = collections.find(c => c.id === collectionId);
                              return collection ? (
                                <span key={collectionId} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                  {collection.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={onApproveSelectedPapers}
                  disabled={selectedPapers.length === 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
                >
                  <div className="w-5 h-5">
                    <CheckIcon />
                  </div>
                  {selectedPapers.length > 0 
                    ? `Approve & Continue Pipeline (${selectedPapers.length} papers)`
                    : 'Select papers to continue'
                  }
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step Results Display */}
      {stepResults.downloadResults && (
        <PaperResultsPanel
          title="Download Results"
          papers={papers}
          results={stepResults.downloadResults}
          resultType="download"
          isLoading={isDownloading}
        />
      )}

      {stepResults.conversionResults && (
        <PaperResultsPanel
          title="Markdown Conversion Results"
          papers={papers}
          results={stepResults.conversionResults}
          resultType="conversion"
          isLoading={isConverting}
        />
      )}

      {stepResults.summaryResults && (
        <PaperResultsPanel
          title="Summary Generation Results"
          papers={papers}
          results={stepResults.summaryResults}
          resultType="summary"
          isLoading={isSummarizing}
        />
      )}

      {stepResults.memoryResults && (
        <PaperResultsPanel
          title="Memory Graph Insertion Results"
          papers={papers}
          results={stepResults.memoryResults}
          resultType="memory"
          isLoading={isUpdatingMemory}
        />
      )}
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
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isUpdatingMemory, setIsUpdatingMemory] = useState<boolean>(false);

  // Step results state
  const [stepResults, setStepResults] = useState<StepResults>({});

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

    setStatus('FINDING_PAPERS');
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

  // Enhanced workflow functions for complete paper preparation pipeline
  const searchPapers = async () => {
    if (!searchTerm.trim() || !selectedCollection) return;

    setIsSearching(true);
    setStatus('FINDING_PAPERS');
    setError(null);
    
    try {
      const results = await api.searchPapers(searchTerm, config.maxPapers);
      setSearchResults(results);

      // Add results to main papers list with 'found' status
      const newPapers = results.map(paper => ({
        ...paper,
        selected: false,
        collections: [],
        processingStatus: 'found' as const
      }));

      setPapers(prev => {
        const updatedPapers = [...prev];
        newPapers.forEach(newPaper => {
          const existingIndex = updatedPapers.findIndex(p => p.id === newPaper.id);
          if (existingIndex >= 0) {
            updatedPapers[existingIndex] = {
              ...updatedPapers[existingIndex],
              ...newPaper
            };
          } else {
            updatedPapers.push(newPaper);
          }
        });
        return updatedPapers;
      });

      // Automatically proceed to organize papers into collections
      await organizePapersIntoCollections(results);
      
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search for papers');
      setStatus('ERROR');
    } finally {
      setIsSearching(false);
    }
  };

  const organizePapersIntoCollections = async (foundPapers: Paper[]) => {
    setIsOrganizing(true);
    setStatus('REVIEW_AND_APPROVE');
    
    try {
      const organizedPapers = await api.organizePapersIntoCollections(foundPapers);
      
      // Update papers with AI-suggested collections
      setPapers(prev => prev.map(paper => {
        const organizedPaper = organizedPapers.find(op => op.id === paper.id);
        return organizedPaper ? {
          ...paper,
          ...organizedPaper,
          processingStatus: 'organized' as const
        } : paper;
      }));

      // Stay in review and approve stage - user can now review and approve
      setIsAwaitingApproval(true);
      
    } catch (error) {
      console.error('Organization failed:', error);
      setError('Failed to organize papers into collections');
      setStatus('ERROR');
    } finally {
      setIsOrganizing(false);
    }
  };

  const approveSelectedPapers = async () => {
    const approvedPapers = papers.filter(p => selectedPapers.includes(p.id));
    if (approvedPapers.length === 0) {
      setError('Please select at least one paper to approve');
      return;
    }

    // Update approved papers status
    setPapers(prev => prev.map(paper => 
      selectedPapers.includes(paper.id) 
        ? { ...paper, processingStatus: 'approved' as const }
        : paper
    ));

    setIsAwaitingApproval(false);
    
    // Proceed to download papers
    await downloadApprovedPapers(approvedPapers);
  };

  const downloadApprovedPapers = async (approvedPapers: Paper[]) => {
    setIsDownloading(true);
    setStatus('DOWNLOADING_PDFS');
    setProgress({
      current: 0,
      total: approvedPapers.length,
      message: 'Downloading papers...'
    });
    
    try {
      const paperIds = approvedPapers.map(p => p.id);
      const downloadResults = await api.downloadPapers(paperIds);
      
      // Store results for display
      setStepResults(prev => ({
        ...prev,
        downloadResults
      }));
      
      // Update papers with download status
      setPapers(prev => prev.map(paper => {
        const downloadData = downloadResults[paper.id];
        return downloadData ? {
          ...paper,
          pdf_url: downloadData.path,
          downloadPath: downloadData.path,
          processingStatus: 'downloaded' as const
        } : paper;
      }));

      setProgress({
        current: approvedPapers.length,
        total: approvedPapers.length,
        message: 'Download complete'
      });

      // Proceed to convert to markdown
      await convertPapersToMarkdown(approvedPapers);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download papers');
      setStatus('ERROR');
    } finally {
      setIsDownloading(false);
    }
  };

  const convertPapersToMarkdown = async (downloadedPapers: Paper[]) => {
    setIsConverting(true);
    setStatus('CONVERTING_TO_MARKDOWN');
    setProgress({
      current: 0,
      total: downloadedPapers.length,
      message: 'Converting PDFs to markdown...'
    });
    
    try {
      const paperIds = downloadedPapers.map(p => p.id);
      const conversionResults = await api.convertToMarkdown(paperIds);
      
      // Store results for display
      setStepResults(prev => ({
        ...prev,
        conversionResults
      }));
      
      // Update papers with markdown content
      setPapers(prev => prev.map(paper => {
        const conversionData = conversionResults[paper.id];
        return conversionData ? {
          ...paper,
          markdown: conversionData.content,
          markdownLineCount: conversionData.lineCount,
          processingStatus: 'converted' as const
        } : paper;
      }));

      setProgress({
        current: downloadedPapers.length,
        total: downloadedPapers.length,
        message: 'Conversion complete'
      });

      // Proceed to generate summaries
      await generatePaperSummaries(downloadedPapers);
      
    } catch (error) {
      console.error('Conversion failed:', error);
      setError('Failed to convert papers to markdown');
      setStatus('ERROR');
    } finally {
      setIsConverting(false);
    }
  };

  const generatePaperSummaries = async (convertedPapers: Paper[]) => {
    setIsSummarizing(true);
    setStatus('GENERATING_SUMMARIES');
    setProgress({
      current: 0,
      total: convertedPapers.length,
      message: 'Generating AI summaries...'
    });
    
    try {
      const paperIds = convertedPapers.map(p => p.id);
      const summaryResults = await api.generateSummaries(paperIds);
      
      // Store results for display
      setStepResults(prev => ({
        ...prev,
        summaryResults
      }));
      
      // Update papers with summaries
      setPapers(prev => prev.map(paper => {
        const summaryData = summaryResults[paper.id];
        return summaryData ? {
          ...paper,
          summary: summaryData.summary,
          summaryWordCount: summaryData.wordCount,
          processingStatus: 'summarized' as const
        } : paper;
      }));

      setProgress({
        current: convertedPapers.length,
        total: convertedPapers.length,
        message: 'Summaries generated'
      });

      // Proceed to insert into memory graph
      await insertPapersIntoMemoryGraph(convertedPapers);
      
    } catch (error) {
      console.error('Summary generation failed:', error);
      setError('Failed to generate summaries');
      setStatus('ERROR');
    } finally {
      setIsSummarizing(false);
    }
  };

  const insertPapersIntoMemoryGraph = async (summarizedPapers: Paper[]) => {
    setIsUpdatingMemory(true);
    setStatus('UPDATING_MEMORY_GRAPH');
    setProgress({
      current: 0,
      total: summarizedPapers.length,
      message: 'Inserting into memory graph...'
    });
    
    try {
      const memoryResults = await api.insertIntoMemoryGraph(summarizedPapers);
      
      // Store results for display
      setStepResults(prev => ({
        ...prev,
        memoryResults
      }));
      
      // Update papers with memory graph IDs
      setPapers(prev => prev.map(paper => {
        const memoryData = memoryResults[paper.id];
        return memoryData ? {
          ...paper,
          memoryGraphId: memoryData.nodeId,
          processingStatus: 'in_memory_graph' as const
        } : paper;
      }));

      // Assign papers to selected collection
      const collection = collections.find(c => c.id === selectedCollection);
      if (collection) {
        setPapers(prev => prev.map(paper =>
          summarizedPapers.find(s => s.id === paper.id)
            ? { ...paper, collections: [selectedCollection] }
            : paper
        ));

        // Update collection paper count
        setCollections(prev => prev.map(collection =>
          collection.id === selectedCollection
            ? { ...collection, paperCount: collection.paperCount + summarizedPapers.length }
            : collection
        ));
      }

      setProgress({
        current: summarizedPapers.length,
        total: summarizedPapers.length,
        message: 'Pipeline complete!'
      });

      setStatus('COMPLETE');
      
    } catch (error) {
      console.error('Memory graph insertion failed:', error);
      setError('Failed to insert papers into memory graph');
      setStatus('ERROR');
    } finally {
      setIsUpdatingMemory(false);
    }
  };

  // Legacy functions for backward compatibility
  const downloadPapers = async () => {
    const approvedPapers = papers.filter(p => selectedPapers.includes(p.id));
    await downloadApprovedPapers(approvedPapers);
  };

  const convertPapers = async () => {
    const approvedPapers = papers.filter(p => selectedPapers.includes(p.id));
    await convertPapersToMarkdown(approvedPapers);
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
          {/* Theme Toggle Button - Top Right */}
          <div className="absolute top-0 right-0">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Theme"
            >
              <div className="w-5 h-5">
                {theme === 'light' ? <SunIcon /> : <MoonIcon />}
              </div>
            </button>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-300 dark:via-purple-400 dark:to-pink-400 flex items-center justify-center gap-3">
            <div className="w-12 h-12 text-blue-500 dark:text-blue-400">
              <DatabaseIcon />
            </div>
            Research Collections
            <div className="w-12 h-12 text-purple-500 dark:text-purple-400">
              <SparklesIcon />
            </div>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
            <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
              <HumanIcon />
            </div>
            Organize and process your research papers by topic
            <div className="w-6 h-6 text-purple-500 dark:text-purple-400">
              <LoopIcon />
            </div>
          </p>
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
            <FileUploadSection
              onUploadPapers={uploadPapers}
              selectedCollection={collections.find(c => c.id === selectedCollection) || null}
            />
          </div>

          {/* Right Panel - Workflow */}
          <div className="lg:col-span-8">
            <WorkflowComponent
              selectedCollection={collections.find(c => c.id === selectedCollection) || null}
              papers={papers}
              searchResults={searchResults}
              selectedPapers={selectedPapers}
              status={status}
              progress={progress}
              collections={collections}
              stepResults={stepResults}
              onTogglePaper={togglePaper}
              onSearchPapers={searchPapers}
              onApproveSelectedPapers={approveSelectedPapers}
              isSearching={isSearching}
              isOrganizing={isOrganizing}
              isAwaitingApproval={isAwaitingApproval}
              isDownloading={isDownloading}
              isConverting={isConverting}
              isSummarizing={isSummarizing}
              isUpdatingMemory={isUpdatingMemory}
              error={error}
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
