
import React from 'react';
import { RevisionIcon } from '@shared/components/Icons';

interface FeedbackPanelProps {
    feedback: string;
    setFeedback: (feedback: string) => void;
    onRevision: () => void;
    isLoading: boolean;
    restartChoice: 'continue' | 'search' | 'proposal';
    setRestartChoice: (choice: 'continue' | 'search' | 'proposal') => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
    feedback,
    setFeedback,
    onRevision,
    isLoading,
    restartChoice,
    setRestartChoice
}) => {
    return (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-blue-400 dark:border-blue-500 rounded-xl p-6 shadow-lg animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Human-in-the-Loop Feedback</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                The analysis is complete. Review the final report and other outputs. If you'd like to refine the results, provide your feedback below and request a revision.
            </p>

            {/* Restart Choice Options */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Revision Type:</h4>
                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="continue"
                            checked={restartChoice === 'continue'}
                            onChange={(e) => setRestartChoice(e.target.value as 'continue' | 'search' | 'proposal')}
                            className="mr-2 text-blue-600 dark:text-blue-400"
                            disabled={isLoading}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Continue normally (append new iteration to history)
                        </span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="search"
                            checked={restartChoice === 'search'}
                            onChange={(e) => setRestartChoice(e.target.value as 'continue' | 'search' | 'proposal')}
                            className="mr-2 text-blue-600 dark:text-blue-400"
                            disabled={isLoading}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Restart from Search (keep all history, rerun entire workflow)
                        </span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="proposal"
                            checked={restartChoice === 'proposal'}
                            onChange={(e) => setRestartChoice(e.target.value as 'continue' | 'search' | 'proposal')}
                            className="mr-2 text-blue-600 dark:text-blue-400"
                            disabled={isLoading}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Restart from Proposal (keep Search + Learnings, rerun analysis)
                        </span>
                    </label>
                </div>
            </div>

            <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'Focus more on the economic impact for developing nations.' or 'The critique was too harsh, please generate a more balanced view.'"
                className="w-full h-28 bg-gray-50 dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                disabled={isLoading}
            />

            <div className="mt-4 flex justify-end">
                <button
                    onClick={onRevision}
                    disabled={isLoading || !feedback.trim()}
                    className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <RevisionIcon />
                    {isLoading ? 'Revising...' : 'Request Revision'}
                </button>
            </div>
        </div>
    );
};

export default FeedbackPanel;