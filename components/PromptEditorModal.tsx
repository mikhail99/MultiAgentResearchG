import React, { useState, useEffect } from 'react';
import { AgentName, AgentPrompts, LlmOptions } from '../types';
import { improvePrompt } from '../services/geminiService';
import { agentTaskDescriptions } from '../prompts';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: AgentPrompts;
  onSave: (newPrompts: AgentPrompts) => void;
  llmOptions: LlmOptions;
  initialAgent: AgentName | null;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, prompts, onSave, llmOptions, initialAgent }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentName>(initialAgent || AgentName.RESEARCHER);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [improvementInstruction, setImprovementInstruction] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const agentToEdit = initialAgent || selectedAgent;
      setSelectedAgent(agentToEdit);
      setCurrentPrompt(prompts[agentToEdit]);
      setImprovementInstruction('');
      setError(null);
    }
  }, [initialAgent, prompts, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ ...prompts, [selectedAgent]: currentPrompt });
    onClose();
  };

  const handleAutoImprove = async () => {
    setIsImproving(true);
    setError(null);
    try {
        const taskDescription = agentTaskDescriptions[selectedAgent];
        const improved = await improvePrompt(currentPrompt, taskDescription, improvementInstruction, llmOptions);
        setCurrentPrompt(improved);
    } catch (e) {
        const errorMessage = `Error improving prompt: ${e instanceof Error ? e.message : String(e)}`;
        setError(errorMessage);
    } finally {
        setIsImproving(false);
    }
  };


  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800/80 backdrop-blur-md border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Agent Prompts</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>
        <main className="p-6 flex-grow flex flex-col overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="agent-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Agent to Edit
            </label>
            <select
              id="agent-select"
              value={selectedAgent}
              onChange={(e) => {
                  const newAgent = e.target.value as AgentName;
                  setSelectedAgent(newAgent);
                  setCurrentPrompt(prompts[newAgent]);
              }}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              {Object.values(AgentName).map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          <div className="mb-4 flex-grow flex flex-col">
            <label htmlFor="prompt-textarea" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt for <span className="font-bold text-green-600 dark:text-green-300">{selectedAgent}</span> Agent
            </label>
            <textarea
              id="prompt-textarea"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-full flex-grow bg-gray-50 dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              rows={15}
            />
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Use placeholders like <code className="bg-gray-200 dark:bg-gray-700 rounded px-1">{`{topic}`}</code>, <code className="bg-gray-200 dark:bg-gray-700 rounded px-1">{`{critique}`}</code> etc. where applicable.</p>
          </div>
           <div className="mb-4">
            <label htmlFor="improvement-instruction" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Optional: Specify how to "Auto-Improve"
            </label>
            <input
                id="improvement-instruction"
                type="text"
                value={improvementInstruction}
                onChange={(e) => setImprovementInstruction(e.target.value)}
                placeholder="e.g., 'Make it more concise' or 'Add a section on ethics'"
                className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          {error && <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 p-3 rounded-lg text-sm mb-4">{error}</div>}
        </main>
        <footer className="flex items-center justify-between p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50">
            <button
                onClick={handleAutoImprove}
                disabled={isImproving}
                className="flex items-center justify-center bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-wait"
            >
                {isImproving ? (
                     <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Improving...</>
                ) : 'Auto-Improve Prompt'}
            </button>
            <div>
                <button
                    onClick={onClose}
                    className="mr-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    Save & Close
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default PromptEditorModal;