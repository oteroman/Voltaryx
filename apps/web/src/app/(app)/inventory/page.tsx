import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { InventoryList } from './inventory-list'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string

  const { data: items } = await supabase
    .from('inventory_items')
    .select(`
      id, serial_number, item_code, status, location,
      deployed_at, rental_monthly_rate, workshop_reason, workshop_since,
      products(id, description, brand, model, power_kva, category, final_price, is_rentable),
      customers(id, name),
      sites(name),
      replaced_by:replaced_by_item_id(id, serial_number, item_code)
    `)
    .order('status').order('created_at')

  const all      = items ?? []
  const inStock  = all.filter(i => i.status === 'stock').length
  const deployed = all.filter(i => i.status === 'deployed').length
  const workshop = all.filter(i => i.status === 'workshop').length
  const transit  = all.filter(i => i.status === 'transit').length

  const canEdit = ['tenant_admin', 'supervisor', 'commercial'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Inventario</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{all.length} unidades totales</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/products"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              Catálogo
            </Link>
            {['tenant_admin', 'supervisor'].includes(role) && (
              <Link href="/purchases"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
                <ShoppingCart size={15} />Compras
              </Link>
            )}
            {canEdit && (
              <Link href="/inventory/new"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Plus size={16} strokeWidth={2.5} />Unidad
              </Link>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[
            { label: 'Stock',     count: inStock,  cls: 'text-success'                              },
            { label: 'Operación', count: deployed, cls: 'text-blue-400'                             },
            { label: 'Taller',    count: workshop, cls: workshop > 0 ? 'text-amber-400' : 'text-ink-tertiary' },
            { label: 'Tránsito',  count: transit,  cls: 'text-purple-400'                           },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-surface-2 px-2 py-2 text-center">
              <p className={cn('text-lg font-bold', s.cls)}>{s.count}</p>
              <p className="text-xs text-ink-tertiary leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <InventoryList items={all} canEdit={canEdit} />
    </div>
  )
}
