'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Item = {
  id: string
  description: string
  quantityOrdered: number
  quantityReceived: number
}

interface Props {
  poId: string
  status: string
  items: Item[]
  canReceive: boolean
  canCancel: boolean
}

export function ReceiveActions({ poId, status, items, canReceive, canCancel }: Props) {
  const router  = useRouter()
  const [showPartial, setShowPartial] = useState(false)
  const [received,    setReceived]    = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.quantityReceived]))
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function markFullyReceived() {
    setLoading(true); setError('')
    const today = new Date().toISOString().split('T')[0]!

    // Update all items to fully received
    for (const item of items) {
      await createClient().from('purchase_order_items')
        .update({ quantity_received: item.quantityOrdered })
        .eq('id', item.id)
    }

    const { error: err } = await createClient().from('purchase_orders')
      .update({ status: 'received', received_date: today })
      .eq('id', poId)

    if (err) { setError('No se pudo actualizar.'); setLoading(false); return }
    router.refresh()
  }

  async function savePartialReceive() {
    setLoading(true); setError('')
    const today = new Date().toISOString().split('T')[0]!

    for (const item of items) {
      const qty = received[item.id] ?? item.quantityReceived
      await createClient().from('purchase_order_items')
        .update({ quantity_received: qty })
        .eq('id', item.id)
    }

    const allReceived = items.every(i => (received[i.id] ?? i.quantityReceived) >= i.quantityOrdered)
    const newStatus   = allReceived ? 'received' : 'partial'
    const patch: Record<string, unknown> = { status: newStatus }
    if (allReceived) patch.received_date = today

    const { error: err } = await createClient().from('purchase_orders')
      .update(patch).eq('id', poId)

    if (err) { setError('No se pudo actualizar.'); setLoading(false); return }
    router.refresh()
    setShowPartial(false)
  }

  async function cancelOrder() {
    if (!confirm('¿Anular esta orden de compra? Esta acción no se puede deshacer.')) return
    setLoading(true); setError('')

    const { error: err } = await createClient().from('purchase_orders')
      .update({ status: 'cancelled' }).eq('id', poId)

    if (err) { setError('No se pudo anular.'); setLoading(false); return }
    router.refresh()
  }

  async function advanceStatus(next: string) {
    setLoading(true); setError('')
    const { error: err } = await createClient().from('purchase_orders')
      .update({ status: next }).eq('id', poId)
    if (err) { setError('No se pudo actualizar.'); setLoading(false); return }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      {/* Advance status */}
      {status === 'draft' && (
        <button onClick={() => advanceStatus('sent')} disabled={loading}
          className={cn(btnBase, 'border border-border bg-surface-2 text-ink-primary hover:bg-surface-3')}>
          Marcar como enviada al proveedor
        </button>
      )}
      {status === 'sent' && (
        <button onClick={() => advanceStatus('confirmed')} disabled={loading}
          className={cn(btnBase, 'border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20')}>
          Marcar como confirmada
        </button>
      )}

      {/* Receive actions */}
      {canReceive && (
        <>
          <button onClick={markFullyReceived} disabled={loading}
            className={cn(btnBase, 'bg-success text-white hover:bg-success/90')}>
            <PackageCheck size={18} />
            {loading ? 'Actualizando...' : 'Marcar como completamente recibida'}
          </button>

          <button type="button"
            onClick={() => setShowPartial(v => !v)}
            className={cn(btnBase, 'border border-border-subtle bg-surface-2 text-ink-secondary hover:bg-surface-3')}>
            Recepción parcial
            {showPartial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showPartial && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-primary">Cantidades recibidas</h3>
              <div className="flex flex-col gap-3">
                {items.map(item => (
                  <div key={item.id}>
                    <p className="mb-1 text-xs font-medium text-ink-secondary truncate">{item.description}</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min="0" max={item.quantityOrdered}
                        value={received[item.id] ?? item.quantityReceived}
                        onChange={e => setReceived(prev => ({
                          ...prev,
                          [item.id]: Math.min(item.quantityOrdered, Math.max(0, parseInt(e.target.value) || 0))
                        }))}
                        className="w-20 rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-sm text-ink-primary outline-none focus:border-volt-500"
                      />
                      <span className="text-xs text-ink-tertiary">de {item.quantityOrdered}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={savePartialReceive} disabled={loading}
                className={cn(btnBase, 'mt-4 bg-volt-500 text-ink-inverse hover:bg-volt-400')}>
                {loading ? 'Guardando...' : 'Guardar recepción'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Cancel */}
      {canCancel && (
        <button onClick={cancelOrder} disabled={loading}
          className={cn(btnBase, 'border border-critical/30 bg-critical/10 text-critical hover:bg-critical/20')}>
          <XCircle size={16} />Anular orden
        </button>
      )}
    </div>
  )
}

const btnBase = cn(
  'flex h-touch w-full items-center justify-center gap-2 rounded-xl font-sans text-sm font-semibold',
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
)
