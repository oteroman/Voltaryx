'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Package, Wrench, Repeat, HardHat, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'
import { Combobox } from '@/components/ui/combobox'

type Product = { id: string; description: string; brand: string | null; model: string | null; category: string; power_kva: number | null; final_price: number | null; rental_price_monthly: number | null; is_rentable: boolean }

type LineType = 'product' | 'service' | 'rental' | 'installation'

interface LineItem {
  id: string
  type: LineType
  description: string
  product_id: string
  inventory_item_id: string
  quantity: number
  unit_price: number
  discount_pct: number
  is_rental: boolean
  rental_months: number
}

const LINE_TYPES: { value: LineType; label: string; icon: React.ElementType; hint: string }[] = [
  { value: 'product',      label: 'Venta equipo',   icon: Package,  hint: 'UPS, bancos baterías, módulos, ATS...' },
  { value: 'service',      label: 'Servicio técnico',icon: Wrench,   hint: 'Mantenimiento, reparación, diagnóstico...' },
  { value: 'rental',       label: 'Alquiler',        icon: Repeat,   hint: 'Equipo en renta mensual' },
  { value: 'installation', label: 'Instalación',     icon: HardHat,  hint: 'Instalación, puesta en marcha, traslado...' },
]

const TYPE_SERVICES: Record<string, string[]> = {
  service: [
    'Mantenimiento preventivo UPS',
    'Mantenimiento correctivo UPS',
    'Mantenimiento banco de baterías',
    'Diagnóstico y evaluación técnica',
    'Recarga de baterías',
    'Actualización de firmware UPS',
    'Calibración de medidores',
    'Inspección eléctrica preventiva',
  ],
  installation: [
    'Instalación de UPS',
    'Instalación de banco de baterías',
    'Puesta en marcha de equipo',
    'Traslado e instalación en nuevo sitio',
    'Cableado y conexiones eléctricas',
    'Configuración de sistema de monitoreo',
  ],
}

function newLine(type: LineType = 'product'): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    description: '',
    product_id: '',
    inventory_item_id: '',
    quantity: 1,
    unit_price: 0,
    discount_pct: 0,
    is_rental: type === 'rental',
    rental_months: type === 'rental' ? 1 : 0,
  }
}

function lineSubtotal(l: LineItem) {
  const base = l.is_rental
    ? l.unit_price * l.rental_months * l.quantity
    : l.unit_price * l.quantity
  return base * (1 - l.discount_pct / 100)
}

const IGV = 0.18

function NewQuoteForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [products,   setProducts]   = useState<Product[]>([])

  const [customerId, setCustomerId] = useState(params.get('customerId') ?? '')
  const [assignedTo, setAssignedTo] = useState('')
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [notes,      setNotes]      = useState('')
  const [terms,      setTerms]      = useState('Precios en soles (PEN). IGV incluido. Validez según fecha indicada.')
  const [lines,      setLines]      = useState<LineItem[]>([newLine('product')])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('products')
      .select('id, description, brand, model, category, power_kva, final_price, rental_price_monthly, is_rentable')
      .eq('is_active', true).order('category').order('description')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  const searchCustomers = useCallback(async (q: string) => {
    const { data } = await createClient().from('customers')
      .select('id, name, tax_id').eq('is_active', true)
      .ilike('name', `%${q}%`).order('name').limit(10)
    return (data ?? []).map(c => ({ value: c.id, label: c.name, sublabel: c.tax_id ?? undefined }))
  }, [])

  const searchProfiles = useCallback(async (q: string) => {
    const { data } = await createClient().from('profiles')
      .select('id, full_name, role')
      .ilike('full_name', `%${q}%`).order('full_name').limit(10)
    return (data ?? []).map(p => ({ value: p.id, label: p.full_name ?? p.id.slice(0, 8), sublabel: p.role ?? undefined }))
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<LineItem>) => {
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines(ls => ls.filter(l => l.id !== id))
  }, [])

  const addLine = useCallback((type: LineType) => {
    setLines(ls => [...ls, newLine(type)])
    setShowTypeMenu(null)
  }, [])

  const subtotal = lines.reduce((s, l) => s + lineSubtotal(l), 0)
  const igv      = subtotal * IGV
  const total    = subtotal + igv

  const handleProductSelect = (lineId: string, productId: string) => {
    const p = products.find(x => x.id === productId)
    if (!p) return
    const line = lines.find(l => l.id === lineId)
    const isRental = line?.type === 'rental'
    updateLine(lineId, {
      product_id: productId,
      description: p.description + (p.power_kva ? ` ${p.power_kva} kVA` : ''),
      unit_price: isRental ? (p.rental_price_monthly ?? p.final_price ?? 0) : (p.final_price ?? 0),
      is_rental: isRental,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || lines.length === 0) return
    setLoading(true); setError('')

    const sb = createClient()
    const { data: quote, error: qErr } = await sb.from('quotes').insert({
      customer_id:  customerId,
      assigned_to:  assignedTo || null,
      quote_number: '',
      status:       'draft',
      valid_until:  validUntil || null,
      subtotal,
      igv_pct:      18,
      igv,
      total,
      notes:        notes.trim() || null,
      terms:        terms.trim() || null,
    }).select('id').single()

    if (qErr || !quote) { setError('Error al crear cotización: ' + (qErr?.message ?? '')); setLoading(false); return }

    const items = lines.map((l, i) => ({
      quote_id:          quote.id,
      product_id:        l.product_id || null,
      inventory_item_id: l.inventory_item_id || null,
      description:       l.description.trim(),
      quantity:          l.quantity,
      unit_price:        l.unit_price,
      discount_pct:      l.discount_pct,
      subtotal:          lineSubtotal(l),
      is_rental:         l.is_rental,
      rental_months:     l.is_rental ? l.rental_months : null,
      sort_order:        i,
    }))

    const { error: iErr } = await sb.from('quote_items').insert(items)
    if (iErr) { setError('Error en ítems: ' + iErr.message); setLoading(false); return }

    router.push(`/quotes/${quote.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        {/* Cliente */}
        <Field label="Cliente *">
          <Combobox
            value={customerId}
            onChange={setCustomerId}
            onSearch={searchCustomers}
            placeholder="Buscar cliente por nombre o RUC..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Válida hasta">
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Responsable">
            <Combobox
              value={assignedTo}
              onChange={setAssignedTo}
              onSearch={searchProfiles}
              placeholder="Sin asignar (opcional)"
            />
          </Field>
        </div>

        {/* Líneas */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink-secondary">Ítems cotizados</p>

          {lines.map((line, idx) => (
            <LineCard
              key={line.id}
              line={line}
              idx={idx}
              products={products}
              onUpdate={patch => updateLine(line.id, patch)}
              onRemove={() => removeLine(line.id)}
              onProductSelect={pid => handleProductSelect(line.id, pid)}
              canRemove={lines.length > 1}
            />
          ))}

          {/* Botón agregar ítem con type selector */}
          <div className="relative">
            <button type="button"
              onClick={() => setShowTypeMenu(showTypeMenu ? null : 'main')}
              className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-1 text-sm font-medium text-ink-secondary hover:border-volt-500 hover:text-volt-400 transition-colors">
              <Plus size={16} />Agregar ítem
              {showTypeMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTypeMenu && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface-2 p-2 shadow-xl">
                {LINE_TYPES.map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.value} type="button" onClick={() => addLine(t.value)}
                      className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface-1 px-3 py-2 text-left hover:border-volt-500 hover:bg-volt-500/5 transition-colors">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
                        <Icon size={14} className="text-volt-400" />{t.label}
                      </span>
                      <span className="text-xs text-ink-tertiary leading-tight">{t.hint}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Totales */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-ink-secondary">
              <span>Subtotal (sin IGV)</span>
              <span className="font-medium">{fmtCur(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>IGV (18%)</span>
              <span className="font-medium">{fmtCur(igv)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border-subtle pt-2 text-base font-bold text-ink-primary">
              <span>Total</span>
              <span className="text-volt-500">{fmtCur(total)}</span>
            </div>
          </div>
        </div>

        <Field label="Notas para el cliente">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className={cn(inputCls, 'h-auto resize-none py-3')}
            placeholder="Condiciones especiales, tiempo de entrega, garantía..." />
        </Field>

        <Field label="Términos y condiciones">
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2}
            className={cn(inputCls, 'h-auto resize-none py-3')} />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !customerId || lines.length === 0}
          className={cn('h-touch w-full rounded-lg bg-volt-500 font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 disabled:opacity-40 disabled:cursor-not-allowed')}>
          {loading ? 'Creando...' : 'Crear cotización'}
        </button>
    </form>
  )
}

export default function NewQuotePage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/quotes"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nueva cotización</h1>
      </header>
      <Suspense fallback={<div className="px-4 py-8 text-sm text-ink-tertiary">Cargando...</div>}>
        <NewQuoteForm />
      </Suspense>
    </div>
  )
}

function LineCard({ line, idx, products, onUpdate, onRemove, onProductSelect, canRemove }: {
  line: LineItem
  idx: number
  products: Product[]
  onUpdate: (p: Partial<LineItem>) => void
  onRemove: () => void
  onProductSelect: (id: string) => void
  canRemove: boolean
}) {
  const typeCfg = LINE_TYPES.find(t => t.value === line.type) ?? LINE_TYPES[0]
  const Icon = typeCfg.icon
  const subtotal = lineSubtotal(line)
  const suggestions = TYPE_SERVICES[line.type] ?? []

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-volt-500/10 text-xs font-bold text-volt-400">{idx + 1}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
            <Icon size={13} className="text-volt-400" />{typeCfg.label}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary hover:bg-critical/10 hover:text-critical transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Selector de producto si es venta o alquiler */}
      {(line.type === 'product' || line.type === 'rental') && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Producto del catálogo</label>
          <select value={line.product_id} onChange={e => onProductSelect(e.target.value)} className={selCls}>
            <option value="">Seleccionar o escribir descripción manual...</option>
            {products
              .filter(p => line.type === 'rental' ? p.is_rentable : true)
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.brand ? p.brand + ' ' : ''}{p.description}{p.power_kva ? ` · ${p.power_kva} kVA` : ''}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Descripción */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-ink-secondary">Descripción *</label>
        {suggestions.length > 0 && !line.description ? (
          <select value="" onChange={e => e.target.value && onUpdate({ description: e.target.value })} className={cn(selCls, 'mb-1.5')}>
            <option value="">Seleccionar servicio común...</option>
            {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : null}
        <input type="text" value={line.description} onChange={e => onUpdate({ description: e.target.value })}
          required placeholder={typeCfg.hint} className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">
            {line.type === 'rental' ? 'Tarifa/mes (S/)' : 'Precio unit. (S/)'}
          </label>
          <input type="number" value={line.unit_price || ''} onChange={e => onUpdate({ unit_price: parseFloat(e.target.value) || 0 })}
            min="0" step="100" placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">
            {line.type === 'rental' ? 'Meses' : 'Cantidad'}
          </label>
          {line.type === 'rental' ? (
            <input type="number" value={line.rental_months || ''} onChange={e => onUpdate({ rental_months: parseInt(e.target.value) || 1 })}
              min="1" placeholder="1" className={inputCls} />
          ) : (
            <input type="number" value={line.quantity || ''} onChange={e => onUpdate({ quantity: parseFloat(e.target.value) || 1 })}
              min="0.01" step="0.01" placeholder="1" className={inputCls} />
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Dscto %</label>
          <input type="number" value={line.discount_pct || ''} onChange={e => onUpdate({ discount_pct: parseFloat(e.target.value) || 0 })}
            min="0" max="100" placeholder="0" className={inputCls} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2">
        <span className="text-xs text-ink-tertiary">
          {line.type === 'rental'
            ? `${fmtCur(line.unit_price)}/mes × ${line.rental_months} mes${line.rental_months !== 1 ? 'es' : ''}`
            : `${fmtCur(line.unit_price)} × ${line.quantity}`}
          {line.discount_pct > 0 ? ` − ${line.discount_pct}%` : ''}
        </span>
        <span className="text-sm font-bold text-volt-500">{fmtCur(subtotal)}</span>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-ink-secondary">{label}</label>{children}</div>
}

function fmtCur(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

const inputCls = cn('h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500')
const selCls   = cn(inputCls, 'cursor-pointer')
