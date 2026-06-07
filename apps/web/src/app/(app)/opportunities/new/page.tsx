'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

type Sel = { id: string; name: string }

const STAGES = [
  { value: 'identified',  label: 'Identificado', desc: 'Hallazgo detectado' },
  { value: 'qualified',   label: 'Calificado',   desc: 'Cliente interesado' },
  { value: 'proposal',    label: 'Propuesta',    desc: 'En preparación'     },
  { value: 'negotiation', label: 'Negociación',  desc: 'Revisión contrato'  },
]

function NewOpportunityForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [customers,   setCustomers]   = useState<Sel[]>([])
  const [technicians, setTechnicians] = useState<Sel[]>([])

  const [title,          setTitle]          = useState(decodeURIComponent(searchParams.get('title') ?? ''))
  const [description,    setDescription]    = useState('')
  const [customerId,     setCustomerId]     = useState(searchParams.get('customerId') ?? '')
  const [stage,          setStage]          = useState('identified')
  const [probability,    setProbability]    = useState('50')
  const [estimatedValue, setEstimatedValue] = useState(searchParams.get('value') ?? '')
  const [expectedClose,  setExpectedClose]  = useState('')
  const [assignedTo,     setAssignedTo]     = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  const findingId = searchParams.get('findingId')

  useEffect(() => {
    const sb = createClient()
    sb.from('customers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data ?? []))
    sb.from('profiles').select('id, full_name').in('role', ['commercial', 'supervisor', 'tenant_admin']).order('full_name')
      .then(({ data }) => setTechnicians((data ?? []).map(p => ({ id: p.id, name: p.full_name ?? '' }))))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !customerId) return
    setLoading(true); setError('')

    const { error: err } = await createClient().from('opportunities').insert({
      title:           title.trim(),
      description:     description.trim() || null,
      customer_id:     customerId,
      finding_id:      findingId || null,
      stage,
      probability:     parseInt(probability) || 50,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      currency:        'PEN',
      expected_close:  expectedClose || null,
      assigned_to:     assignedTo || null,
    })

    if (err) { setError('No se pudo guardar la oportunidad.'); setLoading(false); return }
    router.push('/opportunities')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">
      <Field label="Título *">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className={inputCls}
          placeholder="Reemplazo banco de baterías..." />
      </Field>

      <Field label="Cliente *">
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className={selCls}>
          <option value="">Seleccionar cliente...</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Etapa">
        <div className="grid grid-cols-2 gap-2">
          {STAGES.map(s => (
            <button key={s.value} type="button" onClick={() => setStage(s.value)}
              className={cn('rounded-lg border py-2.5 text-left px-3 transition-colors',
                stage === s.value ? 'border-volt-500 bg-volt-500/10' : 'border-border bg-surface-2')}>
              <p className={cn('text-sm font-semibold', stage === s.value ? 'text-volt-400' : 'text-ink-secondary')}>{s.label}</p>
              <p className="text-xs text-ink-tertiary">{s.desc}</p>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor estimado (S/)">
          <input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)}
            placeholder="15000" min="0" step="100" className={inputCls} />
        </Field>
        <Field label="Probabilidad (%)">
          <input type="number" value={probability} onChange={e => setProbability(e.target.value)}
            min="0" max="100" className={inputCls} />
        </Field>
      </div>

      <Field label="Fecha de cierre estimada">
        <input type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)}
          min={new Date().toISOString().split('T')[0]} className={inputCls} />
      </Field>

      <Field label="Responsable comercial">
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={selCls}>
          <option value="">Sin asignar</option>
          {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>

      <Field label="Descripción / Notas">
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className={cn(inputCls, 'h-auto resize-none py-3')}
          placeholder="Contexto, necesidades específicas del cliente..." />
      </Field>

      {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      <button type="submit" disabled={loading || !title.trim() || !customerId}
        className={cn('h-touch w-full rounded-lg bg-volt-500 font-semibold text-ink-inverse',
          'transition-colors hover:bg-volt-400 disabled:opacity-40 disabled:cursor-not-allowed')}>
        {loading ? 'Guardando...' : 'Crear oportunidad'}
      </button>
    </form>
  )
}

export default function NewOpportunityPage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/opportunities" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nueva Oportunidad</h1>
      </header>
      <Suspense fallback={<div className="px-4 py-8 text-sm text-ink-tertiary">Cargando...</div>}>
        <NewOpportunityForm />
      </Suspense>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-ink-secondary">{label}</label>{children}</div>
}
const inputCls = cn('h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500')
const selCls   = cn(inputCls, 'cursor-pointer')
