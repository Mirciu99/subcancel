'use client'

import { useState } from 'react'

interface AddManualSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string;
    amount: number;
    frequency: string;
    category: string;
    nextPayment?: string;
  }) => void
}

export default function AddManualSubscriptionModal({ isOpen, onClose, onSubmit }: AddManualSubscriptionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category: 'other',
    nextPayment: ''
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.amount) {
      return
    }

    onSubmit({
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      category: formData.category,
      nextPayment: formData.nextPayment || undefined
    })

    // Reset form
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      category: 'other',
      nextPayment: ''
    })
  }

  const categories = [
    { value: 'streaming', label: '📺 Streaming (Netflix, HBO, etc.)' },
    { value: 'utilities', label: '🔌 Utilități (Curent, Gaz, Apă)' },
    { value: 'telecom', label: '📱 Telecomunicații (Orange, Vodafone)' },
    { value: 'fitness', label: '💪 Fitness & Sănătate' },
    { value: 'software', label: '💻 Software & Apps' },
    { value: 'shopping', label: '🛒 Shopping & E-commerce' },
    { value: 'financial', label: '💳 Servicii Financiare' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'other', label: '📦 Altele' }
  ]

  const frequencies = [
    { value: 'weekly', label: 'Săptămânal' },
    { value: 'monthly', label: 'Lunar' },
    { value: 'yearly', label: 'Anual' }
  ]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1f2937, #111827)',
        borderRadius: '1.5rem',
        padding: 'clamp(1rem, 4vw, 2rem)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'clamp(1rem, 3vw, 2rem)'
        }}>
          <h2 style={{
            fontSize: 'clamp(1.125rem, 4vw, 1.5rem)',
            fontWeight: 'bold',
            color: '#f9fafb',
            margin: 0,
            lineHeight: 1.2
          }}>
            ➕ Adaugă Abonament Manual
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              transition: 'color 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Field */}
          <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#f9fafb',
              marginBottom: '0.5rem'
            }}>
              Numele Serviciului *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Netflix, Spotify, Orange..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#f9fafb',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          {/* Amount Field */}
          <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#f9fafb',
              marginBottom: '0.5rem'
            }}>
              Suma (RON) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Ex: 29.99"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#f9fafb',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          {/* Frequency Field */}
          <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#f9fafb',
              marginBottom: '0.5rem'
            }}>
              Frecvența
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#f9fafb',
                fontSize: '1rem'
              }}
            >
              {frequencies.map(freq => (
                <option key={freq.value} value={freq.value} style={{ background: '#1f2937' }}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Field */}
          <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#f9fafb',
              marginBottom: '0.5rem'
            }}>
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#f9fafb',
                fontSize: '1rem'
              }}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value} style={{ background: '#1f2937' }}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Payment Field */}
          <div style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#f9fafb',
              marginBottom: '0.5rem'
            }}>
              Următoarea Plată (opțional)
            </label>
            <input
              type="date"
              value={formData.nextPayment}
              onChange={(e) => setFormData({ ...formData, nextPayment: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#f9fafb',
                fontSize: '1rem',
                colorScheme: 'dark'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            justifyContent: 'stretch'
          }} className="modal-buttons">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#9ca3af',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%'
              }}
            >
              Anulează
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%'
              }}
            >
              ➕ Adaugă Abonament
            </button>
          </div>
          
          <style jsx>{`
            @media (min-width: 480px) {
              .modal-buttons {
                flex-direction: row !important;
                justify-content: flex-end !important;
              }
              .modal-buttons button {
                width: auto !important;
              }
            }
          `}</style>
        </form>
      </div>
    </div>
  )
}