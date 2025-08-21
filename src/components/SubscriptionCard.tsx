import { useState } from 'react'

interface Subscription {
  id: string
  name: string
  merchant: string
  amount: number
  currency: string
  frequency: string
  next_payment: string | null
  status: string
  category: string | null
  confidence?: number
}

interface SubscriptionCardProps {
  subscription: Subscription
  onCancel: (id: string) => void
  onConfirm?: (subscription: Subscription) => void
  onIgnore?: (id: string) => void
  onEdit?: (subscription: Subscription) => void
  onDelete?: (id: string) => void
  showConfidence?: boolean
  showActions?: boolean
}

const categoryConfig: { [key: string]: { icon: string; gradient: string; color: string } } = {
  streaming: { 
    icon: '🎬', 
    gradient: 'from-purple-500 to-pink-600',
    color: 'text-purple-600 dark:text-purple-400'
  },
  telecom: { 
    icon: '📱', 
    gradient: 'from-blue-500 to-cyan-600',
    color: 'text-blue-600 dark:text-blue-400'
  },
  utilities: { 
    icon: '🔌', 
    gradient: 'from-yellow-500 to-orange-600',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  fitness: { 
    icon: '💪', 
    gradient: 'from-green-500 to-emerald-600',
    color: 'text-green-600 dark:text-green-400'
  },
  software: { 
    icon: '💻', 
    gradient: 'from-gray-500 to-slate-600',
    color: 'text-gray-600 dark:text-gray-400'
  },
  financial: { 
    icon: '💳', 
    gradient: 'from-emerald-500 to-teal-600',
    color: 'text-emerald-600 dark:text-emerald-400'
  },
  transport: { 
    icon: '🚗', 
    gradient: 'from-indigo-500 to-blue-600',
    color: 'text-indigo-600 dark:text-indigo-400'
  },
  gaming: { 
    icon: '🎮', 
    gradient: 'from-violet-500 to-purple-600',
    color: 'text-violet-600 dark:text-violet-400'
  },
  shopping: { 
    icon: '🛒', 
    gradient: 'from-pink-500 to-rose-600',
    color: 'text-pink-600 dark:text-pink-400'
  },
  education: { 
    icon: '📚', 
    gradient: 'from-cyan-500 to-blue-600',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  other: { 
    icon: '🏪', 
    gradient: 'from-orange-500 to-amber-600',
    color: 'text-orange-600 dark:text-orange-400'
  }
}

const frequencyLabels: { [key: string]: string } = {
  monthly: 'lunar',
  yearly: 'anual',
  weekly: 'săptămânal'
}

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
  active: {
    label: 'Activ',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  cancelled: {
    label: 'Anulat',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  pending_cancellation: {
    label: 'În curs de anulare',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  detected: {
    label: 'Detectat',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  }
}

export default function SubscriptionCard({ 
  subscription, 
  onCancel, 
  onConfirm,
  onIgnore, 
  onEdit,
  onDelete,
  showConfidence = false,
  showActions = false
}: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await onCancel(subscription.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!onConfirm) return
    setIsLoading(true)
    try {
      await onConfirm(subscription)
    } finally {
      setIsLoading(false)
    }
  }

  const handleIgnore = async () => {
    if (onIgnore) {
      setIsLoading(true)
      try {
        onIgnore(subscription.id)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(subscription)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(subscription.id)
    }
  }

  const category = subscription.category || 'other'
  const categoryInfo = categoryConfig[category] || categoryConfig.other
  const statusInfo = statusConfig[subscription.status] || statusConfig.active

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div 
      className="glass rounded-2xl p-6 card-hover transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 bg-gradient-to-r ${categoryInfo.gradient} rounded-2xl flex items-center justify-center transform transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
            <span className="text-2xl filter drop-shadow-sm">
              {categoryInfo.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
              {subscription.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {subscription.merchant}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {showConfidence && subscription.confidence && (
                <span className={`text-xs font-medium ${getConfidenceColor(subscription.confidence)}`}>
                  {Math.round(subscription.confidence * 100)}% încredere
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sumă</p>
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {formatAmount(subscription.amount, subscription.currency)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {frequencyLabels[subscription.frequency] || subscription.frequency}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Următoarea plată</p>
            <div className="relative">
              <div 
                className="w-3 h-3 rounded-full bg-gray-400 hover:bg-gray-500 flex items-center justify-center cursor-help transition-colors duration-200"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <span className="text-xs text-white font-bold">?</span>
              </div>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Estimare - puteți modifica data după confirmare
                </div>
              )}
            </div>
          </div>
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {formatDate(subscription.next_payment)}
          </p>
          <p className={`text-xs capitalize ${categoryInfo.color}`}>
            {subscription.category || 'Altele'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {subscription.status === 'detected' && (onConfirm || onIgnore) && (
          <div className="space-y-2">
            {onConfirm && (
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Se confirmă...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Confirmă abonamentul</span>
                  </>
                )}
              </button>
            )}
            {onIgnore && (
              <button
                onClick={handleIgnore}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 px-4 rounded-xl hover:from-gray-500 hover:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Se ignoră...</span>
                  </>
                ) : (
                  <>
                    <span>🚫</span>
                    <span>Ignoră abonamentul</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
        
        {subscription.status === 'active' && (
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Se generează...</span>
              </>
            ) : (
              <>
                <span>📝</span>
                <span>Generează cerere anulare</span>
              </>
            )}
          </button>
        )}
        
        {subscription.status === 'pending_cancellation' && (
          <div className="w-full text-center py-3 px-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">⏳</span>
              <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Cerere de anulare generată
              </span>
            </div>
          </div>
        )}
        
        {subscription.status === 'cancelled' && (
          <div className="w-full text-center py-3 px-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-xl">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🎉</span>
              <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                Abonament anulat cu succes
              </span>
            </div>
          </div>
        )}

        {/* Edit and Delete Actions - Only show in subscriptions page */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            {onEdit && (
              <button
                onClick={handleEdit}
                disabled={isLoading}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2"
              >
                <span>✏️</span>
                <span>Editează</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 py-2 px-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2"
              >
                <span>🗑️</span>
                <span>Șterge</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hover Effect Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
    </div>
  )
}