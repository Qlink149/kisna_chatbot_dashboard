import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, setToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Diamond, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login({ username, password })
      setToken(res.token)
      localStorage.setItem('agent_username', username)
      toast.success('Logged in successfully')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* Brand Side */}
      <div className="hidden md:flex flex-col justify-between bg-[#0F172A] text-white p-12 lg:p-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C9A84C]/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#C9A84C]/5 rounded-full blur-[120px] -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A84C] shadow-lg shadow-[#C9A84C]/30">
              <Diamond className="h-5 w-5 text-zinc-900" />
            </div>
            <span className="text-xl font-bold tracking-tight">KISNA Diamond & Gold</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            WhatsApp bot, under your control.
          </h2>
          <p className="text-lg text-zinc-400 max-w-md">
            Monitor conversations, take over live chats, and manage customer interactions — all in one place.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A84C]">
              <Diamond className="h-4 w-4 text-zinc-900" />
            </div>
            <span className="text-lg font-bold text-zinc-900">KISNA Diamond & Gold</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="text-zinc-500">Sign in to access the dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900">Username</label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button className="w-full h-11 bg-[#C9A84C] hover:bg-[#b8963f] text-zinc-900" type="submit" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
