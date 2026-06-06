'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Sel = { id: string; name: string }

const CONTRACT_TYPES = [
  { value: 'maintenance',  label: 'Mantenimiento',  desc: 'Revisiones periódicas'     },
  { value: 'monitoring',   label: 'Monitoreo',       desc: 'Supervisión continua'      },
  { value: 'project',      label: 'Proyecto',        desc: 'Alcance definido'          },
  { value: 'adhoc',        label: 'Ad-hoc',          desc: 'Servicio puntual'          },
]

const BILLING_CYCLES = [
  { value: 'monthly',  label: 'Mensual' },
  { value: 'quarterly',label: 'Trimestral' },
  { value: 'annual',   label: 'Anual' },
  { value: 'one_time', label: 'Pago único' },
]

const SLA_OPTIONS = [4, 8, 12, 24, 48]

export default function NewContractPage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Sel[]>([])
  const [users,     setUsers]     = useState<Sel[]>([])

  const [customerId,     setCustomerId]     = useState('')
  const [type,           setType]           = useState('maintenance')
  const [billingCycle,   setBillingCycle]   = useState('monthly')
  const [value,          setValue]          = useState('')
  const [startDate,      setStartDate]      = useState('')
  const [endDate,        setEndDate]        = useState('')
  const [slaResponse,    setSlaResponse]    = useState('8')
  const [slaResolution,  setSlaResolution]  = useState('48')
  const [visitsPerYear,  setVisitsPerYear]  = useState('')
  const [notes,          setNotes]          = useState('')
  const [assignedTo,     setAssignedTo]     = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.from('customers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data ?? []))
    sb.from('profiles').select('id, full_name').in('role', ['commercial','supervisor','tenant_admin']).order('full_name')
      .then(({ data }) => setUsers((data ?? []).map(p => ({ id: p.id, name: p.full_name }))))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !startDate || !endDate) return
    setLoading(true); setError('')

    const sb = createClient()
    const { error: err } = await sb.from('contracts').insert({
      contract_number:    '',          // trigger auto-generates CT-YYYYMM-NNNN
      customer_id:        customerId,
      type,
      status:             'draft',
      billing_cycle:      billingCycle,
      value:              value ? parseFloat(value) : null,
      currency:           'PEN',
      start_date:         startDate,
      end_date:           endDate,
      sla_response_hours:   slaResponse   ? parseInt(slaResponse)   : null,
      sla_resolution_hours: slaResolution ? parseInt(slaResolution) : null,
      visits_per_year:    visitsPerYear ? parseInt(visitsPerYear) : null,
      notes:              notes.trim() || null,
      account_manager_id: assignedTo || null,
    })

    if (err) { setError('No se pudo guardar el contrato. ' + err.message); setLoading(false); return }
    router.push('/contracts')
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/contracts" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nuevo Contrato</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-5">

        {/* Tipo de contrato */}
        <Field label="Tipo de servicio *">
          <div className="grid grid-cols-2 gap-2">
            {CONTRACT_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn('rounded-lg border py-2.5 text-left px-3 transition-colors',
                  type === t.value ? 'border-volt-500 bg-volt-500/10' : 'border-border bg-surface-2')}>
                <p className={cn('text-sm font-semibold', type === t.value ? 'text-volt-400' : 'text-ink-secondary')}>{t.label}</p>
                <p className="text-xs text-ink-tertiary">{t.desc}</p>
              </button>
            ))}
          </div>
        </Field>

        {/* Cliente */}
        <Field label="Cliente *">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className={selCls}>
            <option value="">Seleccionar cliente...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio *">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              required className={inputCls} />
          </Field>
          <Field label="Vencimiento *">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              required min={startDate} className={inputCls} />
          </Field>
        </div>

        {/* Facturación */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">Ciclo de facturación</label>
          <div className="grid grid-cols-2 gap-2">
            {BILLING_CYCLES.map(b => (
              <button key={b.value} type="button" onClick={() => setBillingCycle(b.value)}
                className={cn('rounded-lg border py-2 px-3 text-sm font-medium text-left transition-colors',
                  billingCycle === b.value ? 'border-volt-500 bg-volt-500/10 text-volt-400' : 'border-border bg-surface-2 text-ink-secondary')}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Valor */}
        <Field label="Valor de contrato (S/)">
          <input type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder="12000" min="0" step="100" className={inputCls} />
        </Field>

        {/* SLA */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-sm font-semibold text-ink-secondary">Niveles de servicio (SLA)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-tertiary">Tiempo respuesta</label>
              <select value={slaResponse} onChange={e => setSlaResponse(e.target.value)} className={selCls}>
                <option value="">Sin SLA</option>
                {SLA_OPTIONS.map(h => <option key={h} value={String(h)}>{h}h</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-tertiary">Tiempo resolución</label>
              <select value={slaResolution} onChange={e => setSlaResolution(e.target.value)} className={selCls}>
                <option value="">Sin SLA</option>
                {[24, 48, 72, 96, 168].map(h => <option key={h} value={String(h)}>{h}h</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Visitas/año */}
        <Field label="Visitas por año (preventivo)">
          <input type="number" value={visitsPerYear} onChange={e => setVisitsPerYear(e.target.value)}
            placeholder="4" min="1" max="52" className={inputCls} />
        </Field>

        {/* Responsable */}
        <Field label="Account manager">
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={selCls}>
            <option value="">Sin asignar</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>

        {/* Notas */}
        <Field label="Notas / alcance">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className={cn(inputCls, 'h-auto resize-none py-3')}
            placeholder="Alcance del servicio, exclusiones, condiciones especiales..." />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !customerId || !startDate || !endDate}
          className={cn('h-touch w-full rounded-lg bg-volt-500 font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 disabled:opacity-40 disabled:cursor-not-allowed')}>
          {loading ? 'Guardando...' : 'Crear contrato (borrador)'}
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
