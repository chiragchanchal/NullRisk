'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Mail, ArrowRight, CheckCircle2, Lock } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setError(err)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (usePassword) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Successful login will automatically trigger Next.js redirect via middleware
        window.location.href = '/'
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSubmitted(true)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Access NullRisk</h2>
          <p className="text-muted-foreground mt-2">
            Sign in with a one-time password to your paper trading account
          </p>
        </div>

        {submitted ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 shadow-lg">
            <div className="mx-auto h-12 w-12 bg-gain/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-gain" />
            </div>
            <h3 className="text-xl font-semibold">Check your email</h3>
            <p className="text-muted-foreground">
              We've sent a magic link to <span className="text-foreground font-medium">{email}</span>.
              Click the link to sign in automatically.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-primary hover:underline text-sm font-medium mt-4 block w-full"
            >
              Try another email address
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    />
                  </div>
                </div>

                {usePassword && (
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-loss/10 text-loss text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || (usePassword && !password)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full font-semibold"
              >
                {loading ? (usePassword ? 'Signing in...' : 'Sending magic link...') : (
                  <>
                    {usePassword ? 'Sign in with Password' : 'Send magic link'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setUsePassword(!usePassword)
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {usePassword ? 'Or sign in with Magic Link instead' : 'Or sign in with Password instead'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center font-mono text-sm text-muted-foreground animate-pulse">
          Loading credentials...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

