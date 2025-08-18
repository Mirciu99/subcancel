import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../supabase'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return singleton instance to avoid multiple GoTrueClient instances
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseClient
}