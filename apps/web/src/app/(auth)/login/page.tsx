'use client'

import { useState } from 'react'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/components/ui/cn'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode]           = useState<Mode>('password')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    if (mode === 'password' && !password) return

    setLoading(true)
    setError('')

    const supabase = createClient()

    if (mode === 'password') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(
          authError.message.includes('Invalid login')
            ? 'Correo o contraseña incorrectos.'
            : 'Error al iniciar sesión. Intenta de nuevo.'
        )
      } else {
        router.push('/orders')
        router.refresh()
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) {
        setError('No pudimos enviar el enlace. Intenta de nuevo.')
      } else {
        setSent(true)
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-void px-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-volt-500">
          <Zap size={28} className="text-ink-inverse" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-primary">
            Voltaryx
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">Field service excellence</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-1 p-6">
        {sent ? (
          /* Magic link sent */
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Zap size={22} className="text-success" />
            </div>
            <div>
              <p className="font-sans text-base font-semibold text-ink-primary">
                Revisa tu correo
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                Enviamos un enlace de acceso a{' '}
                <span className="text-ink-primary">{email}</span>
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-ink-tertiary underline-offset-2 hover:text-ink-secondary hover:underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-5 font-sans text-md font-semibold text-ink-primary">
              Acceder
            </h2>

            {/* Mode tabs */}
            <div className="mb-5 flex rounded-lg bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => { setMode('password'); setError('') }}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                  mode === 'password'
                    ? 'bg-surface-1 text-ink-primary shadow-sm'
                    : 'text-ink-tertiary hover:text-ink-secondary',
                )}
              >
                Contraseña
              </button>
              <button
                type="button"
                onClick={() => { setMode('magic'); setError('') }}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                  mode === 'magic'
                    ? 'bg-surface-1 text-ink-primary shadow-sm'
                    : 'text-ink-tertiary hover:text-ink-secondary',
                )}
              >
                Enlace mágico
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-ink-secondary">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="tecnico@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'h-touch w-full rounded bg-surface-3 px-4 text-base text-ink-primary',
                    'border border-border outline-none transition-colors',
                    'placeholder:text-ink-tertiary focus:border-volt-500',
                  )}
                />
              </div>

              {/* Password (only in password mode) */}
              {mode === 'password' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-ink-secondary">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        'h-touch w-full rounded bg-surface-3 pl-4 pr-11 text-base text-ink-primary',
                        'border border-border outline-none transition-colors',
                        'placeholder:text-ink-tertiary focus:border-volt-500',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || (mode === 'password' && !password)}
                className={cn(
                  'h-touch w-full rounded bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
                  'transition-colors hover:bg-volt-400 active:bg-volt-600',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {loading
                  ? mode === 'password' ? 'Ingresando...' : 'Enviando...'
                  : mode === 'password' ? 'Ingresar'      : 'Enviar enlace de acceso'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-ink-tertiary">
        Voltaryx © {new Date().getFullYear()}
      </p>
    </div>
  )
}
