import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserSubscription {
  id: string
  user_id: string
  plan_type: 'free' | 'pro' | 'premium'
  status: 'active' | 'cancelled' | 'expired'
  started_at: string
  expires_at: string | null
  created_at: string
}

interface SubscriptionStatus {
  subscription: UserSubscription | null
  loading: boolean
  error: string | null
  daysRemaining: number | null
  isExpired: boolean
  isPremium: boolean
  isPro: boolean
  isFree: boolean
  refresh: () => Promise<void>
}

export function useSubscription(): SubscriptionStatus {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const loadSubscription = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setSubscription(null)
        return
      }

      const { data: sub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subError)
        setError('Failed to load subscription')
        return
      }

      setSubscription(sub)
      
    } catch (err) {
      console.error('Error in loadSubscription:', err)
      setError('Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadSubscription()
      }
    })

    return () => authSubscription.unsubscribe()
  }, [])

  const getDaysRemaining = (): number | null => {
    if (!subscription?.expires_at) return null
    
    const now = new Date()
    const expires = new Date(subscription.expires_at)
    const diffTime = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  const isExpired = (): boolean => {
    if (!subscription?.expires_at) return false
    return new Date(subscription.expires_at) < new Date()
  }

  const daysRemaining = getDaysRemaining()
  const expired = isExpired()

  return {
    subscription,
    loading,
    error,
    daysRemaining,
    isExpired: expired,
    isPremium: subscription?.plan_type === 'premium' && !expired,
    isPro: subscription?.plan_type === 'pro' && !expired,
    isFree: subscription?.plan_type === 'free' || expired || !subscription,
    refresh: loadSubscription
  }
}