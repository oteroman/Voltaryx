'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Sel = { id: string; name: string }

const STATUSES = [
  { value: 'operational', label: 'Operativo'  },
  { value: 'degraded',    label: 'Degradado'  },
  { value: 'critical',    label: 'Crítico'    },
]

export default function NewAssetPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [customers,   setCustomers]   = useState<Sel[]>([])
  const [sites,       setSites]       = useState<Sel[]>([])
  const [assetTypes,  setAssetTypes]  = useState<Sel[]>([])

  const [customerId,   setCustomerId]   = useState(searchParams.get('customerId') ?? '')
  const [siteId,       setSiteId]       = useState(searchParams.get('siteId') ?? '')
  const [assetTypeId,  setAssetTypeId]  = useState('')
  const [name,         setName]         = useState('')
  const [brand,        setBrand]        = useState('')
  const [model,        setModel]        = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [capacityKva,  setCapacityKva]  = useState('')
  const [status,       setStatus]       = useState('operational')
  const [installDate,  setInstallDate]  = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.from('customers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data ?? []))
    sb.from('asset_types').select('id, name').order('name')
      .then(({ data }) => setAssetTypes(data ?? []))
  }, [])

  useEffect(() => {
    setSiteId('')
    if (!customerId) { setSites([]); return }
    createClient().from('sites').select('id, name').eq('customer_id', customerId).eq('is_active', true).order('name')
      .then(({ data }) => setSites(data ?? []))
  }, [customerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!siteId || !name.trim()) return
    setLoading(true)
    setError('')

    const sb = createClient()
    const { data, error: err } = await sb.from('assets').insert({
      site_id:           siteId,
      asset_type_id:     assetTypeId || null,
      name:              name.trim(),
      brand:             brand.trim() || null,
      model:             model.trim() || null,
      serial_number:     serialNumber.trim() || null,
      capacity_kva:      capacityKva ? parseFloat(capacityKva) : null,
      status,
      installation_date: installDate || null,
    }).select('id').single()

    if (err) {
      setError('No se pudo crear el activo. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/assets/${data.id}`)
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/assets" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nuevo Activo</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        <Field label="Cliente *">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className={selCls}>
            <option value="">Seleccionar cliente...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Sede *">
          <select value={siteId} onChange={e => setSiteId(e.target.value)} required
            disabled={!customerId} className={cn(selCls, !customerId && 'opacity-50')}>
            <option value="">{customerId ? 'Seleccionar sede...' : 'Primero elige un cliente'}</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="Tipo de equipo">
          <select value={assetTypeId} onChange={e => setAssetTypeId(e.target.value)} className={selCls}>
            <option value="">Sin clasificar</option>
            {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        <Field label="Nombre del equipo *">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="UPS Sala Servidores, Estabilizador Principal..." required className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca">
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
              placeholder="APC, Eaton..." className={inputCls} />
          </Field>
          <Field label="Modelo">
            <input type="text" value={model} onChange={e => setModel(e.target.value)}
              placeholder="Smart-UPS 3000" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Serie">
            <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
              placeholder="SN-XXXXXXX" className={inputCls} />
          </Field>
          <Field label="Capacidad (kVA)">
            <input type="number" value={capacityKva} onChange={e => setCapacityKva(e.target.value)}
              placeholder="10" min="0" step="0.5" className={inputCls} />
          </Field>
        </div>

        <Field label="Estado inicial">
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={cn(
                  'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                  status === s.value
                    ? s.value === 'critical' ? 'border-critical/50 bg-critical/10 text-critical'
                      : s.value === 'degraded' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-volt-500 bg-volt-500/10 text-volt-400'
                    : 'border-border bg-surface-2 text-ink-secondary',
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Fecha de instalación">
          <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} className={inputCls} />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !siteId || !name.trim()}
          className={cn(
            'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:cursor-not-allowed disabled:opacity-40',
          )}>
          {loading ? 'Guardando...' : 'Crear activo'}
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
  'border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500',
)
const selCls = cn(inputCls, 'cursor-pointer')
