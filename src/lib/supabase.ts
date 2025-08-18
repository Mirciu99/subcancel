import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          merchant: string
          amount: number
          currency: string
          frequency: string
          next_payment: string | null
          status: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          merchant: string
          amount: number
          currency: string
          frequency: string
          next_payment?: string | null
          status?: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          merchant?: string
          amount?: number
          currency?: string
          frequency?: string
          next_payment?: string | null
          status?: string
          category?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          merchant: string
          date: string
          description: string | null
          source_file: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          merchant: string
          date: string
          description?: string | null
          source_file?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          merchant?: string
          date?: string
          description?: string | null
          source_file?: string | null
        }
      }
      cancellation_requests: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          status: string
          generated_at: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          status?: string
          generated_at?: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string
          status?: string
          generated_at?: string
          sent_at?: string | null
        }
      }
      savings_tracking: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          monthly_savings: number
          total_savings: number
          cancelled_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          monthly_savings: number
          total_savings: number
          cancelled_at: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string
          monthly_savings?: number
          total_savings?: number
          cancelled_at?: string
        }
      }
    }
  }
}