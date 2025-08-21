import { NextRequest } from 'next/server';
import { PDFExtractor } from '@/lib/pdf-extractor';
import { OpenAISubscriptionDetector, ProcessingProgress } from '@/lib/openai-subscription-detector';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE data
      const sendProgress = (data: any) => {
        const sseData = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      };

      try {
        sendProgress({ type: 'start', message: 'Starting PDF analysis...' });

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('pdf') as File;

        if (!file) {
          sendProgress({ type: 'error', error: 'No PDF file provided' });
          controller.close();
          return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
          sendProgress({ type: 'error', error: 'Invalid file type. Only PDF files are allowed.' });
          controller.close();
          return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          sendProgress({ type: 'error', error: 'File too large. Maximum size is 10MB.' });
          controller.close();
          return;
        }

        sendProgress({ 
          type: 'progress', 
          message: `Processing PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` 
        });

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Extract text from PDF
        sendProgress({ type: 'progress', message: 'Extracting text from PDF...' });
        const extractionResult = await PDFExtractor.extractText(buffer);

        if (!extractionResult.text || extractionResult.text.length < 100) {
          sendProgress({ 
            type: 'error', 
            error: 'Could not extract meaningful text from PDF',
            details: 'The PDF might be scanned or contain images. Try uploading a text-based PDF.'
          });
          controller.close();
          return;
        }

        sendProgress({ 
          type: 'progress', 
          message: `Extracted ${extractionResult.text.length} characters from ${extractionResult.pages} pages` 
        });

        // Step 2: AI-powered subscription detection with real-time progress
        const subscriptions = await OpenAISubscriptionDetector.analyzeRawText(
          extractionResult.text,
          (progress: ProcessingProgress) => {
            console.log('📊 API: Sending progress:', progress);
            sendProgress({
              type: 'analysis_progress',
              stage: progress.stage,
              currentChunk: progress.currentChunk,
              totalChunks: progress.totalChunks,
              message: progress.message
            });
          }
        );

        const processingTime = Date.now() - startTime;

        // Convert Date objects to ISO strings for JSON serialization
        const serializedSubscriptions = subscriptions.map(sub => ({
          ...sub,
          nextEstimatedPayment: sub.nextEstimatedPayment.toISOString(),
          transactions: [] // Empty array since we don't parse transactions anymore
        }));

        // Estimate transactions processed based on text length and subscriptions found
        const estimatedTransactions = Math.max(
          Math.floor(extractionResult.text.length / 200), // Rough estimate: 1 transaction per ~200 chars
          subscriptions.length * 3 // At minimum 3x the subscriptions found
        );

        // Send final results
        sendProgress({
          type: 'complete',
          subscriptions: serializedSubscriptions,
          totalSubscriptions: subscriptions.length,
          totalTransactions: estimatedTransactions,
          processingTime,
          analysisMetadata: {
            processingTime,
            extractionMethod: extractionResult.method,
            pdfPages: extractionResult.pages
          }
        });

        controller.close();

      } catch (error) {
        console.error('❌ PDF analysis error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        sendProgress({
          type: 'error',
          error: 'Failed to analyze PDF',
          details: errorMessage
        });

        controller.close();
      }
    }
  });

  // Return response with appropriate headers for SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Use Node.js runtime for PDF processing
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for streaming
export const dynamic = 'force-dynamic'; // Prevent static generation