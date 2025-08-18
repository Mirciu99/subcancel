export interface Transaction {
  date: Date;
  amount: number;
  currency: string;
  beneficiary: string;
  description: string;
  type: 'debit' | 'credit';
}

export interface DetectedSubscription {
  beneficiary: string;
  averageAmount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly';
  confidence: number; // 0-100
  transactions: Transaction[];
  nextEstimatedPayment: Date;
  totalPaidAmount: number;
  category?: string;
}

export interface PDFAnalysisResult {
  subscriptions: DetectedSubscription[];
  totalTransactions: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  analysisMetadata: {
    processingTime: number;
    extractionMethod: 'text' | 'ocr';
    pdfPages: number;
  };
}

export interface SubscriptionPattern {
  beneficiary: string;
  transactions: Transaction[];
  intervals: number[]; // days between transactions
  averageInterval: number;
  intervalVariance: number;
  amountVariance: number;
  confidence: number;
}

export type FrequencyType = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly';

export interface FrequencyConfig {
  name: FrequencyType;
  minDays: number;
  maxDays: number;
  idealDays: number;
}