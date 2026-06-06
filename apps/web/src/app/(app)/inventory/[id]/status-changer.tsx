'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Status = 'stock' | 'deployed' | 'workshop' | 'transit' | 'retired'

const NEXT_ACTIONS: Record<Status, { to: Status; label: string; cls: string }[]> = {
  stock:    [{ to: 'deployed', label: 'Desplegar a cliente',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
             { to: 'transit',  label: 'Marcar en tránsito',    cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }],
  deployed: [{ to: 'workshop', label: 'Enviar a taller',       cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
             { to: 'stock',    label: 'Devolver a stock',       cls: 'bg-success/20 text-success border-success/30' }],
  workshop: [{ to: 'deployed', label: 'Devolver a operación',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
             { to: 'stock',    label: 'Devolver a stock',       cls: 'bg-success/20 text-success border-success/30' },
             { to: 'retired',  label: 'Dar de baja',            cls: 'bg-surface-3 text-ink-tertiary border-border' }],
  transit:  [{ to: 'deployed', label: 'Confirmar entrega',     cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
             { to: 'stock',    label: 'Devolver a stock',       cls: 'bg-success/20 text-success border-success/30' }],
  retired:  [],
}

interface Props {
  itemId: string
  currentStatus: Status
  customerId?: string
  productDescription: string
}

export function ItemStatusChanger({ itemId, currentStatus, customerId, productDescription }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Status | null>(null)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [replacements, setReplacements] = useState<{ id: string; serial_number: string | null; item_code: string | null; products: { description: string } | null }[]>([])

  const [newCustomerId,    setNewCustomerId]    = useState(customerId ?? '')
  const [newSiteId,        setNewSiteId]        = useState('')
  const [rentalRate,       setRentalRate]       = useState('')
  const [workshopReason,   setWorkshopReason]   = useState('')
  const [replacementItemId,setReplacementItemId]= useState('')
  const [loading,          setLoading]          = useState(false)

  const actions = NEXT_ACTIONS[currentStatus] ?? []

  useEffect(() => {
    if (selected !== 'deployed' && selected !== 'workshop') return
    const sb = createClient()
    if (selected === 'deployed') {
      sb.from('customers').select('id, name').eq('is_active', true).order('name')
        .then(({ data }) => setCustomers(data ?? []))
    }
    if (selected === 'workshop') {
      sb.from('inventory_items')
        .select('id, serial_number, item_code, products(description)')
        .eq('status', 'stock')
        .then(({ data }) => setReplacements((data ?? []) as any))
    }
  }, [selected])

  useEffect(() => {
    if (!newCustomerId || selected !== 'deployed') return
    const sb = createClient()
    sb.from('sites').select('id, name').eq('customer_id', newCustomerId).order('name')
      .then(({ data }) => setSites(data ?? []))
  }, [newCustomerId, selected])

  async function applyChange() {
    if (!selected) return
    setLoading(true)
    const sb = createClient()

    const updates: Record<string, any> = { status: selected }

    if (selected === 'deployed') {
      updates.customer_id = newCustomerId || null
      updates.site_id     = newSiteId     || null
      updates.deployed_at = new Date().toISOString()
      updates.rental_monthly_rate = rentalRate ? parseFloat(rentalRate) : null
      updates.workshop_reason = null
      updates.workshop_since  = null
    }
    if (selected === 'workshop') {
      updates.workshop_reason = workshopReason || 'En reparación'
      updates.workshop_since  = new Date().toISOString()
    }
    if (selected === 'stock') {
      updates.customer_id = null
      updates.site_id     = null
      updates.deployed_at = null
      updates.workshop_reason = null
      updates.workshop_since  = null
      updates.replaced_by_item_id = null
    }

    await sb.from('inventory_items').update(updates).eq('id', itemId)

    // Asignar reemplazo en el item actual (si se envía a taller con reemplazo)
    if (selected === 'workshop' && replacementItemId) {
      // Desplegar el reemplazo hacia el mismo cliente/sitio
      await sb.from('inventory_items').update({
        status:         'deployed',
        customer_id:    customerId ?? null,
        deployed_at:    new Date().toISOString(),
        replaced_by_item_id: null,
      }).eq('id', replacementItemId)

      // Registrar que el item en taller es reemplazado por este
      await sb.from('inventory_items').update({
        replaced_by_item_id: replacementItemId
      }).eq('id', itemId)
    }

    setLoading(false)
    router.refresh()
    setSelected(null)
  }

  if (actions.length === 0) return null

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Cambiar estado</p>

      {/* Selección de acción */}
      {!selected ? (
        <div className="flex flex-col gap-2">
          {actions.map(a => (
            <button key={a.to} onClick={() => setSelected(a.to)}
              className={cn('w-full rounded-lg border px-4 py-2.5 text-sm font-semibold text-left transition-colors', a.cls)}>
              {a.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            {actions.find(a => a.to === selected)?.label} — <strong>{productDescription}</strong>
          </p>

          {/* Formulario deploy */}
          {selected === 'deployed' && (
            <>
              <select value={newCustomerId} onChange={e => setNewCustomerId(e.target.value)}
                className={inputCls}>
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {sites.length > 0 && (
                <select value={newSiteId} onChange={e => setNewSiteId(e.target.value)} className={inputCls}>
                  <option value="">Seleccionar sede...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <input type="number" value={rentalRate} onChange={e => setRentalRate(e.target.value)}
                placeholder="Tarifa mensual alquiler (S/)" className={inputCls} />
            </>
          )}

          {/* Formulario taller */}
          {selected === 'workshop' && (
            <>
              <input type="text" value={workshopReason} onChange={e => setWorkshopReason(e.target.value)}
                placeholder="Motivo de ingreso a taller..." className={inputCls} />
              {replacements.length > 0 && (
                <select value={replacementItemId} onChange={e => setReplacementItemId(e.target.value)} className={inputCls}>
                  <option value="">Sin reemplazo (dejar vacío)</option>
                  {replacements.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.products?.description} · {r.serial_number ?? r.item_code}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button onClick={() => setSelected(null)}
              className="flex-1 rounded-lg border border-border bg-surface-2 py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-3">
              Cancelar
            </button>
            <button onClick={applyChange} disabled={loading}
              className="flex-1 rounded-lg bg-volt-500 py-2.5 text-sm font-semibold text-ink-inverse hover:bg-volt-400 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'h-11 w-full rounded-lg bg-surface-2 px-4 text-sm text-ink-primary border border-border outline-none transition-colors focus:border-volt-500 placeholder:text-ink-tertiary'
