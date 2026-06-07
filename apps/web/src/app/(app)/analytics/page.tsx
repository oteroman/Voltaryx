import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  TrendingUp, Clock, CheckCircle2, BarChart3,
  Award, Building2, Target,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function fmtMrr(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `S/ ${(n / 1_000).toFixed(0)}K`
  return `S/ ${Math.round(n)}`
}

function fmtHours(h: number) {
  if (h < 1)  return `${Math.round(h * 60)}min`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

function sinceISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

type CompletedOrder = {
  id: string
  created_at: string
  completed_at: string | null
  assigned_to: string | null
  customer_id: string
  priority: string
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const days  = parseInt(searchParams.period ?? '30', 10) || 30
  const since = sinceISO(days)

  const [
    { data: contracts    },
    { data: completedRaw },
    { data: allPeriod    },
    { data: oppsRaw      },
    { data: profilesRaw  },
    { data: customersRaw },
  ] = await Promise.all([
    supabase.from('contracts').select('id, value, billing_cycle, status'),
    supabase.from('work_orders')
      .select('id, created_at, completed_at, assigned_to, customer_id, priority')
      .eq('status', 'completed')
      .gte('completed_at', since),
    supabase.from('work_orders')
      .select('id, status')
      .in('status', ['completed', 'cancelled'])
      .gte('created_at', since),
    supabase.from('opportunities')
      .select('id, stage, estimated_value')
      .gte('created_at', since),
    // Fetch profiles for technician names
    supabase.from('profiles').select('id, full_name').in('role', ['technician', 'supervisor']),
    // Fetch customer names
    supabase.from('customers').select('id, name'),
  ])

  const completed = (completedRaw ?? []) as CompletedOrder[]

  // Build lookup maps
  const profileMap = new Map<string, string>(
    (profilesRaw ?? []).map(p => [p.id, p.full_name ?? 'Sin nombre'])
  )
  const customerMap = new Map<string, string>(
    (customersRaw ?? []).map(c => [c.id, c.name ?? '—'])
  )

  // ── MRV ──────────────────────────────────────────────────────────────────
  const active = (contracts ?? []).filter(c => c.status === 'active')
  const mrv = active.reduce((s, c) => {
    const v = c.value ?? 0
    if (c.billing_cycle === 'monthly')   return s + v
    if (c.billing_cycle === 'quarterly') return s + v / 3
    if (c.billing_cycle === 'annual')    return s + v / 12
    return s
  }, 0)

  // ── Completion rate ───────────────────────────────────────────────────────
  const totalPeriod     = allPeriod?.length ?? 0
  const completedCount  = completed.length
  const completionRate  = totalPeriod > 0 ? Math.round((completedCount / totalPeriod) * 100) : 0

  // ── MTTR overall ─────────────────────────────────────────────────────────
  const withTime  = completed.filter(o => o.created_at && o.completed_at)
  const avgMttrH  = withTime.length > 0
    ? withTime.reduce((s, o) => {
        return s + (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()) / 3_600_000
      }, 0) / withTime.length
    : null

  // ── Technician ranking ───────────────────────────────────────────────────
  const techMap = new Map<string, { name: string; count: number }>()
  for (const o of completed) {
    if (!o.assigned_to) continue
    const name = profileMap.get(o.assigned_to) ?? 'Desconocido'
    const cur  = techMap.get(o.assigned_to) ?? { name, count: 0 }
    techMap.set(o.assigned_to, { name, count: cur.count + 1 })
  }
  const techRanking = [...techMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  const maxTech     = techRanking[0]?.count ?? 1

  // ── Customer ranking ──────────────────────────────────────────────────────
  const custMap = new Map<string, { name: string; count: number }>()
  for (const o of completed) {
    const name = customerMap.get(o.customer_id) ?? '—'
    const cur  = custMap.get(o.customer_id) ?? { name, count: 0 }
    custMap.set(o.customer_id, { name, count: cur.count + 1 })
  }
  const custRanking = [...custMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  const maxCust     = custRanking[0]?.count ?? 1

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const opps     = oppsRaw ?? []
  const wonOpps  = opps.filter(o => o.stage === 'won')
  const wonValue = wonOpps.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const convRate = opps.length > 0 ? Math.round((wonOpps.length / opps.length) * 100) : 0

  const PIPELINE_STAGES = [
    { key: 'identified',  label: 'Identificado', dot: 'bg-ink-tertiary' },
    { key: 'qualified',   label: 'Calificado',   dot: 'bg-blue-500'     },
    { key: 'proposal',    label: 'Propuesta',    dot: 'bg-purple-500'   },
    { key: 'negotiation', label: 'Negociación',  dot: 'bg-amber-400'    },
    { key: 'won',         label: 'Ganado',       dot: 'bg-success'      },
    { key: 'lost',        label: 'Perdido',      dot: 'bg-critical'     },
  ] as const

  // ── MTTR por prioridad ───────────────────────────────────────────────────
  const PRIORITIES = [
    { key: 'critical', label: 'Crítica', cls: 'text-critical'     },
    { key: 'high',     label: 'Alta',    cls: 'text-amber-400'    },
    { key: 'normal',   label: 'Normal',  cls: 'text-ink-secondary' },
    { key: 'low',      label: 'Baja',    cls: 'text-ink-tertiary'  },
  ] as const

  const periodLabel = days === 30 ? 'Últimos 30 días' : days === 90 ? 'Últimos 3 meses' : 'Último año'
  const noData      = completed.length === 0 && opps.length === 0

  return (
    <div className="flex flex-col pb-8">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <h1 className="font-display text-xl font-bold text-ink-primary">Analítica</h1>
        <div className="mt-3 flex gap-1.5">
          {[
            { v: '30',  l: '30 días'  },
            { v: '90',  l: '3 meses'  },
            { v: '365', l: 'Año'      },
          ].map(p => (
            <Link
              key={p.v}
              href={`/analytics?period=${p.v}`}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                String(days) === p.v
                  ? 'bg-volt-500 text-ink-inverse'
                  : 'bg-surface-2 text-ink-secondary hover:bg-surface-3',
              )}
            >
              {p.l}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">

        {/* KPIs */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Resumen · {periodLabel}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              icon={<TrendingUp size={18} className="text-volt-500" />}
              value={fmtMrr(mrv)}
              label="MRV mensual"
              sub={`${active.length} contratos activos`}
              border="border-volt-500/20"
            />
            <KpiTile
              icon={<CheckCircle2 size={18} className="text-success" />}
              value={String(completedCount)}
              label="OTs completadas"
              sub={`${completionRate}% tasa completado`}
              border="border-success/20"
            />
            <KpiTile
              icon={<Clock size={18} className="text-amber-400" />}
              value={avgMttrH !== null ? fmtHours(avgMttrH) : '—'}
              label="MTTR promedio"
              sub="Tiempo hasta resolución"
              border="border-amber-500/20"
            />
            <KpiTile
              icon={<Target size={18} className="text-purple-400" />}
              value={`${convRate}%`}
              label="Tasa de cierre"
              sub={`${wonOpps.length} oportunidades ganadas`}
              border="border-purple-500/20"
            />
          </div>
        </section>

        {/* Técnicos */}
        {techRanking.length > 0 && (
          <section>
            <SectionTitle icon={<Award size={13} className="text-volt-500" />} title="Técnicos · OTs completadas" />
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="flex flex-col gap-3">
                {techRanking.map((t, i) => (
                  <RankBar key={t.name} rank={i + 1} name={t.name} count={t.count} max={maxTech} color="bg-volt-500" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Clientes */}
        {custRanking.length > 0 && (
          <section>
            <SectionTitle icon={<Building2 size={13} className="text-blue-400" />} title="Clientes · actividad" />
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="flex flex-col gap-3">
                {custRanking.map((c, i) => (
                  <RankBar key={c.name} rank={i + 1} name={c.name} count={c.count} max={maxCust} color="bg-blue-500" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pipeline */}
        {opps.length > 0 && (
          <section>
            <SectionTitle icon={<BarChart3 size={13} className="text-purple-400" />} title={`Pipeline · ${periodLabel}`} />
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="mb-4 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-ink-primary">{fmtMrr(wonValue)}</p>
                <p className="text-xs text-ink-tertiary">cerrado en el período</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {PIPELINE_STAGES.map(s => {
                  const count = opps.filter(o => o.stage === s.key).length
                  if (count === 0) return null
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', s.dot)} />
                      <p className="w-24 text-xs text-ink-secondary">{s.label}</p>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-3">
                        <div
                          className={cn('h-1.5 rounded-full', s.dot)}
                          style={{ width: `${(count / opps.length) * 100}%` }}
                        />
                      </div>
                      <span className="w-5 text-right text-xs font-semibold text-ink-secondary">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* MTTR por prioridad */}
        {completed.length > 0 && (
          <section>
            <SectionTitle icon={<Clock size={13} className="text-amber-400" />} title="MTTR por prioridad" />
            <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle overflow-hidden">
              {PRIORITIES.map(p => {
                const pOTs = withTime.filter(o => o.priority === p.key)
                if (pOTs.length === 0) return null
                const avg = pOTs.reduce((s, o) => {
                  return s + (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()) / 3_600_000
                }, 0) / pOTs.length
                return (
                  <div key={p.key} className="flex items-center justify-between px-4 py-3">
                    <span className={cn('text-xs font-semibold', p.cls)}>{p.label}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-primary">{fmtHours(avg)}</p>
                      <p className="text-xs text-ink-tertiary">{pOTs.length} OT{pOTs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {noData && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <BarChart3 size={32} className="text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">Sin datos en el período seleccionado</p>
            <p className="text-xs text-ink-tertiary">Prueba ampliar el rango de fechas</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */
function KpiTile({ icon, value, label, sub, border }: {
  icon: React.ReactNode; value: string; label: string; sub: string; border: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border bg-surface-1 p-4', border)}>
      {icon}
      <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">{title}</h2>
    </div>
  )
}

function RankBar({ rank, name, count, max, color }: {
  rank: number; name: string; count: number; max: number; color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-center text-xs font-bold text-ink-tertiary">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary truncate">{name}</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-surface-3">
          <div
            className={cn('h-1.5 rounded-full', color)}
            style={{ width: `${(count / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-6 text-right text-sm font-bold text-ink-secondary">{count}</span>
    </div>
  )
}
