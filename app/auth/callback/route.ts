import { type NextRequest } from 'next/server'
import { handleAuthCallback } from '@/lib/supabase/auth-callback'

export async function GET(request: NextRequest) {
  return await handleAuthCallback(request)
}
