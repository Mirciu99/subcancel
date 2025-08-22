'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubscriptionCard from '@/components/SubscriptionCard'
import CancellationModal from '@/components/CancellationModal'
import UserProfileDropdown from '@/components/UserProfileDropdown'

interface User {
  id: string
  email: string
  name: string
}

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
}

interface SubscriptionStats {
  total: number
  active: number
  cancelled: number
  monthly_cost: number
  yearly_cost: number
}

export default function SubscriptionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    cancelled: 0,
    monthly_cost: 0,
    yearly_cost: 0
  })
  const [loading, setLoading] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSubscription, setEditSubscription] = useState<Subscription | null>(null)
  // Always dark mode enabled globally
  const [mounted, setMounted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('amount')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    checkUser()
    
    // Force dark mode
    document.documentElement.classList.add('dark')
    document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
  }, [])

  useEffect(() => {
    if (user) {
      loadSubscriptions()
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

  const loadSubscriptions = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Load subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError)
        setError('Eroare la încărcarea abonamentelor')
        return
      }
      
      setSubscriptions(subscriptionsData || [])
      
      // Calculate stats
      const subs = subscriptionsData || []
      const active = subs.filter((sub: Subscription) => sub.status === 'active')
      const cancelled = subs.filter((sub: Subscription) => sub.status === 'cancelled')
      
      let monthlyTotal = 0
      let yearlyTotal = 0
      
      active.forEach((sub: Subscription) => {
        if (sub.frequency === 'monthly') {
          monthlyTotal += sub.amount
        } else if (sub.frequency === 'yearly') {
          yearlyTotal += sub.amount
          monthlyTotal += sub.amount / 12
        } else if (sub.frequency === 'weekly') {
          monthlyTotal += sub.amount * 4.33
        }
      })
      
      setStats({
        total: subs.length,
        active: active.length,
        cancelled: cancelled.length,
        monthly_cost: monthlyTotal,
        yearly_cost: monthlyTotal * 12
      })
      
    } catch (err) {
      console.error('Error loading subscriptions:', err)
      setError('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Dark mode is always enabled - no toggle needed

  const generateCancellation = async (subscriptionId: string) => {
    const subscription = subscriptions.find((sub: Subscription) => sub.id === subscriptionId)
    if (!subscription || !user) return
    
    setSelectedSubscription(subscription)
    setShowCancellationModal(true)
  }

  const handleCancellationSuccess = async () => {
    if (!selectedSubscription) return
    
    try {
      // Update subscription status to pending_cancellation in database
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'pending_cancellation' })
        .eq('id', selectedSubscription.id)
      
      if (error) {
        console.error('Error updating subscription status:', error)
        setError('Eroare la actualizarea statusului')
        return
      }
      
      await loadSubscriptions()
      setSuccess('Cererea de anulare a fost generată și trimisă')
      setShowCancellationModal(false)
      setSelectedSubscription(null)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la salvarea cererii: ${errorMessage}`)
    }
  }

  const handleEdit = (subscription: Subscription) => {
    setEditSubscription(subscription)
    setShowEditModal(true)
  }

  const handleUpdate = async (id: string, updates: Partial<Subscription>) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating subscription:', error)
        setError('Eroare la actualizarea abonamentului')
        return
      }
      
      await loadSubscriptions()
      setSuccess('Abonamentul a fost actualizat')
      setShowEditModal(false)
      setEditSubscription(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la actualizare: ${errorMessage}`)
    }
  }

  const handleDelete = async (id: string) => {
    setSubscriptionToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!subscriptionToDelete) return
    
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionToDelete)
      
      if (error) {
        console.error('Error deleting subscription:', error)
        setError('Eroare la ștergerea abonamentului')
        return
      }
      
      await loadSubscriptions()
      setSuccess('Abonamentul a fost șters')
      setShowDeleteModal(false)
      setSubscriptionToDelete(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la ștergere: ${errorMessage}`)
      setShowDeleteModal(false)
      setSubscriptionToDelete(null)
    }
  }

  // Filter and sort subscriptions
  const filteredSubscriptions = subscriptions
    .filter(sub => filterStatus === 'all' || sub.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return new Date(b.next_payment || 0).getTime() - new Date(a.next_payment || 0).getTime()
        default:
          return 0
      }
    })

  if (!mounted) {
    return (
      <div style={{background: '#ffffff', minHeight: '100vh', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        Loading...
      </div>
    )
  }

  if (userLoading || loading) {
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
            Se încarcă abonamentele...
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
                    Abonamente
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
        <div style={{marginBottom: '2rem'}}>
          <h2 style={{
            fontSize: 'clamp(1.875rem, 4vw, 2.25rem)',
            fontWeight: 'bold',
            color: '#f9fafb',
            marginBottom: '0.5rem'
          }}>
            Abonamentele Tale 📊
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: '#9ca3af'
          }}>
            Gestionează și monitorizează toate serviciile tale
          </p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Total Subscriptions - Clickable */}
          <div 
            onClick={() => setFilterStatus('all')}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              boxShadow: 'none',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(59, 130, 246, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{fontSize: '1.5rem'}}>📊</span>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#f9fafb'
                }}>
                  {stats.total}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af'
                }}>
                  Total
                </div>
              </div>
            </div>
            <h3 style={{
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '0.25rem',
              fontSize: '1rem'
            }}>
              Total Abonamente
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                margin: 0
              }}>
                Vezi toate serviciile
              </p>
              <div style={{
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: '500'
              }}>
                Click →
              </div>
            </div>
            {/* Hover effect overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              borderRadius: '1rem',
              pointerEvents: 'none'
            }} />
          </div>

          {/* Active Subscriptions - Clickable */}
          <div 
            onClick={() => setFilterStatus('active')}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              boxShadow: 'none',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(16, 185, 129, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{fontSize: '1.5rem'}}>✅</span>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  {stats.active}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af'
                }}>
                  Active
                </div>
              </div>
            </div>
            <h3 style={{
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '0.25rem',
              fontSize: '1rem'
            }}>
              Abonamente Active
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                margin: 0
              }}>
                Servicii în folosință
              </p>
              <div style={{
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: '500'
              }}>
                Filtrează →
              </div>
            </div>
          </div>

          {/* Cancelled Subscriptions - Clickable */}
          <div 
            onClick={() => setFilterStatus('cancelled')}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              boxShadow: 'none',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 30px -8px rgba(239, 68, 68, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{fontSize: '1.5rem'}}>❌</span>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#ef4444'
                }}>
                  {stats.cancelled}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af'
                }}>
                  Anulate
                </div>
              </div>
            </div>
            <h3 style={{
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '0.25rem',
              fontSize: '1rem'
            }}>
              Abonamente Anulate
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                margin: 0
              }}>
                Servicii oprite
              </p>
              <div style={{
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: '500'
              }}>
                Vezi →
              </div>
            </div>
          </div>

          {/* Monthly Cost - Info Card */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            boxShadow: 'none'
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{fontSize: '1.5rem'}}>💰</span>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#f9fafb'
                }}>
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.monthly_cost || 0)}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#9ca3af'
                }}>
                  / lună
                </div>
              </div>
            </div>
            <h3 style={{
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '0.25rem',
              fontSize: '1rem'
            }}>
              Cost Lunar
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              margin: 0
            }}>
              Total abonamente active
            </p>
          </div>
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

        {/* Filters and Controls */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none'
        }}>
          <div className="subscriptions-controls">
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
              <div>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginRight: '0.5rem'
                }}>
                  Filtrează:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Toate</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Anulate</option>
                  <option value="pending_cancellation">În curs de anulare</option>
                </select>
              </div>
              
              <div>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginRight: '0.5rem'
                }}>
                  Sortează:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="amount">Preț</option>
                  <option value="name">Nume</option>
                  <option value="date">Dată următoare</option>
                </select>
              </div>
            </div>
            
            <div style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              background: 'rgba(31, 41, 55, 0.5)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px'
            }}>
              {filteredSubscriptions.length} rezultate
            </div>
          </div>
        </div>

        {/* Subscriptions Grid */}
        {filteredSubscriptions.length === 0 ? (
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '3rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'none'
          }}>
            <div style={{
              width: '5rem',
              height: '5rem',
              background: 'rgba(107, 114, 128, 0.2)',
              borderRadius: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span style={{fontSize: '2.5rem', opacity: 0.5}}>📄</span>
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#f9fafb',
              marginBottom: '0.75rem'
            }}>
              {filterStatus === 'all' ? 'Nu ai încă abonamente înregistrate' : `Nu ai abonamente ${filterStatus}`}
            </h3>
            <p style={{
              color: '#9ca3af',
              marginBottom: '1.5rem',
              maxWidth: '28rem',
              margin: '0 auto 1.5rem'
            }}>
              {filterStatus === 'all' 
                ? 'Mergi în dashboard pentru a detecta automat abonamentele din extrasul bancar'
                : 'Încearcă să schimbi filtrul pentru a vedea alte abonamente'
              }
            </p>
            <Link 
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              ← Înapoi la Dashboard
            </Link>
          </div>
        ) : (
          <div className="subscriptions-grid">
            {filteredSubscriptions.map((subscription: Subscription) => (
              <div key={subscription.id}>
                <SubscriptionCard
                  subscription={subscription}
                  onCancel={generateCancellation}
                  onEdit={() => handleEdit(subscription)}
                  onDelete={() => handleDelete(subscription.id)}
                  showActions={true}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cancellation Modal */}
      {selectedSubscription && (
        <CancellationModal
          subscription={selectedSubscription}
          isOpen={showCancellationModal}
          onClose={() => {
            setShowCancellationModal(false)
            setSelectedSubscription(null)
          }}
          onSuccess={handleCancellationSuccess}
        />
      )}

      {/* Edit Modal */}
      {editSubscription && showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(31, 41, 55, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: 'clamp(1rem, 4vw, 2rem)',
            maxHeight: '90vh',
            overflowY: 'auto',
            maxWidth: '500px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{
              fontSize: 'clamp(1.125rem, 4vw, 1.5rem)',
              fontWeight: 'bold',
              color: '#f9fafb',
              marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
              lineHeight: 1.2
            }}>
              Editează Abonamentul
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              handleUpdate(editSubscription.id, {
                name: formData.get('name') as string,
                amount: parseFloat(formData.get('amount') as string),
                frequency: formData.get('frequency') as string,
                status: formData.get('status') as string,
                category: formData.get('category') as string,
                next_payment: formData.get('next_payment') as string || null
              })
            }}>
              <div style={{marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Nume Serviciu
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editSubscription.name}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              
              <div style={{marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Preț (RON)
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  defaultValue={editSubscription.amount}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              
              <div style={{marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Frecvență
                </label>
                <select
                  name="frequency"
                  defaultValue={editSubscription.frequency}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="monthly">Lunar</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Săptămânal</option>
                </select>
              </div>
              
              <div style={{marginBottom: 'clamp(1rem, 2vw, 1.5rem)'}}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editSubscription.status}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="active">Activ</option>
                  <option value="cancelled">Anulat</option>
                  <option value="pending_cancellation">În curs de anulare</option>
                </select>
              </div>
              
              <div style={{marginBottom: '1.5rem'}}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  Categorie
                </label>
                <select
                  name="category"
                  defaultValue={editSubscription.category || 'other'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="streaming">Streaming</option>
                  <option value="telecom">Telecom</option>
                  <option value="fitness">Fitness</option>
                  <option value="software">Software</option>
                  <option value="other">Altele</option>
                </select>
              </div>

              {/* Next Payment Field */}
              <div style={{marginBottom: 'clamp(1.5rem, 3vw, 2rem)'}}>
                <label style={{
                  display: 'block',
                  color: '#f9fafb',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Următoarea Plată (opțional)
                </label>
                <input
                  type="date"
                  name="next_payment"
                  defaultValue={editSubscription.next_payment ? editSubscription.next_payment.split('T')[0] : ''}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(55, 65, 81, 1)',
                    background: 'rgba(31, 41, 55, 1)',
                    color: '#f9fafb',
                    fontSize: '0.875rem',
                    colorScheme: 'dark'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                justifyContent: 'stretch'
              }} className="modal-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditSubscription(null)
                  }}
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
                  Salvează Modificări
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(31, 41, 55, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span style={{fontSize: '1.5rem', color: 'white'}}>⚠️</span>
            </div>
            
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#f9fafb',
              marginBottom: '0.75rem'
            }}>
              Confirmare Ștergere
            </h3>
            
            <p style={{
              color: '#9ca3af',
              marginBottom: '2rem'
            }}>
              Ești sigur că vrei să ștergi acest abonament? Această acțiune nu poate fi anulată.
            </p>
            
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSubscriptionToDelete(null)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(55, 65, 81, 1)',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Anulează
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Da, Șterge
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (min-width: 480px) {
          .modal-buttons {
            flex-direction: row !important;
            justify-content: flex-end !important;
          }
          .modal-buttons button {
            width: auto !important;
          }
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: clamp(1.5rem, 3vw, 2rem);
        }
        
        .subscriptions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: clamp(1rem, 3vw, 1.5rem);
        }
        
        @media (max-width: 768px) {
          .subscriptions-controls {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem;
          }
          
          .user-info-desktop {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}