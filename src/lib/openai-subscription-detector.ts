/**
 * OpenAI-powered subscription detection system - Optimized Version
 * Uses GPT-4o-mini with structured JSON output and sequential processing
 */

import { Transaction, DetectedSubscription } from '@/types/pdf-analyzer';
import { addDays } from 'date-fns';

export interface ProcessingProgress {
  stage: 'chunking' | 'processing' | 'merging' | 'complete';
  currentChunk: number;
  totalChunks: number;
  message: string;
}

export interface RawTransaction {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  originalText: string;
}

export interface MerchantGroup {
  normalizedMerchant: string;
  transactions: RawTransaction[];
  rawMerchants: string[];
}

export interface SubscriptionCandidate {
  group: MerchantGroup;
  averageAmount: number;
  averageIntervalDays: number;
  confidence: number;
  lastTransactionDate: string;
}

export class OpenAISubscriptionDetector {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  private static readonly FIXED_SEED = 42; // For consistency

  /**
   * NEW: Analyze PDF using manual extraction + intelligent grouping + batch OpenAI processing
   */
  static async analyzeRawText(
    pdfText: string, 
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<DetectedSubscription[]> {
    console.log('🚀 Starting new intelligent PDF analysis...');
    console.log(`📄 PDF text length: ${pdfText.length} characters`);

    if (!this.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return this.fallbackAnalysis([]);
    }

    try {
      // Step 1: Manual extraction of all transactions from PDF
      console.log('📊 Step 1: Extracting transactions manually...');
      onProgress?.({ stage: 'chunking', currentChunk: 1, totalChunks: 4, message: 'Extracting transactions from PDF...' });
      
      const rawTransactions = this.extractRawTransactions(pdfText);
      console.log(`✅ Extracted ${rawTransactions.length} raw transactions`);

      if (rawTransactions.length === 0) {
        console.warn('⚠️ No transactions found in PDF');
        return [];
      }

      // Step 2: Group similar merchants with pattern detection
      console.log('🔗 Step 2: Grouping similar merchants...');
      onProgress?.({ stage: 'chunking', currentChunk: 2, totalChunks: 4, message: 'Grouping similar transactions...' });
      
      const merchantGroups = this.groupSimilarMerchants(rawTransactions);
      console.log(`✅ Created ${merchantGroups.length} merchant groups`);

      // Step 3: Detect subscription patterns (2+ transactions, ~30 day intervals)
      console.log('🔍 Step 3: Detecting subscription patterns...');
      onProgress?.({ stage: 'processing', currentChunk: 3, totalChunks: 4, message: 'Analyzing payment patterns...' });
      
      const subscriptionCandidates = this.detectSubscriptionPatterns(merchantGroups);
      console.log(`✅ Found ${subscriptionCandidates.length} potential subscription groups`);

      // Step 4: Send candidates to OpenAI in batches with rate limiting
      console.log('🤖 Step 4: Processing with OpenAI...');
      onProgress?.({ stage: 'processing', currentChunk: 4, totalChunks: 4, message: 'Validating subscriptions with AI...' });
      
      const rawSubscriptions = await this.processCandidatesWithOpenAI(subscriptionCandidates, onProgress);
      
      // Step 5: Post-processing deduplication for same services
      console.log('🔄 Step 5: Post-processing deduplication...');
      const finalSubscriptions = this.deduplicateSimilarServices(rawSubscriptions);
      
      onProgress?.({ stage: 'complete', currentChunk: 0, totalChunks: 0, message: `Analysis complete: ${finalSubscriptions.length} subscriptions found` });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`🎉 Final result: ${finalSubscriptions.length} validated subscriptions (after deduplication)`);
      return finalSubscriptions;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return this.fallbackAnalysis([]);
    }
  }



  /**
   * IMPROVED: Universal transaction extraction focusing on real merchants
   */
  private static extractRawTransactions(pdfText: string): RawTransaction[] {
    console.log('🔧 Extracting transactions with enhanced merchant-focused patterns...');
    const transactions: RawTransaction[] = [];
    
    // First try to extract known subscription services directly
    const knownMerchants = [
      'NETFLIX', 'SPOTIFY', 'APPLE', 'OPENAI', 'CHATGPT', 'ADOBE', 
      'MICROSOFT', 'GOOGLE', 'YOUTUBE', 'AMAZON', 'HBO', 'DISNEY',
      'HAWK HOST', 'SONETEL', 'ELEVENLABS', 'SHOPIFY', 'CANVA'
    ];
    
    for (const merchant of knownMerchants) {
      // Pattern to find this specific merchant with amount and date
      // Enhanced pattern to better capture currency information
      const merchantPattern = new RegExp(
        `(${merchant}[^\\n\\r]*?).*?(\\d+[,.]\\d{2})\\s*(USD|EUR|RON|LEI|\\$|€)?.*?(\\d{1,2}[\\\/\\-\\.]\\d{1,2}[\\\/\\-\\.]\\d{2,4})`,
        'gi'
      );
      
      let match;
      while ((match = merchantPattern.exec(pdfText)) !== null) {
        try {
          const merchantText = match[1]?.trim();
          const amountStr = match[2]?.replace(',', '.');
          let originalCurrency = match[3] || 'RON';
          const dateStr = match[4];
          
          // Normalize currency symbols
          if (originalCurrency === '$') originalCurrency = 'USD';
          if (originalCurrency === '€') originalCurrency = 'EUR';
          
          if (!merchantText || !amountStr) continue;
          
          let amount = Math.abs(parseFloat(amountStr));
          
          // Convert EUR/USD to RON immediately during extraction
          if (originalCurrency === 'EUR' || originalCurrency === 'USD') {
            const originalAmount = amount;
            amount = amount * 5; // x5 conversion rate
            console.log(`💱 PDF Extraction conversion: ${originalAmount} ${originalCurrency} → ${amount} RON for ${merchantText}`);
          }
          
          const normalizedDate = this.normalizeDate(dateStr);
          
          if (!normalizedDate || isNaN(amount)) continue;
          
          const transaction: RawTransaction = {
            merchant: this.normalizeMerchantName(merchantText),
            amount: amount,
            currency: 'RON', // Always RON after conversion
            date: normalizedDate,
            originalText: match[0]
          };
          
          // Avoid duplicates
          const isDuplicate = transactions.some(t => 
            t.merchant === transaction.merchant &&
            Math.abs(t.amount - transaction.amount) < 0.01 &&
            t.date === transaction.date
          );
          
          if (!isDuplicate) {
            transactions.push(transaction);
            console.log(`✅ Found ${merchant}: ${amount} RON on ${normalizedDate}`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to parse ${merchant}:`, error);
        }
      }
    }
    
    // Always try generic patterns to catch missed subscriptions
    console.log('🔍 Trying generic patterns for additional transactions...');
    
    // Generic patterns for any merchant-like text
    const genericPatterns = [
        // Pattern 1: UPPERCASE merchant names
        /([A-Z][A-Z0-9\s\*\.]{4,}[A-Z0-9]).*?(\d+[,.]\\d{2})\s*(USD|EUR|RON|LEI|\$|€)?.*?(\d{1,2}[\\\/\\-\\.]\\d{1,2}[\\\/\\-\\.]\\d{2,4})/gi,
        // Pattern 2: Mixed case merchant names  
        /([A-Z][a-zA-Z0-9\s\.]{4,}).*?(\d+[,.]\\d{2})\s*(USD|EUR|RON|LEI|\$|€)?.*?(\d{1,2}[\\\/\\-\\.]\\d{1,2}[\\\/\\-\\.]\\d{2,4})/gi,
        // Pattern 3: Merchant with domain
        /([a-zA-Z0-9]+\.[a-zA-Z]{2,}).*?(\d+[,.]\\d{2})\s*(USD|EUR|RON|LEI|\$|€)?.*?(\d{1,2}[\\\/\\-\\.]\\d{1,2}[\\\/\\-\\.]\\d{2,4})/gi
    ];
    
    for (const pattern of genericPatterns) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(pdfText)) !== null) {
        try {
          const merchantText = match[1]?.trim();
          const amountStr = match[2]?.replace(',', '.');
          let originalCurrency = match[3] || 'RON';
          const dateStr = match[4];
          
          // Normalize currency symbols
          if (originalCurrency === '$') originalCurrency = 'USD';
          if (originalCurrency === '€') originalCurrency = 'EUR';
          
          if (!merchantText || merchantText.length < 4) continue;
          if (!amountStr || isNaN(parseFloat(amountStr))) continue;
          
          const normalizedMerchant = this.normalizeMerchantName(merchantText);
          if (!normalizedMerchant || normalizedMerchant.length < 3) continue;
          
          let amount = Math.abs(parseFloat(amountStr));
          
          // Convert EUR/USD to RON immediately during extraction
          if (originalCurrency === 'EUR' || originalCurrency === 'USD') {
            const originalAmount = amount;
            amount = amount * 5; // x5 conversion rate
            console.log(`💱 Generic pattern conversion: ${originalAmount} ${originalCurrency} → ${amount} RON for ${normalizedMerchant}`);
          }
          
          const normalizedDate = this.normalizeDate(dateStr);
          
          if (!normalizedDate || isNaN(amount)) continue;
          
          const transaction: RawTransaction = {
            merchant: normalizedMerchant,
            amount: amount,
            currency: 'RON', // Always RON after conversion
            date: normalizedDate,
            originalText: match[0]
          };
          
          // Avoid duplicates
          const isDuplicate = transactions.some(t => 
            t.merchant === transaction.merchant &&
            Math.abs(t.amount - transaction.amount) < 0.01 &&
            t.date === transaction.date
          );
          
          if (!isDuplicate) {
            transactions.push(transaction);
          }
          
        } catch (error) {
          console.warn('⚠️ Failed to parse generic pattern:', error);
        }
      }
    }
    
    console.log(`🔍 Extracted ${transactions.length} unique transactions`);
    
    // Log first few transactions for debugging
    transactions.slice(0, 5).forEach(t => {
      console.log(`📦 Sample: ${t.merchant} - ${t.amount} ${t.currency} on ${t.date}`);
    });
    
    return transactions;
  }

  /**
   * Normalize date strings to consistent format
   */
  private static normalizeDate(dateStr: string): string | null {
    if (!dateStr) return null;
    
    try {
      // Handle different date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      const dateMatch = dateStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
      if (!dateMatch) return null;
      
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);
      
      // Convert 2-digit year to 4-digit
      if (year < 50) year += 2000;
      else if (year < 100) year += 1900;
      
      // Validate date ranges
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) {
        return null;
      }
      
      // Return in ISO format for easy parsing
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
    } catch (error) {
      console.warn('⚠️ Failed to normalize date:', dateStr, error);
      return null;
    }
  }

  /**
   * NEW: Group similar merchants using fuzzy matching and intelligent clustering
   */
  private static groupSimilarMerchants(transactions: RawTransaction[]): MerchantGroup[] {
    console.log(`🔗 Grouping ${transactions.length} transactions by similar merchants...`);
    
    const groups: MerchantGroup[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < transactions.length; i++) {
      if (processed.has(i)) continue;
      
      const currentTransaction = transactions[i];
      const group: MerchantGroup = {
        normalizedMerchant: currentTransaction.merchant,
        transactions: [currentTransaction],
        rawMerchants: [currentTransaction.merchant]
      };
      
      // Find similar merchants
      for (let j = i + 1; j < transactions.length; j++) {
        if (processed.has(j)) continue;
        
        const otherTransaction = transactions[j];
        
        if (this.areMerchantsSimilar(currentTransaction.merchant, otherTransaction.merchant)) {
          group.transactions.push(otherTransaction);
          if (!group.rawMerchants.includes(otherTransaction.merchant)) {
            group.rawMerchants.push(otherTransaction.merchant);
          }
          processed.add(j);
        }
      }
      
      processed.add(i);
      groups.push(group);
    }
    
    console.log(`✅ Created ${groups.length} merchant groups from ${transactions.length} transactions`);
    return groups;
  }

  /**
   * NEW: Check if two merchant names are similar using fuzzy matching
   */
  private static areMerchantsSimilar(merchant1: string, merchant2: string): boolean {
    if (merchant1 === merchant2) return true;
    
    // Normalize for comparison
    const normalize = (name: string) => name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all special characters
      .replace(/(netflix|spotify|apple|google|microsoft|adobe|amazon|youtube|hbo|disney).*/, '$1'); // Normalize to core name
    
    const norm1 = normalize(merchant1);
    const norm2 = normalize(merchant2);
    
    if (norm1 === norm2) return true;
    
    // Check if one contains the other (for variations like "Netflix" vs "Netflix.com")
    if (norm1.length > 3 && norm2.length > 3) {
      if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    }
    
    // Levenshtein distance for typos (Netflix vs Netfix)
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const similarity = 1 - (distance / maxLen);
    
    // 85% similarity threshold for fuzzy matching
    return similarity >= 0.85;
  }

  /**
   * Calculate Levenshtein distance for fuzzy string matching
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * NEW: Detect subscription patterns in merchant groups
   */
  private static detectSubscriptionPatterns(groups: MerchantGroup[]): SubscriptionCandidate[] {
    console.log(`🔍 Analyzing ${groups.length} merchant groups for subscription patterns...`);
    
    const candidates: SubscriptionCandidate[] = [];
    
    for (const group of groups) {
      console.log(`🔍 Group: ${group.normalizedMerchant} - ${group.transactions.length} transactions`);
      
      // Must have at least 2 transactions
      if (group.transactions.length < 2) {
        console.log(`❌ Skipping ${group.normalizedMerchant}: only ${group.transactions.length} transactions`);
        continue;
      }
      
      // Sort transactions by date
      const sortedTransactions = [...group.transactions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Check amount consistency with intelligent grouping (±20% tolerance)
      const amounts = sortedTransactions.map(t => t.amount);
      
      // For subscriptions with different plans, use the MAXIMUM amount (highest plan)
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      
      // Use max amount as the subscription amount (user wants highest plan detected)
      const subscriptionAmount = maxAmount;
      
      // For known subscription services, always accept regardless of amount variation
      const knownSubscriptions = ['Netflix', 'Spotify', 'Apple', 'OpenAI', 'Adobe', 'Shopify', 'Canva', 'Microsoft', 'Google'];
      const isKnownService = knownSubscriptions.some(service => 
        group.normalizedMerchant.toLowerCase().includes(service.toLowerCase())
      );
      
      // Allow up to 95% variation (or 100% for known services)
      const maxVariation = isKnownService ? 1.0 : 0.95; // 100% for known, 95% for others
      const amountVariation = (maxAmount - minAmount) / maxAmount <= maxVariation;
      
      console.log(`💰 ${group.normalizedMerchant} amounts:`, amounts, `max: ${maxAmount.toFixed(2)}, variation ok: ${amountVariation}, known service: ${isKnownService}`);
      
      if (!amountVariation) {
        console.log(`❌ Skipping ${group.normalizedMerchant}: amount variation too high`);
        continue; // Skip if amounts vary too much
      }
      
      // Check date intervals (~30 days for monthly subscriptions)
      const intervals: number[] = [];
      for (let i = 1; i < sortedTransactions.length; i++) {
        const prevDate = new Date(sortedTransactions[i - 1].date);
        const currDate = new Date(sortedTransactions[i].date);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(diffDays);
      }
      
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      
      // Check if intervals are consistent (±15 days for flexibility)
      const intervalConsistency = intervals.every(interval => 
        Math.abs(interval - avgInterval) <= 15
      );
      
      console.log(`📅 ${group.normalizedMerchant} intervals:`, intervals, `avg: ${avgInterval.toFixed(1)} days, consistency: ${intervalConsistency}`);
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      
      // Base confidence for having multiple transactions
      confidence += 30;
      
      // Amount consistency bonus
      if (amountVariation) confidence += 25;
      
      // Interval consistency bonus
      if (intervalConsistency) confidence += 25;
      
      // Monthly pattern bonus (~30 days, flexible)
      if (avgInterval >= 20 && avgInterval <= 40) confidence += 15;
      
      // Bimonthly pattern bonus (~60 days)
      if (avgInterval >= 50 && avgInterval <= 70) confidence += 10;
      
      // Weekly pattern bonus (~7 days)  
      if (avgInterval >= 5 && avgInterval <= 9) confidence += 15;
      
      // More transactions = higher confidence
      confidence += Math.min(group.transactions.length * 5, 20);
      
      // Only consider if confidence >= 40% (more permissive)
      if (confidence >= 40) {
        // Find the last transaction date for next payment calculation
        const lastTransactionDate = sortedTransactions[sortedTransactions.length - 1].date;
        
        candidates.push({
          group,
          averageAmount: subscriptionAmount, // Use max amount instead of average
          averageIntervalDays: avgInterval,
          confidence: Math.min(confidence, 100),
          lastTransactionDate: lastTransactionDate // Add this for accurate next payment
        });
      }
    }
    
    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`✅ Found ${candidates.length} subscription candidates from ${groups.length} groups`);
    return candidates;
  }

  /**
   * NEW: Process subscription candidates with OpenAI in batches
   */
  private static async processCandidatesWithOpenAI(
    candidates: SubscriptionCandidate[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<DetectedSubscription[]> {
    console.log(`🤖 Processing ${candidates.length} candidates with OpenAI...`);
    
    if (candidates.length === 0) return [];
    
    const finalSubscriptions: DetectedSubscription[] = [];
    const batchSize = 10; // Process 10 candidates per batch
    const batches = this.createBatches(candidates, batchSize);
    
    console.log(`📦 Created ${batches.length} batches for processing`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      onProgress?.({ 
        stage: 'processing', 
        currentChunk: i + 1, 
        totalChunks: batches.length, 
        message: `Processing batch ${i + 1}/${batches.length}...` 
      });
      
      try {
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} with ${batch.length} candidates...`);
        
        const batchResults = await this.processBatchWithOpenAI(batch);
        // Enhance results with accurate next payment dates from candidates
        const enhancedResults = this.enhanceWithCandidateData(batchResults, batch);
        finalSubscriptions.push(...enhancedResults);
        
        console.log(`✅ Batch ${i + 1} returned ${batchResults.length} valid subscriptions`);
        
        // Rate limiting: Wait 20 seconds between batches (3 requests/min)
        if (i < batches.length - 1) {
          console.log('⏳ Waiting 20 seconds for rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 20000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        
        // Fallback: Convert candidates directly to subscriptions when OpenAI fails
        console.log('🔄 Using fallback conversion for failed batch...');
        const fallbackResults = this.convertCandidatesDirectly(batch);
        finalSubscriptions.push(...fallbackResults);
      }
    }
    
    console.log(`🎉 OpenAI processing complete: ${finalSubscriptions.length} final subscriptions`);
    return finalSubscriptions;
  }

  /**
   * Create batches from candidates array
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a single batch of candidates with OpenAI
   */
  private static async processBatchWithOpenAI(candidates: SubscriptionCandidate[]): Promise<DetectedSubscription[]> {
    const prompt = this.buildCandidateAnalysisPrompt(candidates);
    
    try {
      const response = await fetch(this.OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst expert at validating subscription patterns. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          seed: this.FIXED_SEED,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "subscription_validation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subscriptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        merchant_name: { type: "string" },
                        category: { type: "string" },
                        average_amount: { type: "number" },
                        currency: { type: "string" },
                        frequency: { type: "string" },
                        confidence: { type: "integer", minimum: 0, maximum: 100 }
                      },
                      required: ["merchant_name", "category", "average_amount", "currency", "frequency", "confidence"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["subscriptions"],
                additionalProperties: false
              }
            }
          },
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0]?.message?.content || '{}');
      
      return this.convertStructuredResponse(result);
      
    } catch (error) {
      console.error('❌ OpenAI batch processing failed:', error);
      return [];
    }
  }

  /**
   * Build prompt for analyzing subscription candidates
   */
  private static buildCandidateAnalysisPrompt(candidates: SubscriptionCandidate[]): string {
    let prompt = `Analizează aceste candidați de abonamente și confirmă care sunt abonamente reale.

REGULI SIMPLE:
- Dacă un merchant apare de 2+ ori = abonament VALID (nu contează dacă sumele variază)
- Acceptă TOATE intervalele: 15-70 zile (săptămânal, lunar, bilunar)
- Acceptă și sume variabile (planuri diferite, conversii valutare)
- Folosește moneda ORIGINALĂ din tranzacții  
- Păstrează numele merchant-ului exact
- FII FOARTE PERMISIV - aproape toate pattern-urile sunt abonamente valide
- Netflix, Spotify, Apple, OpenAI, Adobe, Shopify, Canva = ÎNTOTDEAUNA abonamente

CANDIDAȚI DE ANALIZAT:

`;

    candidates.forEach((candidate, index) => {
      const { group, averageAmount, averageIntervalDays, confidence } = candidate;
      
      prompt += `${index + 1}. MERCHANT: "${group.normalizedMerchant}"
   Tranzacții: ${group.transactions.length}
   Sumă medie: ${averageAmount.toFixed(2)} ${group.transactions[0].currency}
   Interval mediu: ${averageIntervalDays.toFixed(1)} zile
   Confidence: ${confidence}%
   
   Detalii tranzacții:
`;
      
      group.transactions.forEach(tx => {
        prompt += `   - ${tx.date}: ${tx.amount} ${tx.currency}\n`;
      });
      
      prompt += '\n';
    });

    prompt += `
RĂSPUNS JSON (doar abonamentele confirmate):`;

    return prompt;
  }

  /**
   * Normalize merchant names using deterministic rules
   */
  private static normalizeMerchantName(merchantName: string): string {
    const name = merchantName.trim().toUpperCase();
    
    // Hard mappings for known services
    const mappings: Record<string, string> = {
      // AI/Tech services
      'OPENAI*CHATGPT SUBSCR': 'OpenAI',
      'OPENAI US': 'OpenAI', 
      'OPENAI*': 'OpenAI',
      'CHATGPT*': 'OpenAI',
      
      // Streaming
      'SPOTIFY*': 'Spotify',
      'SPOTIFYRO': 'Spotify',
      'NETFLIX.COM': 'Netflix',
      'NETFLIX*': 'Netflix',
      'YOUTUBE*PREMIUM': 'YouTube Premium',
      'HBO*': 'HBO Max',
      'DISNEY*': 'Disney+',
      'AMAZON*PRIME': 'Amazon Prime',
      
      // Apple services
      'APPLE.COM/BILL': 'Apple',
      'APPLE*': 'Apple',
      'ITUNES*': 'Apple',
      
      // Microsoft
      'MICROSOFT*': 'Microsoft',
      'MSFT*': 'Microsoft',
      'OFFICE*': 'Microsoft 365',
      
      // Adobe
      'ADOBE*': 'Adobe',
      
      // Design tools
      'CANVA*': 'Canva',
      'CANVA.COM': 'Canva',
      
      // Hosting/Dev tools
      'HAWK HOST': 'Hawk Host',
      'HAWK.HOST': 'Hawk Host',
      'SONETEL.COM': 'Sonetel',
      'ELEVENLABS.IO': 'ElevenLabs',
      'ELEVENLABS*': 'ElevenLabs',
      'SHOPIFY*': 'Shopify'
    };
    
    // Check exact matches first
    for (const [pattern, normalized] of Object.entries(mappings)) {
      if (name.includes(pattern) || pattern.includes('*') && new RegExp(pattern.replace('*', '.*')).test(name)) {
        return normalized;
      }
    }
    
    // Exclude utilities/telecom/banking
    const exclusions = ['DIGI', 'ORANGE', 'VODAFONE', 'TELEKOM', 'ATM', 'TRANSFER', 'COMISION', 'DOBANDA'];
    if (exclusions.some(exc => name.includes(exc))) {
      return ''; // Empty string to exclude
    }
    
    // Return cleaned original name
    return merchantName.trim();
  }




  /**
   * Normalize frequency to only weekly or monthly (simplified)
   */
  private static normalizeFrequency(frequency: string): string {
    const freq = frequency.toLowerCase();
    
    // Extract days if present
    const daysMatch = freq.match(/(\d+(?:\.\d+)?)\s*days?/);
    if (daysMatch) {
      const days = parseFloat(daysMatch[1]);
      // Anything 14 days or less = weekly, everything else = monthly
      return days <= 14 ? 'weekly' : 'monthly';
    }
    
    // Direct frequency matches
    if (freq.includes('week')) return 'weekly';
    
    // Default to monthly for everything else
    return 'monthly';
  }
  
  /**
   * Get interval days for frequency (simplified)
   */
  private static getIntervalDays(frequency: string): number {
    return frequency === 'weekly' ? 7 : 30; // Only 2 options
  }

  /**
   * Enhance OpenAI results with accurate next payment dates from candidates
   */
  private static enhanceWithCandidateData(
    subscriptions: DetectedSubscription[], 
    candidates: SubscriptionCandidate[]
  ): DetectedSubscription[] {
    return subscriptions.map(subscription => {
      // Find matching candidate for this subscription
      const matchingCandidate = candidates.find(candidate => 
        this.areMerchantsSimilar(candidate.group.normalizedMerchant, subscription.beneficiary)
      );
      
      if (matchingCandidate) {
        // Calculate accurate next payment from last transaction
        const lastDate = new Date(matchingCandidate.lastTransactionDate);
        const frequency = matchingCandidate.averageIntervalDays <= 14 ? 'weekly' : 'monthly';
        const intervalDays = frequency === 'weekly' ? 7 : 30;
        const accurateNextPayment = addDays(lastDate, intervalDays);
        
        console.log(`📅 Enhanced ${subscription.beneficiary}: last payment ${matchingCandidate.lastTransactionDate} → next payment ${accurateNextPayment.toISOString().split('T')[0]}`);
        
        return {
          ...subscription,
          frequency: frequency,
          nextEstimatedPayment: accurateNextPayment,
          totalPaidAmount: subscription.averageAmount * (frequency === 'weekly' ? 52 : 12) // 52 weeks or 12 months
        };
      }
      
      return subscription; // Return unchanged if no matching candidate
    });
  }

  /**
   * Post-processing deduplication for similar services (e.g., multiple Spotify entries)
   */
  private static deduplicateSimilarServices(subscriptions: DetectedSubscription[]): DetectedSubscription[] {
    console.log(`🔄 Deduplicating ${subscriptions.length} subscriptions...`);
    
    // Service mappings for deduplication
    const serviceGroups: { [key: string]: string } = {
      // Streaming
      'netflix': 'netflix',
      'spotify': 'spotify', 
      'youtube': 'youtube',
      'hbo': 'hbo',
      'disney': 'disney',
      'amazon': 'amazon',
      
      // Tech services
      'apple': 'apple',
      'microsoft': 'microsoft',
      'google': 'google',
      'adobe': 'adobe',
      'openai': 'openai',
      'chatgpt': 'openai', // ChatGPT -> OpenAI
      
      // E-commerce/Other
      'shopify': 'shopify',
      'canva': 'canva',
      
      // Hosting/Dev
      'hawk host': 'hawkhost',
      'hawkhost': 'hawkhost',
      'sonetel': 'sonetel',
      'elevenlabs': 'elevenlabs'
    };
    
    // Group subscriptions by normalized service name
    const grouped = new Map<string, DetectedSubscription[]>();
    
    for (const subscription of subscriptions) {
      // Find the normalized service name
      const beneficiary = subscription.beneficiary.toLowerCase();
      let serviceKey = 'other';
      
      for (const [pattern, group] of Object.entries(serviceGroups)) {
        if (beneficiary.includes(pattern)) {
          serviceKey = group;
          break;
        }
      }
      
      if (!grouped.has(serviceKey)) {
        grouped.set(serviceKey, []);
      }
      grouped.get(serviceKey)!.push(subscription);
    }
    
    // For each group, keep only the one with the highest amount
    const deduplicated: DetectedSubscription[] = [];
    
    for (const [serviceKey, group] of grouped.entries()) {
      if (group.length === 1) {
        // Single subscription - keep as is
        deduplicated.push(group[0]);
      } else {
        // Multiple subscriptions - merge them
        console.log(`🔗 Found ${group.length} subscriptions for ${serviceKey}, merging...`);
        
        // Sort by amount descending and take the highest
        const sorted = group.sort((a, b) => b.averageAmount - a.averageAmount);
        const merged = sorted[0]; // Keep the highest amount one
        
        // Update the name to be consistent
        if (serviceKey !== 'other') {
          merged.beneficiary = this.getCanonicalServiceName(serviceKey);
        }
        
        console.log(`✅ Merged ${serviceKey}: keeping ${merged.averageAmount} RON (was ${group.map(g => g.averageAmount).join(', ')})`);
        deduplicated.push(merged);
      }
    }
    
    console.log(`✅ Deduplication complete: ${subscriptions.length} → ${deduplicated.length} subscriptions`);
    return deduplicated;
  }
  
  /**
   * Get canonical service name for display
   */
  private static getCanonicalServiceName(serviceKey: string): string {
    const canonicalNames: { [key: string]: string } = {
      'netflix': 'Netflix',
      'spotify': 'Spotify',
      'youtube': 'YouTube Premium',
      'hbo': 'HBO Max',
      'disney': 'Disney+',
      'amazon': 'Amazon Prime',
      'apple': 'Apple',
      'microsoft': 'Microsoft',
      'google': 'Google',
      'adobe': 'Adobe',
      'openai': 'OpenAI',
      'shopify': 'Shopify',
      'canva': 'Canva',
      'hawkhost': 'Hawk Host',
      'sonetel': 'Sonetel',
      'elevenlabs': 'ElevenLabs'
    };
    
    return canonicalNames[serviceKey] || serviceKey;
  }

  /**
   * Convert candidates directly to subscriptions when OpenAI fails (fallback)
   */
  private static convertCandidatesDirectly(candidates: SubscriptionCandidate[]): DetectedSubscription[] {
    return candidates.map(candidate => {
      const { group, averageAmount, averageIntervalDays, confidence, lastTransactionDate } = candidate;
      const firstTransaction = group.transactions[0];
      
      // No need for conversion - already converted during PDF extraction
      let finalAmount = averageAmount;
      let finalCurrency = firstTransaction.currency; // Should always be RON now
      
      // Determine frequency based on average interval (simplified)
      const frequency = averageIntervalDays <= 14 ? 'weekly' : 'monthly';
      
      // Calculate next payment based on last transaction + interval
      const lastDate = new Date(lastTransactionDate);
      const nextPayment = addDays(lastDate, Math.round(averageIntervalDays));
      
      return {
        beneficiary: group.normalizedMerchant,
        averageAmount: finalAmount,
        currency: finalCurrency,
        frequency: frequency as any,
        confidence: Math.min(confidence / 100, 1), // Convert to 0-1 range
        transactions: [], 
        nextEstimatedPayment: nextPayment,
        totalPaidAmount: finalAmount * (frequency === 'weekly' ? 52 : 12),
        category: this.categorizeByKeywords(group.normalizedMerchant)
      };
    });
  }

  /**
   * Convert structured OpenAI response to DetectedSubscription objects
   */
  private static convertStructuredResponse(response: any): DetectedSubscription[] {
    if (!response.subscriptions || !Array.isArray(response.subscriptions)) {
      return [];
    }

    return response.subscriptions.map((sub: any) => {
      console.log(`Converting subscription: ${sub.merchant_name} - ${sub.average_amount} ${sub.currency}`);
      
      // No need for conversion - already converted during PDF extraction
      let finalAmount = sub.average_amount;
      let finalCurrency = sub.currency; // Should always be RON now
      
      // Calculate proper frequency and next payment based on OpenAI response
      const frequency = this.normalizeFrequency(sub.frequency);
      const intervalDays = this.getIntervalDays(frequency);
      
      // Calculate next payment based on candidates (we'll enhance this)
      const estimatedNext = addDays(new Date(), intervalDays);
      
      return {
        beneficiary: sub.merchant_name,
        averageAmount: finalAmount,
        currency: finalCurrency,
        frequency: frequency,
        confidence: sub.confidence / 100, // Convert 0-100 to 0-1 for UI compatibility
        transactions: [], // Not needed in new approach
        nextEstimatedPayment: estimatedNext,
        totalPaidAmount: finalAmount * (frequency === 'weekly' ? 52 : 12), // 52 weeks or 12 months
        category: sub.category
      };
    });
  }


  /**
   * Simple fallback analysis when OpenAI fails
   */
  private static fallbackAnalysis(transactions: Transaction[]): DetectedSubscription[] {
    console.log('🔧 Running fallback subscription detection...');
    
    // Group by beneficiary
    const groups = new Map<string, Transaction[]>();
    transactions.forEach(t => {
      const key = t.beneficiary.toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });

    const subscriptions: DetectedSubscription[] = [];

    // Known subscription keywords
    const knownKeywords = [
      'netflix', 'spotify', 'youtube', 'hbo', 'disney', 'amazon', 'prime',
      'orange', 'vodafone', 'digi', 'telekom', 'upc', 'rcs', 'rds',
      'enel', 'electrica', 'eon', 'distrigaz', 'engie',
      'revolut', 'microsoft', 'adobe', 'google', 'dropbox',
      'uber', 'bolt', 'lyft', 'world class', '7card'
    ];

    for (const [beneficiary, txns] of groups.entries()) {
      if (txns.length >= 2) {
        // Check if it matches known subscription services
        const isKnownService = knownKeywords.some(keyword => 
          beneficiary.includes(keyword) || 
          txns.some(t => t.description.toLowerCase().includes(keyword))
        );

        if (isKnownService) {
          const amounts = txns.map(t => t.amount);
          const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const lastTxn = txns.sort((a, b) => a.date.getTime() - b.date.getTime())[txns.length - 1];
          
          subscriptions.push({
            beneficiary: txns[0].beneficiary,
            averageAmount: Math.round(avgAmount * 100) / 100,
            currency: txns[0].currency,
            frequency: 'monthly' as any,
            confidence: 75,
            transactions: txns,
            nextEstimatedPayment: addDays(lastTxn.date, 30),
            totalPaidAmount: amounts.reduce((a, b) => a + b, 0),
            category: this.categorizeByKeywords(beneficiary)
          });
        }
      }
    }

    console.log(`🔧 Fallback detected ${subscriptions.length} subscriptions`);
    return subscriptions;
  }

  /**
   * Simple categorization by keywords
   */
  private static categorizeByKeywords(beneficiary: string): string {
    const b = beneficiary.toLowerCase();
    if (['netflix', 'spotify', 'youtube', 'hbo', 'disney', 'amazon', 'prime'].some(k => b.includes(k))) return 'streaming';
    if (['orange', 'vodafone', 'digi', 'telekom', 'upc', 'rcs', 'rds'].some(k => b.includes(k))) return 'telecom';
    if (['enel', 'electrica', 'eon', 'distrigaz', 'engie'].some(k => b.includes(k))) return 'utilities';
    if (['microsoft', 'adobe', 'google', 'dropbox'].some(k => b.includes(k))) return 'software';
    if (['uber', 'bolt', 'lyft'].some(k => b.includes(k))) return 'transport';
    if (['revolut'].some(k => b.includes(k))) return 'financial';
    return 'other';
  }
}