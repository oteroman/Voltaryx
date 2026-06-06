import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Cpu, MapPin, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const supabase = createClient()

  const { data: assets } = await supabase
    .from('assets')
    .select('id, name, brand, model, serial_number, status, sites ( name, customers ( name ) )')
    .eq('is_active', true)
    .order('name')

  const list = (assets ?? []) as unknown as Array<{
    id: string; name: string; brand: string | null; model: string | null
    serial_number: string | null; status: string
    sites: { name: string; customers: { name: string } | null } | null
  }>

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-ink-primary">Activos</h1>
        <p className="text-sm text-ink-tertiary">{list.length} equipos</p>
      </header>

      <div className="flex flex-col gap-2 px-4 py-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Cpu size={32} className="text-ink-tertiary" />
            <p className="text-base font-medium text-ink-secondary">Sin activos asignados</p>
            <p className="text-sm text-ink-tertiary">
              Los activos aparecerán aquí cuando sean asociados a tu empresa
            </p>
          </div>
        ) : (
          list.map(asset => (
            <div
              key={asset.id}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-tertiary">
                <Cpu size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-medium text-ink-primary">
                  {`${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || asset.name}
                </p>
                {asset.sites && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="flex-shrink-0 text-ink-tertiary" />
                    <span className="truncate text-xs text-ink-tertiary">
                      {asset.sites.customers?.name} · {asset.sites.name}
                    </span>
                  </div>
                )}
                {asset.serial_number && (
                  <p className="font-mono text-xs text-ink-tertiary">SN: {asset.serial_number}</p>
                )}
              </div>
              <Badge
                variant={asset.status === 'operational' ? 'completed' : asset.status === 'critical' ? 'critical' : 'high'}
                label={asset.status === 'operational' ? 'OK' : asset.status}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
