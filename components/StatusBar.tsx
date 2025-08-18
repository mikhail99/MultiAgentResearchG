import React from 'react';
import { ProcessStatus } from '../types';

interface StatusBarProps {
  status: ProcessStatus;
}

const steps = [
  { id: ProcessStatus.RESEARCHING, label: 'Research' },
  { id: ProcessStatus.GENERATING, label: 'Generate' },
  { id: ProcessStatus.EVALUATING, label: 'Evaluate' },
  { id: ProcessStatus.PROPOSING, label: 'Propose' },
  { id: ProcessStatus.AGGREGATING, label: 'Aggregate' },
  { id: ProcessStatus.FEEDBACK, label: 'Feedback' },
];

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const getStatusIndex = () => {
    switch(status) {
      case ProcessStatus.RESEARCHING: return 0;
      case ProcessStatus.GENERATING: return 1;
      case ProcessStatus.EVALUATING: return 2;
      case ProcessStatus.PROPOSING: return 3;
      case ProcessStatus.AGGREGATING:
      case ProcessStatus.GENERATING_FACTS:
      case ProcessStatus.GENERATING_QUESTIONS:
          return 4;
      case ProcessStatus.FEEDBACK: return 5;
      case ProcessStatus.IDLE: return -1;
      default: return -1;
    }
  };

  const currentIndex = getStatusIndex();

  return (
    <div className="w-full p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <span className="text-white font-bold">{index + 1}</span>
                  )}
                </div>
                <p className={`ml-2 text-xs md:text-sm font-medium ${isCurrent || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{step.label}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-auto border-t-2 transition-all duration-300 mx-2 ${isCompleted ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StatusBar;