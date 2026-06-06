import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, MapPin, Calendar, Wrench, ChevronRight } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { ItemStatusChanger } from './status-changer'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  stock:    { label: 'En stock',    cls: 'bg-success/20 text-success'       },
  deployed: { label: 'Operación',   cls: 'bg-blue-500/20 text-blue-400'     },
  workshop: { label: 'Taller',      cls: 'bg-amber-500/20 text-amber-400'   },
  transit:  { label: 'En tránsito', cls: 'bg-purple-500/20 text-purple-400' },
  retired:  { label: 'Retirado',    cls: 'bg-surface-3 text-ink-tertiary'   },
} as const

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string

  const { data: item } = await supabase
    .from('inventory_items')
    .select(`
      *,
      products(id, description, brand, model, power_kva, phase, category, final_price, rental_price_monthly, is_rentable, distributor_price),
      customers(id, name, tax_id),
      sites(id, name, address, city),
      replaced_by:replaced_by_item_id(id, serial_number, item_code, status)
    `)
    .eq('id', params.id)
    .single()

  if (!item) notFound()

  const prod     = (item as any).products  as { description: string; brand: string | null; model: string | null; power_kva: number | null; phase: string | null; category: string; final_price: number | null; rental_price_monthly: number | null; is_rentable: boolean; distributor_price: number | null } | null
  const customer = (item as any).customers as { id: string; name: string; tax_id: string | null } | null
  const site     = (item as any).sites     as { id: string; name: string; address: string | null; city: string | null } | null
  const replaced = (item as any).replaced_by as { id: string; serial_number: string | null; item_code: string | null; status: string } | null

  // Otros equipos desplegados en el mismo cliente (contexto)
  const { data: sibling } = customer ? await supabase
    .from('inventory_items')
    .select('id, serial_number, item_code, status, products(description)')
    .eq('customer_id', customer.id)
    .neq('id', item.id)
    .in('status', ['deployed', 'workshop'])
    .limit(5) : { data: [] }

  const cfg     = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.stock
  const canEdit = ['tenant_admin', 'supervisor', 'commercial'].includes(role)

  const CATEGORY_LABEL: Record<string, string> = {
    ups: 'UPS', battery_bank: 'Banco Baterías', module: 'Módulo', cooling: 'Enfriamiento',
    ats: 'ATS', software: 'Software', accessory: 'Accesorio', other: 'Otro',
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link href="/inventory"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-ink-tertiary">{item.serial_number ?? item.item_code ?? '—'}</p>
          <p className="truncate text-base font-semibold text-ink-primary">{prod?.description}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0', cfg.cls)}>{cfg.label}</span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Especificaciones del producto */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Equipo</p>
          </div>
          {prod?.brand    && <InfoRow label="Marca"     value={prod.brand} />}
          {prod?.model    && <InfoRow label="Modelo"    value={prod.model} />}
          {prod?.power_kva && <InfoRow label="Potencia"  value={`${prod.power_kva} kVA`} />}
          {prod?.phase    && <InfoRow label="Fase"      value={prod.phase === 'monofasico' ? 'Monofásico' : 'Trifásico'} />}
          {prod?.category && <InfoRow label="Categoría" value={CATEGORY_LABEL[prod.category] ?? prod.category} />}
          {item.serial_number && <InfoRow label="Serie" value={item.serial_number} mono />}
          {item.item_code && <InfoRow label="Cód. interno" value={item.item_code} mono />}
        </section>

        {/* Precios */}
        {(prod?.final_price || prod?.rental_price_monthly) && (
          <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
            <div className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Precios</p>
            </div>
            {prod?.distributor_price && <InfoRow label="Distribuidor" value={fmt(prod.distributor_price)} />}
            {prod?.final_price && <InfoRow label="Precio venta" value={fmt(prod.final_price)} accent="volt" />}
            {prod?.rental_price_monthly && <InfoRow label="Alquiler/mes" value={fmt(prod.rental_price_monthly)} accent="volt" />}
          </section>
        )}

        {/* Estado actual */}
        {item.status === 'deployed' && customer && (
          <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-400">En operación</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-ink-tertiary flex-shrink-0" />
                <Link href={`/customers/${customer.id}`} className="text-sm font-semibold text-ink-primary hover:text-volt-400">
                  {customer.name}
                </Link>
              </div>
              {site && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-ink-tertiary flex-shrink-0" />
                  <span className="text-sm text-ink-secondary">{site.name}{site.city ? `, ${site.city}` : ''}</span>
                </div>
              )}
              {item.deployed_at && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-ink-tertiary flex-shrink-0" />
                  <span className="text-sm text-ink-secondary">
                    Desde {new Date(item.deployed_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
              {item.rental_monthly_rate && (
                <p className="mt-1 text-base font-bold text-success">{fmt(item.rental_monthly_rate)}/mes</p>
              )}
            </div>
          </section>
        )}

        {item.status === 'workshop' && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">En taller</p>
            {item.workshop_reason && (
              <p className="text-sm text-ink-secondary mb-2">{item.workshop_reason}</p>
            )}
            {item.workshop_since && (
              <p className="text-xs text-ink-tertiary mb-3">
                Desde {new Date(item.workshop_since).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
              </p>
            )}
            {replaced ? (
              <Link href={`/inventory/${replaced.id}`}
                className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success hover:bg-success/10">
                <span>Reemplazo activo: {replaced.serial_number ?? replaced.item_code}</span>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
                <Wrench size={14} />
                <span>Sin reemplazo asignado — cliente sin cobertura</span>
              </div>
            )}
          </section>
        )}

        {item.location && (
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <MapPin size={14} className="text-ink-tertiary" />
            <span>Ubicación: <strong>{item.location}</strong></span>
          </div>
        )}

        {/* Compra */}
        {(item.supplier || item.purchase_order || item.invoice_number || item.entry_date) && (
          <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
            <div className="px-4 py-3"><p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Compra / Ingreso</p></div>
            {item.supplier        && <InfoRow label="Proveedor" value={item.supplier} />}
            {item.purchase_order  && <InfoRow label="OC"        value={item.purchase_order} mono />}
            {item.invoice_number  && <InfoRow label="Factura"   value={item.invoice_number} mono />}
            {item.entry_date      && <InfoRow label="Fecha ingreso" value={new Date(item.entry_date + 'T12:00').toLocaleDateString('es-PE')} />}
            {item.purchase_price  && <InfoRow label="Costo"     value={fmt(item.purchase_price)} />}
          </section>
        )}

        {/* Otros equipos del mismo cliente */}
        {(sibling?.length ?? 0) > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Otros equipos de {customer?.name}
            </p>
            <div className="flex flex-col gap-1.5">
              {sibling!.map(s => {
                const sp = (s as any).products as { description: string } | null
                return (
                  <Link key={s.id} href={`/inventory/${s.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5 hover:border-border transition-colors">
                    <div className={cn('h-2 w-2 rounded-full flex-shrink-0',
                      s.status === 'deployed' ? 'bg-blue-400' : 'bg-amber-400')} />
                    <span className="flex-1 text-sm text-ink-primary truncate">{sp?.description}</span>
                    <span className="font-mono text-xs text-ink-tertiary">{s.serial_number ?? s.item_code}</span>
                    <ChevronRight size={13} className="text-ink-tertiary" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Notas */}
        {item.notes && (
          <section className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Notas</p>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap">{item.notes}</p>
          </section>
        )}

        {/* Cambio de estado */}
        {canEdit && (
          <ItemStatusChanger
            itemId={item.id}
            currentStatus={item.status}
            customerId={customer?.id}
            productDescription={prod?.description ?? ''}
          />
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: 'volt' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-ink-secondary flex-shrink-0">{label}</span>
      <span className={cn('text-sm text-right',
        mono ? 'font-mono text-ink-tertiary' : 'text-ink-primary',
        accent === 'volt' ? 'text-volt-500 font-semibold' : ''
      )}>{value}</span>
    </div>
  )
}
