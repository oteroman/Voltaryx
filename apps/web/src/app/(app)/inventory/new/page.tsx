'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Prod = { id: string; description: string; brand: string | null; model: string | null; category: string; power_kva: number | null }

const INITIAL_STATUSES = [
  { value: 'stock',   label: 'En stock (almacén)' },
  { value: 'transit', label: 'En tránsito'         },
]

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [products,  setProducts]  = useState<Prod[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [sites,     setSites]     = useState<{ id: string; name: string }[]>([])

  const [productId,    setProductId]    = useState('')
  const [serial,       setSerial]       = useState('')
  const [itemCode,     setItemCode]     = useState('')
  const [status,       setStatus]       = useState('stock')
  const [location,     setLocation]     = useState('')
  const [customerId,   setCustomerId]   = useState('')
  const [siteId,       setSiteId]       = useState('')
  const [rentalRate,   setRentalRate]   = useState('')
  const [deployedAt,   setDeployedAt]   = useState('')
  const [supplier,     setSupplier]     = useState('')
  const [purchaseOrder,setPurchaseOrder]= useState('')
  const [invoice,      setInvoice]      = useState('')
  const [entryDate,    setEntryDate]    = useState('')
  const [purchasePrice,setPurchasePrice]= useState('')
  const [notes,        setNotes]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.from('products').select('id, description, brand, model, category, power_kva')
      .eq('is_active', true).order('category').order('description')
      .then(({ data }) => setProducts(data ?? []))
    sb.from('customers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data ?? []))
  }, [])

  useEffect(() => {
    if (!customerId) { setSites([]); return }
    const sb = createClient()
    sb.from('sites').select('id, name').eq('customer_id', customerId).order('name')
      .then(({ data }) => setSites(data ?? []))
  }, [customerId])

  const selectedProd = products.find(p => p.id === productId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !serial) return
    setLoading(true); setError('')

    const sb = createClient()
    const { error: err } = await sb.from('inventory_items').insert({
      product_id:    productId,
      serial_number: serial.trim() || null,
      item_code:     itemCode.trim() || null,
      status,
      location:      location.trim() || null,
      customer_id:   customerId || null,
      site_id:       siteId || null,
      deployed_at:   status === 'deployed' ? (deployedAt || new Date().toISOString()) : null,
      rental_monthly_rate: rentalRate ? parseFloat(rentalRate) : null,
      supplier:      supplier.trim() || null,
      purchase_order: purchaseOrder.trim() || null,
      invoice_number: invoice.trim() || null,
      entry_date:    entryDate || null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      notes:         notes.trim() || null,
    })

    if (err) { setError('No se pudo guardar: ' + err.message); setLoading(false); return }
    router.push('/inventory')
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/inventory"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Agregar unidad</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        <Field label="Producto / Modelo *">
          <select value={productId} onChange={e => setProductId(e.target.value)} required className={selCls}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.brand ? `${p.brand} ` : ''}{p.description}{p.power_kva ? ` · ${p.power_kva} kVA` : ''}
              </option>
            ))}
          </select>
          {selectedProd && (
            <p className="mt-1 text-xs text-ink-tertiary">
              {selectedProd.model ?? '—'} · {selectedProd.category}
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="N° de serie *">
            <input type="text" value={serial} onChange={e => setSerial(e.target.value)}
              required placeholder="2601300016BWK9H" className={inputCls} />
          </Field>
          <Field label="Código interno">
            <input type="text" value={itemCode} onChange={e => setItemCode(e.target.value)}
              placeholder="BWK9H" className={inputCls} />
          </Field>
        </div>

        <Field label="Estado inicial">
          <div className="grid grid-cols-2 gap-2">
            {INITIAL_STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={cn('rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors',
                  status === s.value ? 'border-volt-500 bg-volt-500/10 text-volt-400' : 'border-border bg-surface-2 text-ink-secondary')}>
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ubicación física">
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Almacén principal, 4to Piso, Showroom..." className={inputCls} />
        </Field>

        {/* Separador */}
        <div className="border-t border-border-subtle" />
        <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary -mb-2">Compra / Ingreso</p>

        <Field label="Proveedor">
          <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
            placeholder="VERTIV, Nexus, etc." className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Orden de compra">
            <input type="text" value={purchaseOrder} onChange={e => setPurchaseOrder(e.target.value)}
              placeholder="OC-367-25" className={inputCls} />
          </Field>
          <Field label="Factura">
            <input type="text" value={invoice} onChange={e => setInvoice(e.target.value)}
              placeholder="F001-0058531" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha ingreso">
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Precio compra (S/)">
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
              placeholder="0" min="0" step="100" className={inputCls} />
          </Field>
        </div>

        <Field label="Notas">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className={cn(inputCls, 'h-auto resize-none py-3')}
            placeholder="Observaciones, condición del equipo, etc." />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !productId || !serial}
          className={cn('h-touch w-full rounded-lg bg-volt-500 font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 disabled:opacity-40 disabled:cursor-not-allowed')}>
          {loading ? 'Guardando...' : 'Registrar unidad'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-ink-secondary">{label}</label>{children}</div>
}
const inputCls = cn('h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500')
const selCls   = cn(inputCls, 'cursor-pointer')
