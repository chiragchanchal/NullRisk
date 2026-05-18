'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Mail, ArrowRight, CheckCircle2, Lock, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
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
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden">
      {/* Dynamic glow decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-zinc-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo and Subtext */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-12 w-12 bg-green-950/40 border border-green-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-green-950/20">
            <TrendingUp className="h-6 w-6 text-green-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">NullRisk</h1>
          <p className="text-xs text-zinc-500 max-w-xs font-mono">
            Professional Market Options & Margin Paper Trading Simulator
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl font-mono"
          >
            <div className="mx-auto h-12 w-12 bg-green-950/30 border border-green-800/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Account Pending</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We have sent an activation link to <span className="text-green-400 font-bold">{email}</span>.
                Please check your inbox or spam folder to complete registration.
              </p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false)
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }}
              className="text-xs text-green-400 hover:text-green-300 font-bold hover:underline transition-all pt-2 block w-full uppercase tracking-wider"
            >
              ← Back to Sign In
            </button>
          </motion.div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Elegant Tab Headers */}
            <div className="flex border-b border-zinc-800/80 bg-zinc-950/40">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin')
                  setError(null)
                }}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all font-mono border-b-2 ${
                  activeTab === 'signin'
                    ? 'border-green-500 text-green-400 bg-zinc-900/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/5'
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
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all font-mono border-b-2 ${
                  activeTab === 'signup'
                    ? 'border-green-500 text-green-400 bg-zinc-900/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/5'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Google Social OAuth Button */}
              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={handleGoogleAuth}
                className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 active:scale-[0.99] disabled:opacity-40 text-zinc-200 hover:text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {googleLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-green-500" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    {activeTab === 'signin' ? 'Continue with Google' : 'Sign Up with Google'}
                  </>
                )}
              </button>

              {/* Text Separator */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-zinc-800/60"></div>
                <span className="flex-shrink mx-4 text-[9px] text-zinc-600 font-bold uppercase tracking-widest font-mono">
                  or use Gmail / Email
                </span>
                <div className="flex-grow border-t border-zinc-800/60"></div>
              </div>

              {/* Credential Auth Form */}
              <form onSubmit={handleCredentialAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                    Gmail / Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@gmail.com"
                      className="w-full h-11 bg-zinc-950 border border-zinc-800/80 focus:border-green-700 rounded-xl pl-11 pr-4 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-green-950"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 bg-zinc-950 border border-zinc-800/80 focus:border-green-700 rounded-xl pl-11 pr-10 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-green-950"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {activeTab === 'signup' && (
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 bg-zinc-950 border border-zinc-800/80 focus:border-green-700 rounded-xl pl-11 pr-4 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-green-950"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-semibold leading-relaxed font-mono"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading || !email || !password || (activeTab === 'signup' && !confirmPassword)}
                  className="w-full h-11 bg-green-900 hover:bg-green-800 text-green-100 hover:text-white disabled:opacity-40 rounded-xl text-xs font-black uppercase tracking-widest transition-all font-mono flex items-center justify-center gap-1.5 mt-2 shadow-lg shadow-green-950/10 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {activeTab === 'signin' ? 'Authenticating...' : 'Registering...'}
                    </>
                  ) : (
                    <>
                      {activeTab === 'signin' ? 'Sign In with Gmail' : 'Create Account'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Account conversion message */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(activeTab === 'signin' ? 'signup' : 'signin')
                    setError(null)
                  }}
                  className="text-[10px] font-bold text-green-500 hover:text-green-400 uppercase tracking-wider font-mono hover:underline"
                >
                  {activeTab === 'signin'
                    ? "Don't have an account? Sign Up instead"
                    : 'Already registered? Log In instead'}
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
