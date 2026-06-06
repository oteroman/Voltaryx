import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  ClipboardList, AlertCircle, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Users, Building2, ChevronRight,
  Clock, DollarSign, FileWarning, Plus, CalendarCheck2,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function todayISO() { return new Date().toISOString().split('T')[0]! }
function monthStart() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]!
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string

  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const today = todayISO()
  const mStart = monthStart()

  // ── Queries en paralelo ──────────────────────────────────────────────────
  const [
    { data: ordersToday },
    { data: ordersMonth },
    { data: assets },
    { data: openFindings },
    { data: opportunities },
    { data: contracts },
    { data: upcomingOrders },
  ] = await Promise.all([
    supabase.from('work_orders').select('id, status, priority')
      .eq('scheduled_date', today),
    supabase.from('work_orders').select('id, status')
      .gte('scheduled_date', mStart).lte('scheduled_date', today),
    supabase.from('assets').select('id, status, name').eq('is_active', true),
    supabase.from('findings').select('id, title, severity, estimated_value, is_opportunity, work_orders(order_number, customers(name))')
      .eq('status', 'open').order('severity'),
    supabase.from('findings').select('id, estimated_value')
      .eq('is_opportunity', true).eq('status', 'open'),
    supabase.from('contracts').select('id, status, end_date, value, customers(name)')
      .in('status', ['active', 'draft']).order('end_date'),
    supabase.from('work_orders')
      .select('id, order_number, type, status, priority, scheduled_date, scheduled_time, customers(name), sites(name)')
      .not('status', 'in', '("completed","cancelled")')
      .gte('scheduled_date', today)
      .order('scheduled_date').order('scheduled_time').limit(6),
  ])

  // ── Métricas ─────────────────────────────────────────────────────────────
  const todayTotal    = ordersToday?.length ?? 0
  const todayActive   = ordersToday?.filter(o => ['in_progress','on_site'].includes(o.status)).length ?? 0
  const todayDone     = ordersToday?.filter(o => o.status === 'completed').length ?? 0
  const todayCritical = ordersToday?.filter(o => o.priority === 'critical').length ?? 0

  const monthDone     = ordersMonth?.filter(o => o.status === 'completed').length ?? 0

  const assetCritical  = assets?.filter(a => a.status === 'critical').length  ?? 0
  const assetDegraded  = assets?.filter(a => a.status === 'degraded').length  ?? 0
  const assetOk        = assets?.filter(a => a.status === 'operational').length ?? 0

  const pipelineValue  = (opportunities ?? []).reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const pipelineCount  = opportunities?.length ?? 0

  const activeContracts  = contracts?.filter(c => c.status === 'active').length ?? 0
  const expiringContracts = contracts?.filter(c => {
    if (!c.end_date || c.status !== 'active') return false
    const days = (new Date(c.end_date).getTime() - Date.now()) / 86400000
    return days <= 30
  }).length ?? 0

  const criticalFindings = (openFindings ?? []).filter(f => f.severity === 'critical')
  const highFindings     = (openFindings ?? []).filter(f => f.severity === 'high')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Dashboard</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Link href="/orders/new"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
            <Plus size={16} strokeWidth={2.5} />Nueva OT
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ── ALERTAS CRÍTICAS ── */}
        {(criticalFindings.length > 0 || expiringContracts > 0 || todayCritical > 0) && (
          <section className="rounded-xl border border-critical/30 bg-critical/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileWarning size={16} className="text-critical" />
              <h2 className="text-sm font-bold text-critical uppercase tracking-wide">Requieren atención</h2>
            </div>
            <div className="flex flex-col gap-2">
              {todayCritical > 0 && (
                <AlertRow icon="🚨" text={`${todayCritical} orden${todayCritical > 1 ? 'es' : ''} crítica${todayCritical > 1 ? 's' : ''} programada${todayCritical > 1 ? 's' : ''} hoy`} href="/orders" />
              )}
              {criticalFindings.map((f, i) => {
                const wo = f.work_orders as unknown as { order_number: string; customers: { name: string } | null } | null
                return (
                  <AlertRow key={i} icon="🔴"
                    text={`${f.title} — ${wo?.customers?.name ?? ''}`}
                    href="/opportunities" />
                )
              })}
              {expiringContracts > 0 && (
                <AlertRow icon="📋" text={`${expiringContracts} contrato${expiringContracts > 1 ? 's' : ''} vence en menos de 30 días`} href="/contracts" />
              )}
            </div>
          </section>
        )}

        {/* ── KPIs OPERATIVOS ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Operaciones</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={<ClipboardList size={20} className="text-volt-500" />}
              label="Órdenes hoy"
              value={todayTotal}
              sub={`${todayActive} activa${todayActive !== 1 ? 's' : ''} · ${todayDone} completada${todayDone !== 1 ? 's' : ''}`}
              href="/orders"
              accent="volt"
            />
            <KpiCard
              icon={<CheckCircle2 size={20} className="text-success" />}
              label="Completadas (mes)"
              value={monthDone}
              sub={`de ${ordersMonth?.length ?? 0} programadas`}
              href="/orders"
              accent="success"
            />
          </div>
        </section>

        {/* ── ESTADO DE FLOTA ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Estado de equipos</h2>
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink-primary">{(assets?.length ?? 0)} equipos en flota</span>
              <Link href="/assets" className="text-xs text-volt-500 hover:underline">Ver todos</Link>
            </div>
            {/* Barra de estado */}
            <div className="mb-3 flex h-3 overflow-hidden rounded-full gap-0.5">
              {assetCritical > 0 && (
                <div className="bg-critical rounded-full" style={{ flex: assetCritical }} />
              )}
              {assetDegraded > 0 && (
                <div className="bg-amber-400 rounded-full" style={{ flex: assetDegraded }} />
              )}
              {assetOk > 0 && (
                <div className="bg-success rounded-full" style={{ flex: assetOk }} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatusBadge count={assetCritical}  label="Críticos"  cls="text-critical"  />
              <StatusBadge count={assetDegraded}  label="Degradados" cls="text-amber-400" />
              <StatusBadge count={assetOk}        label="Operativos" cls="text-success"   />
            </div>
          </div>
        </section>

        {/* ── KPIs COMERCIALES ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Comercial</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={<TrendingUp size={20} className="text-purple-400" />}
              label="Pipeline abierto"
              value={formatCurrency(pipelineValue)}
              sub={`${pipelineCount} oportunidad${pipelineCount !== 1 ? 'es' : ''}`}
              href="/opportunities"
              accent="purple"
            />
            <KpiCard
              icon={<Building2 size={20} className="text-blue-400" />}
              label="Contratos activos"
              value={activeContracts}
              sub={expiringContracts > 0 ? `⚠️ ${expiringContracts} vencen pronto` : 'Al día'}
              href="/contracts"
              accent="blue"
            />
          </div>
        </section>

        {/* ── MANTENIMIENTO PREVENTIVO SHORTCUT ── */}
        {['tenant_admin', 'supervisor'].includes(role) && (
          <Link href="/maintenance"
            className="flex items-center gap-3 rounded-xl border border-volt-500/20 bg-volt-500/5 px-4 py-3 hover:bg-volt-500/10 transition-colors">
            <CalendarCheck2 size={20} className="flex-shrink-0 text-volt-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-primary">Mantenimiento Preventivo</p>
              <p className="text-xs text-ink-tertiary">Ver estado de visitas PM por contrato</p>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-ink-tertiary" />
          </Link>
        )}

        {/* ── HALLAZGOS ABIERTOS ── */}
        {(openFindings?.length ?? 0) > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                Hallazgos abiertos · {openFindings?.length}
              </h2>
              <Link href="/opportunities" className="text-xs text-volt-500 hover:underline">Ver pipeline</Link>
            </div>
            <div className="flex flex-col gap-2">
              {[...criticalFindings, ...highFindings].slice(0, 4).map((f, i) => {
                const wo = f.work_orders as unknown as { order_number: string; customers: { name: string } | null } | null
                return (
                  <Link key={i} href="/opportunities"
                    className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <span className="text-lg flex-shrink-0">
                      {f.severity === 'critical' ? '🔴' : '🟠'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{f.title}</p>
                      <p className="text-xs text-ink-tertiary">{wo?.customers?.name}</p>
                    </div>
                    {f.estimated_value && (
                      <span className="text-xs font-semibold text-success flex-shrink-0">
                        {formatCurrency(f.estimated_value)}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── PRÓXIMAS ÓRDENES ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Próximas órdenes</h2>
            <Link href="/orders" className="text-xs text-volt-500 hover:underline">Ver todas</Link>
          </div>
          <div className="flex flex-col gap-2">
            {(upcomingOrders ?? []).slice(0, 5).map((o) => {
              const customer = o.customers as unknown as { name: string } | null
              const site = o.sites as unknown as { name: string } | null
              const isToday = o.scheduled_date === today
              const isActive = ['in_progress', 'on_site'].includes(o.status)
              return (
                <Link key={o.id} href={`/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0',
                    isActive ? 'bg-volt-500 animate-pulse' :
                    o.priority === 'critical' ? 'bg-critical' :
                    o.priority === 'high' ? 'bg-amber-400' : 'bg-ink-tertiary'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary truncate">{customer?.name}</p>
                    <p className="text-xs text-ink-tertiary truncate">{site?.name} · {o.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-ink-secondary">
                      {isToday ? 'Hoy' : new Date(o.scheduled_date + 'T12:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      {o.scheduled_time && ` ${o.scheduled_time.slice(0,5)}`}
                    </p>
                    {isActive && <p className="text-xs font-medium text-volt-500">En curso</p>}
                  </div>
                </Link>
              )
            })}
            {(upcomingOrders?.length ?? 0) === 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-8 text-center">
                <p className="text-sm text-ink-tertiary">No hay órdenes próximas</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, href, accent }: {
  icon: React.ReactNode; label: string; value: string | number
  sub: string; href: string; accent: string
}) {
  const borderCls = accent === 'volt' ? 'border-volt-500/30' : accent === 'success' ? 'border-success/30' :
    accent === 'purple' ? 'border-purple-500/30' : 'border-blue-500/30'
  return (
    <Link href={href}
      className={cn('flex flex-col gap-1 rounded-xl border bg-surface-1 p-4 hover:bg-surface-2 transition-colors', borderCls)}>
      <div className="flex items-center justify-between">
        {icon}
        <ChevronRight size={14} className="text-ink-tertiary" />
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-primary">{value}</p>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </Link>
  )
}

function StatusBadge({ count, label, cls }: { count: number; label: string; cls: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn('text-xl font-bold', cls)}>{count}</span>
      <span className="text-xs text-ink-tertiary">{label}</span>
    </div>
  )
}

function AlertRow({ icon, text, href }: { icon: string; text: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm text-critical hover:underline">
      <span>{icon}</span><span>{text}</span>
    </Link>
  )
}
