'use client'

import { useState } from 'react'
import { useGenerateCancellation } from '@/lib/hooks/useApi'

interface Subscription {
  id: string
  name: string
  merchant: string
  amount: number
  currency: string
  frequency: string
  category: string | null
}


interface CancellationModalProps {
  subscription: Subscription
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CancellationModal({ 
  subscription, 
  isOpen, 
  onClose, 
  onSuccess 
}: CancellationModalProps) {
  const [step, setStep] = useState<'generate' | 'preview' | 'sent'>('generate')
  const [cancellationRequest, setCancellationRequest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { execute: generateCancellation } = useGenerateCancellation()

  if (!isOpen) return null

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const request = await generateCancellation(subscription.id)
      setCancellationRequest(request)
      setStep('preview')
    } catch (error) {
      console.error('Error generating cancellation request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!cancellationRequest) return
    
    try {
      await navigator.clipboard.writeText(cancellationRequest.content)
      alert('Cererea a fost copiată în clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleDownload = () => {
    if (!cancellationRequest) return
    
    const element = document.createElement('a')
    const file = new Blob([cancellationRequest.content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `cerere_reziliere_${subscription.merchant.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleMarkAsSent = () => {
    setStep('sent')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Cerere de reziliere
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subscription.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {step === 'generate' && (
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">
                Generează cererea de reziliere
              </h3>
              <p className="text-gray-600 mb-6">
                Vom crea o cerere oficială de reziliere pentru abonamentul tău la {subscription.merchant}
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Detalii abonament:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li><strong>Serviciu:</strong> {subscription.name}</li>
                  <li><strong>Furnizor:</strong> {subscription.merchant}</li>
                  <li><strong>Valoare:</strong> {subscription.amount} {subscription.currency}</li>
                  <li><strong>Frecvență:</strong> {subscription.frequency}</li>
                </ul>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 font-medium transition-all duration-300"
              >
                {loading ? 'Se generează...' : 'Generează cererea'}
              </button>
            </div>
          )}

          {step === 'preview' && cancellationRequest && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  Cererea ta de reziliere
                </h3>
                <p className="text-gray-600">
                  Verifică cererea și apoi copiaz-o sau descarcă-o pentru a o trimite furnizorului.
                </p>
              </div>

              {/* Contact suggestions */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Cum să trimiți cererea:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {cancellationRequest.merchantInfo.contactSuggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Letter preview */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                <pre className="text-sm whitespace-pre-wrap font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
                  {cancellationRequest.content}
                </pre>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
                >
                  📋 Copiază în clipboard
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-medium"
                >
                  💾 Descarcă fișier
                </button>
                <button
                  onClick={handleMarkAsSent}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-medium"
                >
                  ✅ Am trimis cererea
                </button>
              </div>
            </div>
          )}

          {step === 'sent' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
                Cererea a fost trimisă!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Vei primi o confirmare de la {subscription.merchant} în următoarele zile.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Statusul abonamentului va fi actualizat automat când rezilierea este confirmată.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {step === 'sent' ? 'Închide' : 'Anulează'}
          </button>
        </div>
      </div>
    </div>
  )
}