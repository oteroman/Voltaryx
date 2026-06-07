'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Plus, Wrench, Truck, AlertTriangle, CheckCircle2, ChevronRight, MapPin, Building2 } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/components/ui/cn'

const STATUS_CFG = {
  stock:    { label: 'En stock',    cls: 'bg-success/20 text-success',       dot: 'bg-success'      },
  deployed: { label: 'Operación',   cls: 'bg-blue-500/20 text-blue-400',     dot: 'bg-blue-400'     },
  workshop: { label: 'Taller',      cls: 'bg-amber-500/20 text-amber-400',   dot: 'bg-amber-400'    },
  transit:  { label: 'En tránsito', cls: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400'   },
  retired:  { label: 'Retirado',    cls: 'bg-surface-3 text-ink-tertiary',   dot: 'bg-ink-tertiary' },
} as const

interface InventoryItem {
  id: string
  serial_number: string | null
  item_code: string | null
  status: string
  location: string | null
  rental_monthly_rate: number | null
  workshop_reason: string | null
  products: unknown
  customers: unknown
  sites: unknown
  replaced_by: unknown
}

interface Props {
  items: InventoryItem[]
  canEdit: boolean
}

function ItemCard({ item }: { item: InventoryItem }) {
  const prod     = item.products    as { description: string; brand: string | null; model: string | null; power_kva: number | null; category: string } | null
  const customer = item.customers   as { id: string; name: string } | null
  const site     = item.sites       as { name: string } | null
  const replaced = item.replaced_by as { serial_number: string | null; item_code: string | null } | null
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
}

function Section({ title, items }: { title: string; items: InventoryItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">{title} · {items.length}</h2>
      <div className="flex flex-col gap-2">
        {items.map(item => <ItemCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}

export function InventoryList({ items, canEdit }: Props) {
  const [q, setQ] = useState('')

  const ql = q.toLowerCase()
  const filtered = q
    ? items.filter(i => {
        const prod = i.products as { description: string } | null
        const cust = i.customers as { name: string } | null
        return (
          (i.serial_number ?? '').toLowerCase().includes(ql) ||
          (i.item_code ?? '').toLowerCase().includes(ql) ||
          (prod?.description ?? '').toLowerCase().includes(ql) ||
          (cust?.name ?? '').toLowerCase().includes(ql)
        )
      })
    : items

  const workshopNoReplacement = items.filter(i => i.status === 'workshop' && !(i.replaced_by))
  const deployed  = filtered.filter(i => i.status === 'deployed')
  const inStock   = filtered.filter(i => i.status === 'stock')
  const workshop  = filtered.filter(i => i.status === 'workshop')
  const transit   = filtered.filter(i => i.status === 'transit')

  return (
    <>
      <div className="px-4 pt-3 pb-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por serie, código, producto o cliente..."
        />
        {q && (
          <p className="mt-2 text-xs text-ink-tertiary">
            {filtered.length} de {items.length} unidades
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5 px-4 pb-4">
        {!q && workshopNoReplacement.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400">
                En taller sin reemplazo · {workshopNoReplacement.length}
              </h2>
            </div>
            {workshopNoReplacement.map(i => {
              const prod = i.products as { description: string } | null
              const cust = i.customers as { name: string } | null
              return (
                <div key={i.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-ink-primary truncate">{prod?.description} · {i.serial_number ?? i.item_code}</span>
                  <span className="text-amber-400 text-xs flex-shrink-0 ml-2">{cust?.name}</span>
                </div>
              )
            })}
          </section>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Package size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">
                {q ? 'Sin resultados para esa búsqueda' : 'Sin unidades registradas'}
              </p>
              {canEdit && !q && <p className="mt-1 text-sm text-ink-tertiary">Agrega los equipos del inventario</p>}
            </div>
            {canEdit && !q && (
              <Link href="/inventory/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Agregar unidad
              </Link>
            )}
          </div>
        ) : (
          <>
            {deployed.length > 0  && <Section title="En operación"        items={deployed} />}
            {inStock.length > 0   && <Section title="Disponibles en stock" items={inStock} />}
            {workshop.length > 0  && <Section title="En taller"            items={workshop} />}
            {transit.length > 0   && <Section title="En tránsito"          items={transit} />}
          </>
        )}
      </div>
    </>
  )
}
