'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, CheckCircle2, Lock, RefreshCw, Eye, EyeOff, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

function LoginForm() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(() => searchParams.get('error'))

  const supabase = createClient()

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleCredentialAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (activeTab === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data?.session) {
        window.location.href = '/'
      } else {
        setSubmitted(true)
        setLoading(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        window.location.href = '/'
      }
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 bg-dot-grid p-4 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_-5px_rgba(16,185,129,0.3)]">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 font-sans">NullRisk</h1>
          <p className="text-xs text-zinc-400 max-w-xs font-mono">
            High-fidelity institutional options & margin paper trading platform
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl font-mono"
          >
            <div className="mx-auto h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wider">Account Pending Activation</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                We have sent an activation link to <span className="text-emerald-400 font-mono font-bold">{email}</span>.
                Please check your inbox or spam folder to complete registration.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-all pt-2 block w-full uppercase tracking-wider"
            >
              ← Back to Sign In
            </button>
          </motion.div>
        ) : (
          <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_8px_32px_-4px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            {/* Tab Navigation */}
            <div className="flex border-b border-white/[0.06] bg-zinc-900/40">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin')
                  setError(null)
                }}
                className={`flex-1 py-3.5 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === 'signin'
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/20'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup')
                  setError(null)
                }}
                className={`flex-1 py-3.5 text-xs font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === 'signup'
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/20'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {/* Google OAuth Button */}
              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={handleGoogleAuth}
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-850 border border-white/[0.08] hover:border-zinc-700 active:scale-[0.99] disabled:opacity-40 text-zinc-200 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {googleLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    {activeTab === 'signin' ? 'Continue with Google' : 'Sign Up with Google'}
                  </>
                )}
              </button>

              {/* Separator */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-white/[0.06]"></div>
                <span className="flex-shrink mx-3 text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-semibold">
                  or email credentials
                </span>
                <div className="flex-grow border-t border-white/[0.06]"></div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleCredentialAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@nullrisk.dev"
                      className="w-full h-10 bg-zinc-900/60 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 bg-zinc-900/60 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-10 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {activeTab === 'signup' && (
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 bg-zinc-900/60 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-4 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-rose-300 text-xs font-mono leading-relaxed"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading || !email || !password || (activeTab === 'signup' && !confirmPassword)}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-40 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 mt-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {activeTab === 'signin' ? 'Authenticating...' : 'Registering...'}
                    </>
                  ) : (
                    <>
                      {activeTab === 'signin' ? 'Sign In with Email' : 'Create Account'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Conversion link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(activeTab === 'signin' ? 'signup' : 'signin')
                    setError(null)
                  }}
                  className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 transition-colors"
                >
                  {activeTab === 'signin'
                    ? "Don't have an account? Sign Up instead →"
                    : 'Already registered? Log In instead →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
          <div className="text-center font-mono text-xs text-zinc-500 animate-pulse uppercase tracking-widest">
            Initialising System Auth...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
