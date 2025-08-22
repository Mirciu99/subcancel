import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Return default settings if none exist
    const defaultSettings = {
      notifications: {
        email: true,
        browser: false,
        monthly_reports: true,
        payment_reminders: true
      },
      privacy: {
        analytics: true,
        marketing: false
      },
      preferences: {
        currency: 'RON',
        language: 'ro',
        theme: 'dark'
      }
    }

    return NextResponse.json({
      settings: settings?.settings || defaultSettings
    })
    
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json()
    
    const supabase = createClient()
    
    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Upsert user settings
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings: settings,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Error updating settings:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings
    })
    
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}