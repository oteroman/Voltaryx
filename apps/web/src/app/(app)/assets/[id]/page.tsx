import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link         from 'next/link'
import { ArrowLeft, Cpu, Calendar, Hash, Zap, MapPin, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  operational: { label: 'Operativo', Icon: CheckCircle,   cls: 'text-success',    bg: 'bg-success/10'   },
  degraded:    { label: 'Degradado', Icon: AlertTriangle, cls: 'text-amber-400',  bg: 'bg-amber-500/10' },
  critical:    { label: 'Crítico',   Icon: AlertCircle,   cls: 'text-critical',   bg: 'bg-critical/10'  },
  retired:     { label: 'Retirado',  Icon: Cpu,           cls: 'text-ink-tertiary', bg: 'bg-surface-3'  },
} as const

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

  const st     = STATUS_CFG[asset.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.operational
  const type   = asset.asset_types as unknown as { name: string; category: string } | null
  const site   = asset.sites     as unknown as { name: string; address: string | null; customers: { name: string; id: string } | null } | null

  // Últimas órdenes que incluyeron este activo
  const { data: history } = await supabase
    .from('work_order_assets')
    .select('work_orders(id, order_number, type, status, scheduled_date, completed_at)')
    .eq('asset_id', params.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/assets" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-primary truncate">{asset.name}</h1>
          {type && <p className="text-xs text-ink-tertiary">{type.name}</p>}
        </div>
        <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', st.bg, st.cls)}>
          <st.Icon size={12} />{st.label}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Info técnica */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex flex-col gap-3">
          {asset.brand && asset.model && (
            <Row icon={<Cpu size={15} />} label="Equipo" value={`${asset.brand} ${asset.model}`} />
          )}
          {asset.serial_number && (
            <Row icon={<Hash size={15} />} label="Serie" value={asset.serial_number} mono />
          )}
          {asset.capacity_kva && (
            <Row icon={<Zap size={15} />} label="Capacidad" value={`${asset.capacity_kva} kVA`} />
          )}
          {asset.installation_date && (
            <Row icon={<Calendar size={15} />} label="Instalación"
              value={new Date(asset.installation_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
          {site && (
            <Row icon={<MapPin size={15} />} label="Ubicación"
              value={`${site.customers?.name ?? ''} — ${site.name}`} />
          )}
        </section>

        {/* Historial de órdenes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-secondary">
            Historial de servicio
          </h2>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-ink-tertiary">Sin órdenes de servicio registradas</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(history ?? []).map((h) => {
                const wo = h.work_orders as unknown as {
                  id: string; order_number: string; type: string; status: string;
                  scheduled_date: string; completed_at: string | null
                } | null
                if (!wo) return null
                return (
                  <Link key={wo.id} href={`/orders/${wo.id}`}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <div>
                      <p className="font-mono text-xs text-volt-500">{wo.order_number}</p>
                      <p className="text-sm text-ink-primary capitalize">{wo.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-tertiary">
                        {new Date(wo.scheduled_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className={cn('text-xs font-medium capitalize',
                        wo.status === 'completed' ? 'text-success' :
                        wo.status === 'in_progress' ? 'text-volt-500' : 'text-ink-tertiary'
                      )}>
                        {wo.status === 'completed' ? 'Completado' :
                         wo.status === 'in_progress' ? 'En progreso' :
                         wo.status === 'scheduled' ? 'Programado' : wo.status}
                      </p>
                    </div>
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

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-tertiary flex-shrink-0">{icon}</span>
      <span className="text-xs text-ink-tertiary w-20 flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-ink-primary', mono && 'font-mono')}>{value}</span>
    </div>
  )
}
