import React, { useState, useMemo, useCallback } from 'react';
import { ProcessStatus } from '../types';

interface StatusBarProps {
  status: ProcessStatus;
  completedSteps?: ProcessStatus[];
  onRestartFrom?: (step: ProcessStatus) => void;
  hasFeedback?: boolean;
}

const steps = [
  { id: ProcessStatus.RESEARCHING, label: 'Research' },
  { id: ProcessStatus.GENERATING, label: 'Generate' },
  { id: ProcessStatus.EVALUATING, label: 'Evaluate' },
  { id: ProcessStatus.PROPOSING, label: 'Propose' },
  { id: ProcessStatus.CHECKING_NOVELTY, label: 'Novelty Check' },
  { id: ProcessStatus.AGGREGATING, label: 'Aggregate' },
  { id: ProcessStatus.FEEDBACK, label: 'Feedback' },
];

const StatusBar: React.FC<StatusBarProps> = React.memo(({ status, completedSteps = [], onRestartFrom, hasFeedback = false }) => {
  const [hoveredStep, setHoveredStep] = useState<ProcessStatus | null>(null);

  const getStepState = useMemo(() => {
    return (step: { id: ProcessStatus; label: string }, index: number) => {
      const isCompleted = completedSteps.includes(step.id);
      const isCurrent = status === step.id;
      const isHovered = hoveredStep === step.id;
      const hoveredIndex = hoveredStep ? steps.findIndex(s => s.id === hoveredStep) : -1;
      const willRerun = hoveredStep && hoveredIndex <= index && isCompleted;

      return { isCompleted, isCurrent, isHovered, willRerun };
    };
  }, [status, completedSteps, hoveredStep]);



  const getAffectedSteps = useCallback((fromStep: ProcessStatus): string[] => {
    const fromIndex = steps.findIndex(step => step.id === fromStep);
    if (fromIndex === -1) return [];
    return steps.slice(fromIndex).map(step => step.label);
  }, []);

  return (
    <div className="w-full p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const { isCompleted, isCurrent, isHovered, willRerun } = getStepState(step, index);
          const canRestart = isCompleted && onRestartFrom;
          const showFeedbackGlow = hasFeedback && isCompleted && !isCurrent;
          
          return (
            <React.Fragment key={step.id}>
              <div 
                className={`flex items-center text-center relative ${canRestart ? 'cursor-pointer group' : ''}`}
                onMouseEnter={() => canRestart && setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => canRestart && onRestartFrom(step.id)}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative
                  ${isCompleted && !isHovered && !willRerun ? 'bg-green-500' : ''}
                  ${isCompleted && isHovered ? 'bg-blue-500 ring-2 ring-blue-300 scale-110' : ''}
                  ${isCurrent ? 'bg-blue-500 animate-pulse' : ''}
                  ${willRerun && !isHovered ? 'bg-gray-400 dark:bg-gray-600' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-400 dark:bg-gray-600' : ''}
                  ${canRestart ? 'hover:scale-110' : ''}
                  ${showFeedbackGlow ? 'ring-2 ring-blue-200 dark:ring-blue-400 ring-opacity-50 shadow-lg shadow-blue-200/30 dark:shadow-blue-400/20' : ''}
                `}>
                  {/* Restart indicator badge when feedback is present */}
                  {showFeedbackGlow && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border-2 border-white dark:border-gray-800">
                    </div>
                  )}
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
                    {hasFeedback ? 'Restart from here with feedback' : 'Restart from here'}
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
      
      {/* Feedback hint */}
      {hasFeedback && completedSteps.length > 0 && !hoveredStep && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-center flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          💡 Click completed steps to restart from there
        </div>
      )}
    </div>
  );
});

export default StatusBar;