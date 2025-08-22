'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FileUploader from '@/components/FileUploader'
import SubscriptionCard from '@/components/SubscriptionCard'
import CancellationModal from '@/components/CancellationModal'
import AddManualSubscriptionModal from '@/components/AddManualSubscriptionModal'
import VerificationModal from '@/components/VerificationModal'
import UserProfileDropdown from '@/components/UserProfileDropdown'
import { useSubscription } from '@/hooks/useSubscription'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PDFAnalysisResult, DetectedSubscription } from '@/types/pdf-analyzer'
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
  const [pdfAnalysisResult, setPdfAnalysisResult] = useState<PDFAnalysisResult | null>(null)
  const [showAddManualModal, setShowAddManualModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  
  // Ref for autoscroll to detected subscriptions
  const detectedSubscriptionsRef = useRef<HTMLDivElement>(null)
  
  // Direct Supabase data fetching instead of API client to avoid network errors
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const { subscription: userSubscription, loading: subscriptionLoading, daysRemaining, isPremium, isPro, isFree, isExpired } = useSubscription()
  
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
        name: detectedSub.beneficiary,
        merchant: detectedSub.beneficiary,
        amount: detectedSub.averageAmount,
        currency: detectedSub.currency || 'RON', // Use actual currency from AI
        frequency: detectedSub.frequency || 'monthly',
        status: 'active',
        category: detectedSub.category || 'other'
      })
    
    if (error) {
      console.error('Database insert error:', error)
      throw new Error('Failed to confirm subscription')
    }
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
  // Always dark mode
  const isDarkMode = true
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // PRESERVE AUTH - Don't clear localStorage to avoid breaking Supabase session
    // Force dark mode styling (client-side only)
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('dark')
      document.body.className = ''
      document.body.style.cssText = 'background: #0f172a !important; color: #ffffff !important;'
    }
    
    checkUser()
    loadSavings()
  }, [])

  // Load subscriptions when user becomes available
  useEffect(() => {
    if (user) {
      loadSubscriptions()
    }
  }, [user])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Note: Subscription-based redirect is now handled by middleware

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
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la procesarea datelor: ${errorMessage}`)
    }
  }

  const handleUploadError = (error: string) => {
    setError(error)
  }

  const handleAddManualSubscription = async (subscriptionData: {
    name: string;
    amount: number;
    frequency: string;
    category: string;
    currency?: string;
    nextPayment?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user?.id,
          name: subscriptionData.name,
          merchant: subscriptionData.name,
          amount: subscriptionData.amount,
          currency: subscriptionData.currency || 'RON',
          frequency: subscriptionData.frequency,
          status: 'active',
          category: subscriptionData.category,
          next_payment: subscriptionData.nextPayment || null
        })
      
      if (error) throw new Error('Failed to add subscription')
      
      await refetchSubscriptions()
      setSuccess(`Abonamentul ${subscriptionData.name} a fost adăugat cu succes`)
      setShowAddManualModal(false)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la adăugarea abonamentului: ${errorMessage}`)
    }
  }

  const handlePDFAnalyzed = useCallback((result: PDFAnalysisResult) => {
    setError('')
    setSuccess('')
    setPdfAnalysisResult(result)
    
    // Use the PDF analysis result subscriptions directly (they already match DetectedSubscription interface)
    const pdfDetectedSubs = result.subscriptions;
    
    setDetectedSubscriptions(pdfDetectedSubs)
    
    // Show verification modal if subscriptions found
    if (result.subscriptions.length > 0) {
      setShowVerificationModal(true)
    }
    
    // Show success message
    const message = `✅ ${result.subscriptions.length} abonamente detectate din PDF (${result.totalTransactions} tranzacții analizate)!`
    setSuccess(message)
    
    // Success message will be auto-hidden by useEffect
  }, [])

  // Handle verification modal confirmation and autoscroll
  const handleVerificationConfirm = () => {
    // Auto-scroll to detected subscriptions section
    setTimeout(() => {
      if (detectedSubscriptionsRef.current) {
        detectedSubscriptionsRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }, 300)
  }

  const confirmSubscription = async (detectedSub: DetectedSubscription) => {
    try {
      await confirmSubscriptionAPI(detectedSub)

      setDetectedSubscriptions(prev => 
        prev.filter(sub => sub.beneficiary !== detectedSub.beneficiary)
      )
      
      await refetchSubscriptions()
      setSuccess(`Abonamentul ${detectedSub.beneficiary} a fost confirmat`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută'
      setError(`Eroare la confirmarea abonamentului: ${errorMessage}`)
    }
  }

  const ignoreSubscription = (subscriptionId: string) => {
    // Remove from detected subscriptions list (simple ignore - don't save anywhere)
    setDetectedSubscriptions(prev => 
      prev.filter(sub => sub.beneficiary !== subscriptionId)
    )
    setSuccess('Abonament ignorat')
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

  // Dark mode is always enabled - no toggle needed

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.status === 'active')
  const monthlyTotal = activeSubscriptions
    .filter(sub => sub.frequency === 'monthly')
    .reduce((sum: number, sub: Subscription) => sum + (sub.amount || 0), 0)
  const weeklyTotal = activeSubscriptions
    .filter(sub => sub.frequency === 'weekly')
    .reduce((sum: number, sub: Subscription) => sum + ((sub.amount || 0) * 4), 0)
  const yearlyTotal = activeSubscriptions
    .filter(sub => sub.frequency === 'yearly')
    .reduce((sum: number, sub: Subscription) => sum + ((sub.amount || 0) / 12), 0)
  const totalMonthlySpend = monthlyTotal + weeklyTotal + yearlyTotal

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
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 clamp(0.5rem, 2vw, 1rem)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
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
                  fontSize: 'clamp(1rem, 3vw, 1.25rem)',
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

        {/* Trial Status Alert */}
        {isFree && daysRemaining !== null && (
          <div style={{
            marginBottom: '2rem',
            background: daysRemaining <= 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem 1.5rem',
            borderLeft: `4px solid ${daysRemaining <= 1 ? '#ef4444' : '#f59e0b'}`
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <span style={{fontSize: '1.5rem'}}>
                {daysRemaining <= 1 ? '⚠️' : '🕒'}
              </span>
              <div>
                <p style={{
                  color: daysRemaining <= 1 ? '#fca5a5' : '#fbbf24',
                  fontWeight: '600',
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  {daysRemaining === 0 ? 'Trial-ul a expirat!' : 
                   daysRemaining === 1 ? 'Trial-ul expiră mâine!' :
                   `Trial-ul expiră în ${daysRemaining} zile`}
                </p>
                <p style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  {daysRemaining === 0 ? 
                    'Alege un plan pentru a continua să folosești toate funcționalitățile.' :
                    'Upgrade la Pro sau Premium pentru a avea acces nelimitat la toate funcționalitățile.'
                  }
                </p>
              </div>
              <Link 
                href="/plans" 
                style={{
                  marginLeft: 'auto',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
              >
                {daysRemaining === 0 ? 'Alege Plan' : 'Upgrade'}
              </Link>
            </div>
          </div>
        )}

        {isExpired && (
          <div style={{
            marginBottom: '2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem 1.5rem',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <span style={{fontSize: '1.5rem'}}>🚫</span>
              <div>
                <p style={{color: '#fca5a5', fontWeight: '600', margin: 0, marginBottom: '0.25rem'}}>
                  Abonamentul a expirat
                </p>
                <p style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  Funcționalitățile sunt limitate. Alege un plan pentru a continua.
                </p>
              </div>
              <Link 
                href="/plans" 
                style={{
                  marginLeft: 'auto',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Reactivează
              </Link>
            </div>
          </div>
        )}

        {/* Analytics Dashboard Layout */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem'}}>
          {/* Quick Stats Overview */}
          <div style={{
            background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: 'clamp(1rem, 4vw, 2rem)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
            boxShadow: isDarkMode ? 'none' : '0 8px 25px -8px rgba(0, 0, 0, 0.12)'
          }}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(1rem, 3vw, 2rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)'}}>
              {/* Quick Stats */}
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
                  {activeSubscriptions.length}
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem', fontWeight: '500'}}>
                    Abonamente Active
                  </div>
                  <div className="group relative">
                    <div className="w-4 h-4 rounded-full bg-gray-500 hover:bg-gray-400 flex items-center justify-center cursor-help transition-colors duration-200 opacity-70 hover:opacity-100">
                      <span className="text-xs text-white font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Numărul total de servicii cu abonament pe care le plătești
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
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
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem', fontWeight: '500'}}>
                    Cheltuieli Lunare
                  </div>
                  <div className="group relative">
                    <div className="w-4 h-4 rounded-full bg-gray-500 hover:bg-gray-400 flex items-center justify-center cursor-help transition-colors duration-200 opacity-70 hover:opacity-100">
                      <span className="text-xs text-white font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Total cheltuieli recurente pe lună (include săptămânale și anuale)
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
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
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem', fontWeight: '500'}}>
                    Economii Realizate
                  </div>
                  <div className="group relative">
                    <div className="w-4 h-4 rounded-full bg-gray-500 hover:bg-gray-400 flex items-center justify-center cursor-help transition-colors duration-200 opacity-70 hover:opacity-100">
                      <span className="text-xs text-white font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Bani economisiți prin anularea abonamentelor
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
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
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <div style={{color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem', fontWeight: '500'}}>
                    Potențial Anual
                  </div>
                  <div className="group relative">
                    <div className="w-4 h-4 rounded-full bg-gray-500 hover:bg-gray-400 flex items-center justify-center cursor-help transition-colors duration-200 opacity-70 hover:opacity-100">
                      <span className="text-xs text-white font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Cheltuieli cu abonamente pe întregul an (lunar x 12)
                    </div>
                  </div>
                </div>
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
              
              <button 
                onClick={() => setShowAddManualModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.875rem'
                }}>
                  ➕ Adaugă Abonament Nou
                </button>
              
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
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span style={{marginRight: '0.75rem', fontSize: '1.25rem'}}>🎉</span>
                <p style={{margin: 0, fontWeight: '500', fontSize: '0.95rem'}}>{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                ✕
              </button>
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
            onPDFAnalyzed={handlePDFAnalyzed}
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
                            return Object.keys(categoryData).map((_, index) => (
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

        {/* PDF Analysis Summary */}
        {pdfAnalysisResult && (
          <div style={{
            background: isDarkMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 1)',
            boxShadow: isDarkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: isDarkMode ? '#f9fafb' : '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📄 Analiză PDF Completă
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
              <div style={{textAlign: 'center', padding: '1rem', background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderRadius: '0.75rem'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem'}}>
                  {pdfAnalysisResult.totalTransactions}
                </div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Tranzacții analizate</div>
              </div>
              <div style={{textAlign: 'center', padding: '1rem', background: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderRadius: '0.75rem'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.25rem'}}>
                  {pdfAnalysisResult.subscriptions.length}
                </div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Abonamente detectate</div>
              </div>
              <div style={{textAlign: 'center', padding: '1rem', background: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)', borderRadius: '0.75rem'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.25rem'}}>
                  {pdfAnalysisResult.analysisMetadata.pdfPages}
                </div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Pagini procesate</div>
              </div>
              <div style={{textAlign: 'center', padding: '1rem', background: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.25rem'}}>
                  {Math.round(pdfAnalysisResult.analysisMetadata.processingTime / 1000)}s
                </div>
                <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>Timp procesare</div>
              </div>
            </div>
            <div style={{marginTop: '1rem', padding: '0.75rem', background: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(248, 250, 252, 0.8)', borderRadius: '0.5rem'}}>
              <div style={{fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280'}}>
                <strong>Perioada analizată:</strong> {new Date(pdfAnalysisResult.dateRange.start).toLocaleDateString('ro-RO')} - {new Date(pdfAnalysisResult.dateRange.end).toLocaleDateString('ro-RO')}
                <br />
                <strong>Metodă extragere:</strong> {pdfAnalysisResult.analysisMetadata.extractionMethod === 'text' ? 'Extragere text directă' : 'OCR (recunoaștere optică)'}
              </div>
            </div>
          </div>
        )}

        {/* Detected Subscriptions */}
        {detectedSubscriptions.length > 0 && (
          <div ref={detectedSubscriptionsRef} style={{marginBottom: '2rem'}}>
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
                      name: sub.beneficiary,
                      merchant: sub.beneficiary,
                      amount: sub.averageAmount,
                      currency: sub.currency,
                      frequency: sub.frequency,
                      next_payment: sub.nextEstimatedPayment ? (typeof sub.nextEstimatedPayment === 'string' ? sub.nextEstimatedPayment : sub.nextEstimatedPayment.toISOString().split('T')[0]) : null,
                      status: 'detected',
                      category: sub.category || 'other',
                      confidence: sub.confidence
                    }}
                    onCancel={() => {}}
                    onConfirm={() => confirmSubscription(sub)}
                    onIgnore={() => ignoreSubscription(sub.beneficiary)}
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

      {/* Add Manual Subscription Modal */}
      {showAddManualModal && (
        <AddManualSubscriptionModal
          isOpen={showAddManualModal}
          onClose={() => setShowAddManualModal(false)}
          onSubmit={handleAddManualSubscription}
        />
      )}

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

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onConfirm={handleVerificationConfirm}
        subscriptionCount={detectedSubscriptions.length}
      />

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