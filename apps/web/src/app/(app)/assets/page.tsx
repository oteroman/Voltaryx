import { createClient } from '@/lib/supabase/server'
import Link             from 'next/link'
import { Cpu, Plus, AlertTriangle, CheckCircle, AlertCircle, XCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  operational: { label: 'Operativo',  Icon: CheckCircle,   cls: 'text-success'      },
  degraded:    { label: 'Degradado',  Icon: AlertTriangle, cls: 'text-amber-400'    },
  critical:    { label: 'Crítico',    Icon: AlertCircle,   cls: 'text-critical'     },
  retired:     { label: 'Retirado',   Icon: XCircle,       cls: 'text-ink-tertiary' },
} as const

const CATEGORY_LABEL: Record<string, string> = {
  ups:          'UPS',
  stabilizer:   'Estabilizador',
  battery_bank: 'Banco Baterías',
  precision_ac: 'A/C Precisión',
  other:        'Otro',
}

export default async function AssetsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role    = (profile?.role ?? 'technician') as string
  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  const { data: assets } = await supabase
    .from('assets')
    .select(`
      id, name, brand, model, serial_number, capacity_kva, status,
      asset_types(name, category),
      sites(name, customers(name))
    `)
    .eq('is_active', true)
    .order('status')
    .order('name')

  const criticalCount = assets?.filter(a => a.status === 'critical').length  ?? 0
  const degradedCount = assets?.filter(a => a.status === 'degraded').length  ?? 0

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Activos</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{assets?.length ?? 0} equipos</p>
          </div>
          {canEdit && (
            <Link href="/assets/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={16} strokeWidth={2.5} />
              Nuevo
            </Link>
          )}
        </div>
        {(criticalCount > 0 || degradedCount > 0) && (
          <div className="mt-3 flex gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-critical/10 px-3 py-1 text-xs font-medium text-critical">
                <AlertCircle size={12} />{criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {degradedCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                <AlertTriangle size={12} />{degradedCount} degradado{degradedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-2 px-4 py-4">
        {(assets ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Cpu size={32} className="text-ink-tertiary" />
            <p className="text-sm text-ink-tertiary">No hay activos registrados</p>
          </div>
        ) : (
          (assets ?? []).map((a) => {
            const st   = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.operational
            const type = a.asset_types as unknown as { name: string; category: string } | null
            const site = a.sites as unknown as { name: string; customers: { name: string } | null } | null
            return (
              <Link key={a.id} href={`/assets/${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3')}>
                  <st.Icon size={18} className={st.cls} />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-ink-primary truncate">{a.name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                    {type && <span>{CATEGORY_LABEL[type.category] ?? type.category}</span>}
                    {a.brand && <><span>·</span><span>{a.brand}</span></>}
                    {a.capacity_kva && <><span>·</span><span>{a.capacity_kva} kVA</span></>}
                  </div>
                  {site && (
                    <span className="text-xs text-ink-tertiary truncate">
                      {site.customers?.name} — {site.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={cn('flex items-center gap-1 text-xs font-medium', st.cls)}>
                    <st.Icon size={12} />{st.label}
                  </span>
                  <ChevronRight size={15} className="text-ink-tertiary" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
