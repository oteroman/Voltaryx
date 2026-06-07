import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  CalendarCheck2, AlertTriangle, Clock, CheckCircle2,
  Plus, ChevronRight, Calendar, ArrowRight,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function today() { return new Date().toISOString().split('T')[0]! }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]!
}
function monthsBetween(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth())
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface PMContract {
  id: string
  contract_number: string
  customer_name: string
  customer_id: string
  start_date: string
  end_date: string
  visits_per_year: number
  type: string
  value: number
  sla_response_hours: number | null
  // computed
  totalVisitsCommitted: number
  completedVisits: number
  remainingVisits: number
  lastPmDate: string | null
  nextSuggestedDate: string | null
  status: 'overdue' | 'upcoming' | 'on_track' | 'done'
  daysUntilNext: number | null
}

export default async function MaintenancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const todayStr = today()

  // Contratos activos con visits_per_year > 0
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`id, contract_number, type, status, start_date, end_date, visits_per_year, value, sla_response_hours,
      customers(id, name)`)
    .eq('status', 'active')
    .gt('visits_per_year', 0)
    .lte('start_date', todayStr)
    .gte('end_date', todayStr)
    .order('end_date')

  // Para cada contrato, contar OTs de tipo preventivo completadas en el período
  const contractIds = (contracts ?? []).map(c => c.id)
  const { data: pmOrders } = contractIds.length > 0 ? await supabase
    .from('work_orders')
    .select('id, contract_id, status, completed_at, scheduled_date')
    .in('contract_id', contractIds)
    .eq('type', 'preventive')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    : { data: [] }

  // También OTs preventivas programadas (no completadas aún)
  const { data: scheduledPMs } = contractIds.length > 0 ? await supabase
    .from('work_orders')
    .select('id, contract_id, status, scheduled_date')
    .in('contract_id', contractIds)
    .eq('type', 'preventive')
    .in('status', ['scheduled', 'in_transit', 'on_site', 'in_progress'])
    .gte('scheduled_date', todayStr)
    .order('scheduled_date')
    : { data: [] }

  // Construir métricas por contrato
  const pmData: PMContract[] = (contracts ?? []).map(c => {
    const cust = c.customers as unknown as { id: string; name: string } | null
    const startDate = c.start_date
    const endDate   = c.end_date

    // Visitas comprometidas en el período del contrato (proporcional al tiempo transcurrido)
    const totalMonths  = monthsBetween(startDate, endDate) || 12
    const elapsed      = monthsBetween(startDate, todayStr)
    const fraction     = Math.min(1, Math.max(0, elapsed / totalMonths))
    const totalCommitted = c.visits_per_year
    const expectedByNow  = Math.floor(totalCommitted * fraction)

    // Visitas completadas
    const completed = (pmOrders ?? [])
      .filter(o => o.contract_id === c.id)
    const completedCount = completed.length
    const lastPm = completed[0]?.completed_at?.split('T')[0] ?? null

    // Siguiente visita sugerida
    const monthsPerVisit = 12 / totalCommitted
    let nextSuggested: string | null = null
    if (lastPm) {
      const next = new Date(lastPm)
      next.setDate(next.getDate() + Math.floor(monthsPerVisit * 30))
      nextSuggested = next.toISOString().split('T')[0]!
    } else {
      nextSuggested = addDays(startDate, 30)
    }

    const daysUntilNext = nextSuggested
      ? Math.round((new Date(nextSuggested).getTime() - new Date(todayStr).getTime()) / 86400000)
      : null

    const remaining = Math.max(0, totalCommitted - completedCount)

    let pmStatus: PMContract['status'] = 'on_track'
    if (remaining === 0) pmStatus = 'done'
    else if (completedCount < expectedByNow - 1) pmStatus = 'overdue'
    else if (daysUntilNext !== null && daysUntilNext <= 30) pmStatus = 'upcoming'
    else pmStatus = 'on_track'

    return {
      id: c.id,
      contract_number: c.contract_number,
      customer_name: cust?.name ?? '—',
      customer_id: cust?.id ?? '',
      start_date: startDate,
      end_date: endDate,
      visits_per_year: c.visits_per_year,
      type: c.type,
      value: c.value ?? 0,
      sla_response_hours: c.sla_response_hours,
      totalVisitsCommitted: totalCommitted,
      completedVisits: completedCount,
      remainingVisits: remaining,
      lastPmDate: lastPm,
      nextSuggestedDate: nextSuggested,
      status: pmStatus,
      daysUntilNext,
    }
  })

  const overdue  = pmData.filter(c => c.status === 'overdue')
  const upcoming = pmData.filter(c => c.status === 'upcoming')
  const onTrack  = pmData.filter(c => c.status === 'on_track')
  const done     = pmData.filter(c => c.status === 'done')

  const totalRemaining = pmData.reduce((s, c) => s + c.remainingVisits, 0)
  const totalCompleted = pmData.reduce((s, c) => s + c.completedVisits, 0)
  const totalCommitted = pmData.reduce((s, c) => s + c.totalVisitsCommitted, 0)
  const completionRate = totalCommitted > 0 ? Math.round((totalCompleted / totalCommitted) * 100) : 0

  const nextScheduled = (scheduledPMs ?? [])[0]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Mantenimiento Preventivo</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{pmData.length} contratos activos con PM</p>
          </div>
          <Link href="/orders/new?type=preventive"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
            <Plus size={16} strokeWidth={2.5} />PM
          </Link>
        </div>

        {/* KPIs */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className={cn('text-lg font-bold', overdue.length > 0 ? 'text-critical' : 'text-ink-tertiary')}>
              {overdue.length}
            </p>
            <p className="text-xs text-ink-tertiary leading-tight">Atrasados</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className="text-lg font-bold text-amber-400">{upcoming.length}</p>
            <p className="text-xs text-ink-tertiary leading-tight">Próximos</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className="text-lg font-bold text-ink-primary">{totalRemaining}</p>
            <p className="text-xs text-ink-tertiary leading-tight">Pendientes</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className={cn('text-lg font-bold', completionRate >= 80 ? 'text-success' : completionRate >= 60 ? 'text-amber-400' : 'text-critical')}>
              {completionRate}%
            </p>
            <p className="text-xs text-ink-tertiary leading-tight">Cumplimiento</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Atrasados — crítico */}
        {overdue.length > 0 && (
          <section className="rounded-xl border border-critical/30 bg-critical/5 p-3">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-critical" />
              <h2 className="text-sm font-bold text-critical">Contratos atrasados en PM · {overdue.length}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {overdue.map(c => <PMCard key={c.id} contract={c} />)}
            </div>
          </section>
        )}

        {/* Próximos 30 días */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">
              Próximos 30 días · {upcoming.length}
            </h2>
            <div className="flex flex-col gap-2">
              {upcoming.map(c => <PMCard key={c.id} contract={c} />)}
            </div>
          </section>
        )}

        {/* En tiempo */}
        {onTrack.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Al día · {onTrack.length}
            </h2>
            <div className="flex flex-col gap-2">
              {onTrack.map(c => <PMCard key={c.id} contract={c} />)}
            </div>
          </section>
        )}

        {/* Completados año */}
        {done.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Completados este período · {done.length}
            </h2>
            <div className="flex flex-col gap-2 opacity-60">
              {done.map(c => <PMCard key={c.id} contract={c} />)}
            </div>
          </section>
        )}

        {pmData.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <CalendarCheck2 size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin contratos con PM activos</p>
              <p className="mt-1 text-sm text-ink-tertiary">Los contratos con visitas/año aparecerán aquí</p>
            </div>
            <Link href="/contracts"
              className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
              Ver contratos
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function PMCard({ contract: c }: { contract: PMContract }) {
  const pct = c.totalVisitsCommitted > 0
    ? Math.round((c.completedVisits / c.totalVisitsCommitted) * 100)
    : 0

  const statusColor = {
    overdue:  'border-critical/30 bg-critical/5',
    upcoming: 'border-amber-500/30 bg-amber-500/5',
    on_track: 'border-border-subtle bg-surface-1',
    done:     'border-border-subtle bg-surface-1',
  }[c.status]

  const pillColor = {
    overdue:  'bg-critical/20 text-critical',
    upcoming: 'bg-amber-500/20 text-amber-400',
    on_track: 'bg-success/20 text-success',
    done:     'bg-surface-3 text-ink-tertiary',
  }[c.status]

  const pillLabel = {
    overdue:  'Atrasado',
    upcoming: c.daysUntilNext !== null ? `En ${c.daysUntilNext}d` : 'Próximo',
    on_track: 'Al día',
    done:     'Completo',
  }[c.status]

  return (
    <div className={cn('rounded-xl border p-4', statusColor)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-primary truncate">{c.customer_name}</p>
          <p className="font-mono text-xs text-ink-tertiary">{c.contract_number} · {c.type}</p>
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', pillColor)}>
          {pillLabel}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-ink-secondary">
            {c.completedVisits} de {c.totalVisitsCommitted} visitas realizadas
          </span>
          <span className={cn('font-bold', pct >= 100 ? 'text-success' : pct >= 60 ? 'text-amber-400' : 'text-critical')}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-3">
          <div
            className={cn('h-1.5 rounded-full transition-all',
              pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-amber-400' : 'bg-critical')}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Detalle fechas */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-ink-tertiary">Último PM</p>
          <p className="font-medium text-ink-secondary">{fmtDate(c.lastPmDate)}</p>
        </div>
        <div>
          <p className="text-ink-tertiary">Próximo sugerido</p>
          <p className={cn('font-medium',
            c.status === 'overdue' ? 'text-critical' :
            c.status === 'upcoming' ? 'text-amber-400' : 'text-ink-secondary')}>
            {fmtDate(c.nextSuggestedDate)}
          </p>
        </div>
      </div>

      {/* Acciones */}
      {c.remainingVisits > 0 && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/orders/new?type=preventive&contractId=${c.id}&customerId=${c.customer_id}&customerLabel=${encodeURIComponent(c.customer_name)}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-volt-500/10 py-2 text-xs font-semibold text-volt-400 hover:bg-volt-500/20 transition-colors">
            <Plus size={13} />Programar PM
          </Link>
          <Link
            href={`/contracts/${c.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-tertiary hover:border-border-subtle hover:bg-surface-2 transition-colors">
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
