import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Diamond, Eye, EyeOff } from 'lucide-react'

const BRAND_PANEL_GRADIENT = `
  radial-gradient(ellipse 66% 56% at 92% 6%, rgba(118,48,242,0.97) 0%, rgba(78,28,208,0.72) 26%, rgba(42,14,165,0.38) 52%, transparent 70%),
  radial-gradient(ellipse 64% 54% at 82% 60%, rgba(16,9,148,0.99) 0%, rgba(11,7,112,0.88) 30%, rgba(7,4,72,0.54) 58%, transparent 78%),
  radial-gradient(ellipse 44% 36% at 90% 96%, rgba(102,36,214,0.68) 0%, rgba(66,20,178,0.40) 44%, transparent 64%),
  radial-gradient(ellipse 30% 24% at 15% 82%, rgba(58,18,162,0.30) 0%, transparent 56%),
  radial-gradient(ellipse 50% 44% at 50% 50%, rgba(20,10,80,0.22) 0%, transparent 65%),
  linear-gradient(142deg, #020110 0%, #040220 26%, #07042a 62%, #030116 100%)
`

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()

  useEffect(() => {
    try {
      if (sessionStorage.getItem('kisna_logout_reason') === 'session_replaced') {
        sessionStorage.removeItem('kisna_logout_reason')
        toast.error('You were signed out — this account was logged in elsewhere.')
      }
    } catch { /* ignore */ }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ username, password })
      await refresh()
      localStorage.setItem('agent_username', username)
      toast.success('Logged in successfully')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh overflow-y-auto grid grid-cols-1 md:grid-cols-2">
      {/* Brand Side */}
      <div
        className="hidden md:flex flex-col justify-between text-white p-12 lg:p-20 relative overflow-hidden"
        style={{ background: BRAND_PANEL_GRADIENT }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8d57de 0%, #5d27ca 50%, #1f0798 100%)',
                boxShadow: '0 8px 24px rgba(93,39,202,0.32)',
              }}
            >
              <Diamond className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">KISNA Diamond & Gold</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 font-display">
            WhatsApp bot, under your control.
          </h2>
          <p className="text-lg text-white/60 max-w-md">
            Monitor conversations, take over live chats, and manage customer interactions — all in one place.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div
        className="relative flex items-center justify-center p-8 lg:p-12"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 80% 20%, rgb(var(--lavender-rgb) / 0.18) 0%, transparent 70%)',
          }}
        />

        <div className="relative w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #8d57de 0%, #5d27ca 50%, #1f0798 100%)',
              }}
            >
              <Diamond className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>KISNA Diamond & Gold</span>
          </div>

          <div className="space-y-2">
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.20em]"
              style={{
                background: 'rgb(var(--royal-rgb) / 0.08)',
                border: '1px solid rgb(var(--royal-rgb) / 0.14)',
                color: 'var(--royal)',
              }}
            >
              Dashboard
            </span>
            <h1 className="text-3xl font-bold tracking-tight font-display" style={{ color: 'var(--text)' }}>
              Welcome back
            </h1>
            <p className="text-muted-foreground">Sign in to access the dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Username</label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="login-input brand-input h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="login-input brand-input h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-btn h-12 w-full rounded-xl text-sm font-semibold text-white outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #8d57de 0%, #5d27ca 50%, #1f0798 100%)',
                boxShadow: '0 12px 32px rgba(93,39,202,0.32)',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
