import { NextRequest, NextResponse } from 'next/server';
import { PDFExtractor } from '@/lib/pdf-extractor';
import { TransactionParser } from '@/lib/transaction-parser';
import { SubscriptionDetector } from '@/lib/subscription-detector';
import { PDFAnalysisResult } from '@/types/pdf-analyzer';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting PDF analysis...');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`📄 Processing PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Extract text from PDF
    console.log('📝 Step 1: Extracting text from PDF...');
    const extractionResult = await PDFExtractor.extractText(buffer);
    
    if (!extractionResult.text || extractionResult.text.length < 100) {
      return NextResponse.json(
        { 
          error: 'Could not extract meaningful text from PDF. Please ensure the PDF contains readable bank statement data.',
          details: 'The PDF might be scanned or contain images. Try uploading a text-based PDF.'
        },
        { status: 400 }
      );
    }

    console.log(`✅ Extracted ${extractionResult.text.length} characters from ${extractionResult.pages} pages`);

    // Step 2: Parse transactions
    console.log('🔍 Step 2: Parsing transactions...');
    const transactions = TransactionParser.parseTransactions(extractionResult.text);

    if (transactions.length === 0) {
      return NextResponse.json(
        {
          error: 'No transactions found in the PDF.',
          details: 'Please check that the PDF contains a valid Romanian bank statement with transaction data.'
        },
        { status: 400 }
      );
    }

    console.log(`✅ Parsed ${transactions.length} transactions`);

    // Step 3: Detect subscriptions
    console.log('🎯 Step 3: Detecting subscription patterns...');
    const subscriptions = SubscriptionDetector.detectSubscriptions(transactions);

    console.log(`✅ Detected ${subscriptions.length} potential subscriptions`);

    // Calculate date range
    const dates = transactions.map(t => t.date);
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const processingTime = Date.now() - startTime;

    const result: PDFAnalysisResult = {
      subscriptions,
      totalTransactions: transactions.length,
      dateRange: {
        start: startDate,
        end: endDate
      },
      analysisMetadata: {
        processingTime,
        extractionMethod: extractionResult.method,
        pdfPages: extractionResult.pages
      }
    };

    console.log(`🎉 Analysis complete in ${processingTime}ms`);
    console.log(`📊 Results: ${subscriptions.length} subscriptions from ${transactions.length} transactions`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ PDF analysis error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze PDF',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Use Node.js runtime for PDF processing
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout
export const dynamic = 'force-dynamic'; // Prevent static generation