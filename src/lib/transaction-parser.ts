import { Transaction } from '@/types/pdf-analyzer';
import { isValid } from 'date-fns';

export class TransactionParser {
  private static readonly MONTH_MAPPINGS = {
    // Romanian months
    'ian': '01', 'ianuarie': '01',
    'feb': '02', 'februarie': '02',
    'mar': '03', 'martie': '03',
    'apr': '04', 'aprilie': '04',
    'mai': '05',
    'iun': '06', 'iunie': '06',
    'iul': '07', 'iulie': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'septembrie': '09',
    'oct': '10', 'octombrie': '10',
    'nov': '11', 'noiembrie': '11',
    'dec': '12', 'decembrie': '12',
    // English months
    'jan': '01', 'january': '01',
    'february': '02',
    'march': '03',
    'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'september': '09',
    'october': '10',
    'november': '11',
    'december': '12',
    // Other common abbreviations
    'mart': '03', 'mayo': '05', 'juni': '06', 'juli': '07'
  };

  /**
   * Parse transactions from extracted PDF text (UNIVERSAL APPROACH)
   */
  static parseTransactions(text: string): Transaction[] {
    console.log('🔍 Starting UNIVERSAL transaction parsing...');
    
    // Try multiple parsing strategies
    let transactions: Transaction[] = [];
    
    // Strategy 1: Table-based parsing (like BT format)
    const tableTransactions = this.parseTableFormat(text);
    transactions = transactions.concat(tableTransactions);
    
    // Strategy 2: Line-by-line parsing
    const lineTransactions = this.parseLineFormat(text);
    transactions = transactions.concat(lineTransactions);
    
    // Strategy 3: Pattern detection across multiple lines
    const patternTransactions = this.parsePatternFormat(text);
    transactions = transactions.concat(patternTransactions);
    
    // Strategy 4: Smart extraction - look for any combination of date + amount + description
    const smartTransactions = this.parseSmartFormat(text);
    transactions = transactions.concat(smartTransactions);

    console.log(`📊 Parsed ${transactions.length} total transactions from all strategies`);
    return this.removeDuplicates(transactions);
  }

  /**
   * Parse table format (columns: Date | Description | Debit | Credit)
   */
  private static parseTableFormat(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for date at start + amounts at end pattern
      const tableMatch = line.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s+(.+?)\s+(\d+[,\.]\d{2})\s*(\d+[,\.]\d{2})?/);
      if (tableMatch) {
        const [, dateStr, description, debitStr, creditStr] = tableMatch;
        
        const date = this.parseDate(dateStr);
        const debit = this.parseAmount(debitStr);
        const credit = creditStr ? this.parseAmount(creditStr) : 0;
        
        if (date && (debit > 0 || credit > 0)) {
          const beneficiary = this.extractBeneficiary(description);
          if (beneficiary && beneficiary !== 'Unknown Merchant') {
            transactions.push({
              date,
              amount: debit > 0 ? debit : credit,
              currency: 'RON',
              beneficiary,
              description: description.trim(),
              type: debit > 0 ? 'debit' : 'credit'
            });
          }
        }
      }
    }
    
    console.log(`📋 Table format found ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse line format (each line is a transaction)
   */
  private static parseLineFormat(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const transaction = this.parseTransactionLine(line, lines, i);
      
      if (transaction) {
        transactions.push(transaction);
      }
    }

    console.log(`📝 Line format found ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse pattern format (data spread across multiple lines)
   */
  private static parsePatternFormat(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length - 2; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      const thirdLine = lines[i + 2];
      
      // Look for date in current line
      const dateMatch = currentLine.match(/(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const date = this.parseDate(dateStr);
        
        if (date) {
          // Look for amount in next 3 lines
          const combinedText = [currentLine, nextLine, thirdLine].join(' ');
          const amountMatch = combinedText.match(/(\d+[,\.]\d{2})/);
          
          if (amountMatch) {
            const amount = this.parseAmount(amountMatch[1]);
            const beneficiary = this.extractBeneficiary(combinedText);
            
            if (amount > 0 && beneficiary && beneficiary !== 'Unknown Merchant') {
              transactions.push({
                date,
                amount,
                currency: 'RON',
                beneficiary,
                description: combinedText.trim(),
                type: 'debit'
              });
            }
          }
        }
      }
    }
    
    console.log(`🔄 Pattern format found ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Smart format - extract ANY combination of date + amount + description
   */
  private static parseSmartFormat(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    
    // Find all dates in text
    const dateRegex = /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/g;
    const dates = [...text.matchAll(dateRegex)];
    
    // Find all amounts in text
    const amountRegex = /(\d+[,\.]\d{2})/g;
    const amounts = [...text.matchAll(amountRegex)];
    
    // Try to correlate dates with nearby amounts
    for (const dateMatch of dates) {
      const date = this.parseDate(dateMatch[1]);
      if (!date) continue;
      
      const datePosition = dateMatch.index || 0;
      
      // Look for amounts within 200 characters of the date
      for (const amountMatch of amounts) {
        const amountPosition = amountMatch.index || 0;
        const distance = Math.abs(amountPosition - datePosition);
        
        if (distance < 200) {
          const amount = this.parseAmount(amountMatch[1]);
          if (amount > 0) {
            // Extract text around date and amount for beneficiary
            const start = Math.max(0, Math.min(datePosition, amountPosition) - 100);
            const end = Math.max(datePosition, amountPosition) + 100;
            const context = text.substring(start, end);
            
            const beneficiary = this.extractBeneficiary(context);
            if (beneficiary && beneficiary !== 'Unknown Merchant') {
              transactions.push({
                date,
                amount,
                currency: 'RON',
                beneficiary,
                description: context.trim(),
                type: 'debit'
              });
            }
          }
        }
      }
    }
    
    console.log(`🧠 Smart format found ${transactions.length} transactions`);
    return transactions;
  }

  /**
   * Parse a single transaction line
   */
  private static parseTransactionLine(line: string, allLines: string[], index: number): Transaction | null {
    try {
      // Try different parsing patterns for Romanian bank statements
      
      // Pattern 1: Date Amount Beneficiary Description
      const pattern1 = this.tryPattern1(line);
      if (pattern1) return pattern1;

      // Pattern 2: Multi-line transaction (common in Romanian banks)
      const pattern2 = this.tryPattern2(line, allLines, index);
      if (pattern2) return pattern2;

      // Pattern 3: Tab-separated values
      const pattern3 = this.tryPattern3(line);
      if (pattern3) return pattern3;

      return null;
    } catch {
      // Ignore parsing errors for individual lines
      return null;
    }
  }

  /**
   * Pattern 1: Single line with all data (universal patterns)
   */
  private static tryPattern1(line: string): Transaction | null {
    const patterns = [
      // DD.MM.YYYY Amount Currency Description
      /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})\s+(-?\d+[,\.]\d{1,2})\s*([A-Z]{3})?\s+(.+)$/i,
      // DD Month YYYY Amount Currency Description  
      /^(\d{1,2}\s+\w+\s+\d{2,4})\s+(-?\d+[,\.]\d{1,2})\s*([A-Z]{3})?\s+(.+)$/i,
      // Amount Date Description (reversed order)
      /^(-?\d+[,\.]\d{1,2})\s*([A-Z]{3})?\s+(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})\s+(.+)$/i,
      // Date Description Amount (amount at end)
      /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})\s+(.+?)\s+(-?\d+[,\.]\d{1,2})\s*([A-Z]{3})?$/i
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = line.match(patterns[i]);
      if (match) {
        let dateStr, amountStr, currency, description;
        
        // Handle different pattern structures
        if (i === 0 || i === 1) {
          // Date Amount Currency Description
          [, dateStr, amountStr, currency = 'RON', description] = match;
        } else if (i === 2) {
          // Amount Currency Date Description
          [, amountStr, currency = 'RON', dateStr, description] = match;
        } else if (i === 3) {
          // Date Description Amount Currency
          [, dateStr, description, amountStr, currency = 'RON'] = match;
        }
        
        // Type guard to ensure all variables are defined
        if (!dateStr || !amountStr || !description) continue;
        
        const date = this.parseDate(dateStr);
        const amount = this.parseAmount(amountStr);
        const beneficiary = this.extractBeneficiary(description);

        if (date && !isNaN(amount) && beneficiary && beneficiary !== 'Unknown Merchant') {
          return {
            date,
            amount: Math.abs(amount),
            currency: (currency || 'RON').toUpperCase(),
            beneficiary,
            description: description.trim(),
            type: amount < 0 ? 'debit' : 'credit'
          };
        }
      }
    }

    return null;
  }

  /**
   * Pattern 2: Multi-line transaction (Romanian bank format)
   */
  private static tryPattern2(line: string, allLines: string[], index: number): Transaction | null {
    // Check if current line contains a date
    const dateMatch = line.match(/^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{4}|\d{1,2}\s+\w+\s+\d{4})/);
    if (!dateMatch) return null;

    const date = this.parseDate(dateMatch[1]);
    if (!date) return null;

    // Look for amount in current line or next few lines
    let amount: number | null = null;
    let currency = 'RON';
    let description = '';
    let beneficiary = '';

    for (let i = index; i < Math.min(index + 4, allLines.length); i++) {
      const currentLine = allLines[i];
      
      // Try to find amount
      if (amount === null) {
        const amountMatch = currentLine.match(/(-?\d+[,\.]\d{2})\s*(RON|LEI|EUR|USD)?/i);
        if (amountMatch) {
          amount = this.parseAmount(amountMatch[1]);
          currency = amountMatch[2]?.toUpperCase() || 'RON';
        }
      }

      // Collect description parts
      description += ' ' + currentLine;
    }

    if (amount !== null) {
      beneficiary = this.extractBeneficiary(description);
      
      if (beneficiary) {
        return {
          date,
          amount: Math.abs(amount),
          currency,
          beneficiary,
          description: description.trim(),
          type: amount < 0 ? 'debit' : 'credit'
        };
      }
    }

    return null;
  }

  /**
   * Pattern 3: Tab or multiple space separated
   */
  private static tryPattern3(line: string): Transaction | null {
    const parts = line.split(/\t+|\s{3,}/).filter(part => part.trim().length > 0);
    
    if (parts.length < 3) return null;

    // Try different column arrangements
    for (let dateIndex = 0; dateIndex < Math.min(2, parts.length); dateIndex++) {
      const date = this.parseDate(parts[dateIndex]);
      if (!date) continue;

      for (let amountIndex = dateIndex + 1; amountIndex < parts.length; amountIndex++) {
        const amountMatch = parts[amountIndex].match(/(-?\d+[,\.]\d{2})\s*(RON|LEI|EUR|USD)?/i);
        if (!amountMatch) continue;

        const amount = this.parseAmount(amountMatch[1]);
        const currency = amountMatch[2]?.toUpperCase() || 'RON';
        
        // Rest is description
        const descriptionParts = parts.slice(Math.max(dateIndex + 1, amountIndex + 1));
        const description = descriptionParts.join(' ');
        const beneficiary = this.extractBeneficiary(description);

        if (beneficiary) {
          return {
            date,
            amount: Math.abs(amount),
            currency,
            beneficiary,
            description: description.trim(),
            type: amount < 0 ? 'debit' : 'credit'
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse Romanian date formats
   */
  private static parseDate(dateStr: string): Date | null {
    const cleaned = dateStr.trim().toLowerCase();

    // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    const numericMatch = cleaned.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
    if (numericMatch) {
      const [, day, month, year] = numericMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValid(date) ? date : null;
    }

    // DD Month YYYY format
    const textualMatch = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (textualMatch) {
      const [, day, monthName, year] = textualMatch;
      const monthNum = this.MONTH_MAPPINGS[monthName as keyof typeof this.MONTH_MAPPINGS];
      
      if (monthNum) {
        const date = new Date(parseInt(year), parseInt(monthNum) - 1, parseInt(day));
        return isValid(date) ? date : null;
      }
    }

    return null;
  }

  /**
   * Parse amount from Romanian format
   */
  private static parseAmount(amountStr: string): number {
    // Handle Romanian number format: 1.234,56 or 1,234.56
    const cleaned = amountStr.replace(/[^\d,\.\-+]/g, '');
    
    // Determine if comma is decimal separator or thousands separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    let normalized = cleaned;
    
    if (lastComma > lastDot) {
      // Comma is decimal separator: 1.234,56 -> 1234.56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Dot is decimal separator: 1,234.56 -> 1234.56
      normalized = cleaned.replace(/,/g, '');
    }

    return parseFloat(normalized) || 0;
  }

  /**
   * Extract beneficiary from description (SUPER UNIVERSAL approach)
   */
  private static extractBeneficiary(description: string): string {
    const cleaned = description.trim();
    
    // Step 1: Look for explicit beneficiary indicators
    const explicitPatterns = [
      /(?:plata\s+la|transfer\s+catre|payment\s+to|payee)[:\s]+([^,\n\t0-9]+)/gi,
      /(?:card|pos|atm)\s+(?:la|at)?\s*([A-Z][^,\n\t0-9]{2,})/gi,
      /(?:comerciant|merchant|beneficiar|recipient)[:\s]+([^,\n\t0-9]+)/gi
    ];

    for (const pattern of explicitPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        const candidate = this.cleanBeneficiaryName(match[1].trim());
        if (candidate.length > 1) return candidate;
      }
    }

    // Step 2: Look for ANY capitalized words (company names are usually capitalized)
    const capitalizedWords = cleaned.match(/\b[A-Z][A-Z\s&\.\-]{2,}\b/g);
    if (capitalizedWords) {
      for (const word of capitalizedWords) {
        const candidate = this.cleanBeneficiaryName(word);
        if (candidate.length > 2 && !this.isCommonWord(candidate.toLowerCase())) {
          return candidate;
        }
      }
    }

    // Step 3: Look for mixed case company names
    const mixedCasePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const mixedCaseWords = cleaned.match(mixedCasePattern);
    if (mixedCaseWords) {
      for (const word of mixedCaseWords) {
        const candidate = this.cleanBeneficiaryName(word);
        if (candidate.length > 2 && !this.isCommonWord(candidate.toLowerCase())) {
          return candidate;
        }
      }
    }

    // Step 4: Look for any word sequence that doesn't contain numbers or common words
    const meaningfulWords = cleaned.split(/\s+/).filter(word => {
      const w = word.toLowerCase();
      return word.length > 2 && 
             !/\d/.test(word) && // No numbers
             !this.isCommonWord(w) &&
             !/^[,\.;:\-\(\)]+$/.test(word); // Not just punctuation
    });

    if (meaningfulWords.length > 0) {
      const candidate = meaningfulWords.slice(0, 2).join(' ').trim();
      if (candidate.length > 2) {
        return this.cleanBeneficiaryName(candidate);
      }
    }

    // Step 5: Last resort - look for ANYTHING that looks like a name
    const anyWordPattern = /[A-Za-z]{3,}/g;
    const anyWords = cleaned.match(anyWordPattern);
    if (anyWords) {
      for (const word of anyWords) {
        if (!this.isCommonWord(word.toLowerCase()) && word.length > 3) {
          return this.cleanBeneficiaryName(word);
        }
      }
    }

    return 'Unknown Merchant';
  }

  /**
   * Clean and normalize a beneficiary name
   */
  private static cleanBeneficiaryName(name: string): string {
    return name
      .replace(/[^A-Za-z0-9\s\-&\.]/g, ' ') // Remove special chars except common ones
      .replace(/\b(SRL|SA|PFA|LTD|INC|CORP|SERVICES|SERVICE|ROMANIA|RO)\b/gi, '') // Remove company suffixes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .toUpperCase();
  }

  /**
   * Check if a word is too common to be a company name
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'and', 'or', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
      'si', 'sau', 'de', 'la', 'cu', 'pe', 'in', 'din', 'pentru',
      'card', 'pos', 'atm', 'transfer', 'payment', 'transaction', 'fee',
      'ron', 'lei', 'eur', 'usd', 'gbp', 'currency', 'amount', 'sum',
      'date', 'time', 'from', 'description', 'reference', 'ref'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Normalize beneficiary names for better grouping
   */
  private static normalizeBeneficiary(name: string): string {
    return name
      .toUpperCase()
      .replace(/\b(SRL|SA|PFA|II|SERVICES|SERVICE|ROMANIA|RO|BUCURESTI|CLUJ|TIMISOARA)\b/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Remove duplicate transactions
   */
  private static removeDuplicates(transactions: Transaction[]): Transaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
      const key = `${transaction.date.toISOString()}-${transaction.amount}-${transaction.beneficiary}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}