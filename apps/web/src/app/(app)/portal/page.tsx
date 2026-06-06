import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Cpu, ChevronRight, Plus,
  CheckCircle2, Clock, Truck, Wrench, XCircle,
  CalendarCheck2, Building2,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function monthStart() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]!
}

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

/* ── Status config ───────────────────────────────────────────────────────── */
const STATUS_CFG = {
  scheduled:   { label: 'Programado',  dot: 'bg-ink-tertiary',   text: 'text-ink-tertiary'  },
  in_transit:  { label: 'En tránsito', dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
  on_site:     { label: 'En sitio',    dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
  in_progress: { label: 'En proceso',  dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
  completed:   { label: 'Completado',  dot: 'bg-success',         text: 'text-success'       },
  cancelled:   { label: 'Cancelado',   dot: 'bg-surface-3',       text: 'text-ink-tertiary'  },
} as const

type OtStatus = keyof typeof STATUS_CFG

const PRIORITY_CFG = {
  critical: { label: 'Crítico', cls: 'text-critical bg-critical/10'  },
  high:     { label: 'Alto',    cls: 'text-amber-400 bg-amber-400/10' },
  medium:   { label: 'Medio',   cls: 'text-amber-400 bg-amber-400/10' },
  low:      { label: 'Bajo',    cls: 'text-ink-tertiary bg-surface-3' },
  normal:   { label: 'Normal',  cls: 'text-ink-tertiary bg-surface-3' },
} as const

type Priority = keyof typeof PRIORITY_CFG

const CONTRACT_STATUS_BADGE = {
  active:    { label: 'Vigente',   cls: 'bg-success/10 text-success'      },
  draft:     { label: 'Borrador',  cls: 'bg-surface-3 text-ink-tertiary'  },
  expired:   { label: 'Vencido',   cls: 'bg-critical/10 text-critical'    },
  cancelled: { label: 'Cancelado', cls: 'bg-surface-3 text-ink-tertiary'  },
  suspended: { label: 'Suspendido',cls: 'bg-amber-400/10 text-amber-400'  },
} as const

/* ── Type helpers ────────────────────────────────────────────────────────── */
type WorkOrder = {
  id: string
  order_number: string | null
  type: string | null
  status: string | null
  priority: string | null
  scheduled_date: string | null
  created_at: string | null
  assigned_profile: { full_name: string } | null
}

type Asset = {
  id: string
  name: string | null
  model: string | null
  serial_number: string | null
  brand: string | null
  status: string | null
  last_maintenance_date: string | null
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default async function PortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get profile with customer_id
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role, full_name, customer_id, email')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as unknown as {
    role: string | null
    full_name: string | null
    customer_id: string | null
    email: string | null
  } | null

  if (!profile || profile.role !== 'client') redirect('/dashboard')

  // Resolve customer_id — fallback: match by email if customer_id column doesn't exist
  let customerId: string | null = profile.customer_id ?? null

  if (!customerId) {
    const emailToMatch = profile.email ?? user.email
    if (emailToMatch) {
      const { data: customerByEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', emailToMatch)
        .limit(1)
        .single()
      customerId = (customerByEmail as unknown as { id: string } | null)?.id ?? null
    }
  }

  if (!customerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8 py-24 text-center">
        <Building2 size={40} className="text-ink-tertiary" />
        <p className="text-base font-medium text-ink-primary">Sin empresa asociada</p>
        <p className="text-sm text-ink-tertiary">
          Tu cuenta no está vinculada a una empresa. Contacta al administrador.
        </p>
      </div>
    )
  }

  const today    = todayISO()
  const mStart   = monthStart()

  // assets don't have customer_id directly — resolve via sites
  const { data: sitesRaw } = await supabase
    .from('sites').select('id').eq('customer_id', customerId)
  const siteIds = (sitesRaw as unknown as { id: string }[] | null ?? []).map(s => s.id)

  // Parallel queries
  const [
    { data: customerRaw },
    { data: contractRaw },
    { data: ordersRaw },
    { data: assetsRaw },
    { data: openOrdersRaw },
    { data: monthDoneRaw },
    { data: nextPMRaw },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('name, phone, email')
      .eq('id', customerId)
      .single(),

    supabase
      .from('contracts')
      .select('id, type, status, start_date, end_date, value, visits_per_year')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('end_date')
      .limit(1)
      .single(),

    // Last 10 work orders with assigned technician name
    supabase
      .from('work_orders')
      .select('id, order_number, type, status, priority, scheduled_date, created_at, assigned_to')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Top 8 active assets via site_id (assets don't have customer_id column)
    siteIds.length > 0
      ? supabase
          .from('assets')
          .select('id, name, model, serial_number, brand, status, last_maintenance_date')
          .in('site_id', siteIds)
          .neq('status', 'retired')
          .order('name')
          .limit(8)
      : Promise.resolve({ data: [], error: null }),

    // Open OTs count
    supabase
      .from('work_orders')
      .select('id')
      .eq('customer_id', customerId)
      .not('status', 'in', '("completed","cancelled")'),

    // Completed this month
    supabase
      .from('work_orders')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gte('scheduled_date', mStart)
      .lte('scheduled_date', today),

    // Next scheduled preventive
    supabase
      .from('work_orders')
      .select('scheduled_date')
      .eq('customer_id', customerId)
      .eq('type', 'preventive')
      .eq('status', 'scheduled')
      .gte('scheduled_date', today)
      .order('scheduled_date')
      .limit(1)
      .single(),
  ])

  const customer  = customerRaw as unknown as { name: string; phone: string | null; email: string | null } | null
  const contract  = contractRaw as unknown as {
    id: string; type: string; status: string; start_date: string | null;
    end_date: string | null; value: number | null; visits_per_year: number | null
  } | null

  // Fetch technician names for orders that have assigned_to
  const orders = (ordersRaw ?? []) as unknown as (WorkOrder & { assigned_to: string | null })[]

  const assignedIds = [...new Set(orders.map(o => o.assigned_to).filter(Boolean))] as string[]
  let techMap: Record<string, string> = {}
  if (assignedIds.length > 0) {
    const { data: techsRaw } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', assignedIds)
    const techs = techsRaw as unknown as { id: string; full_name: string }[] | null
    techMap = Object.fromEntries((techs ?? []).map(t => [t.id, t.full_name]))
  }

  const ordersWithTech: WorkOrder[] = orders.map(o => ({
    ...o,
    assigned_profile: o.assigned_to ? { full_name: techMap[o.assigned_to] ?? 'Sin asignar' } : null,
  }))

  const assets        = assetsRaw as unknown as Asset[] | null
  const openCount     = openOrdersRaw?.length ?? 0
  const monthDone     = monthDoneRaw?.length ?? 0
  const activeAssets  = assets?.length ?? 0
  const nextPM        = (nextPMRaw as unknown as { scheduled_date: string | null } | null)?.scheduled_date ?? null
  const companyName   = customer?.name ?? 'Mi Empresa'

  const contractStatus = (contract?.status ?? null) as keyof typeof CONTRACT_STATUS_BADGE | null
  const contractBadge  = contractStatus ? CONTRACT_STATUS_BADGE[contractStatus] : null

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-ink-tertiary">Portal Cliente</p>
            <h1 className="font-display text-xl font-bold text-ink-primary truncate">
              Bienvenido, {companyName}
            </h1>
          </div>
          {contractBadge && (
            <span className={cn('flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold', contractBadge.cls)}>
              {contractBadge.label}
            </span>
          )}
        </div>
        {contract?.end_date && (
          <p className="mt-1 text-xs text-ink-tertiary">
            Contrato vigente hasta {fmtDate(contract.end_date)}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ── KPIs ── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Resumen</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={<ClipboardList size={20} className="text-volt-500" />}
              label="OTs abiertas"
              value={openCount}
              sub="en curso o programadas"
              accent="volt"
            />
            <KpiCard
              icon={<CheckCircle2 size={20} className="text-success" />}
              label="Completadas (mes)"
              value={monthDone}
              sub="este mes"
              accent="success"
            />
            <KpiCard
              icon={<Cpu size={20} className="text-blue-400" />}
              label="Equipos activos"
              value={activeAssets}
              sub="en operación"
              accent="blue"
            />
            <KpiCard
              icon={<CalendarCheck2 size={20} className="text-amber-400" />}
              label="Próximo PM"
              value={nextPM ? fmtDate(nextPM) : 'Sin agendar'}
              sub="mantenimiento preventivo"
              accent="amber"
              small={!!nextPM}
            />
          </div>
        </section>

        {/* ── CTA: Solicitar servicio ── */}
        <Link
          href="/portal/solicitud"
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl',
            'bg-volt-500 px-4 py-3 text-sm font-semibold text-ink-inverse',
            'hover:bg-volt-400 active:bg-volt-600 transition-colors',
          )}
        >
          <Plus size={18} strokeWidth={2.5} />
          Solicitar servicio
        </Link>

        {/* ── Mis Órdenes de Trabajo ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Mis Órdenes · {ordersWithTech.length}
            </h2>
          </div>

          {ordersWithTech.length === 0 ? (
            <EmptySlot message="No tienes órdenes de trabajo registradas" />
          ) : (
            <div className="flex flex-col gap-2">
              {ordersWithTech.map((o) => {
                const status = (o.status ?? 'scheduled') as OtStatus
                const priority = (o.priority ?? 'low') as Priority
                const cfg = STATUS_CFG[status] ?? STATUS_CFG.scheduled
                const pcfg = PRIORITY_CFG[priority] ?? PRIORITY_CFG.low
                const typeLabel = TYPE_LABELS[o.type ?? ''] ?? o.type ?? '—'
                return (
                  <div
                    key={o.id}
                    className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3"
                  >
                    <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink-primary font-mono">
                          {o.order_number || '—'}
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', pcfg.cls)}>
                          {pcfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {typeLabel}
                        {o.assigned_profile?.full_name ? ` · ${o.assigned_profile.full_name}` : ''}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
                        <span className="text-xs text-ink-tertiary">
                          {o.scheduled_date ? fmtDate(o.scheduled_date) : fmtDate(o.created_at?.split('T')[0])}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Mis Equipos ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Mis Equipos · {activeAssets}
            </h2>
          </div>

          {(assets ?? []).length === 0 ? (
            <EmptySlot message="No tienes equipos registrados" />
          ) : (
            <div className="flex flex-col gap-2">
              {(assets ?? []).map((a) => {
                const asCfg = ASSET_STATUS_CFG[a.status ?? ''] ?? ASSET_STATUS_CFG.operational
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3"
                  >
                    <Cpu size={16} className={cn('flex-shrink-0', asCfg.cls)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{a.name ?? '—'}</p>
                      <p className="text-xs text-ink-tertiary truncate">
                        {[a.brand, a.model].filter(Boolean).join(' · ')}
                        {a.serial_number ? ` · S/N ${a.serial_number}` : ''}
                      </p>
                      {a.last_maintenance_date && (
                        <p className="text-xs text-ink-tertiary mt-0.5">
                          Último mant. {fmtDate(a.last_maintenance_date)}
                        </p>
                      )}
                    </div>
                    <span className={cn('flex-shrink-0 text-xs font-medium', asCfg.cls)}>
                      {asCfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

/* ── Lookups ─────────────────────────────────────────────────────────────── */
const TYPE_LABELS: Record<string, string> = {
  preventive:   'Preventivo',
  corrective:   'Correctivo',
  emergency:    'Emergencia',
  installation: 'Instalación',
  inspection:   'Inspección',
}

const ASSET_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  operational: { label: 'Operativo',  cls: 'text-success'      },
  degraded:    { label: 'Degradado',  cls: 'text-amber-400'    },
  critical:    { label: 'Crítico',    cls: 'text-critical'     },
  retired:     { label: 'Retirado',   cls: 'text-ink-tertiary' },
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function KpiCard({
  icon, label, value, sub, accent, small,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  accent: string
  small?: boolean
}) {
  const borderCls =
    accent === 'volt'    ? 'border-volt-500/30'    :
    accent === 'success' ? 'border-success/30'     :
    accent === 'blue'    ? 'border-blue-500/30'    :
    accent === 'amber'   ? 'border-amber-400/30'   : 'border-border-subtle'

  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border bg-surface-1 p-4', borderCls)}>
      <div className="flex items-center justify-between">
        {icon}
        <ChevronRight size={14} className="text-ink-tertiary" />
      </div>
      <p className={cn('mt-2 font-bold text-ink-primary', small ? 'text-base' : 'text-2xl')}>
        {value}
      </p>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </div>
  )
}

function EmptySlot({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-4 py-8 text-center">
      <p className="text-sm text-ink-tertiary">{message}</p>
    </div>
  )
}
