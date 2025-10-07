
import React, { useState } from 'react';
import { StylizedFact } from '../types';
import { FactIcon, QuestionIcon, CopyIcon, SaveIcon, CheckIcon } from './Icons';

interface ResultsPanelProps {
  facts: StylizedFact[];
  questions: string[];
  isLoadingFacts: boolean;
  isLoadingQuestions: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
    </div>
);

const ResultsPanel: React.FC<ResultsPanelProps> = ({ facts, questions, isLoadingFacts, isLoadingQuestions }) => {
  const [copiedFacts, setCopiedFacts] = useState(false);
  const [copiedQuestions, setCopiedQuestions] = useState(false);

  const formatFactsText = () => facts.map(f => `Fact: ${f.fact}\nDescription: ${f.description}`).join('\n\n');
  const formatQuestionsText = () => questions.map(q => `- ${q}`).join('\n');

  const handleCopy = (type: 'facts' | 'questions') => {
    if (type === 'facts') {
      navigator.clipboard.writeText(formatFactsText());
      setCopiedFacts(true);
      setTimeout(() => setCopiedFacts(false), 2000);
    } else {
      navigator.clipboard.writeText(formatQuestionsText());
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 2000);
    }
  };

  const handleSave = (type: 'facts' | 'questions') => {
    const textToSave = type === 'facts' ? formatFactsText() : formatQuestionsText();
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = type === 'facts' ? 'stylized_facts.txt' : 'stylized_questions.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Stylized Facts */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
          <div className="flex items-center">
            <FactIcon />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stylized Facts</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => handleCopy('facts')} title="Copy Facts" disabled={isLoadingFacts || facts.length === 0} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50">
              {copiedFacts ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button onClick={() => handleSave('facts')} title="Save Facts" disabled={isLoadingFacts || facts.length === 0} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50">
              <SaveIcon />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          {facts.length === 0 && isLoadingFacts ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              {facts.map((item, index) => (
                <div key={index} className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-md">
                  <p className="font-bold text-green-700 dark:text-green-300">{item.fact}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                </div>
              ))}
              {isLoadingFacts && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse mr-2" />
                  Streaming facts...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stylized Questions */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
           <div className="flex items-center">
            <QuestionIcon />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stylized Questions</h3>
          </div>
           <div className="flex items-center space-x-2">
            <button onClick={() => handleCopy('questions')} title="Copy Questions" disabled={isLoadingQuestions || questions.length === 0} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50">
              {copiedQuestions ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button onClick={() => handleSave('questions')} title="Save Questions" disabled={isLoadingQuestions || questions.length === 0} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50">
              <SaveIcon />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          {questions.length === 0 && isLoadingQuestions ? (
            <LoadingSpinner />
          ) : (
            <>
              <ul className="space-y-3 list-inside">
                {questions.map((q, index) => (
                  <li key={index} className="text-purple-700 dark:text-purple-300 flex items-start">
                    <svg className="w-4 h-4 mr-2 mt-1 text-purple-500 dark:text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0110 5a3 3 0 012.598 4.577 1 1 0 11-1.732.998A1 1 0 0010 9a1 1 0 000 2h.001a1 1 0 100 2H10a1 1 0 100-2H9a1 1 0 100 2h1a1 1 0 100-2z" clipRule="evenodd"></path></svg>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              {isLoadingQuestions && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse mr-2" />
                  Streaming questions...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;