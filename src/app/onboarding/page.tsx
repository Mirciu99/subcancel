'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    
    // FORCE DARK MODE
    document.documentElement.classList.add('dark')
    document.body.className = ''
    document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'

    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handlePlanSelection = async (planType: 'free' | 'pro' | 'premium') => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const expiresAt = new Date()
      
      // Set expiration based on plan
      if (planType === 'free') {
        expiresAt.setDate(expiresAt.getDate() + 3) // 3 days trial
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month
      }

      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: planType,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })

      if (subError) {
        setError('A apărut o eroare la crearea abonamentului')
        console.error('Subscription error:', subError)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (err) {
      console.error('Error:', err)
      setError('A apărut o eroare neașteptată')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !user) {
    return (
      <div style={{background: '#0f172a', minHeight: '100vh', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        Loading...
      </div>
    )
  }

  const plans = [
    {
      id: 'free',
      name: 'Free Trial',
      price: '0€',
      duration: '3 zile',
      description: 'Perfect pentru a testa aplicația',
      features: [
        'Încarcă un extras bancar',
        'Detectarea abonamentelor',
        'Generarea a 2 cereri de reziliere',
        'Suport email'
      ],
      colorStart: '#4b5563',
      colorEnd: '#374151',
      borderColor: 'border-gray-600',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '5€',
      duration: 'lună',
      description: 'Ideal pentru persoane cu multe abonamente',
      features: [
        'Extrase bancare nelimitate',
        'Detectare avansată abonamente',
        'Cereri de reziliere nelimitate',
        'Statistici și analytics',
        'Suport prioritar'
      ],
      colorStart: '#2563eb',
      colorEnd: '#1d4ed8',
      borderColor: 'border-blue-500',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '8€',
      duration: 'lună',
      description: 'Pentru utilizatori avansați și business',
      features: [
        'Tot din Pro +',
        'Monitorizare automată abonamente',
        'Rapoarte personalizate',
        'API access',
        'Suport telefonic 24/7'
      ],
      colorStart: '#9333ea',
      colorEnd: '#7c3aed',
      borderColor: 'border-purple-500',
      popular: false
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      minHeight: '100vh',
      color: '#ffffff',
      padding: '2rem 1rem'
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
      </div>

      <div style={{position: 'relative', maxWidth: '80rem', margin: '0 auto'}}>
        {/* Header */}
        <div style={{textAlign: 'center', marginBottom: '3rem'}}>
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
            fontSize: 'clamp(1.875rem, 5vw, 2.5rem)',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.75rem'
          }}>
            Alege planul perfect pentru tine
          </h1>
          
          <p style={{
            fontSize: '1.125rem',
            color: '#9ca3af',
            maxWidth: '32rem',
            margin: '0 auto'
          }}>
            Bun venit, {user.user_metadata?.name || user.email}! Selectează planul care se potrivește nevoilor tale.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '2rem',
            background: 'rgba(127, 29, 29, 0.3)',
            backdropFilter: 'blur(16px)',
            borderRadius: '0.75rem',
            padding: '1rem',
            borderLeft: '4px solid #ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            maxWidth: '32rem',
            margin: '0 auto 2rem'
          }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{color: '#ef4444', fontSize: '1.125rem', marginRight: '0.75rem'}}>⚠️</span>
              <p style={{color: '#fca5a5', fontSize: '0.875rem', margin: 0}}>{error}</p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(16px)',
                borderRadius: '1.5rem',
                padding: '2rem',
                border: `2px solid ${plan.popular ? '#3b82f6' : 'rgba(71, 85, 105, 0.3)'}`,
                boxShadow: plan.popular ? '0 0 30px rgba(59, 130, 246, 0.3)' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-0.75rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  🔥 Cel mai popular
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
                    background: `linear-gradient(135deg, ${plan.colorStart}, ${plan.colorEnd})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {plan.price}
                  </span>
                  <span style={{color: '#9ca3af', fontSize: '1rem'}}>
                    /{plan.duration}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div style={{marginBottom: '2rem'}}>
                {plan.features.map((feature, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <span style={{
                      color: '#10b981',
                      fontSize: '1rem',
                      width: '1rem',
                      flexShrink: 0
                    }}>
                      ✓
                    </span>
                    <span style={{
                      color: '#e2e8f0',
                      fontSize: '0.875rem'
                    }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handlePlanSelection(plan.id as any)}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#9ca3af' : `linear-gradient(135deg, ${plan.colorStart}, ${plan.colorEnd})`,
                  color: 'white',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Se activează...' : `Alege ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem'}}>
          <p style={{marginBottom: '1rem'}}>
            Poți schimba planul oricând din secțiunea Settings.
          </p>
          <Link 
            href="/dashboard" 
            style={{
              color: '#60a5fa',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            ← Sari peste și mergi la Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}