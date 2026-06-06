import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  User2, ChevronRight, CheckCircle2, Clock,
  Zap, Shield, MapPin, TrendingUp,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function todayISO()   { return new Date().toISOString().split('T')[0]! }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]! }

const ACTIVE_STATUS = ['in_transit', 'on_site', 'in_progress']

export default async function TechniciansPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const today  = todayISO()
  const mStart = monthStart()

  // Técnicos y supervisores
  const { data: techs } = await supabase
    .from('profiles')
    .select('id, full_name, role, skills, certifications, territory, phone, hire_date, max_daily_orders')
    .in('role', ['technician', 'supervisor'])
    .order('role').order('full_name')

  // OTs de hoy por técnico
  const { data: todayOrders } = await supabase
    .from('work_orders')
    .select('id, status, priority, assigned_to, customers(name)')
    .eq('scheduled_date', today)
    .not('status', 'in', '("cancelled")')

  // OTs del mes completadas por técnico
  const { data: monthOrders } = await supabase
    .from('work_orders')
    .select('id, assigned_to, status')
    .gte('scheduled_date', mStart)
    .lte('scheduled_date', today)
    .eq('status', 'completed')

  // OTs de este mes total (para completion rate)
  const { data: monthTotal } = await supabase
    .from('work_orders')
    .select('id, assigned_to, status')
    .gte('scheduled_date', mStart)
    .lte('scheduled_date', today)
    .not('status', 'eq', 'cancelled')

  const allTechs = techs ?? []

  const techStats = allTechs.map(t => {
    const todayWOs   = (todayOrders ?? []).filter(o => o.assigned_to === t.id)
    const monthDone  = (monthOrders ?? []).filter(o => o.assigned_to === t.id).length
    const monthAll   = (monthTotal  ?? []).filter(o => o.assigned_to === t.id).length
    const activeNow  = todayWOs.find(o => ACTIVE_STATUS.includes(o.status))
    const completionRate = monthAll > 0 ? Math.round((monthDone / monthAll) * 100) : null
    const maxOrders  = t.max_daily_orders ?? 6
    const loadPct    = todayWOs.length > 0 ? Math.round((todayWOs.length / maxOrders) * 100) : 0

    return {
      ...t,
      skills:          (t.skills ?? []) as string[],
      certifications:  (t.certifications ?? []) as { name: string; expiry: string | null }[],
      todayWOs,
      todayCount:      todayWOs.length,
      monthDone,
      completionRate,
      activeNow:       !!activeNow,
      activeOrder:     activeNow ? (activeNow.customers as any)?.name ?? 'En servicio' : null,
      loadPct,
      maxOrders,
    }
  })

  // KPIs globales
  const activeCount    = techStats.filter(t => t.activeNow).length
  const totalToday     = (todayOrders ?? []).length
  const unassignedToday= (todayOrders ?? []).filter(o => !o.assigned_to).length
  const avgCompletion  = (() => {
    const rates = techStats.map(t => t.completionRate).filter((r): r is number => r !== null)
    return rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null
  })()

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Técnicos</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{allTechs.length} en equipo</p>
          </div>
          <Link href="/dispatch"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
            Despacho
          </Link>
        </div>

        {/* KPIs del equipo */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className={cn('text-lg font-bold', activeCount > 0 ? 'text-volt-500' : 'text-ink-tertiary')}>
              {activeCount}
            </p>
            <p className="text-xs text-ink-tertiary leading-tight">En campo</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className="text-lg font-bold text-ink-primary">{totalToday}</p>
            <p className="text-xs text-ink-tertiary leading-tight">OTs hoy</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className={cn('text-lg font-bold', unassignedToday > 0 ? 'text-amber-400' : 'text-ink-tertiary')}>
              {unassignedToday}
            </p>
            <p className="text-xs text-ink-tertiary leading-tight">Sin asignar</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2 text-center">
            <p className={cn('text-lg font-bold',
              avgCompletion == null ? 'text-ink-tertiary'
              : avgCompletion >= 80 ? 'text-success'
              : avgCompletion >= 60 ? 'text-amber-400' : 'text-critical')}>
              {avgCompletion != null ? `${avgCompletion}%` : '—'}
            </p>
            <p className="text-xs text-ink-tertiary leading-tight">Cumplimiento</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {techStats.map(t => (
          <Link key={t.id} href={`/technicians/${t.id}`}
            className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-4 hover:border-border transition-colors block">

            {/* Fila principal */}
            <div className="flex items-start gap-3">
              {/* Avatar con estado */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full text-base font-bold',
                  t.activeNow ? 'bg-volt-500 text-ink-inverse' : 'bg-surface-3 text-ink-secondary',
                )}>
                  {t.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                {t.activeNow && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-void bg-volt-500 animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink-primary truncate">{t.full_name ?? 'Sin nombre'}</p>
                  <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    t.role === 'supervisor' ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-3 text-ink-secondary')}>
                    {t.role === 'supervisor' ? 'Supervisor' : 'Técnico'}
                  </span>
                </div>

                {/* Estado actual */}
                {t.activeNow ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-volt-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-volt-500 animate-pulse inline-block" />
                    En campo · {t.activeOrder}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-tertiary">Disponible</p>
                )}

                {t.territory && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-tertiary">
                    <MapPin size={11} />{t.territory}
                  </p>
                )}
              </div>

              <ChevronRight size={16} className="flex-shrink-0 text-ink-tertiary mt-1" />
            </div>

            {/* Carga del día */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-tertiary">Carga hoy</span>
                <span className={cn('font-semibold',
                  t.loadPct >= 100 ? 'text-critical' : t.loadPct >= 70 ? 'text-amber-400' : 'text-success')}>
                  {t.todayCount}/{t.maxOrders} OTs
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div className={cn('h-1.5 rounded-full transition-all',
                  t.loadPct >= 100 ? 'bg-critical' : t.loadPct >= 70 ? 'bg-amber-400' : 'bg-success')}
                  style={{ width: `${Math.min(100, t.loadPct)}%` }} />
              </div>
            </div>

            {/* Métricas + skills */}
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-tertiary border-t border-border-subtle pt-2 flex-wrap">
              {t.completionRate !== null && (
                <span className="flex items-center gap-1">
                  <TrendingUp size={11} />
                  <span className={cn(t.completionRate >= 80 ? 'text-success' : t.completionRate >= 60 ? 'text-amber-400' : 'text-critical')}>
                    {t.completionRate}%
                  </span> cumplimiento mes
                </span>
              )}
              {t.skills.length > 0 && (
                <span className="flex items-center gap-1">
                  <Zap size={11} />{t.skills.slice(0, 2).join(' · ')}{t.skills.length > 2 ? ` +${t.skills.length - 2}` : ''}
                </span>
              )}
              {t.certifications.filter(c => {
                if (!c.expiry) return false
                return new Date(c.expiry) < new Date(Date.now() + 30 * 86400000)
              }).length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Shield size={11} />Cert. próxima a vencer
                </span>
              )}
            </div>
          </Link>
        ))}

        {allTechs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <User2 size={32} className="text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">Sin técnicos registrados</p>
          </div>
        )}
      </div>
    </div>
  )
}
