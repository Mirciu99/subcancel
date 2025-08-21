import { useState, useCallback } from 'react';
import { DetectedSubscription } from '@/types/pdf-analyzer';

export interface AnalysisProgress {
  type: 'start' | 'progress' | 'analysis_progress' | 'complete' | 'error';
  message?: string;
  stage?: 'chunking' | 'processing' | 'merging' | 'complete';
  currentChunk?: number;
  totalChunks?: number;
  subscriptions?: DetectedSubscription[];
  totalSubscriptions?: number;
  totalTransactions?: number;
  processingTime?: number;
  error?: string;
  details?: string;
  analysisMetadata?: {
    processingTime: number;
    extractionMethod: string;
    pdfPages: number;
  };
}

export interface PDFAnalysisStreamState {
  isAnalyzing: boolean;
  progress: AnalysisProgress | null;
  subscriptions: DetectedSubscription[];
  error: string | null;
  completedAt: Date | null;
  totalTransactions: number;
  processingTime: number;
  pdfPages: number;
}

export function usePDFAnalysisStream() {
  const [state, setState] = useState<PDFAnalysisStreamState>({
    isAnalyzing: false,
    progress: null,
    subscriptions: [],
    error: null,
    completedAt: null,
    totalTransactions: 0,
    processingTime: 0,
    pdfPages: 0
  });

  const analyzeFile = useCallback(async (file: File) => {
    setState({
      isAnalyzing: true,
      progress: null,
      subscriptions: [],
      error: null,
      completedAt: null,
      totalTransactions: 0,
      processingTime: 0,
      pdfPages: 0
    });

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/analyze-pdf-stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: AnalysisProgress = JSON.parse(line.slice(6));
              console.log('📥 Received SSE data:', data);
              
              setState(prev => ({ ...prev, progress: data }));

              if (data.type === 'complete' && data.subscriptions) {
                setState(prev => ({
                  ...prev,
                  isAnalyzing: false,
                  subscriptions: data.subscriptions!,
                  completedAt: new Date(),
                  totalTransactions: data.totalTransactions || 0,
                  processingTime: data.processingTime || 0,
                  pdfPages: data.analysisMetadata?.pdfPages || 0
                }));
                break;
              }

              if (data.type === 'error') {
                setState(prev => ({
                  ...prev,
                  isAnalyzing: false,
                  error: data.error || 'Analysis failed',
                  completedAt: new Date()
                }));
                break;
              }
            } catch (err) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Stream analysis failed:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        completedAt: new Date()
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: null,
      subscriptions: [],
      error: null,
      completedAt: null,
      totalTransactions: 0,
      processingTime: 0,
      pdfPages: 0
    });
  }, []);

  return {
    ...state,
    analyzeFile,
    reset
  };
}

// Helper function to format progress messages
export function formatProgressMessage(progress: AnalysisProgress): string {
  if (progress.type === 'analysis_progress') {
    const { stage, currentChunk, totalChunks } = progress;
    
    switch (stage) {
      case 'chunking':
        return '📦 Preparing data for analysis...';
      case 'processing':
        return `🤖 Processing chunk ${currentChunk}/${totalChunks}...`;
      case 'merging':
        return '🔄 Merging results...';
      case 'complete':
        return '✅ Analysis complete!';
      default:
        return progress.message || 'Processing...';
    }
  }
  
  return progress.message || 'Processing...';
}

// Helper function to calculate overall progress percentage
export function calculateProgress(progress: AnalysisProgress): number {
  if (!progress) return 0;
  
  switch (progress.type) {
    case 'start':
      return 5;
    case 'progress':
      return 15;
    case 'analysis_progress':
      if (progress.stage === 'chunking') return 20;
      if (progress.stage === 'processing' && progress.totalChunks) {
        const chunkProgress = (progress.currentChunk || 0) / progress.totalChunks;
        return 20 + (chunkProgress * 60); // 20-80% for processing
      }
      if (progress.stage === 'merging') return 85;
      if (progress.stage === 'complete') return 100;
      return 50;
    case 'complete':
      return 100;
    case 'error':
      return 0;
    default:
      return 0;
  }
}