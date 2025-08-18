'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // FORCE DARK MODE - Don't clear localStorage to preserve auth
    document.documentElement.classList.add('dark')
    document.body.className = ''
    document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
  }, [])


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔐 Login result:', { 
        success: !error, 
        hasSession: !!data.session,
        hasUser: !!data.user,
        error: error?.message 
      })

      if (error) {
        setError(error.message)
      } else {
        // Wait a bit for session to be stored
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 100)
      }
    } catch (err) {
      setError('A apărut o eroare neașteptată')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) {
        setError(error.message)
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
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
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
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              Bun venit înapoi
            </h1>
            <p style={{
              color: '#cbd5e0'
            }}>
              Conectează-te la contul tău SubCancel
            </p>
          </div>


          {/* Error Message */}
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
                <span style={{color: '#fca5a5', fontSize: '1.125rem', marginRight: '0.75rem'}}>⚠️</span>
                <p style={{color: '#fca5a5', fontSize: '0.875rem', margin: 0}}>{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{marginBottom: '1.5rem'}}>
            <div style={{marginBottom: '1.5rem'}}>
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
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
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
                  placeholder="Introdu parola"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
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
                transition: 'all 0.3s ease',
                marginBottom: '1.5rem'
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
                  <span>Se conectează...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Conectează-te</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div style={{position: 'relative', margin: '1.5rem 0'}}>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '100%',
                  borderTop: '1px solid rgba(71, 85, 105, 0.5)'
                }}></div>
              </div>
              <div style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                fontSize: '0.875rem'
              }}>
                <span style={{
                  padding: '0 1rem',
                  background: 'rgba(15, 23, 42, 0.95)',
                  color: '#cbd5e0',
                  borderRadius: '0.5rem'
                }}>
                  sau
                </span>
              </div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                color: '#e2e8f0',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(51, 65, 85, 0.9)'
                e.target.style.borderColor = 'rgba(71, 85, 105, 0.7)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(30, 41, 59, 0.8)'
                e.target.style.borderColor = 'rgba(71, 85, 105, 0.5)'
              }}
            >
              <svg style={{width: '1.25rem', height: '1.25rem'}} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continuă cu Google</span>
            </button>
          </form>

          {/* Footer */}
          <div style={{textAlign: 'center'}}>
            <p style={{
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              Nu ai cont încă?{' '}
              <Link href="/signup" style={{
                fontWeight: '500',
                color: '#60a5fa',
                textDecoration: 'none'
              }}>
                Înregistrează-te gratuit
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