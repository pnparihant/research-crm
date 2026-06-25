'use client'
import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type LoginTab = 'client' | 'admin'
type Step = 'credentials' | 'email-otp' | 'forgot'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local}***@${domain}`
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`
}

function redirectForRole(role: string) {
  if (role === 'master_admin') return '/master-admin'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

const EMAIL_DOMAIN = '@arihantcapital.com'

const TAB_CONFIG: Record<LoginTab, {
  label: string
  expectedRoles: string[]
  sendOtpUrl: string
  verifyOtpUrl: string
  accent: string
  ring: string
  btn: string
  activeBg: string
  activeText: string
  icon: React.ReactNode
}> = {
  client: {
    label: 'Client Login',
    expectedRoles: ['user'],
    sendOtpUrl: '/api/auth/send-login-otp',
    verifyOtpUrl: '/api/auth/verify-login-otp',
    accent: 'teal',
    ring: 'focus:ring-teal-500',
    btn: 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-300',
    activeBg: 'bg-teal-50',
    activeText: 'text-teal-700 border-teal-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  admin: {
    label: 'Admin Login',
    expectedRoles: ['admin', 'master_admin'],
    sendOtpUrl: '/api/admin/auth/send-login-otp',
    verifyOtpUrl: '/api/admin/auth/verify-login-otp',
    accent: 'indigo',
    ring: 'focus:ring-indigo-500',
    btn: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-700 border-indigo-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
}

function OtpBoxes({ value, onChange, ring }: { value: string; onChange: (v: string) => void; ring: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        onChange(value.slice(0, i - 1) + value.slice(i))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  function handleInput(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const next = value.slice(0, i) + digit + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (i < 5) refs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted)
      refs.current[Math.min(pasted.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-13 text-center text-xl font-mono font-bold border-2 rounded-xl focus:outline-none focus:ring-2 ${ring} transition-all ${
            value[i] ? 'border-current bg-gray-50 text-gray-900' : 'border-gray-200 bg-white text-gray-400'
          }`}
          style={{ height: '3.25rem' }}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LoginTab>('client')
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotResetUrl, setForgotResetUrl] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  function switchTab(tab: LoginTab) {
    setActiveTab(tab)
    setEmail('')
    setPassword('')
    setOtp('')
    setDevOtp('')
    setError('')
    setStep('credentials')
    setShowPassword(false)
    setForgotSent(false)
    setForgotEmail('')
    setForgotResetUrl('')
    setResendCooldown(0)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
    setForgotSent(true)
    if (data.resetUrl) setForgotResetUrl(data.resetUrl)
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fullEmail = email.includes('@') ? email : email + EMAIL_DOMAIN
    const result = await signIn('credentials', { email: fullEmail, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      // NextAuth encodes thrown Error messages as the error value
      const msg = result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error;
      setError(msg);
      return;
    }

    const session = await fetch('/api/auth/session').then((r) => r.json())
    const role: string = session?.user?.role ?? 'user'

    if (!TAB_CONFIG[activeTab].expectedRoles.includes(role)) {
      setError('This account does not have access to this login')
      return
    }

    setEmail(fullEmail)
    await sendEmailOtp(fullEmail)
  }

  async function sendEmailOtp(emailOverride?: string) {
    setLoading(true)
    const res = await fetch(cfg.sendOtpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOverride ?? email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send OTP'); return }

    setOtp('')
    setStep('email-otp')
    if (data.otp) setDevOtp(data.otp)

    setResendCooldown(30)
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  async function handleEmailOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) return
    setError('')
    setLoading(true)

    const res = await fetch(cfg.verifyOtpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Invalid OTP'); return }

    const s = await fetch('/api/auth/session').then((r) => r.json())
    router.push(redirectForRole(s?.user?.role ?? 'user'))
  }

  const cfg = TAB_CONFIG[activeTab]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-6">
          
          <h2 className="text-base font-semibold text-gray-700">Arihant Capital Markets</h2>
          <p className="text-xs text-gray-400 mt-0.5">Research Servicing Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            {(Object.keys(TAB_CONFIG) as LoginTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? `${TAB_CONFIG[tab].activeBg} ${TAB_CONFIG[tab].activeText}`
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {TAB_CONFIG[tab].icon}
                {TAB_CONFIG[tab].label}
              </button>
            ))}
          </div>

          <div className="p-7">
            {/* Step header */}
            <div className="text-center mb-6">
              {step === 'email-otp' ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 mb-3">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">Check your inbox</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    OTP sent to <span className="font-medium text-gray-700">{maskEmail(email)}</span>
                  </p>
                  <p className="text-xs text-teal-700 mt-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-1.5 inline-block">
                    Valid till midnight (IST) · Do not share
                  </p>
                </>
              ) : step === 'forgot' ? (
                <>
                  <h1 className="text-lg font-bold text-gray-900">Reset password</h1>
                  <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link</p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-bold text-gray-900">Welcome back</h1>
                  <p className="text-sm text-gray-500 mt-1">Sign in to your {activeTab === 'admin' ? 'admin ' : ''}account</p>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Credentials step */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <div className={`flex items-center border border-gray-200 rounded-xl focus-within:ring-2 ${cfg.ring} focus-within:border-transparent overflow-hidden bg-gray-50`}>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/@.*/, ''))}
                      required
                      autoFocus
                      className="flex-1 px-4 py-2.5 bg-transparent focus:outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
                      placeholder="username"
                    />
                    <span className="px-3 py-2.5 text-gray-400 text-sm border-l border-gray-200 bg-gray-100 whitespace-nowrap select-none">
                      {EMAIL_DOMAIN}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email ? email + EMAIL_DOMAIN : ''); setStep('forgot'); setError(''); setForgotSent(false); setForgotResetUrl('') }}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 ${cfg.ring} focus:border-transparent text-gray-900 placeholder:text-gray-400`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-1 ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Spinner />Signing in…</span>
                    : 'Sign In'}
                </button>
              </form>
            )}

            {/* OTP step */}
            {step === 'email-otp' && (
              <form onSubmit={handleEmailOtp} className="space-y-5">
                {devOtp && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 text-center">
                    <span className="font-semibold">Dev OTP: </span>
                    <span className="font-mono tracking-widest text-base">{devOtp}</span>
                  </div>
                )}

                <OtpBoxes value={otp} onChange={setOtp} ring={cfg.ring} />

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Spinner />Verifying…</span>
                    : 'Verify OTP'}
                </button>

                <div className="flex items-center justify-between text-sm pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setOtp(''); setDevOtp(''); setError('') }}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => sendEmailOtp()}
                    className="text-teal-600 hover:text-teal-700 disabled:text-gray-400 font-medium transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Forgot password step */}
            {step === 'forgot' && (
              <div className="space-y-5">
                {!forgotSent ? (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 ${cfg.ring} focus:border-transparent placeholder:text-gray-400`}
                        placeholder="you@arihantcapital.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><Spinner />Sending…</span>
                        : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStep('credentials'); setError('') }}
                      className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to login
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
                      <p className="font-semibold mb-1">Check your email</p>
                      <p>If <span className="font-medium">{forgotEmail}</span> is registered, a reset link has been sent. It expires in 1 hour.</p>
                    </div>
                    {forgotResetUrl && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                        <p className="text-amber-800 font-semibold mb-1.5">Dev mode — reset link:</p>
                        <a href={forgotResetUrl} className="text-teal-600 break-all text-xs hover:underline">{forgotResetUrl}</a>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setStep('credentials'); setForgotSent(false); setError('') }}
                      className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to login
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          © {new Date().getFullYear()} Arihant Capital Markets Ltd.
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
