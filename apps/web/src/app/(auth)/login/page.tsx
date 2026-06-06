'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError('No pudimos enviar el enlace. Intenta de nuevo.')
    } else {
      setSent(true)
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
          <p className="mt-1 text-sm text-ink-secondary">
            Field service excellence
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface-1 p-6">
        {!sent ? (
          <>
            <h2 className="mb-1 font-sans text-md font-semibold text-ink-primary">
              Acceder
            </h2>
            <p className="mb-5 text-sm text-ink-secondary">
              Ingresa tu correo y te enviamos un enlace de acceso.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-ink-secondary"
                >
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
                    'placeholder:text-ink-tertiary',
                    'focus:border-volt-500',
                  )}
                />
              </div>

              {error && (
                <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className={cn(
                  'h-touch w-full rounded bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
                  'transition-colors hover:bg-volt-400 active:bg-volt-600',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
              </button>
            </form>
          </>
        ) : (
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
        )}
      </div>

      <p className="mt-6 text-xs text-ink-tertiary">
        Voltaryx © {new Date().getFullYear()}
      </p>
    </div>
  )
}
