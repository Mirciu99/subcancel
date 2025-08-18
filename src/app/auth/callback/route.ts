import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo')

  console.log('Auth callback received:', { code: !!code, redirectTo })

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
      }

      console.log('Session exchange successful, redirecting to login')
      
      // Successful confirmation - redirect to login with success
      if (redirectTo) {
        return NextResponse.redirect(new URL(decodeURIComponent(redirectTo), requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
      }
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
    }
  }

  console.log('No code provided, redirecting to home')
  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}