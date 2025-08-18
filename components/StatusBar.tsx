import React, { useState } from 'react';
import { ProcessStatus } from '../types';

interface StatusBarProps {
  status: ProcessStatus;
  completedSteps?: ProcessStatus[];
  onRestartFrom?: (step: ProcessStatus) => void;
}

const steps = [
  { id: ProcessStatus.RESEARCHING, label: 'Research' },
  { id: ProcessStatus.GENERATING, label: 'Generate' },
  { id: ProcessStatus.EVALUATING, label: 'Evaluate' },
  { id: ProcessStatus.PROPOSING, label: 'Propose' },
  { id: ProcessStatus.AGGREGATING, label: 'Aggregate' },
  { id: ProcessStatus.FEEDBACK, label: 'Feedback' },
];

const StatusBar: React.FC<StatusBarProps> = ({ status, completedSteps = [], onRestartFrom }) => {
  const [hoveredStep, setHoveredStep] = useState<ProcessStatus | null>(null);
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

  const getStepState = (step: { id: ProcessStatus; label: string }, index: number) => {
    const isCompleted = completedSteps.includes(step.id);
    const isCurrent = status === step.id;
    const isHovered = hoveredStep === step.id;
    const hoveredIndex = hoveredStep ? steps.findIndex(s => s.id === hoveredStep) : -1;
    const willRerun = hoveredStep && hoveredIndex <= index && isCompleted;

    return { isCompleted, isCurrent, isHovered, willRerun };
  };

  const getAffectedSteps = (fromStep: ProcessStatus): string[] => {
    const fromIndex = steps.findIndex(step => step.id === fromStep);
    if (fromIndex === -1) return [];
    return steps.slice(fromIndex).map(step => step.label);
  };

  return (
    <div className="w-full p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, isHovered, willRerun } = getStepState(step, index);
          const canRestart = isCompleted && onRestartFrom;
          
          return (
            <React.Fragment key={step.id}>
              <div 
                className={`flex items-center text-center relative ${canRestart ? 'cursor-pointer group' : ''}`}
                onMouseEnter={() => canRestart && setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => canRestart && onRestartFrom(step.id)}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 
                  ${isCompleted && !isHovered && !willRerun ? 'bg-green-500' : ''}
                  ${isCompleted && isHovered ? 'bg-blue-500 ring-2 ring-blue-300 scale-110' : ''}
                  ${isCurrent ? 'bg-blue-500 animate-pulse' : ''}
                  ${willRerun && !isHovered ? 'bg-gray-400 dark:bg-gray-600' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-400 dark:bg-gray-600' : ''}
                  ${canRestart ? 'hover:scale-110' : ''}
                `}>
                  {isCompleted ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  ) : (
                    <span className="text-white font-bold">{index + 1}</span>
                  )}
                </div>
                
                <p className={`
                  ml-2 text-xs md:text-sm font-medium transition-all duration-300
                  ${isCurrent || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
                  ${isHovered ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}
                `}>
                  {step.label}
                </p>
                
                {/* Restart Tooltip */}
                {canRestart && (
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                    Restart from here
                  </div>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  flex-auto border-t-2 transition-all duration-300 mx-2
                  ${isCompleted && !willRerun ? 'border-green-500' : ''}
                  ${willRerun ? 'border-blue-300 border-dashed' : 'border-gray-300 dark:border-gray-600'}
                `}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Preview of affected steps */}
      {hoveredStep && onRestartFrom && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
          Will rerun: {getAffectedSteps(hoveredStep).join(' → ')}
        </div>
      )}
    </div>
  );
};

export default StatusBar;