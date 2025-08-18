'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // FORCE DARK MODE
    document.documentElement.classList.add('dark')
    document.body.className = ''
    document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
  }, [])


  if (!mounted) {
    return (
      <div style={{background: '#0f172a', minHeight: '100vh', color: '#ffffff'}}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* Background Elements */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
        <div style={{
          position: 'absolute',
          top: '-10rem',
          right: '-10rem',
          width: '20rem',
          height: '20rem',
          background: 'rgba(59, 130, 246, 0.08)',
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
          background: 'rgba(139, 92, 246, 0.08)',
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
          background: 'rgba(16, 185, 129, 0.06)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: 0.4
        }}></div>
      </div>

      {/* Modern Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'none'
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
              
              <Link 
                href="/login"
                style={{
                  color: '#d1d5db',
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
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(16px)',
              boxShadow: 'none'
            }}>
              <span style={{marginRight: '0.5rem'}}>🚀</span>
              Nouă platformă pentru gestionarea abonamentelor
            </div>
            
            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 'bold',
              color: '#f9fafb',
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
              color: '#9ca3af',
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
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#d1d5db',
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
                  boxShadow: 'none'
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
                <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>Utilizatori activi</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.25rem'}}>€2.5M</div>
                <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>Bani economisiți</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.25rem'}}>98%</div>
                <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>Rată de succes</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.25)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        padding: '3rem 0',
        boxShadow: 'none'
      }}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center'}}>
          <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
            &copy; 2025 SubCancel. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  )
}