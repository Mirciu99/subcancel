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

interface UserSubscription {
  id: string
  user_id: string
  plan_type: 'free' | 'pro' | 'premium'
  status: 'active' | 'cancelled' | 'expired'
  started_at: string
  expires_at: string | null
  created_at: string
}

interface Plan {
  id: 'free' | 'pro' | 'premium'
  name: string
  price: number
  duration: string
  description: string
  features: string[]
  highlighted?: boolean
  buttonText: string
  buttonColor: string
}

export default function PlansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free Trial',
      price: 0,
      duration: '3 zile',
      description: 'Perfect pentru a testa aplicația',
      features: [
        '✅ Detectare automată abonamente (max 5)',
        '✅ Generare cereri de anulare (max 3)',
        '✅ Dashboard basic cu statistici',
        '✅ Upload CSV extracte bancare',
        '❌ Notificări înainte de plăți',
        '❌ Rapoarte lunare detaliate',
        '❌ Suport prioritar',
        '❌ Integrare cu bănci românești'
      ],
      buttonText: 'Începe Trial Gratuit',
      buttonColor: 'linear-gradient(135deg, #6b7280, #4b5563)'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 5,
      duration: 'lună',
      description: 'Ideal pentru utilizare personală',
      highlighted: true,
      features: [
        '✅ Detectare automată abonamente (nelimitat)',
        '✅ Generare cereri de anulare (nelimitat)',
        '✅ Dashboard avansat cu analytics',
        '✅ Upload CSV și PDF extracte bancare',
        '✅ Notificări email înainte de plăți (3-7 zile)',
        '✅ Notificări browser push',
        '✅ Rapoarte lunare cu economii',
        '✅ Categorii personalizate',
        '❌ Suport prioritar 24/7',
        '❌ Integrare automată cu bănci'
      ],
      buttonText: 'Alege Pro',
      buttonColor: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 8,
      duration: 'lună',
      description: 'Pentru utilizatori avansați',
      features: [
        '✅ Toate beneficiile Pro',
        '✅ Notificări avansate (SMS + Email + Push)',
        '✅ Notificări personalizabile (1-14 zile înainte)',
        '✅ Reminder-uri recurente pentru plăți',
        '✅ Integrare automată cu BCR, BRD, ING',
        '✅ Suport prioritar 24/7',
        '✅ Rapoarte avansate și export Excel',
        '✅ API acces pentru dezvoltatori',
        '✅ Backup automat în cloud',
        '✅ Analiză predictivă economii'
      ],
      buttonText: 'Alege Premium',
      buttonColor: 'linear-gradient(135deg, #f59e0b, #d97706)'
    }
  ]

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
      loadCurrentSubscription()
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

  const loadCurrentSubscription = async () => {
    if (!user) return
    
    try {
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading subscription:', error)
        return
      }

      setCurrentSubscription(subscription)
      
      // If no subscription exists, create a free trial
      if (!subscription) {
        await createFreeTrialSubscription()
      }
      
    } catch (error) {
      console.error('Error loading subscription:', error)
    }
  }

  const createFreeTrialSubscription = async () => {
    if (!user) return
    
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days trial

      const { data: newSubscription, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating free subscription:', error)
        return
      }

      setCurrentSubscription(newSubscription)
      setSuccess('Trial gratuit de 3 zile activat!')
      
    } catch (error) {
      console.error('Error creating free subscription:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const selectPlan = async (planId: 'free' | 'pro' | 'premium') => {
    if (!user) return
    
    try {
      setLoading(true)
      setError('')
      
      // If same plan, do nothing
      if (currentSubscription?.plan_type === planId) {
        setError('Deja ai acest plan activ')
        return
      }

      // For free plan, can only downgrade from paid
      if (planId === 'free') {
        setError('Nu poți reveni la planul gratuit')
        return
      }

      // For paid plans, redirect to billing
      if (planId === 'pro' || planId === 'premium') {
        // Store selected plan in localStorage for billing page
        localStorage.setItem('selectedPlan', planId)
        router.push('/billing?upgrade=' + planId)
        return
      }
      
    } catch (error: any) {
      console.error('Error selecting plan:', error)
      setError('Eroare la selectarea planului: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRemainingDays = (expiresAt: string | null) => {
    if (!expiresAt) return null
    
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_type === planId
  }

  const getPlanStatus = (planId: string) => {
    if (!isCurrentPlan(planId)) return null
    
    if (currentSubscription?.plan_type === 'free') {
      const remaining = getRemainingDays(currentSubscription.expires_at)
      return `Activ - ${remaining} zile rămase`
    }
    
    return 'Plan Activ'
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
            Se încarcă planurile...
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
                    Planuri
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
        <div style={{textAlign: 'center', marginBottom: '3rem'}}>
          <h2 style={{
            fontSize: 'clamp(1.875rem, 4vw, 2.25rem)',
            fontWeight: 'bold',
            color: '#f9fafb',
            marginBottom: '0.5rem'
          }}>
            Alege Planul Perfect 🚀
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: '#9ca3af',
            marginBottom: '1rem'
          }}>
            Economisește bani prin gestionarea inteligentă a abonamentelor
          </p>
          
          {/* Current Plan Display */}
          {currentSubscription && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '9999px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              marginTop: '1rem'
            }}>
              <span style={{fontSize: '1rem'}}>📋</span>
              <span style={{color: '#3b82f6', fontWeight: '500', fontSize: '0.875rem'}}>
                Plan Curent: {plans.find(p => p.id === currentSubscription.plan_type)?.name}
                {currentSubscription.plan_type === 'free' && currentSubscription.expires_at && (
                  <span style={{marginLeft: '0.5rem', color: '#9ca3af'}}>
                    ({getRemainingDays(currentSubscription.expires_at)} zile rămase)
                  </span>
                )}
              </span>
            </div>
          )}
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

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(16px)',
                borderRadius: '1.5rem',
                padding: '2rem',
                border: plan.highlighted 
                  ? '2px solid rgba(59, 130, 246, 0.5)' 
                  : isCurrentPlan(plan.id)
                  ? '2px solid rgba(34, 197, 94, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: plan.highlighted 
                  ? '0 20px 25px -5px rgba(59, 130, 246, 0.1)' 
                  : 'none',
                position: 'relative',
                transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Plan Badge */}
              {plan.highlighted && (
                <div style={{
                  position: 'absolute',
                  top: '-0.75rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  RECOMANDAT
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan(plan.id) && (
                <div style={{
                  position: 'absolute',
                  top: '-0.75rem',
                  right: '1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  ACTIV
                </div>
              )}

              {/* Plan Header */}
              <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#f9fafb',
                  marginBottom: '0.5rem'
                }}>
                  {plan.name}
                </h3>
                <p style={{
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  {plan.description}
                </p>
                <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem'}}>
                  <span style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#f9fafb'
                  }}>
                    {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                  </span>
                  {plan.price > 0 && (
                    <span style={{
                      color: '#9ca3af',
                      fontSize: '1rem'
                    }}>
                      /{plan.duration}
                    </span>
                  )}
                </div>
                {plan.price === 0 && (
                  <p style={{color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                    {plan.duration}
                  </p>
                )}
              </div>

              {/* Features */}
              <div style={{marginBottom: '2rem'}}>
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem'}}>
                  {plan.features.map((feature, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      color: feature.startsWith('❌') ? '#9ca3af' : '#f9fafb',
                      fontSize: '0.875rem',
                      lineHeight: '1.4'
                    }}>
                      <span style={{marginTop: '0.1rem', fontSize: '0.75rem'}}>
                        {feature.slice(0, 2)}
                      </span>
                      <span style={{opacity: feature.startsWith('❌') ? 0.6 : 1}}>
                        {feature.slice(3)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => selectPlan(plan.id)}
                disabled={loading || isCurrentPlan(plan.id)}
                style={{
                  width: '100%',
                  padding: '1rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: isCurrentPlan(plan.id) 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : plan.buttonColor,
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isCurrentPlan(plan.id) ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentPlan(plan.id) && !loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {loading ? (
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Se procesează...
                  </div>
                ) : isCurrentPlan(plan.id) ? (
                  getPlanStatus(plan.id)
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
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
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            ❓ Întrebări Frecvente
          </h3>

          <div style={{display: 'grid', gap: '1.5rem'}}>
            <div>
              <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.5rem'}}>
                Cum funcționează notificările înainte de plăți?
              </h4>
              <p style={{color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6'}}>
                Te anunțăm cu 3-7 zile înainte de fiecare plată prin email și notificări browser. 
                La Premium, poți personaliza perioada (1-14 zile) și adăugi și SMS-uri.
              </p>
            </div>

            <div>
              <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.5rem'}}>
                Pot anula oricând?
              </h4>
              <p style={{color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6'}}>
                Da, poți anula oricând din setări. Nu existe taxe de anulare și vei avea acces 
                până la sfârșitul perioadei plătite.
              </p>
            </div>

            <div>
              <h4 style={{color: '#f9fafb', fontWeight: '600', marginBottom: '0.5rem'}}>
                Ce bănci sunt suportate?
              </h4>
              <p style={{color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6'}}>
                Toate planurile suportă upload manual CSV/PDF. Premium include integrare 
                automată cu BCR, BRD, ING și alte bănci românești majore.
              </p>
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