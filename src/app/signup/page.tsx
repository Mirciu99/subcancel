'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // FORCE DARK MODE - Don't clear localStorage to preserve auth
    document.documentElement.classList.add('dark')
    document.body.className = ''
    document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
  }, [])


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Cont creat cu succes! Poți acum să te conectezi.')
      }
    } catch (err) {
      setError('A apărut o eroare neașteptată')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div style={{background: '#0f172a', minHeight: '100vh', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      minHeight: '100vh',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
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

      <div style={{position: 'relative', width: '100%', maxWidth: '28rem'}}>

        {/* Main Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(71, 85, 105, 0.3)'
        }}>
          {/* Header */}
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <div style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span style={{color: 'white', fontWeight: 'bold', fontSize: '1.5rem'}}>S</span>
            </div>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              Alătură-te SubCancel
            </h1>
            <p style={{
              color: '#cbd5e0'
            }}>
              Începe să economisești din abonamente
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div style={{
              marginBottom: '1.5rem',
              background: 'rgba(127, 29, 29, 0.3)',
              backdropFilter: 'blur(16px)',
              borderRadius: '0.75rem',
              padding: '1rem',
              borderLeft: '4px solid #ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span style={{color: '#ef4444', fontSize: '1.125rem', marginRight: '0.75rem'}}>⚠️</span>
                <p style={{color: '#fca5a5', fontSize: '0.875rem', margin: 0}}>{error}</p>
              </div>
            </div>
          )}

          {message && (
            <div style={{
              marginBottom: '1.5rem',
              background: 'rgba(6, 78, 59, 0.3)',
              backdropFilter: 'blur(16px)',
              borderRadius: '0.75rem',
              padding: '1rem',
              borderLeft: '4px solid #10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span style={{color: '#10b981', fontSize: '1.125rem', marginRight: '0.75rem'}}>✅</span>
                <p style={{color: '#6ee7b7', fontSize: '0.875rem', margin: 0}}>{message}</p>
              </div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} style={{marginBottom: '1.5rem'}}>
            <div style={{marginBottom: '1.5rem'}}>
              <div style={{marginBottom: '1rem'}}>
                <label htmlFor="name" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Nume complet
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '0.75rem',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#ffffff',
                    transition: 'all 0.3s ease'
                  }}
                  placeholder="Ion Popescu"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Adresa de email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '0.75rem',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#ffffff',
                    transition: 'all 0.3s ease'
                  }}
                  placeholder="nume@exemplu.com"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              
              <div>
                <label htmlFor="password" style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Parola
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '0.75rem',
                    outline: 'none',
                    fontSize: '1rem',
                    color: '#ffffff',
                    transition: 'all 0.3s ease'
                  }}
                  placeholder="Creează o parolă sigură"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <p style={{
                  marginTop: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#9ca3af'
                }}>
                  Minim 6 caractere. Recomandăm o combinație de litere, numere și simboluri.
                </p>
              </div>
            </div>

            {/* Terms */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.75rem',
                color: '#cbd5e0',
                textAlign: 'center',
                margin: 0
              }}>
                Prin înregistrare, accepți să folosești SubCancel pentru a gestiona abonamentele tale în mod responsabil.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #3b82f6)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: '500',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Se înregistrează...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Creează contul gratuit</span>
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div style={{marginTop: '2rem'}}>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              Ce obții cu SubCancel:
            </p>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem'}}>
              {[
                { icon: '✓', text: 'Detectare automată abonamente din extrase' },
                { icon: '✓', text: 'Generare cereri de reziliere legale' },
                { icon: '✓', text: 'Urmărire economii și statistici' }
              ].map((feature, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem'}}>
                  <span style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    background: 'rgba(6, 78, 59, 0.8)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      color: '#6ee7b7',
                      fontSize: '0.75rem'
                    }}>
                      {feature.icon}
                    </span>
                  </span>
                  <span style={{color: '#e2e8f0'}}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{marginTop: '2rem', textAlign: 'center'}}>
            <p style={{
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              Ai deja cont?{' '}
              <Link href="/login" style={{
                fontWeight: '500',
                color: '#6ee7b7',
                textDecoration: 'none'
              }}>
                Conectează-te aici
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Links */}
        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <Link href="/" style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            textDecoration: 'none'
          }}>
            ← Înapoi la homepage
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}