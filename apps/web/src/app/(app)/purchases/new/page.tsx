'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/components/ui/cn'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type LineItem = {
  key: number
  productId: string
  description: string
  qty: number
  unitCost: number
}

/* ─── Inner form (uses useSearchParams) ──────────────────────────────────── */
function NewPurchaseForm() {
  const router = useRouter()
  const sp = useSearchParams()

  const [supplierId,    setSupplierId]    = useState(sp.get('supplierId') ?? '')
  const [orderDate,     setOrderDate]     = useState(new Date().toISOString().split('T')[0]!)
  const [expectedDate,  setExpectedDate]  = useState('')
  const [notes,         setNotes]         = useState('')
  const [lines,         setLines]         = useState<LineItem[]>([{ key: 0, productId: '', description: '', qty: 1, unitCost: 0 }])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [keySeq,        setKeySeq]        = useState(1)

  const searchSuppliers = useCallback(async (q: string) => {
    const { data } = await createClient().from('suppliers')
      .select('id, name, ruc')
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .order('name').limit(10)
    return (data ?? []).map(s => ({ value: s.id, label: s.name, sublabel: s.ruc ?? undefined }))
  }, [])

  const searchProducts = useCallback(async (q: string) => {
    const { data } = await createClient().from('products')
      .select('id, description, brand, model, cost_price, category')
      .eq('is_active', true)
      .or(`description.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
      .order('description').limit(10)
    return (data ?? []).map(p => ({
      value: p.id,
      label: `${p.brand ? p.brand + ' ' : ''}${p.description}`,
      sublabel: p.model ?? undefined,
    }))
  }, [])

  function addLine() {
    setLines(prev => [...prev, { key: keySeq, productId: '', description: '', qty: 1, unitCost: 0 }])
    setKeySeq(k => k + 1)
  }

  function removeLine(key: number) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function updateLine(key: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
  }

  async function onProductSelect(key: number, productId: string) {
    updateLine(key, { productId })
    if (!productId) return
    const { data } = await createClient().from('products')
      .select('description, brand, model, cost_price')
      .eq('id', productId).single()
    if (data) {
      const label = `${data.brand ? data.brand + ' ' : ''}${data.description}${data.model ? ' ' + data.model : ''}`
      updateLine(key, {
        productId,
        description: label,
        unitCost: data.cost_price ?? 0,
      })
    }
  }

  // Totals
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitCost, 0)
  const igv      = subtotal * 0.18
  const total    = subtotal + igv

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || lines.every(l => !l.description.trim())) return
    setLoading(true); setError('')

    const validLines = lines.filter(l => l.description.trim())

    const { data: po, error: err } = await createClient()
      .from('purchase_orders')
      .insert({
        supplier_id:   supplierId,
        status:        'draft',
        order_date:    orderDate,
        expected_date: expectedDate || null,
        subtotal,
        igv_pct:       18,
        igv,
        total,
        notes:         notes.trim() || null,
        po_number:     '',
      })
      .select('id')
      .single()

    if (err || !po) { setError('No se pudo crear la OC.'); setLoading(false); return }

    const itemsPayload = validLines.map((l, i) => ({
      purchase_order_id: po.id,
      product_id:        l.productId || null,
      description:       l.description.trim(),
      quantity_ordered:  l.qty,
      quantity_received: 0,
      unit_cost:         l.unitCost,
      subtotal:          l.qty * l.unitCost,
      sort_order:        i,
    }))

    const { error: itemsErr } = await createClient()
      .from('purchase_order_items')
      .insert(itemsPayload)

    if (itemsErr) { setError('OC creada pero hubo un error en las líneas.'); setLoading(false); return }
    router.push(`/purchases/${po.id}`)
  }

  const canSubmit = supplierId && lines.some(l => l.description.trim()) && !loading

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5 pb-24">

      {/* Proveedor */}
      <Field label="Proveedor *">
        <Combobox
          value={supplierId}
          onChange={setSupplierId}
          onSearch={searchSuppliers}
          placeholder="Buscar proveedor..."
        />
      </Field>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de orden *">
          <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
            required className={inputCls} />
        </Field>
        <Field label="Fecha esperada">
          <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
            min={orderDate} className={inputCls} />
        </Field>
      </div>

      {/* Líneas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink-secondary">Productos / ítems *</label>
          <button type="button" onClick={addLine}
            className="flex items-center gap-1 text-xs font-semibold text-volt-500 hover:text-volt-400 transition-colors">
            <Plus size={13} />Agregar ítem
          </button>
        </div>

        {lines.map((line, idx) => (
          <div key={line.key}
            className="rounded-xl border border-border-subtle bg-surface-1 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-tertiary">Ítem {idx + 1}</span>
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(line.key)}
                  className="text-ink-tertiary hover:text-critical transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Product search (optional) */}
            <div className="mb-2">
              <p className="mb-1 text-xs text-ink-tertiary">Buscar en catálogo (opcional)</p>
              <Combobox
                value={line.productId}
                onChange={id => onProductSelect(line.key, id)}
                onSearch={searchProducts}
                placeholder="Buscar producto..."
              />
            </div>

            {/* Description override */}
            <input
              value={line.description}
              onChange={e => updateLine(line.key, { description: e.target.value })}
              placeholder="Descripción del ítem *"
              className={cn(inputCls, 'mb-2')}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-ink-tertiary">Cantidad</label>
                <input type="number" min="1"
                  value={line.qty}
                  onChange={e => updateLine(line.key, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={cn(inputCls, 'text-center')} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-tertiary">Costo unitario (S/)</label>
                <input type="number" min="0" step="0.01"
                  value={line.unitCost || ''}
                  onChange={e => updateLine(line.key, { unitCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={inputCls} />
              </div>
            </div>

            <p className="mt-2 text-right text-xs font-semibold text-ink-secondary">
              Subtotal: S/ {(line.qty * line.unitCost).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-ink-secondary">
            <span>Subtotal</span>
            <span>S/ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-ink-secondary">
            <span>IGV (18%)</span>
            <span>S/ {igv.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold text-ink-primary">
            <span>Total</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <Field label="Notas">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Condiciones de entrega, observaciones..." rows={3}
          className={cn(inputCls, 'h-auto resize-none py-3')} />
      </Field>

      {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      <button type="submit" disabled={!canSubmit}
        className={cn(
          'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
          'transition-colors hover:bg-volt-400 disabled:cursor-not-allowed disabled:opacity-40',
        )}>
        {loading ? 'Creando OC...' : 'Crear orden de compra'}
      </button>
    </form>
  )
}

/* ─── Page wrapper ───────────────────────────────────────────────────────── */
export default function NewPurchasePage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/purchases"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nueva orden de compra</h1>
      </header>
      <Suspense fallback={<div className="px-4 py-8 text-sm text-ink-tertiary">Cargando...</div>}>
        <NewPurchaseForm />
      </Suspense>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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
  'border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500',
)
