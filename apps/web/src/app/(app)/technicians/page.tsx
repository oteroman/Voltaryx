import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { cn } from '@/components/ui/cn'
import { TechniciansList } from './technicians-list'

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

  const { data: techs } = await supabase
    .from('profiles')
    .select('id, full_name, role, skills, certifications, territory, phone, hire_date, max_daily_orders')
    .in('role', ['technician', 'supervisor'])
    .order('role').order('full_name')

  const { data: todayOrders } = await supabase
    .from('work_orders')
    .select('id, status, priority, assigned_to, customers(name)')
    .eq('scheduled_date', today)
    .not('status', 'in', '("cancelled")')

  const { data: monthOrders } = await supabase
    .from('work_orders')
    .select('id, assigned_to, status')
    .gte('scheduled_date', mStart)
    .lte('scheduled_date', today)
    .eq('status', 'completed')

  const { data: monthTotal } = await supabase
    .from('work_orders')
    .select('id, assigned_to, status')
    .gte('scheduled_date', mStart)
    .lte('scheduled_date', today)
    .not('status', 'eq', 'cancelled')

  const allTechs = techs ?? []

  const techStats = allTechs.map(t => {
    const todayWOs       = (todayOrders ?? []).filter(o => o.assigned_to === t.id)
    const monthDone      = (monthOrders ?? []).filter(o => o.assigned_to === t.id).length
    const monthAll       = (monthTotal  ?? []).filter(o => o.assigned_to === t.id).length
    const activeNow      = todayWOs.find(o => ACTIVE_STATUS.includes(o.status))
    const completionRate = monthAll > 0 ? Math.round((monthDone / monthAll) * 100) : null
    const maxOrders      = t.max_daily_orders ?? 6
    const loadPct        = todayWOs.length > 0 ? Math.round((todayWOs.length / maxOrders) * 100) : 0

    return {
      id:             t.id,
      full_name:      t.full_name,
      role:           t.role,
      skills:         (t.skills ?? []) as string[],
      certifications: (t.certifications ?? []) as { name: string; expiry: string | null }[],
      territory:      t.territory,
      phone:          t.phone,
      todayCount:     todayWOs.length,
      monthDone,
      completionRate,
      activeNow:      !!activeNow,
      activeOrder:    activeNow ? (activeNow.customers as any)?.name ?? 'En servicio' : null,
      loadPct,
      maxOrders,
    }
  })

  const activeCount     = techStats.filter(t => t.activeNow).length
  const totalToday      = (todayOrders ?? []).length
  const unassignedToday = (todayOrders ?? []).filter(o => !o.assigned_to).length
  const avgCompletion   = (() => {
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

      <TechniciansList techStats={techStats} />
    </div>
  )
}
