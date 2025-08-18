'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FileUploader from '@/components/FileUploader'
import SubscriptionCard from '@/components/SubscriptionCard'
import CancellationModal from '@/components/CancellationModal'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
// Removed unused API hooks - now using direct Supabase calls

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

interface Transaction {
  date: string
  amount: number
  merchant: string
  description?: string
}

interface DetectedSubscription {
  merchant: string
  amount: number
  frequency: 'monthly' | 'yearly' | 'weekly'
  category: string
  confidence: number
  nextPayment?: string
}

interface DetectionResponse {
  detectedSubscriptions: DetectedSubscription[]
  message: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<DetectedSubscription[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [totalSavings, setTotalSavings] = useState(0)
  
  // Direct Supabase data fetching instead of API client to avoid network errors
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  
  // Create refetch function for compatibility
  const refetchSubscriptions = () => loadSubscriptions()
  // Direct API functions instead of hooks
  const uploadTransactions = async (transactions: any[]) => {
    // Store transactions in Supabase
    const { error } = await supabase
      .from('transactions')
      .insert(transactions.map(t => ({ ...t, user_id: user?.id })))
    
    if (error) throw new Error('Failed to upload transactions')
  }
  
  const detectSubscriptions = async (transactions: any[]) => {
    // Simple detection logic - group by merchant and find recurring patterns
    const merchantGroups: { [key: string]: any[] } = {}
    transactions.forEach(t => {
      const merchant = t.merchant || t.description
      if (!merchantGroups[merchant]) merchantGroups[merchant] = []
      merchantGroups[merchant].push(t)
    })
    
    const detectedSubscriptions: any[] = []
    Object.entries(merchantGroups).forEach(([merchant, txs]) => {
      if (txs.length >= 2) { // Found recurring pattern
        const amount = txs[0].amount
        detectedSubscriptions.push({
          merchant,
          amount: Math.abs(amount),
          frequency: 'monthly',
          category: 'other',
          confidence: 0.8
        })
      }
    })
    
    return { detectedSubscriptions }
  }
  
  const confirmSubscriptionAPI = async (detectedSub: any) => {
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user?.id,
        name: detectedSub.merchant,
        merchant: detectedSub.merchant,
        amount: detectedSub.amount,
        currency: 'RON',
        frequency: detectedSub.frequency,
        status: 'active',
        category: detectedSub.category
      })
    
    if (error) throw new Error('Failed to confirm subscription')
  }
  
  const generateCancellationAPI = async (subscriptionId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'pending_cancellation' })
      .eq('id', subscriptionId)
    
    if (error) throw new Error('Failed to generate cancellation')
  }
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // PRESERVE AUTH - Don't clear localStorage to avoid breaking Supabase session
    // Only force light mode without clearing auth data
    
    // Force light mode styling (client-side only)
    if (typeof window !== 'undefined') {
      document.documentElement.className = ''
      document.body.className = ''
      document.body.style.cssText = 'background: #ffffff !important; color: #000000 !important;'
    }
    setIsDarkMode(false)
    
    checkUser()
    loadSavings()
  }, [])

  // Load subscriptions when user becomes available
  useEffect(() => {
    if (user) {
      loadSubscriptions()
    }
  }, [user])

  const loadSubscriptions = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching subscriptions:', error)
        setError('Eroare la încărcarea abonamentelor')
        return
      }
      
      setSubscriptions(data || [])
    } catch (err) {
      console.error('Error loading subscriptions:', err)
      setError('Eroare la încărcarea datelor')
    } finally {
      setLoading(false)
    }
  }

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

  const loadSavings = async () => {
    try {
      const { data: savingsData } = await supabase
        .from('savings_tracking')
        .select('total_savings')
      
      const total = savingsData?.reduce((sum: number, item: any) => sum + item.total_savings, 0) || 0
      setTotalSavings(total)
      
    } catch (err) {
      console.error('Error loading savings:', err)
    }
  }

  const handleDataParsed = async (transactions: Transaction[]) => {
    setError('')
    setSuccess('')
    
    try {
      await uploadTransactions(transactions)
      const response = await detectSubscriptions(transactions) as DetectionResponse
      const detectedSubs = response?.detectedSubscriptions || []
      setDetectedSubscriptions(Array.isArray(detectedSubs) ? detectedSubs : [])
      
      // Show success message with better visibility
      const message = `✅ ${detectedSubs.length} abonamente detectate din ${transactions.length} tranzacții!`
      setSuccess(message)
      
      // Auto-scroll to results if subscriptions were detected
      if (detectedSubs.length > 0) {
        setTimeout(() => {
          const resultsSection = document.getElementById('detected-subscriptions')
          if (resultsSection) {
            resultsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            })
          }
        }, 500) // Small delay to let DOM update
      }
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la procesarea datelor: ${errorMessage}`)
    }
  }

  const handleUploadError = (error: string) => {
    setError(error)
  }

  const confirmSubscription = async (detectedSub: DetectedSubscription) => {
    try {
      await confirmSubscriptionAPI(detectedSub)

      setDetectedSubscriptions(prev => 
        prev.filter(sub => sub.merchant !== detectedSub.merchant)
      )
      
      await refetchSubscriptions()
      setSuccess(`Abonamentul ${detectedSub.merchant} a fost confirmat`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la confirmarea abonamentului: ${errorMessage}`)
    }
  }

  const generateCancellation = async (subscriptionId: string) => {
    const subscription = subscriptions.find((sub: Subscription) => sub.id === subscriptionId)
    if (!subscription || !user) return
    
    setSelectedSubscription(subscription)
    setShowCancellationModal(true)
  }

  const handleCancellationSuccess = async () => {
    if (!selectedSubscription) return
    
    try {
      await generateCancellationAPI(selectedSubscription.id)
      await refetchSubscriptions()
      setSuccess('Cererea de anulare a fost generată și trimisă')
      setShowCancellationModal(false)
      setSelectedSubscription(null)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la salvarea cererii: ${errorMessage}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.status === 'active')
  const monthlyTotal = activeSubscriptions
    .filter(sub => sub.frequency === 'monthly')
    .reduce((sum: number, sub: Subscription) => sum + sub.amount, 0)
  const yearlyTotal = activeSubscriptions
    .filter(sub => sub.frequency === 'yearly')
    .reduce((sum: number, sub: Subscription) => sum + (sub.amount / 12), 0)
  const totalMonthlySpend = monthlyTotal + yearlyTotal

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
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1f2937, #111827, #1f2937)' 
          : 'linear-gradient(135deg, #eff6ff, #ffffff, #faf5ff)',
        minHeight: '100vh',
        color: isDarkMode ? '#ffffff' : '#000000',
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
            Se încarcă dashboard-ul...
          </div>
          <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>
            Vă rugăm să așteptați
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
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1f2937, #111827, #1f2937)' 
        : 'linear-gradient(135deg, #eff6ff, #ffffff, #faf5ff)',
      minHeight: '100vh',
      color: isDarkMode ? '#ffffff' : '#000000'
    }}>
      {/* Modern Header */}
      <header style={{
        background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
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
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  Dashboard
                </p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  background: isDarkMode ? 'rgba(31, 41, 55, 1)' : 'rgba(241, 245, 249, 1)',
                  border: isDarkMode ? 'none' : '1px solid rgba(226, 232, 240, 1)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  transition: 'all 0.3s ease',
                  boxShadow: isDarkMode ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              {/* User menu */}
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div className="user-info-desktop" style={{textAlign: 'right'}}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: isDarkMode ? '#f9fafb' : '#111827',
                    margin: 0
                  }}>
                    {user?.name || 'User'}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    margin: 0
                  }}>
                    {user?.email}
                  </p>
                </div>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: '0.875rem',
                    color: '#ef4444',
                    fontWeight: '500',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.375rem'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem'}}>
        {/* Hero Section */}
        <div style={{marginBottom: '2rem'}}>
          <h2 style={{
            fontSize: 'clamp(1.875rem, 4vw, 2.25rem)',
            fontWeight: 'bold',
            color: isDarkMode ? '#f9fafb' : '#111827',
            marginBottom: '0.5rem'
          }}>
            Bun venit înapoi, {user?.name?.split(' ')[0] || 'User'}! 👋
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: isDarkMode ? '#9ca3af' : '#6b7280'
          }}>
            Hai să vedem ce abonamente ai și cât poți economisi
          </p>
        </div>

        {/* Analytics Dashboard Layout */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem'}}>
          {/* Quick Stats Overview */}
          <div style={{
            background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: '2rem',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
            boxShadow: isDarkMode ? 'none' : '0 8px 25px -8px rgba(0, 0, 0, 0.12)'
          }}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem'}}>
              {/* Quick Stats */}
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
                  {activeSubscriptions.length}
                </div>
                <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem', fontWeight: '500'}}>Abonamente Active</div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(totalMonthlySpend)}
                </div>
                <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem', fontWeight: '500'}}>Cheltuieli Lunare</div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(totalSavings)}
                </div>
                <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem', fontWeight: '500'}}>Economii Realizate</div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(totalMonthlySpend * 12)}
                </div>
                <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem', fontWeight: '500'}}>Potențial Anual</div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
              <Link href="/subscriptions" style={{textDecoration: 'none'}}>
                <button style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.875rem'
                }}>
                  📊 Gestionează Abonamente
                </button>
              </Link>
              
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            marginBottom: '1.5rem',
            background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 242, 242, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{fontSize: '1.5rem', marginRight: '0.75rem'}}>⚠️</span>
              <p style={{color: isDarkMode ? '#fca5a5' : '#dc2626', margin: 0}}>{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            borderRadius: '1rem',
            padding: '1rem 1.5rem',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            maxWidth: '400px',
            minWidth: '300px',
            animation: 'slideInFromRight 0.3s ease-out'
          }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{marginRight: '0.75rem', fontSize: '1.25rem'}}>🎉</span>
              <p style={{margin: 0, fontWeight: '500', fontSize: '0.95rem'}}>{success}</p>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div style={{
          background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
          boxShadow: isDarkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
            <div style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span style={{fontSize: '2rem'}}>📁</span>
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: isDarkMode ? '#f9fafb' : '#111827',
              marginBottom: '0.5rem'
            }}>
              Încarcă Extrasul Bancar
            </h2>
            <p style={{
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              Detectează automat abonamentele din tranzacțiile tale
            </p>
          </div>
          <FileUploader 
            onDataParsed={handleDataParsed}
            onError={handleUploadError}
          />
        </div>

        {/* Advanced Analytics Section */}
        {subscriptions.length > 0 && (
          <div style={{marginBottom: '3rem'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
              
              {/* Subscription Categories Pie Chart */}
              <div style={{
                background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                borderRadius: '1.5rem',
                padding: '2rem',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
                boxShadow: isDarkMode ? 'none' : '0 8px 25px -8px rgba(0, 0, 0, 0.12)'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: isDarkMode ? '#f9fafb' : '#111827',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  📊 Distribuția Abonamentelor pe Categorii
                </h3>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
                  <div style={{height: '300px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            const categoryData: { [key: string]: number } = {}
                            subscriptions.forEach((sub: Subscription) => {
                              const category = sub.category || 'Altele'
                              categoryData[category] = (categoryData[category] || 0) + sub.amount
                            })
                            return Object.entries(categoryData).map(([name, value]) => ({ name, value }))
                          })()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(() => {
                            const categoryData: { [key: string]: number } = {}
                            subscriptions.forEach((sub: Subscription) => {
                              const category = sub.category || 'Altele'
                              categoryData[category] = (categoryData[category] || 0) + sub.amount
                            })
                            const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b']
                            return Object.keys(categoryData).map((key, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))
                          })()}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [
                            new Intl.NumberFormat('ro-RO', {
                              style: 'currency',
                              currency: 'RON'
                            }).format(value),
                            'Cheltuieli'
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Category Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}>
                    {(() => {
                      const categoryData: { [key: string]: { amount: number, count: number } } = {}
                      subscriptions.forEach((sub: Subscription) => {
                        const category = sub.category || 'Altele'
                        if (!categoryData[category]) categoryData[category] = { amount: 0, count: 0 }
                        categoryData[category].amount += sub.amount
                        categoryData[category].count += 1
                      })
                      
                      const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b']
                      
                      return Object.entries(categoryData).map(([category, data], index) => (
                        <div key={category} style={{
                          background: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          border: `2px solid ${COLORS[index % COLORS.length]}20`
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                            <div style={{
                              width: '1rem',
                              height: '1rem',
                              borderRadius: '50%',
                              background: COLORS[index % COLORS.length]
                            }}></div>
                            <span style={{fontWeight: '600', color: isDarkMode ? '#f9fafb' : '#111827'}}>
                              {category}
                            </span>
                          </div>
                          <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '0.875rem'}}>
                            {data.count} abonament{data.count !== 1 ? 'e' : ''}
                          </div>
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: '1.125rem',
                            color: COLORS[index % COLORS.length]
                          }}>
                            {new Intl.NumberFormat('ro-RO', {
                              style: 'currency',
                              currency: 'RON'
                            }).format(data.amount)}/lună
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detected Subscriptions */}
        {detectedSubscriptions.length > 0 && (
          <div id="detected-subscriptions" style={{marginBottom: '2rem'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: isDarkMode ? '#f9fafb' : '#111827',
                  marginBottom: '0.25rem'
                }}>
                  Abonamente Detectate
                </h2>
                <p style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  margin: 0
                }}>
                  {detectedSubscriptions.length} servicii găsite în tranzacții
                </p>
              </div>
              <div style={{
                background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                color: isDarkMode ? '#3b82f6' : '#1d4ed8',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: isDarkMode ? 'none' : '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                Nou detectate
              </div>
            </div>
            <div className="subscriptions-grid">
              {detectedSubscriptions.map((sub, index) => (
                <div key={index}>
                  <SubscriptionCard
                    subscription={{
                      id: `detected-${index}`,
                      name: sub.merchant,
                      merchant: sub.merchant,
                      amount: sub.amount,
                      currency: 'RON',
                      frequency: sub.frequency,
                      next_payment: sub.nextPayment || null,
                      status: 'detected',
                      category: sub.category,
                      confidence: sub.confidence
                    }}
                    onCancel={() => {}}
                    onConfirm={() => confirmSubscription(sub)}
                    showConfidence={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Subscriptions */}
        <div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: isDarkMode ? '#f9fafb' : '#111827',
                marginBottom: '0.25rem'
              }}>
                Abonamentele Tale
              </h2>
              <p style={{
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                margin: 0
              }}>
                {subscriptions.length} servicii înregistrate
              </p>
            </div>
            {subscriptions.length > 0 && (
              <div style={{
                fontSize: '0.875rem',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                Total: {new Intl.NumberFormat('ro-RO', {
                  style: 'currency',
                  currency: 'RON'
                }).format(totalMonthlySpend)} / lună
              </div>
            )}
          </div>
          
          {subscriptions.length === 0 ? (
            <div style={{
              background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1rem',
              padding: '3rem',
              textAlign: 'center',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
              boxShadow: isDarkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                width: '5rem',
                height: '5rem',
                background: isDarkMode ? 'rgba(107, 114, 128, 0.2)' : 'rgba(229, 231, 235, 0.5)',
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
                color: isDarkMode ? '#f9fafb' : '#111827',
                marginBottom: '0.75rem'
              }}>
                Nu ai încă abonamente înregistrate
              </h3>
              <p style={{
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                marginBottom: '1.5rem',
                maxWidth: '28rem',
                margin: '0 auto 1.5rem'
              }}>
                Încarcă un extras bancar pentru a detecta automat abonamentele tale sau adaugă manual serviciile
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                ⬆️ Începe prin a încărca un fișier CSV
              </div>
            </div>
          ) : (
            <div className="subscriptions-grid">
              {subscriptions.map((subscription: Subscription) => (
                <div key={subscription.id}>
                  <SubscriptionCard
                    subscription={subscription}
                    onCancel={generateCancellation}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
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

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInFromRight {
          0% { 
            transform: translateX(100%); 
            opacity: 0; 
          }
          100% { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        
        /* Responsive Grid Layouts */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        
        .subscriptions-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        
        .user-info-desktop {
          display: none;
        }
        
        /* Tablet and up */
        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .user-info-desktop {
            display: block;
          }
        }
        
        /* Desktop small */
        @media (min-width: 768px) {
          .subscriptions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        /* Desktop medium */
        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        /* Desktop large */
        @media (min-width: 1280px) {
          .subscriptions-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        /* Dashboard Cards */
        .dashboard-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .dashboard-card:hover {
          transform: translateY(-2px);
        }
        
        .clickable-card {
          cursor: pointer;
        }
        
        .clickable-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px -8px rgba(59, 130, 246, 0.25) !important;
        }
        
        .clickable-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 1rem;
          z-index: 1;
        }
        
        .clickable-card:hover::before {
          opacity: 1;
        }
        
        .clickable-card > * {
          position: relative;
          z-index: 2;
        }
      `}</style>
    </div>
  )
}