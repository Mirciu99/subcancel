'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '2rem',
      right: '2rem',
      zIndex: 9999,
      maxWidth: '26rem',
      width: '100%',
      borderRadius: '1rem',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      transform: isExiting ? 'translateX(100%) scale(0.95)' : 'translateX(0) scale(1)',
      opacity: isExiting ? 0 : 1,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.95), rgba(4, 120, 87, 0.9))',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      },
      error: {
        background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(153, 27, 27, 0.9))',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      },
      info: {
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(37, 99, 235, 0.9))',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }
    }

    return { ...baseStyles, ...typeStyles[type] }
  }

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: '✅', color: '#6ee7b7' }
      case 'error':
        return { icon: '❌', color: '#fca5a5' }
      case 'info':
        return { icon: 'ℹ️', color: '#93c5fd' }
      default:
        return { icon: '✅', color: '#6ee7b7' }
    }
  }

  const { icon } = getIconAndColor()

  return (
    <div style={getToastStyles()}>
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
          <div style={{
            background: `rgba(255, 255, 255, ${type === 'success' ? '0.15' : type === 'error' ? '0.12' : '0.15'})`,
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '0.125rem'
          }}>
            <span style={{ fontSize: '1rem' }}>
              {icon}
            </span>
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#f8fafc',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.25rem',
              lineHeight: '1.4'
            }}>
              {type === 'success' ? 'Cont creat cu succes!' : 
               type === 'error' ? 'A apărut o eroare' : 
               'Informație'}
            </div>
            <div style={{ 
              color: type === 'success' ? '#a7f3d0' : type === 'error' ? '#fecaca' : '#bfdbfe',
              fontSize: '0.8rem',
              margin: 0,
              lineHeight: '1.4',
              opacity: 0.9
            }}>
              {message}
            </div>
          </div>

          <button
            onClick={() => {
              setIsExiting(true)
              setTimeout(() => {
                setIsVisible(false)
                onClose?.()
              }, 300)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '1.125rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
              flexShrink: 0,
              borderRadius: '0.25rem',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}