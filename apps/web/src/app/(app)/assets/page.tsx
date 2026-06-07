import { createClient } from '@/lib/supabase/server'
import Link             from 'next/link'
import { Plus, AlertTriangle, AlertCircle } from 'lucide-react'
import { AssetsList } from './assets-list'

export const dynamic = 'force-dynamic'

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

  const criticalCount = assets?.filter(a => a.status === 'critical').length ?? 0
  const degradedCount = assets?.filter(a => a.status === 'degraded').length ?? 0

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

      <AssetsList assets={assets ?? []} canEdit={canEdit} />
    </div>
  )
}
