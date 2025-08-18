import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // Successful confirmation - redirect to login with success
      if (redirectTo) {
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}