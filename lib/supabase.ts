// lib/supabase.ts
// Browser-side Supabase client. Safe to import in client components.
//
// Reads from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
// If either is missing, getSupabase() returns null and the app silently
// falls back to local-only behavior (data URLs in localStorage).

import { createClient } from './supabase/client'
import { type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    cached = null
    return null
  }

  cached = createClient()
  return cached
}

export const SUPABASE_BUCKET = 'chat-uploads'
