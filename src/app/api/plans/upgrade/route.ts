import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { plan_type, payment_method } = await request.json()
    
    if (!plan_type || !['pro', 'premium'].includes(plan_type)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching current subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch current subscription' },
        { status: 500 }
      )
    }

    // Check if user is trying to upgrade to same plan
    if (currentSub && currentSub.plan_type === plan_type) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      )
    }

    // In a real implementation, you would:
    // 1. Create Stripe/PayPal subscription
    // 2. Handle payment processing
    // 3. Update subscription in database

    // For now, simulate successful upgrade
    const planPrices = {
      pro: 5,
      premium: 8
    }

    // Cancel current subscription if exists
    if (currentSub) {
      await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id)
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan_type,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: null, // Recurring subscription, no expiry
        stripe_subscription_id: payment_method === 'stripe' ? `sub_mock_${Date.now()}` : null,
        paypal_subscription_id: payment_method === 'paypal' ? `I-mock-${Date.now()}` : null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Successfully upgraded plan',
      subscription: newSubscription,
      plan_type: plan_type,
      price: planPrices[plan_type as keyof typeof planPrices]
    })
    
  } catch (error) {
    console.error('Plan upgrade error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}