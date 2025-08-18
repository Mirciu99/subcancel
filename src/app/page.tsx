'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Safe client-side only operations
    if (typeof window !== 'undefined') {
      // Don't clear localStorage to preserve auth
      document.documentElement.className = '' // Remove all classes
      document.body.className = '' // Remove all body classes
      document.body.style.cssText = 'background: #ffffff !important; color: #000000 !important;'
    }
    
    // Force light mode state
    setIsDarkMode(false)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      document.body.style.cssText = ''
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.cssText = 'background: #ffffff !important; color: #000000 !important;'
      localStorage.setItem('darkMode', 'false')
    }
  }

  if (!mounted) {
    return (
      <div style={{background: '#ffffff', minHeight: '100vh', color: '#000000'}}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1f2937, #111827, #1f2937)' 
        : 'linear-gradient(135deg, #eff6ff, #ffffff, #faf5ff)',
      minHeight: '100vh',
      color: isDarkMode ? '#ffffff' : '#000000'
    }}>
      {/* Background Elements */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
        <div style={{
          position: 'absolute',
          top: '-10rem',
          right: '-10rem',
          width: '20rem',
          height: '20rem',
          background: isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.08)',
          borderRadius: '50%',
          filter: 'blur(64px)',
          opacity: 0.6
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-10rem',
          left: '-10rem',
          width: '20rem',
          height: '20rem',
          background: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.08)',
          borderRadius: '50%',
          filter: 'blur(64px)',
          opacity: 0.6
        }}></div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '15rem',
          height: '15rem',
          background: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(16, 185, 129, 0.06)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: 0.4
        }}></div>
      </div>

      {/* Modern Header */}
      <header style={{
        background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{color: 'white', fontWeight: 'bold', fontSize: '1.125rem'}}>S</span>
              </div>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                SubCancel
              </span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(241, 245, 249, 0.8)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
                  backdropFilter: 'blur(16px)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  boxShadow: isDarkMode ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              <Link 
                href="/login"
                style={{
                  color: isDarkMode ? '#d1d5db' : '#4b5563',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
              >
                Conectează-te
              </Link>
              <Link 
                href="/signup"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              >
                Înregistrează-te
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{position: 'relative'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '4rem 1rem 6rem'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              marginBottom: '2rem',
              background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(59, 130, 246, 0.1)',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: isDarkMode ? '#60a5fa' : '#1d4ed8',
              border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgba(59, 130, 246, 0.1)'
            }}>
              <span style={{marginRight: '0.5rem'}}>🚀</span>
              Nouă platformă pentru gestionarea abonamentelor
            </div>
            
            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 'bold',
              color: isDarkMode ? '#f9fafb' : '#111827',
              marginBottom: '1.5rem',
              lineHeight: 1.2
            }}>
              Detectează și anulează
              <span style={{
                display: 'block',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                abonamentele uitate
              </span>
            </h1>
            
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '2.5rem',
              maxWidth: '48rem',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6
            }}>
              Încarcă extrasul bancar și descoperă automat toate abonamentele tale. 
              Generează instant cereri de reziliere și economisește bani în fiecare lună.
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: window.innerWidth < 640 ? 'column' : 'row',
              gap: '1rem',
              justifyContent: 'center',
              marginBottom: '4rem'
            }}>
              <Link 
                href="/signup"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>🚀</span>
                <span>Începe gratuit</span>
              </Link>
              <Link 
                href="/login"
                style={{
                  background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
                  color: isDarkMode ? '#d1d5db' : '#1e293b',
                  padding: '1rem 2rem',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: isDarkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <span>👋</span>
                <span>Am deja cont</span>
              </Link>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 'repeat(3, 1fr)',
              gap: '2rem',
              maxWidth: '32rem',
              margin: '0 auto'
            }}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem'}}>500+</div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Utilizatori activi</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.25rem'}}>€2.5M</div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Bani economisiți</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.25rem'}}>98%</div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Rată de succes</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)',
        borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 0.8)',
        backdropFilter: 'blur(16px)',
        padding: '3rem 0',
        boxShadow: isDarkMode ? 'none' : '0 -1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center'}}>
          <div style={{fontSize: '0.875rem', color: isDarkMode ? '#6b7280' : '#6b7280'}}>
            &copy; 2025 SubCancel. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  )
}