import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// This would require Stripe SDK installation: npm install stripe
// import Stripe from 'stripe'
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2023-10-16'
// })

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    // For now, return mock data since Stripe SDK is not installed
    // In production, you would:
    // 1. Create or get Stripe customer
    // 2. Create setup intent
    // 3. Return client_secret
    
    const mockClientSecret = 'pi_mock_client_secret_' + Date.now()
    
    // TODO: Uncomment when Stripe is properly configured
    /*
    try {
      // Create or retrieve Stripe customer
      let customerId = user.user_metadata?.stripe_customer_id
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        })
        customerId = customer.id
        
        // Update user metadata with Stripe customer ID
        await supabase.auth.updateUser({
          data: { stripe_customer_id: customerId }
        })
      }
      
      // Create setup intent for future payments
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card']
      })
      
      return NextResponse.json({
        client_secret: setupIntent.client_secret,
        customer_id: customerId
      })
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json(
        { error: 'Failed to create setup intent' },
        { status: 500 }
      )
    }
    */
    
    // Mock response for development
    return NextResponse.json({
      client_secret: mockClientSecret,
      customer_id: 'cus_mock_customer_' + user.id.slice(0, 8),
      message: 'Mock Stripe setup intent created. Install Stripe SDK for production.'
    })
    
  } catch (error) {
    console.error('Setup intent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}