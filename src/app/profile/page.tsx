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
  created_at?: string
}

interface ProfileStats {
  totalSubscriptions: number
  activeSubscriptions: number
  totalSpent: number
  savedAmount: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [stats, setStats] = useState<ProfileStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalSpent: 0,
    savedAmount: 0
  })
  const [mounted, setMounted] = useState(false)
  
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
      loadStats()
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
        name: user.user_metadata?.name || '',
        created_at: user.created_at
      })
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setUserLoading(false)
    }
  }

  const loadStats = async () => {
    if (!user) return
    
    try {
      // Load subscriptions stats
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
      
      const total = subscriptions?.length || 0
      const active = subscriptions?.filter((sub: any) => sub.status === 'active').length || 0
      
      // Calculate total spent (rough estimate based on active subscriptions)
      const monthlyTotal = subscriptions
        ?.filter((sub: any) => sub.status === 'active')
        .reduce((sum: number, sub: any) => sum + (sub.amount || 0), 0) || 0
      
      // Load savings from cancellation tracking
      const { data: savings } = await supabase
        .from('savings_tracking')
        .select('total_savings')
      
      const savedAmount = savings?.reduce((sum: number, item: any) => sum + (item.total_savings || 0), 0) || 0
      
      setStats({
        totalSubscriptions: total,
        activeSubscriptions: active,
        totalSpent: monthlyTotal * 6, // Rough 6-month estimate
        savedAmount
      })
      
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const getAvatarColor = (email: string) => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)', 
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)'
    ]
    const index = email.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
            Se încarcă profilul...
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
                    Profile
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
            Profilul Meu 👤
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: '#9ca3af'
          }}>
            Informații despre contul și activitatea ta
          </p>
        </div>

        {/* Profile Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none'
        }}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
            {/* Avatar and Basic Info */}
            <div style={{display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap'}}>
              <div 
                style={{
                  width: '6rem',
                  height: '6rem',
                  borderRadius: '1.5rem',
                  background: getAvatarColor(user?.email || ''),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                }}
              >
                {getInitials(user?.name || '', user?.email || '')}
              </div>
              
              <div style={{flex: 1, minWidth: '200px'}}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  {user?.name || 'Utilizator'}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  color: '#9ca3af',
                  marginBottom: '1rem'
                }}>
                  {user?.email}
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '9999px',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    background: '#10b981',
                    borderRadius: '50%'
                  }}></div>
                  <span style={{fontSize: '0.875rem', color: '#10b981', fontWeight: '500'}}>
                    Cont Activ
                  </span>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#9ca3af',
                  marginBottom: '0.5rem'
                }}>
                  Nume complet
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f9fafb'
                }}>
                  {user?.name || 'Nu este setat'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#9ca3af',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f9fafb'
                }}>
                  {user?.email}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#9ca3af',
                  marginBottom: '0.5rem'
                }}>
                  Membru din
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f9fafb'
                }}>
                  {formatDate(user?.created_at)}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#9ca3af',
                  marginBottom: '0.5rem'
                }}>
                  ID Utilizator
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f9fafb',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  {user?.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#f9fafb',
            marginBottom: '1.5rem'
          }}>
            📊 Activitatea Contului
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '1rem',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#3b82f6',
                marginBottom: '0.5rem'
              }}>
                {stats.totalSubscriptions}
              </div>
              <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                Total Abonamente
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '1rem',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#10b981',
                marginBottom: '0.5rem'
              }}>
                {stats.activeSubscriptions}
              </div>
              <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                Abonamente Active
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '1rem',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#8b5cf6',
                marginBottom: '0.5rem'
              }}>
                {new Intl.NumberFormat('ro-RO', {
                  style: 'currency',
                  currency: 'RON',
                  minimumFractionDigits: 0
                }).format(stats.totalSpent)}
              </div>
              <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                Total Cheltuit
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '1rem',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#f59e0b',
                marginBottom: '0.5rem'
              }}>
                {new Intl.NumberFormat('ro-RO', {
                  style: 'currency',
                  currency: 'RON',
                  minimumFractionDigits: 0
                }).format(stats.savedAmount)}
              </div>
              <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                Bani Economisiți
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
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
            ⚡ Acțiuni Rapide
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <Link href="/settings" style={{textDecoration: 'none'}}>
              <div style={{
                padding: '1.5rem',
                background: 'rgba(31, 41, 55, 0.5)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              className="hover:bg-white/5 hover:scale-105">
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>⚙️</div>
                <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.25rem'}}>
                  Setări Cont
                </h4>
                <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>
                  Schimbă parola, email și preferințe
                </p>
              </div>
            </Link>

            <Link href="/billing" style={{textDecoration: 'none'}}>
              <div style={{
                padding: '1.5rem',
                background: 'rgba(31, 41, 55, 0.5)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              className="hover:bg-white/5 hover:scale-105">
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>💳</div>
                <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.25rem'}}>
                  Billing & Plăți
                </h4>
                <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>
                  Gestionează metode de plată și facturi
                </p>
              </div>
            </Link>

            <Link href="/subscriptions" style={{textDecoration: 'none'}}>
              <div style={{
                padding: '1.5rem',
                background: 'rgba(31, 41, 55, 0.5)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              className="hover:bg-white/5 hover:scale-105">
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>📊</div>
                <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.25rem'}}>
                  Abonamentele Mele
                </h4>
                <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>
                  Vezi și gestionează toate serviciile
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .hover\\:bg-white\\/5:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        
        .hover\\:scale-105:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  )
}