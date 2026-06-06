import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/components/ui/cn'
import {
  CheckCircle2, Clock, AlertTriangle, TrendingUp,
  BarChart3, Zap, Users, Building2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function monthsBack(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d.toISOString().split('T')[0]!
}

function monthLabel(offset: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return d.toLocaleDateString('es-PE', { month: 'short' })
}

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const sixMonthsAgo = monthsBack(6)
  const oneMonthAgo  = monthsBack(1)
  const today        = new Date().toISOString().split('T')[0]!

  const [
    { data: allOrders },
    { data: allFindings },
    { data: allAssets },
    { data: allTechs },
    { data: contracts },
    { data: opportunities },
  ] = await Promise.all([
    supabase.from('work_orders').select('id, status, type, priority, scheduled_date, completed_at, assigned_to, profiles:assigned_to(full_name)')
      .gte('scheduled_date', sixMonthsAgo),
    supabase.from('findings').select('id, severity, status, estimated_value, is_opportunity, created_at'),
    supabase.from('assets').select('id, status, name, asset_types(name)').eq('is_active', true),
    supabase.from('profiles').select('id, full_name').eq('role', 'technician'),
    supabase.from('contracts').select('id, status, value, end_date'),
    supabase.from('opportunities').select('id, stage, estimated_value, probability')
      .not('stage', 'in', '("won","lost")'),
  ])

  // ── OT Metrics ────────────────────────────────────────────────
  const orders        = allOrders ?? []
  const completed     = orders.filter(o => o.status === 'completed')
  const completionRate = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0

  const lastMonth = orders.filter(o => o.scheduled_date >= oneMonthAgo)
  const lastMonthDone = lastMonth.filter(o => o.status === 'completed').length

  // Por mes (últimos 6)
  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const label   = monthLabel(5 - i)
    const start   = monthsBack(5 - i)
    const end     = i < 5 ? monthsBack(5 - i - 1) : (today + 'z')
    const monthOrders = orders.filter(o => o.scheduled_date >= start && o.scheduled_date < end)
    return { label, total: monthOrders.length, done: monthOrders.filter(o => o.status === 'completed').length }
  })

  const maxMonth = Math.max(...byMonth.map(m => m.total), 1)

  // Por tipo
  const byType: Record<string, number> = {}
  orders.forEach(o => { byType[o.type] = (byType[o.type] ?? 0) + 1 })
  const typeColors: Record<string, string> = {
    preventive: 'bg-success', corrective: 'bg-amber-400', emergency: 'bg-critical',
    installation: 'bg-blue-400', inspection: 'bg-purple-400',
  }
  const typeLabels: Record<string, string> = {
    preventive: 'Preventivo', corrective: 'Correctivo', emergency: 'Emergencia',
    installation: 'Instalación', inspection: 'Inspección',
  }

  // Técnicos productividad
  const techStats = (allTechs ?? []).map(t => {
    const mine = orders.filter(o => o.assigned_to === t.id)
    return { name: t.full_name, total: mine.length, done: mine.filter(o => o.status === 'completed').length }
  }).sort((a, b) => b.done - a.done).slice(0, 5)

  // ── Hallazgos ──────────────────────────────────────────────────
  const findings = allFindings ?? []
  const openFindings    = findings.filter(f => f.status === 'open')
  const criticalOpen    = openFindings.filter(f => f.severity === 'critical').length
  const potentialRevenue = openFindings.filter(f => f.is_opportunity)
    .reduce((s, f) => s + (f.estimated_value ?? 0), 0)

  // ── Flota ──────────────────────────────────────────────────────
  const assets = allAssets ?? []
  const fleetOk       = assets.filter(a => a.status === 'operational').length
  const fleetDegraded = assets.filter(a => a.status === 'degraded').length
  const fleetCritical = assets.filter(a => a.status === 'critical').length
  const fleetHealth   = assets.length > 0 ? Math.round((fleetOk / assets.length) * 100) : 0

  // ── Comercial ──────────────────────────────────────────────────
  const activeContracts = (contracts ?? []).filter(c => c.status === 'active')
  const mrr = activeContracts.filter(c => c.value).reduce((s, c) => s + (c.value ?? 0), 0)
  const expiringContracts = activeContracts.filter(c => {
    if (!c.end_date) return false
    const d = (new Date(c.end_date).getTime() - Date.now()) / 86400000
    return d <= 60 && d > 0
  }).length

  const pipelineValue = (opportunities ?? []).reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const weightedPipeline = (opportunities ?? []).reduce((s, o) => s + (o.estimated_value ?? 0) * ((o.probability ?? 50) / 100), 0)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <h1 className="font-display text-xl font-bold text-ink-primary">Analytics</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">Últimos 6 meses</p>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">

        {/* ── OPERACIONES ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Operaciones</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Kpi icon={<CheckCircle2 size={18} className="text-success" />}
              label="Tasa completado" value={`${completionRate}%`}
              sub={`${completed.length} de ${orders.length} OTs`} />
            <Kpi icon={<Zap size={18} className="text-volt-500" />}
              label="Este mes" value={lastMonthDone}
              sub="OTs completadas" />
          </div>

          {/* Gráfico barras por mes */}
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <p className="mb-3 text-xs font-semibold text-ink-secondary">OTs por mes</p>
            <div className="flex items-end gap-2 h-24">
              {byMonth.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '72px' }}>
                    {m.total > 0 && (
                      <div className="w-full rounded-sm bg-ink-tertiary/30"
                        style={{ height: `${Math.round((m.total / maxMonth) * 68)}px` }}>
                        <div className="w-full rounded-sm bg-volt-500/70 transition-all"
                          style={{ height: `${m.total > 0 ? Math.round((m.done / m.total) * 100) : 0}%` }} />
                      </div>
                    )}
                    {m.total === 0 && <div className="w-full rounded-sm bg-surface-3 h-1" />}
                  </div>
                  <span className="text-xs text-ink-tertiary">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-volt-500/70" /><span className="text-xs text-ink-tertiary">Completadas</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-ink-tertiary/30" /><span className="text-xs text-ink-tertiary">Total</span></div>
            </div>
          </div>

          {/* Por tipo */}
          {Object.keys(byType).length > 0 && (
            <div className="mt-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="mb-3 text-xs font-semibold text-ink-secondary">Por tipo de servicio</p>
              <div className="flex flex-col gap-2">
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className={cn('h-2 w-2 rounded-full flex-shrink-0', typeColors[type] ?? 'bg-ink-tertiary')} />
                    <span className="flex-1 text-sm text-ink-secondary">{typeLabels[type] ?? type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-surface-3">
                        <div className={cn('h-full rounded-full', typeColors[type] ?? 'bg-ink-tertiary')}
                          style={{ width: `${Math.round((count / orders.length) * 100)}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs font-mono text-ink-tertiary">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── TÉCNICOS ── */}
        {techStats.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Productividad técnicos</h2>
            <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
              {techStats.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-ink-tertiary w-4">{i + 1}</span>
                  <span className="flex-1 text-sm text-ink-primary truncate">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-success">{t.done}</span>
                    <span className="text-xs text-ink-tertiary">/ {t.total}</span>
                    <div className="w-12 h-1.5 rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-success"
                        style={{ width: t.total > 0 ? `${Math.round((t.done / t.total) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FLOTA ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Salud de flota</h2>
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-bold text-ink-primary">{fleetHealth}%</span>
              <span className="text-sm text-ink-secondary">{assets.length} equipos</span>
            </div>
            <div className="mb-3 flex h-3 overflow-hidden rounded-full gap-0.5">
              {fleetCritical > 0 && <div className="bg-critical rounded-full" style={{ flex: fleetCritical }} />}
              {fleetDegraded > 0 && <div className="bg-amber-400 rounded-full" style={{ flex: fleetDegraded }} />}
              {fleetOk > 0      && <div className="bg-success rounded-full" style={{ flex: fleetOk }} />}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="font-bold text-success text-lg">{fleetOk}</p><p className="text-ink-tertiary">Operativos</p></div>
              <div><p className="font-bold text-amber-400 text-lg">{fleetDegraded}</p><p className="text-ink-tertiary">Degradados</p></div>
              <div><p className="font-bold text-critical text-lg">{fleetCritical}</p><p className="text-ink-tertiary">Críticos</p></div>
            </div>
          </div>
        </section>

        {/* ── HALLAZGOS ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Hallazgos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Kpi icon={<AlertTriangle size={18} className="text-critical" />}
              label="Críticos abiertos" value={criticalOpen}
              sub={`${openFindings.length} total abiertos`} />
            <Kpi icon={<TrendingUp size={18} className="text-volt-500" />}
              label="Potencial facturar" value={fmt(potentialRevenue)}
              sub="en hallazgos no gestionados" />
          </div>
        </section>

        {/* ── COMERCIAL ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Comercial</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Kpi icon={<Building2 size={18} className="text-blue-400" />}
              label="Contratos activos" value={activeContracts.length}
              sub={expiringContracts > 0 ? `⚠️ ${expiringContracts} vencen en 60d` : 'Todos al día'} />
            <Kpi icon={<TrendingUp size={18} className="text-purple-400" />}
              label="Pipeline" value={fmt(pipelineValue)}
              sub={`Ponderado: ${fmt(weightedPipeline)}`} />
          </div>
          {mrr > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-tertiary">MRR (contratos mensuales)</p>
                <p className="text-2xl font-bold text-volt-500">{fmt(mrr)}</p>
              </div>
              <p className="text-sm text-ink-tertiary">ARR: {fmt(mrr * 12)}</p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">{icon}</div>
      <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </div>
  )
}
