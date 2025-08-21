'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { PDFAnalysisResult } from '@/types/pdf-analyzer'
import { usePDFAnalysisStream } from '@/lib/hooks/usePDFAnalysisStream'
import { PDFAnalysisProgress, SuccessAnimation } from './PDFAnalysisProgress'

interface Transaction {
  date: string
  amount: number
  merchant: string
  description?: string
}

interface FileUploaderProps {
  onDataParsed: (data: Transaction[]) => void
  onError: (error: string) => void
  onPDFAnalyzed?: (result: PDFAnalysisResult) => void
}


export default function FileUploader({ onDataParsed, onError, onPDFAnalyzed }: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processingStatus, setProcessingStatus] = useState('')
  
  // New streaming analysis hook
  const pdfAnalysis = usePDFAnalysisStream()
  
  // Debug logging
  console.log('📄 FileUploader render:', { 
    isProcessing, 
    isAnalyzing: pdfAnalysis.isAnalyzing, 
    progress: pdfAnalysis.progress?.stage,
    progressType: pdfAnalysis.progress?.type
  });


  const parseCSV = useCallback((file: File) => {
    setIsProcessing(true)
    setProcessingStatus('Se procesează fișierul CSV...')
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize Romanian headers to standard fields
        const headerMap: { [key: string]: string } = {
          'data': 'date',
          'data tranzactiei': 'date',
          'data tranzacţiei': 'date',
          'suma': 'amount',
          'valoare': 'amount',
          'suma ron': 'amount',
          'beneficiar': 'merchant',
          'merchant': 'merchant',
          'comerciant': 'merchant',
          'descriere': 'description',
          'detalii': 'description',
          'explicatie': 'description',
          'explicație': 'description'
        }
        
        const normalizedHeader = header.toLowerCase().trim()
        return headerMap[normalizedHeader] || header
      },
      transform: (value: string, field: string) => {
        if (field === 'amount') {
          // Handle Romanian number format (comma as decimal separator)
          const cleanValue = value.replace(/[^\d,-]/g, '').replace(',', '.')
          return parseFloat(cleanValue) || 0
        }
        if (field === 'date') {
          // Try to parse various date formats
          const dateFormats = [
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
          ]
          
          for (const format of dateFormats) {
            const match = value.match(format)
            if (match) {
              if (format === dateFormats[2]) { // YYYY-MM-DD
                return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
              } else { // DD.MM.YYYY or DD/MM/YYYY
                return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
              }
            }
          }
        }
        return value?.trim() || ''
      },
      complete: (results) => {
        setIsProcessing(false)
        setProcessingStatus('')
        
        if (results.errors.length > 0) {
          onError(`Erori în fișier: ${results.errors.map(e => e.message).join(', ')}`)
          return
        }

        // Validate and filter data
        const validTransactions = (results.data as Record<string, unknown>[])
          .filter((row) => row.date && row.amount && row.merchant)
          .map((row) => ({
            date: String(row.date),
            amount: Math.abs(Number(row.amount)), // Use absolute value
            merchant: String(row.merchant),
            description: String(row.description || '')
          }))

        if (validTransactions.length === 0) {
          onError('Nu s-au găsit tranzacții valide în fișier. Verifică formatul.')
          return
        }

        onDataParsed(validTransactions)
      },
      error: (error) => {
        setIsProcessing(false)
        setProcessingStatus('')
        onError(`Eroare la parsarea fișierului: ${error.message}`)
      }
    })
  }, [onDataParsed, onError])

  const processPDF = useCallback(async (file: File) => {
    if (!onPDFAnalyzed) {
      onError('PDF processing not enabled')
      return
    }

    // Use new streaming analysis
    try {
      await pdfAnalysis.analyzeFile(file)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Eroare necunoscută la procesarea PDF-ului')
      pdfAnalysis.reset()
    }
  }, [pdfAnalysis, onPDFAnalyzed, onError])
  
  // Effect to handle PDF analysis completion
  React.useEffect(() => {
    if (pdfAnalysis.completedAt && pdfAnalysis.subscriptions.length > 0 && onPDFAnalyzed) {
      // Convert to expected format and call callback
      const result: PDFAnalysisResult = {
        subscriptions: pdfAnalysis.subscriptions,
        totalTransactions: pdfAnalysis.totalTransactions,
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        analysisMetadata: {
          processingTime: pdfAnalysis.processingTime,
          extractionMethod: 'text',
          pdfPages: pdfAnalysis.pdfPages
        }
      }
      onPDFAnalyzed(result)
    }
  }, [pdfAnalysis.completedAt, pdfAnalysis.subscriptions, onPDFAnalyzed])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv')
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    if (!isCSV && !isPDF) {
      onError('Te rog încarcă fișiere CSV sau PDF')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      onError('Fișierul este prea mare. Mărimea maximă este 10MB.')
      return
    }

    setUploadedFile(file)

    if (isCSV) {
      parseCSV(file)
    } else if (isPDF) {
      processPDF(file)
    }
  }, [parseCSV, processPDF, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {(isProcessing || pdfAnalysis.isAnalyzing) ? (
            <div className="text-center">
              {pdfAnalysis.isAnalyzing ? (
                <PDFAnalysisProgress 
                  progress={pdfAnalysis.progress} 
                  isAnalyzing={pdfAnalysis.isAnalyzing} 
                />
              ) : (
                <>
                  <p className="text-xl text-gray-900 dark:text-gray-100 font-semibold mb-4">Se procesează fișierul...</p>
                  <div className="mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    {processingStatus || 'Analizez tranzacțiile și detectez abonamentele'}
                  </p>
                </>
              )}
            </div>
          ) : pdfAnalysis.completedAt && pdfAnalysis.subscriptions.length > 0 ? (
            <SuccessAnimation 
              message="Analiza completă!" 
              subscriptionCount={pdfAnalysis.subscriptions.length}
            />
          ) : isDragActive ? (
            <div className="text-center">
              <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold">Eliberează fișierul aici...</p>
              <p className="text-sm text-blue-500 dark:text-blue-300 mt-2">Voi începe imediat procesarea</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl text-gray-900 dark:text-gray-100 font-semibold mb-2">
                Trage și eliberează fișierul aici
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                CSV sau PDF - extrasul tău bancar
              </p>
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
                📂 Selectează fișierul
              </div>
            </div>
          )}
          
          {uploadedFile && !isProcessing && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                <div className="text-green-800 dark:text-green-200">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB procesate cu succes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Format</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">CSV / PDF</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">extras bancar</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Detectare</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">Abonamente automat</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Netflix, Spotify, etc.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mărime maximă</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">10 MB</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">procesare rapidă</p>
        </div>
      </div>
    </div>
  )
}