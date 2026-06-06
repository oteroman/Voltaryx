import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, ChevronRight, Zap } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const CATEGORY_CFG: Record<string, { label: string; cls: string }> = {
  ups:          { label: 'UPS',             cls: 'bg-volt-500/20 text-volt-400'     },
  battery_bank: { label: 'Banco Baterías',  cls: 'bg-blue-500/20 text-blue-400'     },
  module:       { label: 'Módulo',          cls: 'bg-purple-500/20 text-purple-400' },
  cooling:      { label: 'Enfriamiento',    cls: 'bg-cyan-500/20 text-cyan-400'     },
  ats:          { label: 'ATS',             cls: 'bg-amber-500/20 text-amber-400'   },
  software:     { label: 'Software',        cls: 'bg-success/20 text-success'       },
  accessory:    { label: 'Accesorio',       cls: 'bg-surface-3 text-ink-secondary'  },
  other:        { label: 'Otro',            cls: 'bg-surface-3 text-ink-tertiary'   },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

export default async function ProductsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category').order('description')

  const byCategory: Record<string, typeof products> = {}
  ;(products ?? []).forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category]!.push(p)
  })

  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Catálogo</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{products?.length ?? 0} productos</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inventory"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              Stock
            </Link>
            {canEdit && (
              <Link href="/products/new"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Plus size={16} strokeWidth={2.5} />Nuevo
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {Object.entries(byCategory).map(([cat, prods]) => {
          const cfg = CATEGORY_CFG[cat] ?? CATEGORY_CFG.other
          return (
            <section key={cat}>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', cfg.cls)}>{cfg.label}</span>
                · {prods!.length}
              </h2>
              <div className="flex flex-col gap-2">
                {prods!.map(p => (
                  <Link key={p.id} href={`/products/${p.id}`}
                    className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-primary">{p.description}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {p.brand && <span className="text-xs text-ink-tertiary">{p.brand}</span>}
                          {p.model && <span className="text-xs text-ink-tertiary">· {p.model}</span>}
                          {p.power_kva && (
                            <span className="flex items-center gap-0.5 text-xs font-medium text-volt-400">
                              <Zap size={10} />{p.power_kva} kVA
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <ChevronRight size={14} className="text-ink-tertiary" />
                        {p.final_price && (
                          <span className="text-xs font-semibold text-ink-secondary">{fmt(p.final_price)}</span>
                        )}
                        {p.is_rentable && p.rental_price_monthly && (
                          <span className="text-xs text-blue-400">{fmt(p.rental_price_monthly)}/mes</span>
                        )}
                      </div>
                    </div>
                    {(p.phase || p.is_rentable) && (
                      <div className="mt-2 flex items-center gap-2 border-t border-border-subtle pt-2">
                        {p.phase && (
                          <span className="text-xs text-ink-tertiary capitalize">{p.phase === 'monofasico' ? 'Monofásico' : p.phase === 'trifasico' ? 'Trifásico' : p.phase}</span>
                        )}
                        {p.is_rentable && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">Alquilable</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {(products?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Package size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin productos en el catálogo</p>
              {canEdit && <p className="mt-1 text-sm text-ink-tertiary">Agrega los UPS, baterías y módulos que manejas</p>}
            </div>
            {canEdit && (
              <Link href="/products/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Agregar producto
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
