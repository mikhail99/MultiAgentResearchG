
import React from 'react';
import { RevisionIcon } from './Icons';

interface FeedbackPanelProps {
    feedback: string;
    setFeedback: (feedback: string) => void;
    onRevision: () => void;
    isLoading: boolean;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback, setFeedback, onRevision, isLoading }) => {
    return (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-blue-400 dark:border-blue-500 rounded-xl p-6 shadow-lg animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Human-in-the-Loop Feedback</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                The analysis is complete. Review the final report and other outputs. If you'd like to refine the results, provide your feedback below and request a revision.
            </p>
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