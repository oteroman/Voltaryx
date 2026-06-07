'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'
import { Combobox } from '@/components/ui/combobox'

const ORDER_TYPES = [
  { value: 'preventive',   label: 'Preventivo'   },
  { value: 'corrective',   label: 'Correctivo'   },
  { value: 'emergency',    label: 'Emergencia'   },
  { value: 'installation', label: 'Instalación'  },
  { value: 'inspection',   label: 'Inspección'   },
]

const PRIORITIES = [
  { value: 'low',      label: 'Baja',    cls: 'border-border bg-surface-2 text-ink-secondary'         },
  { value: 'normal',   label: 'Normal',  cls: 'border-border bg-surface-2 text-ink-secondary'         },
  { value: 'high',     label: 'Alta',    cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400'    },
  { value: 'critical', label: 'Crítica', cls: 'border-critical/30 bg-critical/10 text-critical'       },
]

export default function NewOrderPage() {
  const router = useRouter()

  const [customerId,    setCustomerId]    = useState('')
  const [siteId,        setSiteId]        = useState('')
  const [assignedTo,    setAssignedTo]    = useState('')
  const [type,          setType]          = useState('preventive')
  const [priority,      setPriority]      = useState('normal')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [description,   setDescription]   = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const searchCustomers = useCallback(async (q: string) => {
    const { data } = await createClient().from('customers')
      .select('id, name, tax_id')
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .order('name').limit(10)
    return (data ?? []).map(c => ({ value: c.id, label: c.name, sublabel: c.tax_id ?? undefined }))
  }, [])

  const searchSites = useCallback(async (q: string) => {
    if (!customerId) return []
    const { data } = await createClient().from('sites')
      .select('id, name, address')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .order('name').limit(10)
    return (data ?? []).map(s => ({ value: s.id, label: s.name, sublabel: s.address ?? undefined }))
  }, [customerId])

  const searchTechs = useCallback(async (q: string) => {
    const { data } = await createClient().from('profiles')
      .select('id, full_name, role')
      .in('role', ['technician', 'supervisor'])
      .eq('is_active', true)
      .ilike('full_name', `%${q}%`)
      .order('full_name').limit(10)
    return (data ?? []).map(t => ({
      value: t.id,
      label: t.full_name ?? '',
      sublabel: t.role === 'supervisor' ? 'Supervisor' : 'Técnico',
    }))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !siteId || !scheduledDate) return
    setLoading(true); setError('')

    const { data, error: err } = await createClient()
      .from('work_orders')
      .insert({
        customer_id:    customerId,
        site_id:        siteId,
        assigned_to:    assignedTo || null,
        type,
        priority,
        status:         'scheduled',
        order_number:   '',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        description:    description.trim() || null,
      })
      .select('id')
      .single()

    if (err) { setError('No se pudo crear la orden. Intenta de nuevo.'); setLoading(false); return }
    router.push(`/orders/${data.id}`)
  }

  const canSubmit = customerId && siteId && scheduledDate && !loading

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/orders" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nueva Orden</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        {/* Tipo de orden */}
        <Field label="Tipo de servicio *">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ORDER_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn(
                  'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                  type === t.value
                    ? 'border-volt-500 bg-volt-500/10 text-volt-400'
                    : 'border-border bg-surface-2 text-ink-secondary hover:border-border',
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Prioridad */}
        <Field label="Prioridad *">
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map(p => (
              <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                className={cn(
                  'rounded-lg border py-2 text-xs font-medium transition-colors',
                  priority === p.value ? p.cls : 'border-border bg-surface-2 text-ink-secondary',
                )}>
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Cliente */}
        <Field label="Cliente *">
          <Combobox
            value={customerId}
            onChange={v => { setCustomerId(v); setSiteId('') }}
            onSearch={searchCustomers}
            placeholder="Buscar cliente por nombre o RUC..."
          />
        </Field>

        {/* Sede */}
        <Field label="Sede *">
          <Combobox
            value={siteId}
            onChange={setSiteId}
            onSearch={searchSites}
            placeholder={customerId ? 'Buscar sede...' : 'Primero selecciona un cliente'}
            disabled={!customerId}
          />
        </Field>

        {/* Técnico asignado */}
        <Field label="Técnico asignado">
          <Combobox
            value={assignedTo}
            onChange={setAssignedTo}
            onSearch={searchTechs}
            placeholder="Buscar técnico o supervisor (opcional)"
          />
        </Field>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha *">
            <input type="date" value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              required min={new Date().toISOString().split('T')[0]}
              className={inputCls} />
          </Field>
          <Field label="Hora">
            <input type="time" value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className={inputCls} />
          </Field>
        </div>

        {/* Descripción */}
        <Field label="Descripción / Motivo">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Detalla el motivo o alcance del servicio..."
            rows={3} className={cn(inputCls, 'h-auto resize-none py-3')} />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={!canSubmit}
          className={cn(
            'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:cursor-not-allowed disabled:opacity-40',
          )}>
          {loading ? 'Creando orden...' : 'Crear orden de trabajo'}
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
