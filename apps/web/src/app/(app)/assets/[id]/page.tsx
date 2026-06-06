import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'
import {
  ArrowLeft, Cpu, Calendar, Hash, Zap, MapPin,
  AlertCircle, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, Wrench, FileText, Clock,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────────────

type AssetRow = {
  id: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  capacity_kva: number | null
  status: string
  installation_date: string | null
  warranty_expiry: string | null
  location_notes: string | null
  is_active: boolean
  asset_types: { name: string; category: string } | null
  sites: { name: string; address: string | null; customers: { name: string; id: string } | null } | null
}

type WorkOrder = {
  id: string
  order_number: string
  type: string
  status: string
  priority: string
  scheduled_date: string
  completed_at: string | null
}

// ── Status config (real DB values) ───────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; Icon: React.ElementType; cls: string; bg: string }> = {
  operational: { label: 'Operativo',    Icon: CheckCircle,   cls: 'text-success',      bg: 'bg-success/20'        },
  degraded:    { label: 'Degradado',    Icon: AlertTriangle, cls: 'text-amber-400',    bg: 'bg-amber-500/20'      },
  critical:    { label: 'Crítico',      Icon: AlertCircle,   cls: 'text-critical',     bg: 'bg-critical/20'       },
  retired:     { label: 'Retirado',     Icon: XCircle,       cls: 'text-ink-tertiary', bg: 'bg-surface-3'         },
}

// ── Work-order display ────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  preventive:   'Preventivo',
  corrective:   'Correctivo',
  emergency:    'Emergencia',
  installation: 'Instalación',
  inspection:   'Inspección',
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Programada',  cls: 'bg-surface-3 text-ink-secondary'   },
  in_transit:  { label: 'En camino',   cls: 'bg-blue-500/20 text-blue-400'      },
  on_site:     { label: 'En sitio',    cls: 'bg-purple-500/20 text-purple-400'  },
  in_progress: { label: 'En progreso', cls: 'bg-volt-500/20 text-volt-400'      },
  completed:   { label: 'Completada',  cls: 'bg-success/20 text-success'        },
  cancelled:   { label: 'Cancelada',   cls: 'bg-surface-3 text-ink-tertiary'    },
}

const PRIORITY_CLS: Record<string, string> = {
  low:      'text-ink-tertiary',
  normal:   'text-ink-secondary',
  high:     'text-amber-400',
  critical: 'text-critical',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function warrantyClass(iso: string | null): string {
  if (!iso) return 'text-ink-primary'
  const msLeft = new Date(iso).getTime() - Date.now()
  const daysLeft = msLeft / 86_400_000
  if (daysLeft < 0)  return 'text-critical font-semibold'
  if (daysLeft < 90) return 'text-amber-400 font-semibold'
  return 'text-ink-primary'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: asset } = await supabase
    .from('assets')
    .select(`
      *,
      asset_types(name, category),
      sites(name, address, customers(name, id))
    `)
    .eq('id', params.id)
    .single()

  if (!asset) notFound()

  const a    = asset as unknown as AssetRow
  const st   = STATUS_CFG[a.status] ?? STATUS_CFG.operational
  const type = a.asset_types
  const site = a.sites

  // Work-order history via junction table (real schema uses work_order_assets)
  const { data: woa } = await supabase
    .from('work_order_assets')
    .select(`
      work_orders(
        id, order_number, type, status, priority,
        scheduled_date, completed_at
      )
    `)
    .eq('asset_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const orders: WorkOrder[] = (woa ?? [])
    .map(row => row.work_orders as unknown as WorkOrder | null)
    .filter((wo): wo is WorkOrder => wo !== null)

  // Derive "last maintenance" from last completed preventive/corrective order
  const lastMaint = orders.find(o =>
    o.status === 'completed' &&
    ['preventive', 'corrective'].includes(o.type)
  )
  const nextScheduled = orders.find(o =>
    o.status === 'scheduled' &&
    o.type === 'preventive'
  )

  return (
    <div className="flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/assets"
          className="flex h-touch w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-primary truncate">{a.name}</h1>
          {type && <p className="text-xs text-ink-tertiary">{type.name}</p>}
        </div>
        <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', st.bg, st.cls)}>
          <st.Icon size={12} />{st.label}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5">

        {/* ── Ficha técnica ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <SectionTitle>Ficha técnica</SectionTitle>

          {(a.brand || a.model) && (
            <Row icon={<Cpu size={15} />} label="Marca / Modelo">
              {[a.brand, a.model].filter(Boolean).join(' ')}
            </Row>
          )}

          {a.serial_number && (
            <Row icon={<Hash size={15} />} label="N.º de serie">
              <span className="font-mono text-sm">{a.serial_number}</span>
            </Row>
          )}

          {a.capacity_kva && (
            <Row icon={<Zap size={15} />} label="Capacidad">
              {a.capacity_kva} kVA
            </Row>
          )}

          {site && (
            <Row icon={<MapPin size={15} />} label="Cliente / Sitio">
              {site.customers?.name && (
                <Link href={`/customers/${site.customers.id}`}
                  className="text-volt-400 hover:underline">
                  {site.customers.name}
                </Link>
              )}
              {site.customers?.name && ' — '}
              {site.name}
              {site.address && (
                <span className="block text-xs text-ink-tertiary mt-0.5">{site.address}</span>
              )}
            </Row>
          )}

          {a.installation_date && (
            <Row icon={<Calendar size={15} />} label="Instalación">
              {fmtDate(a.installation_date)}
            </Row>
          )}

          {a.warranty_expiry && (
            <Row icon={<Clock size={15} />} label="Vto. garantía">
              <span className={warrantyClass(a.warranty_expiry)}>
                {fmtDate(a.warranty_expiry)}
                {new Date(a.warranty_expiry).getTime() < Date.now() && (
                  <span className="ml-1.5 text-xs font-normal text-critical">(vencida)</span>
                )}
                {new Date(a.warranty_expiry).getTime() >= Date.now() &&
                  (new Date(a.warranty_expiry).getTime() - Date.now()) / 86_400_000 < 90 && (
                  <span className="ml-1.5 text-xs font-normal text-amber-400">(&lt;90 días)</span>
                )}
              </span>
            </Row>
          )}

          {a.location_notes && (
            <Row icon={<FileText size={15} />} label="Notas">
              <span className="text-ink-secondary">{a.location_notes}</span>
            </Row>
          )}
        </section>

        {/* ── Estado de mantenimiento ────────────────────────────────────── */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <SectionTitle>Mantenimiento</SectionTitle>

          <Row icon={<Wrench size={15} />} label="Último PM">
            {lastMaint
              ? fmtDate(lastMaint.completed_at ?? lastMaint.scheduled_date)
              : <span className="text-ink-tertiary">Sin registro</span>}
          </Row>

          <Row icon={<Calendar size={15} />} label="Próximo PM">
            {nextScheduled
              ? (
                <span className={cn(
                  (() => {
                    const daysLeft = (new Date(nextScheduled.scheduled_date).getTime() - Date.now()) / 86_400_000
                    if (daysLeft < 0)  return 'text-critical font-semibold'
                    if (daysLeft < 30) return 'text-amber-400 font-semibold'
                    return 'text-success font-semibold'
                  })()
                )}>
                  {fmtDate(nextScheduled.scheduled_date)}
                </span>
              )
              : <span className="text-ink-tertiary">No programado</span>}
          </Row>

          <div className="px-4 py-3">
            <Link
              href={`/orders/new?assetId=${a.id}&type=preventive`}
              className="flex h-touch items-center justify-center gap-2 rounded-lg bg-volt-500 px-4 text-sm font-semibold text-void hover:bg-volt-400 transition-colors w-full">
              <Wrench size={15} />
              Programar PM
            </Link>
          </div>
        </section>

        {/* ── Historial de OTs ──────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Historial de servicio{orders.length > 0 && ` · ${orders.length}`}
          </h2>

          {orders.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-10 text-center">
              <p className="text-sm text-ink-tertiary">Sin órdenes de servicio registradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map(o => {
                const sCfg = ORDER_STATUS[o.status] ?? ORDER_STATUS.scheduled
                return (
                  <Link key={o.id} href={`/orders/${o.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-volt-400">{o.order_number}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sCfg.cls)}>
                          {sCfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-ink-primary">
                        {TYPE_LABEL[o.type] ?? o.type}
                      </p>
                      <p className="text-xs text-ink-tertiary">
                        {fmtDate(o.scheduled_date)}
                        {o.priority && o.priority !== 'normal' && (
                          <span className={cn('ml-2 capitalize', PRIORITY_CLS[o.priority])}>
                            · {o.priority === 'critical' ? 'Crítico' :
                               o.priority === 'high'     ? 'Alto'    :
                               o.priority === 'low'      ? 'Bajo'    : o.priority}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight size={14} className="flex-shrink-0 text-ink-tertiary" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">{children}</h2>
    </div>
  )
}

function Row({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 flex-shrink-0 text-ink-tertiary">{icon}</span>
      <span className="w-28 flex-shrink-0 text-sm text-ink-tertiary">{label}</span>
      <span className="text-sm text-ink-primary">{children}</span>
    </div>
  )
}
