'use client';

import { formatProgressMessage, calculateProgress } from '@/lib/hooks/usePDFAnalysisStream';
import { AnalysisProgress } from '@/lib/hooks/usePDFAnalysisStream';

interface PDFAnalysisProgressProps {
  progress: AnalysisProgress | null;
  isAnalyzing: boolean;
}

export function PDFAnalysisProgress({ progress, isAnalyzing }: PDFAnalysisProgressProps) {
  console.log('🎯 PDFAnalysisProgress render:', { 
    progress: progress?.stage, 
    type: progress?.type, 
    isAnalyzing,
    currentChunk: progress?.currentChunk,
    totalChunks: progress?.totalChunks
  });
  
  if (!isAnalyzing && !progress) {
    return null;
  }

  const progressPercentage = progress ? calculateProgress(progress) : 0;
  const message = progress ? formatProgressMessage(progress) : 'Starting analysis...';
  
  // Default to 'chunking' stage if we're analyzing but don't have stage info yet
  const currentStage = progress?.stage || (isAnalyzing ? 'chunking' : undefined);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Analysis Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Current Status */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        {/* Animated Spinner */}
        {isAnalyzing && (
          <div className="flex-shrink-0">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Status Message */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          
          {/* Detailed Progress Info */}
          {progress?.type === 'analysis_progress' && progress.totalChunks && (
            <div className="mt-1">
              <p className="text-xs text-gray-500">
                {progress.stage === 'processing' && (
                  <>Processing chunk {progress.currentChunk}/{progress.totalChunks}</>
                )}
                {progress.stage === 'chunking' && (
                  <>Preparing {progress.totalChunks} chunks for analysis</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stage Indicators */}
      {(isAnalyzing || progress?.type === 'analysis_progress') && (
        <div className="mt-4 flex justify-center space-x-2">
          <StageIndicator 
            stage="chunking" 
            currentStage={currentStage} 
            label="Prep" 
          />
          <StageIndicator 
            stage="processing" 
            currentStage={currentStage} 
            label="AI Analysis" 
          />
          <StageIndicator 
            stage="merging" 
            currentStage={currentStage} 
            label="Merge" 
          />
          <StageIndicator 
            stage="complete" 
            currentStage={currentStage} 
            label="Complete" 
          />
        </div>
      )}
    </div>
  );
}

interface StageIndicatorProps {
  stage: string;
  currentStage?: string;
  label: string;
}

function StageIndicator({ stage, currentStage, label }: StageIndicatorProps) {
  const isActive = currentStage === stage;
  const isCompleted = getStageOrder(currentStage || '') > getStageOrder(stage);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-3 h-3 rounded-full mb-1 transition-colors ${
          isCompleted
            ? 'bg-green-500'
            : isActive
            ? 'bg-blue-500 animate-pulse'
            : 'bg-gray-300'
        }`}
      />
      <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function getStageOrder(stage: string): number {
  switch (stage) {
    case 'chunking': return 1;
    case 'processing': return 2;
    case 'merging': return 3;
    case 'complete': return 4;
    default: return 0;
  }
}

// Loading Spinner Component for simple cases
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}

// Success Animation Component
export function SuccessAnimation({ 
  message = 'Analysis Complete!',
  subscriptionCount = 0 
}: { 
  message?: string;
  subscriptionCount?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Success Checkmark */}
      <div className="relative mb-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
      
      {/* Success Message */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
      
      {subscriptionCount > 0 && (
        <>
          <p className="text-gray-600 text-sm mb-3">
            Found {subscriptionCount} potential subscription{subscriptionCount !== 1 ? 's' : ''}
          </p>
          
          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-md">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-amber-800 text-xs font-medium mb-1">Verifică rezultatele</p>
                <p className="text-amber-700 text-xs">
                  AI-ul poate detecta abonamente false sau să rateze unele. Verifică și alege doar abonamentele pe care le recunoști.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}