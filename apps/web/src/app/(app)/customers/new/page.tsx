'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

const TIERS = [
  { value: 'standard', label: 'Standard', desc: 'Cliente regular' },
  { value: 'premium',  label: 'Premium',  desc: 'Contrato activo' },
  { value: 'vip',      label: 'VIP',      desc: 'Prioridad máxima' },
]

export default function NewCustomerPage() {
  const router = useRouter()

  const [name,     setName]     = useState('')
  const [taxId,    setTaxId]    = useState('')
  const [industry, setIndustry] = useState('')
  const [tier,     setTier]     = useState('standard')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('customers')
      .insert({
        name:     name.trim(),
        tax_id:   taxId.trim() || null,
        industry: industry.trim() || null,
        tier,
        notes:    notes.trim() || null,
      })
      .select('id')
      .single()

    if (err) {
      setError('No se pudo guardar el cliente. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/customers/${data.id}`)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/customers" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nuevo Cliente</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">
        {/* Nombre */}
        <Field label="Razón social *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Empresa S.A.C."
            required
            className={inputCls}
          />
        </Field>

        {/* RUC */}
        <Field label="RUC">
          <input
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="20XXXXXXXXX"
            maxLength={11}
            className={inputCls}
          />
        </Field>

        {/* Rubro */}
        <Field label="Rubro / Industria">
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Banca, Retail, Salud..."
            className={inputCls}
          />
        </Field>

        {/* Tier */}
        <Field label="Nivel de cuenta">
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTier(t.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                  tier === t.value
                    ? 'border-volt-500 bg-volt-500/10 text-volt-400'
                    : 'border-border bg-surface-2 text-ink-secondary hover:border-border-muted',
                )}
              >
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-ink-tertiary">{t.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Notas */}
        <Field label="Notas internas">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información relevante, accesos especiales..."
            rows={3}
            className={cn(inputCls, 'h-auto resize-none py-3')}
          />
        </Field>

        {error && (
          <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className={cn(
            'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 active:bg-volt-600',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {loading ? 'Guardando...' : 'Crear cliente'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink-secondary">{label}</label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary',
  'border border-border outline-none transition-colors placeholder:text-ink-tertiary',
  'focus:border-volt-500',
)
