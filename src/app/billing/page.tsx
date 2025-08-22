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

interface PaymentMethod {
  id: string
  type: 'stripe' | 'paypal'
  last4?: string
  brand?: string
  email?: string
  isDefault: boolean
  created_at: string
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  description: string
  created_at: string
  invoice_url?: string
}

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  
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
      loadBillingData()
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

  const loadBillingData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Load payment methods (mock data for now - will be replaced with Stripe/PayPal API)
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: '1',
          type: 'stripe',
          last4: '4242',
          brand: 'Visa',
          isDefault: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2', 
          type: 'paypal',
          email: user.email,
          isDefault: false,
          created_at: new Date().toISOString()
        }
      ]
      
      // Load invoices (mock data for now)
      const mockInvoices: Invoice[] = [
        {
          id: 'inv_001',
          amount: 29.99,
          currency: 'RON',
          status: 'paid',
          description: 'SubCancel Pro - Decembrie 2024',
          created_at: new Date().toISOString()
        },
        {
          id: 'inv_002',
          amount: 29.99,
          currency: 'RON', 
          status: 'pending',
          description: 'SubCancel Pro - Ianuarie 2025',
          created_at: new Date().toISOString()
        }
      ]
      
      setPaymentMethods(mockPaymentMethods)
      setInvoices(mockInvoices)
      
    } catch (error) {
      console.error('Error loading billing data:', error)
      setError('Eroare la încărcarea datelor de facturare')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const addStripePaymentMethod = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if this is for upgrading a plan
      const urlParams = new URLSearchParams(window.location.search)
      const upgradePlan = urlParams.get('upgrade')
      
      if (upgradePlan) {
        // Handle plan upgrade with Stripe
        const upgradeResponse = await fetch('/api/plans/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            plan_type: upgradePlan,
            payment_method: 'stripe'
          })
        })
        
        if (!upgradeResponse.ok) {
          throw new Error('Failed to upgrade plan')
        }
        
        const upgradeResult = await upgradeResponse.json()
        setSuccess(`Plan upgradat cu succes la ${upgradePlan.toUpperCase()}! Prețul: ${upgradeResult.price}€/lună`)
        
        // Redirect to plans page after success
        setTimeout(() => {
          router.push('/plans')
        }, 2000)
        
        return
      }
      
      // Regular payment method setup
      const response = await fetch('/api/billing/stripe/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user?.id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to setup Stripe payment method')
      }
      
      const { client_secret } = await response.json()
      
      // Here you would redirect to Stripe checkout or use Stripe Elements
      setSuccess('Redirecting to Stripe setup...')
      
    } catch (error) {
      console.error('Error adding Stripe payment method:', error)
      setError('Eroare la adăugarea metodei de plată Stripe')
    } finally {
      setLoading(false)
    }
  }

  const addPayPalPaymentMethod = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if this is for upgrading a plan
      const urlParams = new URLSearchParams(window.location.search)
      const upgradePlan = urlParams.get('upgrade')
      
      if (upgradePlan) {
        // Handle plan upgrade with PayPal
        const upgradeResponse = await fetch('/api/plans/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            plan_type: upgradePlan,
            payment_method: 'paypal'
          })
        })
        
        if (!upgradeResponse.ok) {
          throw new Error('Failed to upgrade plan')
        }
        
        const upgradeResult = await upgradeResponse.json()
        setSuccess(`Plan upgradat cu succes la ${upgradePlan.toUpperCase()}! Prețul: ${upgradeResult.price}€/lună`)
        
        // Redirect to plans page after success
        setTimeout(() => {
          router.push('/plans')
        }, 2000)
        
        return
      }
      
      // Regular PayPal setup
      const response = await fetch('/api/billing/paypal/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user?.id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to setup PayPal payment method')
      }
      
      const { approval_url } = await response.json()
      
      // Redirect to PayPal for approval
      window.location.href = approval_url
      
    } catch (error) {
      console.error('Error adding PayPal payment method:', error)
      setError('Eroare la adăugarea metodei de plată PayPal')
    } finally {
      setLoading(false)
    }
  }

  const removePaymentMethod = async (methodId: string) => {
    try {
      setLoading(true)
      
      // API call to remove payment method
      const response = await fetch(`/api/billing/payment-methods/${methodId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove payment method')
      }
      
      setPaymentMethods(prev => prev.filter(pm => pm.id !== methodId))
      setSuccess('Metoda de plată a fost eliminată')
      
    } catch (error) {
      console.error('Error removing payment method:', error)
      setError('Eroare la eliminarea metodei de plată')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Plătită'
      case 'pending': return 'În așteptare'
      case 'failed': return 'Eșuată'
      default: return status
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
            Se încarcă billing...
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
                    Billing
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
            Billing & Plăți 💳
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: '#9ca3af'
          }}>
            Gestionează metodele de plată și facturarea
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

        {/* Payment Methods */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#f9fafb',
              margin: 0
            }}>
              💳 Metode de Plată
            </h3>
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              disabled={loading}
            >
              ➕ Adaugă Metodă
            </button>
          </div>

          {/* Add Payment Method Section */}
          {showAddPayment && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'rgba(31, 41, 55, 0.5)',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{color: '#f9fafb', marginBottom: '1rem'}}>Alege metoda de plată:</h4>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <button
                  onClick={addStripePaymentMethod}
                  disabled={loading}
                  style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #635bff, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>💳</span>
                  <span>Stripe (Card)</span>
                </button>
                
                <button
                  onClick={addPayPalPaymentMethod}
                  disabled={loading}
                  style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #0070ba, #003087)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>🅿️</span>
                  <span>PayPal</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods List */}
          <div style={{display: 'grid', gap: '1rem'}}>
            {paymentMethods.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#9ca3af'
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💳</div>
                <h4 style={{color: '#f9fafb', marginBottom: '0.5rem'}}>Nicio metodă de plată</h4>
                <p>Adaugă o metodă de plată pentru a începe</p>
              </div>
            ) : (
              paymentMethods.map((method) => (
                <div key={method.id} style={{
                  padding: '1.5rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '1rem',
                  border: method.isDefault ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{
                      fontSize: '1.5rem',
                      padding: '0.5rem',
                      background: method.type === 'stripe' ? 'rgba(99, 91, 255, 0.1)' : 'rgba(0, 112, 186, 0.1)',
                      borderRadius: '0.5rem'
                    }}>
                      {method.type === 'stripe' ? '💳' : '🅿️'}
                    </div>
                    <div>
                      <div style={{color: '#f9fafb', fontWeight: '500', marginBottom: '0.25rem'}}>
                        {method.type === 'stripe' 
                          ? `${method.brand} ****${method.last4}`
                          : `PayPal - ${method.email}`
                        }
                      </div>
                      <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                        Adăugată în {formatDate(method.created_at)}
                        {method.isDefault && (
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            borderRadius: '9999px',
                            fontSize: '0.75rem'
                          }}>
                            Implicită
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removePaymentMethod(method.id)}
                    disabled={loading}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices */}
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
            📄 Istoric Facturi
          </h3>

          <div style={{display: 'grid', gap: '1rem'}}>
            {invoices.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#9ca3af'
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📄</div>
                <h4 style={{color: '#f9fafb', marginBottom: '0.5rem'}}>Nicio factură</h4>
                <p>Facturile vor apărea aici după prima plată</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} style={{
                  padding: '1.5rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{flex: 1, minWidth: '200px'}}>
                    <div style={{color: '#f9fafb', fontWeight: '500', marginBottom: '0.25rem'}}>
                      {invoice.description}
                    </div>
                    <div style={{fontSize: '0.875rem', color: '#9ca3af'}}>
                      {formatDate(invoice.created_at)} • {invoice.id}
                    </div>
                  </div>
                  
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{textAlign: 'right'}}>
                      <div style={{color: '#f9fafb', fontWeight: '600'}}>
                        {new Intl.NumberFormat('ro-RO', {
                          style: 'currency',
                          currency: invoice.currency
                        }).format(invoice.amount)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        border: '1px solid',
                        ...getStatusColor(invoice.status).split(' ').reduce((acc, cls) => {
                          if (cls.startsWith('text-')) acc.color = `var(--${cls.replace('text-', '').replace('-400', '')}-400)`
                          if (cls.startsWith('bg-')) acc.background = `var(--${cls.replace('bg-', '').replace('-400/10', '')}-400-10)`
                          if (cls.startsWith('border-')) acc.borderColor = `var(--${cls.replace('border-', '').replace('-400/20', '')}-400-20)`
                          return acc
                        }, {} as any)
                      }}>
                        {getStatusLabel(invoice.status)}
                      </div>
                    </div>
                    
                    {invoice.invoice_url && (
                      <a
                        href={invoice.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.5rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        📥
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        :root {
          --green-400: #4ade80;
          --green-400-10: rgba(74, 222, 128, 0.1);
          --green-400-20: rgba(74, 222, 128, 0.2);
          --yellow-400: #facc15;
          --yellow-400-10: rgba(250, 204, 21, 0.1);
          --yellow-400-20: rgba(250, 204, 21, 0.2);
          --red-400: #f87171;
          --red-400-10: rgba(248, 113, 113, 0.1);
          --red-400-20: rgba(248, 113, 113, 0.2);
        }
      `}</style>
    </div>
  )
}