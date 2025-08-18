import { Transaction, DetectedSubscription, SubscriptionPattern, FrequencyConfig, FrequencyType } from '@/types/pdf-analyzer';
import { differenceInDays, addDays } from 'date-fns';
import * as stringSimilarity from 'string-similarity';

export class SubscriptionDetector {
  private static readonly FREQUENCY_CONFIGS: FrequencyConfig[] = [
    { name: 'weekly', minDays: 6, maxDays: 8, idealDays: 7 },
    { name: 'monthly', minDays: 28, maxDays: 35, idealDays: 30 },
    { name: 'bimonthly', minDays: 55, maxDays: 65, idealDays: 60 },
    { name: 'quarterly', minDays: 85, maxDays: 95, idealDays: 90 }
  ];

  private static readonly MIN_TRANSACTIONS = 2; // Reduced from 3 to 2
  private static readonly MIN_CONFIDENCE = 40; // Reduced from 50 to 40
  private static readonly SIMILARITY_THRESHOLD = 0.7; // Reduced from 0.8 to 0.7

  /**
   * Detect subscriptions from a list of transactions
   */
  static detectSubscriptions(transactions: Transaction[]): DetectedSubscription[] {
    console.log(`🔍 Analyzing ${transactions.length} transactions for subscription patterns...`);

    if (transactions.length < this.MIN_TRANSACTIONS) {
      console.log('⚠️ Not enough transactions for analysis');
      return [];
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group transactions by similar beneficiary
    const groups = this.groupTransactionsByBeneficiary(sortedTransactions);
    console.log(`📊 Grouped into ${groups.length} beneficiary groups`);

    // Analyze each group for subscription patterns
    const patterns: SubscriptionPattern[] = [];
    for (const group of groups) {
      if (group.length >= this.MIN_TRANSACTIONS) {
        const pattern = this.analyzeTransactionGroup(group);
        if (pattern && pattern.confidence >= this.MIN_CONFIDENCE) {
          patterns.push(pattern);
        }
      }
    }

    console.log(`🎯 Found ${patterns.length} potential subscription patterns`);

    // Convert patterns to subscriptions
    return patterns.map(pattern => this.convertPatternToSubscription(pattern));
  }

  /**
   * Group transactions by similar beneficiary names
   */
  private static groupTransactionsByBeneficiary(transactions: Transaction[]): Transaction[][] {
    const groups: Transaction[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < transactions.length; i++) {
      if (processed.has(i)) continue;

      const currentTransaction = transactions[i];
      const group = [currentTransaction];
      processed.add(i);

      // Find similar beneficiaries
      for (let j = i + 1; j < transactions.length; j++) {
        if (processed.has(j)) continue;

        const otherTransaction = transactions[j];
        const similarity = this.calculateBeneficiarySimilarity(
          currentTransaction.beneficiary,
          otherTransaction.beneficiary
        );

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          group.push(otherTransaction);
          processed.add(j);
        }
      }

      if (group.length >= this.MIN_TRANSACTIONS) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Calculate similarity between two beneficiary names
   */
  private static calculateBeneficiarySimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeBeneficiaryName(name1);
    const normalized2 = this.normalizeBeneficiaryName(name2);

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Check if one is substring of another
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return 0.9;
    }

    // Use string similarity
    return stringSimilarity.compareTwoStrings(normalized1, normalized2);
  }

  /**
   * Normalize beneficiary name for comparison
   */
  private static normalizeBeneficiaryName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(SRL|SA|PFA|SERVICES|SERVICE|ROMANIA|RO|LTD|INC|CORP)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Analyze a group of transactions for subscription patterns
   */
  private static analyzeTransactionGroup(transactions: Transaction[]): SubscriptionPattern | null {
    if (transactions.length < this.MIN_TRANSACTIONS) return null;

    // Sort by date
    const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = differenceInDays(sorted[i].date, sorted[i - 1].date);
      intervals.push(days);
    }

    if (intervals.length === 0) return null;

    // Calculate statistics
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalVariance = this.calculateVariance(intervals);
    
    // Calculate amount variance
    const amounts = sorted.map(t => t.amount);
    const amountVariance = this.calculateVariance(amounts);

    // Determine frequency and confidence
    const frequency = this.determineFrequency(averageInterval, intervalVariance);
    if (!frequency) return null;

    const confidence = this.calculateConfidenceScore(
      intervals,
      amounts,
      frequency,
      sorted.length
    );

    const beneficiary = this.selectBestBeneficiaryName(sorted);

    return {
      beneficiary,
      transactions: sorted,
      intervals,
      averageInterval,
      intervalVariance,
      amountVariance,
      confidence
    };
  }

  /**
   * Calculate variance for an array of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Determine frequency type based on average interval
   */
  private static determineFrequency(averageInterval: number, variance: number): FrequencyType | null {
    const maxVariance = 10; // Max allowed variance in days
    
    for (const config of this.FREQUENCY_CONFIGS) {
      if (averageInterval >= config.minDays && 
          averageInterval <= config.maxDays && 
          variance <= maxVariance) {
        return config.name;
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for a subscription pattern
   */
  private static calculateConfidenceScore(
    intervals: number[],
    amounts: number[],
    frequency: FrequencyType,
    transactionCount: number
  ): number {
    let score = 0;

    // Base score for transaction count
    score += Math.min(transactionCount * 10, 40); // Max 40 points

    // Interval consistency score (0-30 points)
    const config = this.FREQUENCY_CONFIGS.find(c => c.name === frequency);
    if (config) {
      const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const intervalScore = 30 * (1 - Math.abs(averageInterval - config.idealDays) / config.idealDays);
      score += Math.max(0, intervalScore);
    }

    // Amount consistency score (0-20 points)
    if (amounts.length > 1) {
      const amountVariance = this.calculateVariance(amounts);
      const averageAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const coefficientOfVariation = amountVariance / averageAmount;
      const amountScore = 20 * (1 - Math.min(coefficientOfVariation, 1));
      score += Math.max(0, amountScore);
    } else {
      score += 20; // Perfect amount consistency for single amount
    }

    // Regularity bonus (0-10 points)
    const intervalVariance = this.calculateVariance(intervals);
    const regularityScore = 10 * (1 - Math.min(intervalVariance / 100, 1));
    score += Math.max(0, regularityScore);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Select the best beneficiary name from a group
   */
  private static selectBestBeneficiaryName(transactions: Transaction[]): string {
    const names = transactions.map(t => t.beneficiary);
    
    // Find the most common name
    const nameCount = new Map<string, number>();
    names.forEach(name => {
      nameCount.set(name, (nameCount.get(name) || 0) + 1);
    });

    // Return the most frequent name, or the shortest if tied
    const sortedNames = Array.from(nameCount.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) return b[1] - a[1]; // Sort by frequency
        return a[0].length - b[0].length; // Then by length
      });

    return sortedNames[0]?.[0] || names[0];
  }

  /**
   * Convert a pattern to a subscription object
   */
  private static convertPatternToSubscription(pattern: SubscriptionPattern): DetectedSubscription {
    const amounts = pattern.transactions.map(t => t.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const totalPaidAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    
    // Get currency from transactions (assume all same currency)
    const currency = pattern.transactions[0]?.currency || 'RON';

    // Predict next payment
    const lastTransaction = pattern.transactions[pattern.transactions.length - 1];
    const nextEstimatedPayment = addDays(lastTransaction.date, Math.round(pattern.averageInterval));

    // Determine category based on beneficiary name
    const category = this.categorizeSubscription(pattern.beneficiary);

    // Get frequency
    const frequency = this.determineFrequency(pattern.averageInterval, pattern.intervalVariance) || 'monthly';

    return {
      beneficiary: pattern.beneficiary,
      averageAmount: Math.round(averageAmount * 100) / 100,
      currency,
      frequency,
      confidence: pattern.confidence,
      transactions: pattern.transactions,
      nextEstimatedPayment,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      category
    };
  }

  /**
   * Categorize subscription based on beneficiary name
   */
  private static categorizeSubscription(beneficiary: string): string {
    const name = beneficiary.toUpperCase();

    const categories = {
      'streaming': ['NETFLIX', 'SPOTIFY', 'YOUTUBE', 'HBO', 'DISNEY', 'AMAZON PRIME', 'APPLE MUSIC', 'DEEZER'],
      'utilities': ['ENEL', 'ELECTRICA', 'E.ON', 'DISTRIGAZ', 'APA', 'SALUBRIZARE', 'TELEKOM', 'UPC'],
      'telecom': ['ORANGE', 'VODAFONE', 'DIGI', 'TELEKOM', 'RCS', 'RDS'],
      'fitness': ['WORLD CLASS', 'FITNESS', 'GYM', '7CARD'],
      'software': ['MICROSOFT', 'ADOBE', 'GOOGLE', 'DROPBOX', 'ZOOM'],
      'shopping': ['EMAG', 'AMAZON', 'ALTEX'],
      'financial': ['BANCA', 'BANK', 'ASIGURARE', 'INSURANCE'],
      'transport': ['STB', 'METROREX', 'RATB', 'UBER', 'BOLT']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }
}