'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

const CATEGORIES = [
  { value: 'ups',          label: 'UPS'            },
  { value: 'battery_bank', label: 'Banco Baterías' },
  { value: 'module',       label: 'Módulo Potencia'},
  { value: 'cooling',      label: 'Enfriamiento'   },
  { value: 'ats',          label: 'ATS'            },
  { value: 'software',     label: 'Software'       },
  { value: 'accessory',    label: 'Accesorio'      },
  { value: 'other',        label: 'Otro'           },
]

export default function NewProductPage() {
  const router = useRouter()

  const [category,            setCategory]            = useState('ups')
  const [description,         setDescription]         = useState('')
  const [brand,               setBrand]               = useState('')
  const [model,               setModel]               = useState('')
  const [code,                setCode]                = useState('')
  const [powerKva,            setPowerKva]            = useState('')
  const [phase,               setPhase]               = useState('monofasico')
  const [costPrice,           setCostPrice]           = useState('')
  const [distributorMarginPct,setDistributorMarginPct]= useState('20')
  const [finalMarginPct,      setFinalMarginPct]      = useState('25')
  const [isRentable,          setIsRentable]          = useState(false)
  const [rentalPrice,         setRentalPrice]         = useState('')
  const [stockAccount,        setStockAccount]        = useState('')
  const [loading,             setLoading]             = useState(false)
  const [error,               setError]               = useState('')

  // Cálculo de precios
  const cost = parseFloat(costPrice) || 0
  const distMargin = parseFloat(distributorMarginPct) || 0
  const finalMargin = parseFloat(finalMarginPct) || 0
  const distPrice = cost > 0 ? cost / (1 - distMargin / 100) : 0
  const finalPrice = cost > 0 ? cost / (1 - finalMargin / 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description) return
    setLoading(true); setError('')

    const sb = createClient()
    const { error: err } = await sb.from('products').insert({
      category,
      description: description.trim(),
      brand:       brand.trim() || null,
      model:       model.trim() || null,
      code:        code.trim() || null,
      power_kva:   powerKva ? parseFloat(powerKva) : null,
      phase:       ['ups','module'].includes(category) ? phase : null,
      cost_price:  cost || null,
      distributor_margin_pct: distMargin || null,
      distributor_price:      distPrice || null,
      final_margin_pct:       finalMargin || null,
      final_price:            finalPrice || null,
      is_rentable:            isRentable,
      rental_price_monthly:   isRentable && rentalPrice ? parseFloat(rentalPrice) : null,
      stock_account:          stockAccount.trim() || null,
    })

    if (err) { setError('No se pudo guardar: ' + err.message); setLoading(false); return }
    router.push('/products')
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/products"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nuevo producto</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        <Field label="Categoría">
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                className={cn('rounded-lg border py-2 px-3 text-sm font-medium text-left transition-colors',
                  category === c.value ? 'border-volt-500 bg-volt-500/10 text-volt-400' : 'border-border bg-surface-2 text-ink-secondary')}>
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Descripción *">
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            required placeholder="UPS Modular Liebert APM 120 kVA" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca">
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
              placeholder="VERTIV, Nexus..." className={inputCls} />
          </Field>
          <Field label="Modelo">
            <input type="text" value={model} onChange={e => setModel(e.target.value)}
              placeholder="APM 0120K" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Código / SKU">
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="BCO-BAT-72V" className={inputCls} />
          </Field>
          <Field label="Potencia (kVA)">
            <input type="number" value={powerKva} onChange={e => setPowerKva(e.target.value)}
              placeholder="30" min="0" step="0.01" className={inputCls} />
          </Field>
        </div>

        {['ups', 'module'].includes(category) && (
          <Field label="Fase">
            <div className="grid grid-cols-2 gap-2">
              {['monofasico', 'trifasico'].map(f => (
                <button key={f} type="button" onClick={() => setPhase(f)}
                  className={cn('rounded-lg border py-2 px-3 text-sm font-medium capitalize transition-colors',
                    phase === f ? 'border-volt-500 bg-volt-500/10 text-volt-400' : 'border-border bg-surface-2 text-ink-secondary')}>
                  {f === 'monofasico' ? 'Monofásico' : 'Trifásico'}
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* Precios */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-sm font-semibold text-ink-secondary">Precios</p>
          <div className="flex flex-col gap-3">
            <Field label="Costo de venta (S/)">
              <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                placeholder="0" min="0" step="100" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Margen distribuidor %">
                <input type="number" value={distributorMarginPct} onChange={e => setDistributorMarginPct(e.target.value)}
                  placeholder="20" min="0" max="100" className={inputCls} />
              </Field>
              <Field label="Margen final %">
                <input type="number" value={finalMarginPct} onChange={e => setFinalMarginPct(e.target.value)}
                  placeholder="25" min="0" max="100" className={inputCls} />
              </Field>
            </div>
            {cost > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3">
                <div className="text-center">
                  <p className="text-xs text-ink-tertiary">Precio distribuidor</p>
                  <p className="text-sm font-bold text-ink-secondary">
                    {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(distPrice)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink-tertiary">Precio final</p>
                  <p className="text-sm font-bold text-volt-500">
                    {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(finalPrice)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alquiler */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-secondary">Disponible para alquiler</p>
            <button type="button" onClick={() => setIsRentable(!isRentable)}
              className={cn('relative h-6 w-10 rounded-full transition-colors',
                isRentable ? 'bg-volt-500' : 'bg-surface-3')}>
              <div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
                isRentable ? 'translate-x-5' : 'translate-x-1')} />
            </button>
          </div>
          {isRentable && (
            <div className="mt-3">
              <Field label="Tarifa mensual alquiler (S/)">
                <input type="number" value={rentalPrice} onChange={e => setRentalPrice(e.target.value)}
                  placeholder="0" min="0" step="100" className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        <Field label="Cuenta almacén">
          <input type="text" value={stockAccount} onChange={e => setStockAccount(e.target.value)}
            placeholder="CUENTA DE ALMACEN" className={inputCls} />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !description}
          className={cn('h-touch w-full rounded-lg bg-volt-500 font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 disabled:opacity-40 disabled:cursor-not-allowed')}>
          {loading ? 'Guardando...' : 'Crear producto'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-ink-secondary">{label}</label>{children}</div>
}
const inputCls = cn('h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500')
