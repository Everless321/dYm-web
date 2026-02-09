import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || '登录失败')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        inputRef.current?.select()
        return
      }
      localStorage.setItem('dym_token', json.data.token)
      onSuccess()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
      </div>

      <div
        className={`relative w-full max-w-[360px] ${shake ? 'animate-shake' : ''}`}
      >
        <div className="bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/[0.04] p-8">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                dYmanager
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                输入密码以继续
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                密码
              </label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="请输入访问密码"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className={`pr-10 ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPw
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
              <div className="h-5">
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={loading || !password.trim()}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> 验证中</>
                : '登录'
              }
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          密码通过启动参数 DYM_PASSWORD 配置
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  )
}
