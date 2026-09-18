import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // If Supabase redirected with auth code to root, login, or any other non-auth route,
  // forward it directly to /auth/callback so the authorization code can be exchanged.
  const code = request.nextUrl.searchParams.get('code')
  if (code && !request.nextUrl.pathname.startsWith('/auth/')) {
    const forwardUrl = request.nextUrl.clone()
    forwardUrl.pathname = '/auth/callback'
    return NextResponse.redirect(forwardUrl)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip session validation on auth callback/confirm routes to allow exchangeCodeForSession to run unhindered
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user
    }
  } catch {
    user = null
  }

  // Protected routes logic
  // If no user and not on auth/login or auth/confirm, redirect to login
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user and trying to access auth/login, redirect to dashboard
  if (user && isAuthRoute && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/' // Redirect to dashboard
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
