import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/') || next.startsWith('//') || next.includes(':')) {
    next = '/'
  }

  // Handle load-balancer / proxy forwarded host if present
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const redirectBase = isLocalEnv || !forwardedHost ? origin : `${forwardedProto}://${forwardedHost}`

  if (code || (token_hash && type)) {
    // Create redirect response so that cookies are set directly on the outgoing response
    const response = NextResponse.redirect(`${redirectBase}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    let authUser = null

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[Auth Callback] exchangeCodeForSession failed:', error.message)
        return NextResponse.redirect(
          `${redirectBase}/login?error=${encodeURIComponent(error.message)}`
        )
      }
      authUser = data?.session?.user ?? null
    } else if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })
      if (error) {
        console.error('[Auth Callback] verifyOtp failed:', error.message)
        return NextResponse.redirect(
          `${redirectBase}/login?error=${encodeURIComponent(error.message)}`
        )
      }
      authUser = data?.user ?? null
    }

    // Self-healing: Ensure user profile exists in public.profiles with initial mock balance
    if (authUser?.id) {
      try {
        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', authUser.id)
          .single()

        if (!profile) {
          const meta = authUser.user_metadata || {}
          const rawName =
            meta.full_name ||
            meta.name ||
            meta.preferred_username ||
            (authUser.email?.split('@')[0] ?? 'trader')
          const cleanUsername =
            (rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) || 'trader') +
            '_' +
            authUser.id.slice(0, 4)

          await adminClient.from('profiles').upsert(
            {
              id: authUser.id,
              email: authUser.email || '',
              username: cleanUsername,
              mock_balance: 500000,
              initial_balance: 500000,
              weekly_start_balance: 500000,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          )
        }
      } catch (err) {
        console.error('[Auth Callback] Profile fallback creation error:', err)
      }
    }

    return response
  }

  return NextResponse.redirect(`${redirectBase}/login?error=Invalid+or+missing+auth+token`)
}
