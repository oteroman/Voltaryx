'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, XCircle, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

interface Props {
  quoteId: string
  status: string
  customerId: string
  total: number
  quoteNumber: string
}

export function QuoteActions({ quoteId, status, customerId, total, quoteNumber }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  async function changeStatus(newStatus: string) {
    setLoading(newStatus); setError('')
    const sb = createClient()
    const { error: err } = await sb.from('quotes').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', quoteId)
    if (err) { setError(err.message); setLoading(null); return }
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      {/* Enviar al cliente */}
      {status === 'draft' && (
        <button onClick={() => changeStatus('sent')} disabled={!!loading}
          className={cn('flex h-touch items-center justify-center gap-2 rounded-lg bg-blue-500 font-semibold text-white',
            'hover:bg-blue-400 disabled:opacity-40 transition-colors')}>
          <Send size={18} />
          {loading === 'sent' ? 'Marcando...' : 'Marcar como enviada al cliente'}
        </button>
      )}

      {/* Aceptar / Rechazar cuando está enviada */}
      {status === 'sent' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => changeStatus('accepted')} disabled={!!loading}
            className={cn('flex h-touch items-center justify-center gap-2 rounded-lg bg-success font-semibold text-ink-inverse',
              'hover:opacity-90 disabled:opacity-40 transition-opacity')}>
            <CheckCircle2 size={18} />
            {loading === 'accepted' ? '...' : 'Aceptada'}
          </button>
          <button onClick={() => changeStatus('rejected')} disabled={!!loading}
            className={cn('flex h-touch items-center justify-center gap-2 rounded-lg border border-critical text-critical font-semibold',
              'hover:bg-critical/10 disabled:opacity-40 transition-colors')}>
            <XCircle size={18} />
            {loading === 'rejected' ? '...' : 'Rechazada'}
          </button>
        </div>
      )}

      {/* Convertir a contrato cuando aceptada */}
      {status === 'accepted' && (
        <Link
          href={`/contracts/new?quoteId=${quoteId}&customerId=${customerId}&value=${total}&title=${encodeURIComponent(quoteNumber)}`}
          className={cn('flex h-touch items-center justify-center gap-2 rounded-lg bg-volt-500 font-semibold text-ink-inverse',
            'hover:bg-volt-400 transition-colors')}>
          <ArrowRight size={18} />
          Convertir a contrato
        </Link>
      )}

      {/* Reabrir borrador */}
      {(status === 'rejected' || status === 'expired') && (
        <button onClick={() => changeStatus('draft')} disabled={!!loading}
          className={cn('flex h-touch items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 font-semibold text-ink-secondary',
            'hover:border-volt-500 hover:text-volt-400 disabled:opacity-40 transition-colors')}>
          <FileText size={18} />
          {loading === 'draft' ? '...' : 'Reactivar como borrador'}
        </button>
      )}
    </div>
  )
}
