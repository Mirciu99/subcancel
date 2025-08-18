import PDFParser from 'pdf2json';

export interface PDFExtractionResult {
  text: string;
  pages: number;
  method: 'text' | 'ocr';
}

export class PDFExtractor {
  /**
   * Extract text from PDF buffer
   */
  static async extractText(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔍 Starting PDF text extraction...');
        
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', (errData: Record<'parserError', Error>) => {
          console.error('❌ PDF parsing error:', errData.parserError);
          reject(new Error(`Failed to parse PDF: ${errData.parserError.message}`));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
          try {
            console.log('📄 PDF data ready, extracting text...');
            
            let extractedText = '';
            let pageCount = 0;

            if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
              pageCount = pdfData.Pages.length;
              
              // Extract text from each page
              for (const page of pdfData.Pages) {
                if (page.Texts && Array.isArray(page.Texts)) {
                  for (const textItem of page.Texts) {
                    if (textItem.R && Array.isArray(textItem.R)) {
                      for (const textRun of textItem.R) {
                        if (textRun.T) {
                          // Decode URI encoded text
                          const decodedText = decodeURIComponent(textRun.T);
                          extractedText += decodedText + ' ';
                        }
                      }
                    }
                  }
                  extractedText += '\n';
                }
              }
            }

            console.log(`📄 Extracted ${extractedText.length} characters from ${pageCount} pages`);

            // Check if we got meaningful text
            if (this.isTextMeaningful(extractedText)) {
              resolve({
                text: extractedText,
                pages: pageCount,
                method: 'text'
              });
            } else {
              console.log('⚠️ PDF appears to be scanned - text extraction yielded minimal results');
              reject(new Error('PDF appears to be scanned - OCR would be needed'));
            }
            
          } catch (error) {
            console.error('❌ Text extraction error:', error);
            reject(new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });

        // Parse the PDF buffer
        pdfParser.parseBuffer(pdfBuffer);
        
      } catch (error) {
        console.error('❌ PDF extraction error:', error);
        reject(new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Check if extracted text contains meaningful data (universal approach)
   */
  private static isTextMeaningful(text: string): boolean {
    const cleanText = text.trim();
    
    // Must have reasonable length
    if (cleanText.length < 50) {
      return false;
    }

    // Count numeric content - any document with financial data should have plenty of numbers
    const numberMatches = cleanText.match(/\d/g);
    const numberDensity = numberMatches ? numberMatches.length / cleanText.length : 0;
    
    // Should have at least 2% numeric content (very permissive)
    if (numberDensity < 0.02) {
      return false;
    }

    // Should contain some date-like patterns (very broad)
    const datePatterns = [
      /\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}/g, // Any date format
      /\d{1,2}\s+\w{3,10}\s+\d{2,4}/g, // DD Month YYYY (any language)
    ];

    const hasDatePattern = datePatterns.some(pattern => pattern.test(text));
    if (!hasDatePattern) {
      return false;
    }

    // Should contain money-like patterns (very broad)
    const amountPatterns = [
      /\d+[,\.]\d{2}(?!\d)/g, // Numbers with 2 decimal places
      /\d{1,3}(?:[,\.\s]\d{3})+/g, // Large formatted numbers
      /-?\d+(?:[,\.]\d+)?/g // Any signed or decimal number
    ];

    const hasAmountPattern = amountPatterns.some(pattern => pattern.test(text));
    
    // Very permissive - if it has numbers, dates, and amounts, it's probably financial data
    return hasAmountPattern;
  }

  /**
   * Clean and normalize extracted text
   */
  static cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove extra line breaks
      .replace(/\n\s*\n/g, '\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  /**
   * Split text into logical sections for easier parsing
   */
  static splitIntoSections(text: string): string[] {
    const cleaned = this.cleanText(text);
    
    // Split by common section indicators in Romanian bank statements
    const sectionIndicators = [
      'tranzactii',
      'lista operatiuni',
      'miscari cont',
      'detalii tranzactii',
      'operatiuni efectuate'
    ];

    for (const indicator of sectionIndicators) {
      const regex = new RegExp(`.*${indicator}.*`, 'gi');
      const match = cleaned.match(regex);
      if (match) {
        const sections = cleaned.split(regex);
        return sections.filter(section => section.trim().length > 50);
      }
    }

    // Fallback: split by page breaks or large gaps
    return cleaned.split(/\n\s*\n\s*\n/).filter(section => section.trim().length > 50);
  }
}