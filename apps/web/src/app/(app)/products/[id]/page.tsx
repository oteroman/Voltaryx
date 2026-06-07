import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Package, Zap, Tag, Repeat,
  CheckCircle2, MapPin, Plus, FileText, AlertTriangle, ShoppingCart,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const CATEGORY_CFG: Record<string, { label: string; cls: string }> = {
  ups:          { label: 'UPS',            cls: 'bg-volt-500/20 text-volt-400'     },
  battery_bank: { label: 'Banco Baterías', cls: 'bg-blue-500/20 text-blue-400'     },
  module:       { label: 'Módulo',         cls: 'bg-purple-500/20 text-purple-400' },
  cooling:      { label: 'Enfriamiento',   cls: 'bg-cyan-500/20 text-cyan-400'     },
  ats:          { label: 'ATS',            cls: 'bg-amber-500/20 text-amber-400'   },
  software:     { label: 'Software',       cls: 'bg-success/20 text-success'       },
  accessory:    { label: 'Accesorio',      cls: 'bg-surface-3 text-ink-secondary'  },
  other:        { label: 'Otro',           cls: 'bg-surface-3 text-ink-tertiary'   },
}

const ITEM_STATUS: Record<string, { label: string; dot: string; cls: string }> = {
  stock:    { label: 'En stock',    dot: 'bg-success',      cls: 'text-success'      },
  deployed: { label: 'Operación',   dot: 'bg-blue-400',     cls: 'text-blue-400'     },
  workshop: { label: 'Taller',      dot: 'bg-amber-400',    cls: 'text-amber-400'    },
  transit:  { label: 'En tránsito', dot: 'bg-purple-400',   cls: 'text-purple-400'   },
  retired:  { label: 'Retirado',    dot: 'bg-ink-tertiary', cls: 'text-ink-tertiary' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const isAdmin = role === 'tenant_admin'
  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!product) notFound()

  // Inventory units for this product
  const { data: unitsRaw } = await supabase
    .from('inventory_items')
    .select('id, serial_number, item_code, status, location, rental_monthly_rate, customers(name), sites(name)')
    .eq('product_id', params.id)
    .order('status').order('created_at')

  const units = (unitsRaw ?? []) as unknown as {
    id: string
    serial_number: string | null
    item_code: string | null
    status: string
    location: string | null
    rental_monthly_rate: number | null
    customers: { name: string } | null
    sites: { name: string } | null
  }[]

  const catCfg = CATEGORY_CFG[product.category] ?? CATEGORY_CFG.other

  // Unit counts by status
  const inStock  = units.filter(u => u.status === 'stock').length
  const deployed = units.filter(u => u.status === 'deployed').length
  const workshop = units.filter(u => u.status === 'workshop').length

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/products"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-base font-bold text-ink-primary truncate">{product.description}</h1>
          {(product.brand || product.model) && (
            <p className="text-xs text-ink-tertiary truncate">
              {[product.brand, product.model].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', catCfg.cls)}>
          {catCfg.label}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5">

        {/* Alerta stock mínimo */}
        {(product.stock_min ?? 0) > 0 && inStock < (product.stock_min ?? 0) && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-400">Stock bajo mínimo</p>
                <p className="text-xs text-amber-300/70">
                  {inStock} en stock · mínimo {product.stock_min}
                </p>
              </div>
            </div>
            <Link href={`/purchases/new`}
              className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 transition-colors">
              <ShoppingCart size={12} />OC
            </Link>
          </div>
        )}

        {/* Disponibilidad rápida */}
        <div className={cn('grid gap-2', (product.stock_min ?? 0) > 0 ? 'grid-cols-4' : 'grid-cols-3')}>
          <StockPill label="En stock" count={inStock}
            cls={inStock < (product.stock_min ?? 0) && (product.stock_min ?? 0) > 0 ? 'text-amber-400' : 'text-success'} />
          <StockPill label="Operación" count={deployed} cls="text-blue-400" />
          <StockPill label="Taller" count={workshop} cls={workshop > 0 ? 'text-amber-400' : 'text-ink-tertiary'} />
          {(product.stock_min ?? 0) > 0 && (
            <StockPill label="Mínimo" count={product.stock_min ?? 0} cls="text-ink-tertiary" />
          )}
        </div>

        {/* Especificaciones */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <div className="px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Especificaciones</h2>
          </div>
          {product.power_kva && (
            <Row icon={<Zap size={15} className="text-volt-400" />} label="Potencia">
              {product.power_kva} kVA
            </Row>
          )}
          {product.phase && (
            <Row icon={<Package size={15} />} label="Fase">
              {product.phase === 'monofasico' ? 'Monofásico' : product.phase === 'trifasico' ? 'Trifásico' : product.phase}
            </Row>
          )}
          {product.is_rentable && (
            <Row icon={<Repeat size={15} className="text-blue-400" />} label="Modalidad">
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">Disponible en alquiler</span>
            </Row>
          )}
          {product.warranty_months && (
            <Row icon={<CheckCircle2 size={15} className="text-success" />} label="Garantía">
              {product.warranty_months} meses
            </Row>
          )}
        </section>

        {/* Precios */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <div className="px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Precios</h2>
          </div>
          {product.final_price && (
            <Row icon={<Tag size={15} className="text-volt-400" />} label="Venta">
              <span className="font-semibold text-ink-primary">{fmt(product.final_price)}</span>
            </Row>
          )}
          {product.is_rentable && product.rental_price_monthly && (
            <Row icon={<Repeat size={15} className="text-blue-400" />} label="Alquiler">
              <span className="font-semibold text-blue-400">{fmt(product.rental_price_monthly)}/mes</span>
            </Row>
          )}
          {isAdmin && product.cost_price && (
            <Row icon={<Tag size={15} className="text-ink-tertiary" />} label="Costo">
              <span className="text-ink-secondary">{fmt(product.cost_price)}</span>
              {product.final_price && product.cost_price && (
                <span className="ml-2 text-xs text-success">
                  {Math.round(((product.final_price - product.cost_price) / product.final_price) * 100)}% margen
                </span>
              )}
            </Row>
          )}
        </section>

        {/* Unidades en inventario */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Unidades · {units.length}
            </h2>
            {canEdit && (
              <Link href={`/inventory/new?productId=${product.id}`}
                className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors">
                <Plus size={13} />Agregar unidad
              </Link>
            )}
          </div>

          {units.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-8 text-center">
              <p className="text-sm text-ink-tertiary">Sin unidades en inventario</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {units.map(u => {
                const st = ITEM_STATUS[u.status] ?? ITEM_STATUS.stock
                const cust = u.customers as unknown as { name: string } | null
                const site = u.sites as unknown as { name: string } | null
                return (
                  <Link key={u.id} href={`/inventory/${u.id}`}
                    className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', st.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-ink-primary">
                          {u.serial_number ?? u.item_code ?? '—'}
                        </p>
                        {cust && (
                          <p className="text-xs text-ink-tertiary truncate">
                            {cust.name}{site ? ` · ${site.name}` : ''}
                          </p>
                        )}
                        {u.location && !cust && (
                          <p className="flex items-center gap-1 text-xs text-ink-tertiary">
                            <MapPin size={10} />{u.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('text-xs font-medium', st.cls)}>{st.label}</span>
                        {u.rental_monthly_rate && (
                          <span className="text-xs text-success">{fmt(u.rental_monthly_rate)}/mes</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Datasheet técnico */}
        {product.datasheet_url && (
          <a
            href={product.datasheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-touch items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-1 text-sm font-medium text-ink-secondary hover:border-border hover:bg-surface-2 transition-colors">
            <FileText size={16} className="text-ink-tertiary" />
            Ver datasheet técnico
          </a>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          <Link href={`/quotes/new?productId=${product.id}`}
            className="flex h-touch items-center justify-center gap-2 rounded-xl border border-volt-500 text-sm font-semibold text-volt-500 hover:bg-volt-500/10 transition-colors">
            Cotizar este producto
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex-shrink-0 text-ink-tertiary">{icon}</span>
      <span className="w-24 flex-shrink-0 text-sm text-ink-tertiary">{label}</span>
      <span className="text-sm text-ink-primary">{children}</span>
    </div>
  )
}

function StockPill({ label, count, cls }: { label: string; count: number; cls: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-3 py-3 text-center">
      <p className={cn('text-xl font-bold', cls)}>{count}</p>
      <p className="text-xs text-ink-tertiary">{label}</p>
    </div>
  )
}
