'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserProfileDropdown from '@/components/UserProfileDropdown'

interface User {
  id: string
  email: string
  name: string
}

interface Settings {
  notifications: {
    email: boolean
    browser: boolean
    monthly_reports: boolean
    payment_reminders: boolean
  }
  privacy: {
    analytics: boolean
    marketing: boolean
  }
  preferences: {
    currency: string
    language: string
    theme: string
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      email: true,
      browser: false,
      monthly_reports: true,
      payment_reminders: true
    },
    privacy: {
      analytics: true,
      marketing: false
    },
    preferences: {
      currency: 'RON',
      language: 'ro',
      theme: 'dark'
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)
  
  // Form states
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // Force dark mode
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('dark')
      document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
    }
    
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      setNewName(user.name)
      setNewEmail(user.email)
      loadSettings()
    }
  }, [user])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || ''
      })
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setUserLoading(false)
    }
  }

  const loadSettings = async () => {
    if (!user) return
    
    try {
      // Load user settings from database (mock for now)
      // In real implementation, you'd have a user_settings table
      console.log('Loading settings for user:', user.id)
      
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateProfile = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await supabase.auth.updateUser({
        data: { name: newName }
      })
      
      if (error) throw error
      
      setUser(prev => prev ? { ...prev, name: newName } : null)
      setSuccess('Profilul a fost actualizat cu succes')
      
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError('Eroare la actualizarea profilului: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmail = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      })
      
      if (error) throw error
      
      setSuccess('Un email de confirmare a fost trimis la noua adresă')
      
    } catch (error: any) {
      console.error('Error updating email:', error)
      setError('Eroare la actualizarea email-ului: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    if (!user) return
    
    if (newPassword !== confirmPassword) {
      setError('Parolele nu se potrivesc')
      return
    }
    
    if (newPassword.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Parola a fost actualizată cu succes')
      
    } catch (error: any) {
      console.error('Error updating password:', error)
      setError('Eroare la actualizarea parolei: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (section: keyof Settings, key: string, value: any) => {
    try {
      const newSettings = {
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value
        }
      }
      
      setSettings(newSettings)
      
      // Save to backend (API call)
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update settings')
      }
      
      setSuccess('Setările au fost salvate')
      
    } catch (error) {
      console.error('Error updating settings:', error)
      setError('Eroare la salvarea setărilor')
    }
  }

  if (!mounted) {
    return (
      <div style={{background: '#0f172a', minHeight: '100vh', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        Loading...
      </div>
    )
  }

  if (userLoading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
        minHeight: '100vh',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '4rem',
            height: '4rem',
            border: '4px solid #3b82f6',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }}></div>
          <div style={{fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem'}}>
            Se încarcă setările...
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

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'none'
      }}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 clamp(0.5rem, 2vw, 1rem)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <Link href="/dashboard" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{
                  width: 'clamp(2rem, 4vw, 2.5rem)',
                  height: 'clamp(2rem, 4vw, 2.5rem)',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{color: 'white', fontWeight: 'bold', fontSize: '1.125rem'}}>S</span>
                </div>
                <div>
                  <h1 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: 0
                  }}>
                    SubCancel
                  </h1>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    margin: 0
                  }}>
                    Settings
                  </p>
                </div>
              </Link>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              {/* Navigation */}
              <Link href="/dashboard" style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                textDecoration: 'none',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                transition: 'color 0.3s ease'
              }}>
                ← Dashboard
              </Link>
              
              {/* User Profile Dropdown */}
              {user && (
                <UserProfileDropdown user={user} onLogout={handleLogout} />
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{maxWidth: '80rem', margin: '0 auto', padding: 'clamp(1rem, 4vw, 2rem) clamp(0.5rem, 2vw, 1rem)'}}>
        {/* Hero Section */}
        <div style={{marginBottom: '3rem'}}>
          <h2 style={{
            fontSize: 'clamp(1.875rem, 4vw, 2.25rem)',
            fontWeight: 'bold',
            color: '#f9fafb',
            marginBottom: '0.5rem'
          }}>
            Setări Cont ⚙️
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: '#9ca3af'
          }}>
            Personalizează experiența și securitatea contului
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            marginBottom: '1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{fontSize: '1.5rem', marginRight: '0.75rem'}}>⚠️</span>
              <p style={{color: '#fca5a5', margin: 0}}>{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div style={{
            marginBottom: '1.5rem',
            background: 'rgba(34, 197, 94, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{fontSize: '1.5rem', marginRight: '0.75rem'}}>✅</span>
              <p style={{color: '#6ee7b7', margin: 0}}>{success}</p>
            </div>
          </div>
        )}

        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
          {/* Profile Settings */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'none'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#f9fafb',
              marginBottom: '1.5rem'
            }}>
              👤 Informații Profil
            </h3>

            <div style={{display: 'grid', gap: '1.5rem'}}>
              {/* Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Nume complet
                </label>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'end'}}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(31, 41, 55, 0.5)',
                      color: '#f9fafb',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={updateProfile}
                    disabled={loading || newName === user?.name}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      opacity: (loading || newName === user?.name) ? 0.5 : 1
                    }}
                  >
                    Salvează
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'end'}}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(31, 41, 55, 0.5)',
                      color: '#f9fafb',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={updateEmail}
                    disabled={loading || newEmail === user?.email}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      opacity: (loading || newEmail === user?.email) ? 0.5 : 1
                    }}
                  >
                    Actualizează
                  </button>
                </div>
                <p style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem'}}>
                  Vei primi un email de confirmare la noua adresă
                </p>
              </div>
            </div>
          </div>

          {/* Password Settings */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'none'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#f9fafb',
              marginBottom: '1.5rem'
            }}>
              🔒 Schimbare Parolă
            </h3>

            <div style={{display: 'grid', gap: '1.5rem'}}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Parola curentă
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(31, 41, 55, 0.5)',
                    color: '#f9fafb',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Parola nouă
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(31, 41, 55, 0.5)',
                    color: '#f9fafb',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Confirmă parola nouă
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(31, 41, 55, 0.5)',
                    color: '#f9fafb',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <button
                onClick={updatePassword}
                disabled={loading || !newPassword || !confirmPassword}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  opacity: (loading || !newPassword || !confirmPassword) ? 0.5 : 1
                }}
              >
                Schimbă Parola
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'none'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#f9fafb',
              marginBottom: '1.5rem'
            }}>
              🔔 Notificări
            </h3>

            <div style={{display: 'grid', gap: '1rem'}}>
              {Object.entries(settings.notifications).map(([key, value]) => (
                <div key={key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '0.5rem'
                }}>
                  <div>
                    <div style={{color: '#f9fafb', fontWeight: '500'}}>
                      {key === 'email' && 'Notificări Email'}
                      {key === 'browser' && 'Notificări Browser'}
                      {key === 'monthly_reports' && 'Rapoarte Lunare'}
                      {key === 'payment_reminders' && 'Reminder Plăți'}
                    </div>
                    <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                      {key === 'email' && 'Primește notificări prin email'}
                      {key === 'browser' && 'Notificări push în browser'}
                      {key === 'monthly_reports' && 'Raport lunar cu economiile'}
                      {key === 'payment_reminders' && 'Reminder pentru plăți'}
                    </div>
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '3rem',
                    height: '1.75rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateSettings('notifications', key, e.target.checked)}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: value ? '#3b82f6' : '#374151',
                      transition: '0.4s',
                      borderRadius: '1.75rem'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '1.25rem',
                        width: '1.25rem',
                        left: value ? '1.5rem' : '0.25rem',
                        bottom: '0.25rem',
                        background: 'white',
                        transition: '0.4s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}