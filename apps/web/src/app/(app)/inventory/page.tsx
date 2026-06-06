import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Plus, Wrench, Truck, AlertTriangle,
  CheckCircle2, ChevronRight, MapPin, Building2,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  stock:     { label: 'En stock',    cls: 'bg-success/20 text-success',          icon: CheckCircle2, dot: 'bg-success'      },
  deployed:  { label: 'Operación',   cls: 'bg-blue-500/20 text-blue-400',        icon: Truck,        dot: 'bg-blue-400'     },
  workshop:  { label: 'Taller',      cls: 'bg-amber-500/20 text-amber-400',      icon: Wrench,       dot: 'bg-amber-400'    },
  transit:   { label: 'En tránsito', cls: 'bg-purple-500/20 text-purple-400',    icon: Truck,        dot: 'bg-purple-400'   },
  retired:   { label: 'Retirado',    cls: 'bg-surface-3 text-ink-tertiary',      icon: Package,      dot: 'bg-ink-tertiary' },
} as const

const CATEGORY_LABEL: Record<string, string> = {
  ups: 'UPS', battery_bank: 'Banco Baterías', module: 'Módulo', cooling: 'Enfriamiento',
  ats: 'ATS', software: 'Software', accessory: 'Accesorio', other: 'Otro',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

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
  const inStock  = all.filter(i => i.status === 'stock')
  const deployed = all.filter(i => i.status === 'deployed')
  const workshop = all.filter(i => i.status === 'workshop')
  const transit  = all.filter(i => i.status === 'transit')

  // Alertas: equipos en taller SIN reemplazo asignado
  const workshopNoReplacement = workshop.filter(i => !(i as any).replaced_by)

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
            {canEdit && (
              <Link href="/inventory/new"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Plus size={16} strokeWidth={2.5} />Unidad
              </Link>
            )}
          </div>
        </div>

        {/* KPIs de estado */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[
            { label: 'Stock', count: inStock.length, cls: 'text-success' },
            { label: 'Operación', count: deployed.length, cls: 'text-blue-400' },
            { label: 'Taller', count: workshop.length, cls: workshop.length > 0 ? 'text-amber-400' : 'text-ink-tertiary' },
            { label: 'Tránsito', count: transit.length, cls: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-surface-2 px-2 py-2 text-center">
              <p className={cn('text-lg font-bold', s.cls)}>{s.count}</p>
              <p className="text-xs text-ink-tertiary leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Alertas: en taller sin reemplazo */}
        {workshopNoReplacement.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400">
                En taller sin reemplazo · {workshopNoReplacement.length}
              </h2>
            </div>
            {workshopNoReplacement.map(i => {
              const prod = (i as any).products as { description: string; brand: string | null } | null
              const cust = (i as any).customers as { name: string } | null
              return (
                <div key={i.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-ink-primary truncate">{prod?.description} · {i.serial_number ?? i.item_code}</span>
                  <span className="text-amber-400 text-xs flex-shrink-0 ml-2">{cust?.name}</span>
                </div>
              )
            })}
          </section>
        )}

        {/* Equipos en operación (alquiler) */}
        {deployed.length > 0 && (
          <InventorySection title="En operación" items={deployed} canEdit={canEdit} />
        )}

        {/* En stock */}
        {inStock.length > 0 && (
          <InventorySection title="Disponibles en stock" items={inStock} canEdit={canEdit} />
        )}

        {/* En taller */}
        {workshop.length > 0 && (
          <InventorySection title="En taller" items={workshop} canEdit={canEdit} />
        )}

        {/* En tránsito */}
        {transit.length > 0 && (
          <InventorySection title="En tránsito" items={transit} canEdit={canEdit} />
        )}

        {all.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Package size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin unidades registradas</p>
              {canEdit && <p className="mt-1 text-sm text-ink-tertiary">Agrega los equipos del inventario</p>}
            </div>
            {canEdit && (
              <Link href="/inventory/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Agregar unidad
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InventorySection({ title, items, canEdit }: { title: string; items: any[]; canEdit: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">{title} · {items.length}</h2>
      <div className="flex flex-col gap-2">
        {items.map(item => {
          const prod     = item.products     as { description: string; brand: string | null; model: string | null; power_kva: number | null; category: string; final_price: number | null; is_rentable: boolean } | null
          const customer = item.customers    as { id: string; name: string } | null
          const site     = item.sites        as { name: string } | null
          const replaced = item.replaced_by  as { serial_number: string | null; item_code: string | null } | null
          const cfg      = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.stock
          return (
            <Link key={item.id} href={`/inventory/${item.id}`}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-primary truncate">{prod?.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {prod?.brand && <span className="text-xs text-ink-tertiary">{prod.brand}</span>}
                    {prod?.model && <span className="text-xs text-ink-tertiary">· {prod.model}</span>}
                    {prod?.power_kva && <span className="text-xs text-volt-400 font-medium">· {prod.power_kva} kVA</span>}
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-tertiary">
                    {item.serial_number ?? item.item_code ?? '—'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <ChevronRight size={14} className="text-ink-tertiary" />
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cfg.cls)}>{cfg.label}</span>
                </div>
              </div>

              {/* Detalles según estado */}
              {item.status === 'deployed' && customer && (
                <div className="mt-2 border-t border-border-subtle pt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-ink-secondary">
                    <Building2 size={11} />{customer.name}
                  </span>
                  {site && <span className="flex items-center gap-1 text-ink-tertiary"><MapPin size={11} />{site.name}</span>}
                  {item.rental_monthly_rate && (
                    <span className="ml-auto text-success font-semibold">
                      {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(item.rental_monthly_rate)}/mes
                    </span>
                  )}
                </div>
              )}
              {item.status === 'workshop' && (
                <div className="mt-2 border-t border-border-subtle pt-2 flex items-center justify-between text-xs">
                  <span className="text-amber-400">{item.workshop_reason ?? 'En reparación'}</span>
                  {replaced
                    ? <span className="text-success">Reemplazo: {replaced.serial_number ?? replaced.item_code}</span>
                    : <span className="text-critical font-semibold">Sin reemplazo asignado</span>
                  }
                </div>
              )}
              {item.location && item.status === 'stock' && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-tertiary">
                  <MapPin size={11} />{item.location}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
