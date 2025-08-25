import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentName, ToolResults } from '../types';
import {
    AggregatorIcon, EvaluatorIcon, GeneratorIcon, ProposerIcon, ResearcherIcon,
    EditIcon, CopyIcon, SaveIcon, CheckIcon, PromptIcon
} from './Icons';

// Add new icon for task profile
const TaskProfileIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

interface AgentCardProps {
  title: string;
  content: string;
  sentPrompt: string;
  isLoading: boolean;
  agent: AgentName;
  onEditPrompt: () => void;
  onViewTaskProfile?: () => void;
  toolResults?: ToolResults | null;
  toolServiceAvailable?: boolean;
  currentIteration?: number;
  totalIterations?: number;
  onIterationSelect?: (iteration: number) => void;
}

const agentIcons: Record<AgentName, React.ReactNode> = {
    [AgentName.SEARCH]: <ResearcherIcon />,
    [AgentName.LEARNINGS]: <GeneratorIcon />,
    [AgentName.OPPORTUNITY_ANALYSIS]: <EvaluatorIcon />,
    [AgentName.PROPOSER]: <ProposerIcon />,
    [AgentName.NOVELTY_CHECKER]: <AggregatorIcon />, // Reuse icon for now
    [AgentName.AGGREGATOR]: <AggregatorIcon />,
};

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full min-h-[10rem]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>
);

const IdlePlaceholder: React.FC<{ agent: AgentName }> = ({ agent }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-500 min-h-[10rem]">
        <div className="mb-3">{agentIcons[agent]}</div>
        <p className="font-semibold text-gray-600 dark:text-gray-400">{agent} Agent</p>
        <p className="text-sm">Awaiting process to start...</p>
    </div>
);

const MarkdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mb-4" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-bold mb-3" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline ? (
            <pre className="bg-gray-200 dark:bg-gray-900 p-3 rounded-md overflow-x-auto my-4">
                <code className={`text-sm ${className}`} {...props}>{children}</code>
            </pre>
        ) : (
            <code className="bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-300 rounded px-1.5 py-1 text-sm" {...props}>
                {children}
            </code>
        );
    },
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-gray-400 dark:border-gray-500 pl-4 italic text-gray-500 dark:text-gray-400 my-4" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-500 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    table: ({node, ...props}: any) => <div className="overflow-x-auto"><table className="table-auto w-full my-4" {...props} /></div>,
    thead: ({node, ...props}: any) => <thead className="bg-gray-200 dark:bg-gray-700" {...props} />,
    th: ({node, ...props}: any) => <th className="px-4 py-2 text-left font-semibold" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />,
};


const AgentCard: React.FC<AgentCardProps> = ({
  title,
  content,
  sentPrompt,
  isLoading,
  agent,
  onEditPrompt,
  onViewTaskProfile,
  toolResults,
  toolServiceAvailable,
  currentIteration = 0,
  totalIterations = 1,
  onIterationSelect
}) => {
  const [copied, setCopied] = useState(false);
  const [showSentPrompt, setShowSentPrompt] = useState(false);

  const handleCopy = () => {
      const textToCopy = showSentPrompt ? sentPrompt : content;
      if (!textToCopy || copied) return;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
      const textToSave = showSentPrompt ? sentPrompt : content;
      if (!textToSave) return;
      const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = showSentPrompt ? `${agent}_prompt.txt` : `${agent}_output.txt`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const hasContent = !!content;
  const currentTitle = showSentPrompt ? "Sent Prompt" : "Agent Output";

  const renderBody = () => {
    if (isLoading && !hasContent) {
      return <LoadingSpinner />;
    }
    if (!hasContent) {
      return <IdlePlaceholder agent={agent} />;
    }
    if (showSentPrompt) {
      return <p className="whitespace-pre-wrap font-mono text-xs">{sentPrompt}</p>;
    }
    return (
      <>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {content}
        </ReactMarkdown>
        {isLoading && <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />}
      </>
    );
  };


  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg flex flex-col min-h-[24rem]">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
              {agentIcons[agent]}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {onViewTaskProfile && (
                <button
                    onClick={onViewTaskProfile}
                    title="View Task Profile"
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                    <TaskProfileIcon />
                </button>
            )}
            <button
                onClick={onEditPrompt}
                title="Edit Base Prompt"
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
                <EditIcon />
            </button>
            <button
                onClick={() => setShowSentPrompt(!showSentPrompt)}
                title={showSentPrompt ? "View Agent Output" : "View Sent Prompt"}
                disabled={!hasContent || isLoading}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${showSentPrompt ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <PromptIcon />
            </button>
          </div>
        </div>

        {/* Iteration Navigation */}
        {totalIterations > 1 && onIterationSelect && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <span className="text-gray-600 dark:text-gray-400">Iterations:</span>
              {Array.from({ length: totalIterations }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onIterationSelect(i)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    i === currentIteration
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title={`View iteration ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {currentIteration + 1} of {totalIterations}
            </span>
          </div>
        )}

        {/* Debug info for iterations */}
        {console.log(`🔍 AgentCard Debug - ${title}: totalIterations=${totalIterations}, currentIteration=${currentIteration}, hasCallback=${!!onIterationSelect}`)}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
                onClick={handleCopy}
                title={`Copy ${currentTitle}`}
                disabled={!hasContent || isLoading}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
                onClick={handleSave}
                title={`Save ${currentTitle} as .txt`}
                disabled={!hasContent || isLoading}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <SaveIcon />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tool Results Section (only for Search Agent) */}
      {agent === AgentName.SEARCH && (
        <div className="px-4 pt-2 pb-1 border-b border-gray-200 dark:border-gray-700">
          {toolServiceAvailable ? (
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {toolResults ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Tools executed: {new Date(toolResults.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  {toolResults.webResults && (
                    <div className="text-blue-600 dark:text-blue-400">
                      🔍 Web search: ✅ ({toolResults.webResults.length > 100 ? `${toolResults.webResults.substring(0, 100)}...` : toolResults.webResults.substring(0, 50)}...)
                    </div>
                  )}
                  
                  {toolResults.localResults && (
                    <div className="text-purple-600 dark:text-purple-400">
                      📁 Local search: ✅ ({toolResults.localResults.length > 100 ? `${toolResults.localResults.substring(0, 100)}...` : toolResults.localResults.substring(0, 50)}...)
                    </div>
                  )}
                  
                  {toolResults.errors.length > 0 && (
                    <div className="text-red-600 dark:text-red-400">
                      ⚠️ Errors: {toolResults.errors.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  <span>🔧 Tools ready</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>⚠️ Tool service unavailable</span>
            </div>
          )}
        </div>
      )}
      
      <div className="p-4 overflow-y-auto flex-grow text-sm text-gray-700 dark:text-gray-300">
        {renderBody()}
      </div>
    </div>
  );
};

export default AgentCard;