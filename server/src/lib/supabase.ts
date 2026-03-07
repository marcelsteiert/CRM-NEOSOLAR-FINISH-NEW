import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL und SUPABASE_ANON_KEY muessen in .env gesetzt sein')
      }

      _supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
    }

    const value = (_supabase as any)[prop]
    if (typeof value === 'function') {
      return value.bind(_supabase)
    }
    return value
  },
})
