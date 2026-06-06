'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PhotoCapture } from '@/components/ui/photo-capture'
import { cn } from '@/components/ui/cn'

interface Params { id: string }

const SEVERITIES = [
  { value: 'low',      label: 'Baja',     color: 'text-ink-secondary  bg-surface-3' },
  { value: 'medium',   label: 'Media',    color: 'text-info           bg-info/10'   },
  { value: 'high',     label: 'Alta',     color: 'text-warning        bg-warning/10' },
  { value: 'critical', label: 'Crítica',  color: 'text-critical       bg-critical/10' },
] as const

const CATEGORIES = [
  'electrical','mechanical','thermal','physical','software','other',
] as const

export default function NewFindingPage({ params }: { params: Params }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [severity,    setSeverity]    = useState<string>('medium')
  const [category,    setCategory]    = useState<string>('')
  const [isOpportunity, setIsOpportunity] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es obligatorio'); return }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('findings').insert({
      work_order_id:   params.id,
      title:           title.trim(),
      description:     description.trim() || null,
      severity,
      category:        category || null,
      is_opportunity:  isOpportunity,
      estimated_value: isOpportunity && estimatedValue ? Number(estimatedValue) : null,
      status:          'open',
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    startTransition(() => router.push(`/orders/${params.id}/execute`))
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/orders/${params.id}/execute`}
          className="flex h-touch w-touch items-center justify-center rounded text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <p className="text-base font-medium text-ink-primary">Nuevo hallazgo</p>
        </div>
        <AlertTriangle size={18} className="text-warning" />
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-4 pb-8">
        {/* Título */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">
            Título <span className="text-critical">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Batería con tensión baja"
            className="h-touch w-full rounded-lg border border-border-subtle bg-surface-1 px-4 text-base text-ink-primary placeholder-ink-tertiary focus:border-volt-500 focus:outline-none"
          />
        </div>

        {/* Severidad */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">Severidad</label>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeverity(s.value)}
                className={cn(
                  'h-touch rounded-lg text-sm font-semibold transition-colors',
                  severity === s.value
                    ? `${s.color} ring-1 ring-current`
                    : 'bg-surface-2 text-ink-tertiary',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categoría */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(prev => prev === cat ? '' : cat)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm capitalize transition-colors min-h-[36px]',
                  category === cat
                    ? 'bg-volt-100 text-volt-500 ring-1 ring-volt-500/40'
                    : 'bg-surface-2 text-ink-tertiary',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">Descripción</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe el hallazgo con detalle..."
            className="w-full rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-ink-primary placeholder-ink-tertiary focus:border-volt-500 focus:outline-none resize-none"
          />
        </div>

        {/* Oportunidad comercial */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsOpportunity(p => !p)}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors min-h-[44px]',
              isOpportunity
                ? 'border-volt-500/30 bg-volt-100'
                : 'border-border-subtle bg-surface-1',
            )}
          >
            <div className={cn(
              'h-5 w-5 rounded-full border-2 flex-shrink-0',
              isOpportunity ? 'border-volt-500 bg-volt-500' : 'border-ink-tertiary',
            )} />
            <div>
              <p className="text-sm font-medium text-ink-primary">
                Oportunidad comercial
              </p>
              <p className="text-xs text-ink-tertiary">
                Este hallazgo puede derivar en una venta o contrato
              </p>
            </div>
          </button>
          {isOpportunity && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-secondary">Valor estimado (USD)</span>
              <input
                type="number"
                inputMode="decimal"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                placeholder="0"
                className="h-touch flex-1 rounded-lg border border-border-subtle bg-surface-1 px-4 font-mono text-base text-ink-primary focus:border-volt-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Fotos */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">Fotografías</label>
          <PhotoCapture workOrderRemoteId={params.id} />
        </div>

        {error && (
          <p className="rounded-md bg-critical/10 px-4 py-3 text-sm text-critical">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || isPending || !title.trim()}
          className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-volt-500 text-base font-semibold text-ink-inverse transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:opacity-50"
        >
          {(saving || isPending) && <Loader2 size={16} className="animate-spin" />}
          Guardar hallazgo
        </button>
      </form>
    </div>
  )
}
