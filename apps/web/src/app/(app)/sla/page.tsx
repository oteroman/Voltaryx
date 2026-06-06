import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  AlertTriangle, Clock, CheckCircle2, ChevronRight,
  Zap, Wrench, AlertCircle, User2, Shield,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

/* ── SLA thresholds (horas) por prioridad ─────────────────────────────────
   Industria: response = primera atención, resolution = cierre total
   ────────────────────────────────────────────────────────────────────── */
const SLA: Record<string, { response: number; resolution: number; label: string }> = {
  critical: { response: 2,  resolution: 8,   label: 'Crítico'  },
  high:     { response: 4,  resolution: 24,  label: 'Alto'     },
  medium:   { response: 24, resolution: 72,  label: 'Medio'    },
  low:      { response: 72, resolution: 168, label: 'Bajo'     },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-critical/20 text-critical',
  high:     'bg-amber-500/20 text-amber-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-surface-3 text-ink-secondary',
}

const TYPE_LABEL: Record<string, string> = {
  preventive:  'Preventivo',
  corrective:  'Correctivo',
  emergency:   'Emergencia',
  installation:'Instalación',
  inspection:  'Inspección',
}

function hoursAgo(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3600000
}
function fmtHours(h: number) {
  if (h < 1)  return `${Math.round(h * 60)}m`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

type SLAStatus = 'breached' | 'risk' | 'ok' | 'responded'

interface WORow {
  id: string
  order_number: string
  priority: string
  type: string
  status: string
  created_at: string
  started_at: string | null
  arrived_at: string | null
  assigned_to: string | null
  customer_name: string
  site_name: string
  technician_name: string | null
  // SLA computed
  slaResponseH: number
  slaResolutionH: number
  elapsedH: number
  responseElapsedH: number
  resolutionElapsedH: number
  responsePct: number
  resolutionPct: number
  hasResponded: boolean
  slaStatus: SLAStatus
  activeMetricPct: number
  activeMetricLabel: string
  deadline: Date
}

export default async function SLAPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const { data: orders } = await supabase
    .from('work_orders')
    .select(`
      id, order_number, priority, type, status, created_at, started_at, arrived_at, assigned_to,
      customers(name),
      sites(name),
      profiles!assigned_to(full_name)
    `)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: true })

  const now = Date.now()

  const rows: WORow[] = (orders ?? []).map(o => {
    const sla         = SLA[o.priority] ?? SLA.medium
    const customer    = o.customers    as unknown as { name: string } | null
    const site        = o.sites        as unknown as { name: string } | null
    const tech        = o.profiles     as unknown as { full_name: string } | null

    const createdMs   = new Date(o.created_at).getTime()
    const startedMs   = o.started_at ? new Date(o.started_at).getTime() : null
    const elapsedH    = (now - createdMs) / 3600000

    // Response SLA: tiempo desde creación hasta primer started_at
    const responseElapsedH = startedMs
      ? (startedMs - createdMs) / 3600000
      : elapsedH
    const hasResponded = !!startedMs

    // Resolution SLA: siempre desde creación hasta ahora
    const resolutionElapsedH = elapsedH

    const responsePct    = (responseElapsedH    / sla.response)   * 100
    const resolutionPct  = (resolutionElapsedH  / sla.resolution) * 100

    // Status: si ya respondió, lo que importa es resolution; si no, response
    let slaStatus: SLAStatus
    let activeMetricPct: number
    let activeMetricLabel: string

    if (hasResponded) {
      activeMetricPct   = resolutionPct
      activeMetricLabel = 'Resolución'
      slaStatus = resolutionPct >= 100 ? 'breached'
                : resolutionPct >= 80  ? 'risk'
                : 'responded'
    } else {
      activeMetricPct   = responsePct
      activeMetricLabel = 'Respuesta'
      slaStatus = responsePct >= 100 ? 'breached'
                : responsePct >= 80  ? 'risk'
                : 'ok'
    }

    // Deadline para la métrica activa
    const deadlineMs = hasResponded
      ? createdMs + sla.resolution * 3600000
      : createdMs + sla.response   * 3600000
    const deadline = new Date(deadlineMs)

    return {
      id:                o.id,
      order_number:      o.order_number,
      priority:          o.priority,
      type:              o.type,
      status:            o.status,
      created_at:        o.created_at,
      started_at:        o.started_at ?? null,
      arrived_at:        o.arrived_at ?? null,
      assigned_to:       o.assigned_to ?? null,
      customer_name:     customer?.name ?? '—',
      site_name:         site?.name ?? '—',
      technician_name:   tech?.full_name ?? null,
      slaResponseH:      sla.response,
      slaResolutionH:    sla.resolution,
      elapsedH,
      responseElapsedH,
      resolutionElapsedH,
      responsePct,
      resolutionPct,
      hasResponded,
      slaStatus,
      activeMetricPct,
      activeMetricLabel,
      deadline,
    }
  })

  // Ordenar: breached primero, luego risk, luego ok — dentro de cada grupo por antigüedad
  const sorted = [...rows].sort((a, b) => {
    const order = { breached: 0, risk: 1, ok: 2, responded: 3 }
    const diff = order[a.slaStatus] - order[b.slaStatus]
    return diff !== 0 ? diff : b.activeMetricPct - a.activeMetricPct
  })

  const breached  = sorted.filter(r => r.slaStatus === 'breached')
  const risk      = sorted.filter(r => r.slaStatus === 'risk')
  const ok        = sorted.filter(r => r.slaStatus === 'ok')
  const responded = sorted.filter(r => r.slaStatus === 'responded')

  // KPIs resumen
  const totalOpen      = rows.length
  const breachedCount  = breached.length
  const riskCount      = risk.length
  const unassigned     = rows.filter(r => !r.assigned_to).length

  // Cumplimiento global: OTs que NO han incumplido vs total
  const compliancePct  = totalOpen > 0
    ? Math.round(((totalOpen - breachedCount) / totalOpen) * 100)
    : 100

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Monitor SLA</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{totalOpen} órdenes activas</p>
          </div>
          <Link href="/orders"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
            Ver órdenes
          </Link>
        </div>

        {/* KPI bar */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <KpiBox
            value={breachedCount}
            label="Incumplidos"
            cls={breachedCount > 0 ? 'text-critical' : 'text-ink-tertiary'}
          />
          <KpiBox
            value={riskCount}
            label="En riesgo"
            cls={riskCount > 0 ? 'text-amber-400' : 'text-ink-tertiary'}
          />
          <KpiBox
            value={unassigned}
            label="Sin asignar"
            cls={unassigned > 0 ? 'text-amber-400' : 'text-ink-tertiary'}
          />
          <KpiBox
            value={`${compliancePct}%`}
            label="Cumplimiento"
            cls={compliancePct >= 90 ? 'text-success' : compliancePct >= 70 ? 'text-amber-400' : 'text-critical'}
          />
        </div>

        {/* SLA legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-tertiary">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-critical inline-block" />Incumplido (&gt;100%)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />En riesgo (80–100%)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success inline-block" />OK (&lt;80%)</span>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Incumplidos */}
        {breached.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-critical" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-critical">
                SLA Incumplido · {breached.length}
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {breached.map(r => <SLACard key={r.id} row={r} />)}
            </div>
          </section>
        )}

        {/* En riesgo */}
        {risk.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Clock size={15} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                En riesgo · {risk.length}
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {risk.map(r => <SLACard key={r.id} row={r} />)}
            </div>
          </section>
        )}

        {/* Al día — respondidas en seguimiento */}
        {responded.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              En seguimiento (respondidas) · {responded.length}
            </h2>
            <div className="flex flex-col gap-2">
              {responded.map(r => <SLACard key={r.id} row={r} />)}
            </div>
          </section>
        )}

        {/* OK */}
        {ok.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Dentro de SLA · {ok.length}
            </h2>
            <div className="flex flex-col gap-2">
              {ok.map(r => <SLACard key={r.id} row={r} />)}
            </div>
          </section>
        )}

        {totalOpen === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <CheckCircle2 size={32} className="text-success" />
            <div>
              <p className="text-base font-semibold text-ink-primary">Sin órdenes activas</p>
              <p className="mt-1 text-sm text-ink-tertiary">Todos los servicios están completados</p>
            </div>
          </div>
        )}

        {/* Tabla de referencia SLA */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Referencia SLA por prioridad
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="pb-2 text-left font-semibold text-ink-secondary">Prioridad</th>
                  <th className="pb-2 text-center font-semibold text-ink-secondary">Respuesta</th>
                  <th className="pb-2 text-center font-semibold text-ink-secondary">Resolución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {Object.entries(SLA).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', PRIORITY_COLOR[k])}>
                        {v.label}
                      </span>
                    </td>
                    <td className="py-2 text-center font-mono text-ink-secondary">{fmtHours(v.response)}</td>
                    <td className="py-2 text-center font-mono text-ink-secondary">{fmtHours(v.resolution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── Componente tarjeta SLA ───────────────────────────────────────────────── */
function SLACard({ row: r }: { row: WORow }) {
  const pct   = Math.min(r.activeMetricPct, 150) // cap a 150% para barra visual
  const pctRaw = r.activeMetricPct

  const barCls = pctRaw >= 100 ? 'bg-critical'
               : pctRaw >= 80  ? 'bg-amber-400'
               : 'bg-success'

  const dotCls = pctRaw >= 100 ? 'bg-critical'
               : pctRaw >= 80  ? 'bg-amber-400'
               : 'bg-success'

  const isOverdue = pctRaw >= 100
  const timeLabel = isOverdue
    ? `Excedido por ${fmtHours(r.elapsedH - (r.hasResponded ? r.slaResolutionH : r.slaResponseH))}`
    : `Vence ${r.deadline.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`

  return (
    <Link href={`/orders/${r.id}`}
      className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors block">

      {/* Fila superior */}
      <div className="flex items-start gap-2">
        <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', dotCls)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-volt-400 font-semibold">{r.order_number}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', PRIORITY_COLOR[r.priority])}>
              {SLA[r.priority]?.label ?? r.priority}
            </span>
            <span className="text-xs text-ink-tertiary">{TYPE_LABEL[r.type] ?? r.type}</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-ink-primary truncate">{r.customer_name}</p>
          <p className="text-xs text-ink-tertiary truncate">{r.site_name}</p>
        </div>
        <ChevronRight size={14} className="flex-shrink-0 text-ink-tertiary mt-1" />
      </div>

      {/* Barra de progreso SLA */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-ink-tertiary">{r.activeMetricLabel} SLA</span>
          <span className={cn('font-bold tabular-nums',
            pctRaw >= 100 ? 'text-critical' : pctRaw >= 80 ? 'text-amber-400' : 'text-success')}>
            {pctRaw.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn('h-1.5 rounded-full transition-all', barCls)}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className={cn('mt-1 text-xs', isOverdue ? 'text-critical font-semibold' : 'text-ink-tertiary')}>
          {timeLabel}
        </p>
      </div>

      {/* Fila inferior: técnico + timestamps */}
      <div className="mt-3 flex items-center gap-3 border-t border-border-subtle pt-2 text-xs text-ink-tertiary flex-wrap">
        {r.technician_name ? (
          <span className="flex items-center gap-1">
            <User2 size={11} />{r.technician_name}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <User2 size={11} />Sin asignar
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={11} />Creada {fmtDateTime(r.created_at)}
        </span>
        {r.started_at && (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 size={11} />Respondida {fmtHours(r.responseElapsedH)} después
          </span>
        )}
      </div>
    </Link>
  )
}

function KpiBox({ value, label, cls }: { value: string | number; label: string; cls: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
      <p className={cn('text-lg font-bold tabular-nums', cls)}>{value}</p>
      <p className="text-xs text-ink-tertiary leading-tight">{label}</p>
    </div>
  )
}
