import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  Plus, AlertTriangle, PackageCheck, PackageX, Clock, Building2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(expected: string | null, status: string) {
  if (!expected || ['received', 'cancelled'].includes(status)) return false
  return new Date(expected) < new Date()
}

const STATUS_CFG: Record<string, { label: string; dot: string; cls: string }> = {
  draft:     { label: 'Borrador',   dot: 'bg-ink-tertiary', cls: 'text-ink-tertiary'  },
  sent:      { label: 'Enviada',    dot: 'bg-blue-500',     cls: 'text-blue-400'      },
  confirmed: { label: 'Confirmada', dot: 'bg-amber-400',    cls: 'text-amber-400'     },
  partial:   { label: 'Parcial',    dot: 'bg-purple-400',   cls: 'text-purple-400'    },
  received:  { label: 'Recibida',   dot: 'bg-success',      cls: 'text-success'       },
  cancelled: { label: 'Anulada',    dot: 'bg-critical',     cls: 'text-critical'      },
}

export default async function PurchasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const [
    { data: posRaw },
    { data: productsRaw },
    { data: stockRaw },
  ] = await Promise.all([
    supabase.from('purchase_orders')
      .select('id, po_number, status, order_date, expected_date, received_date, total, suppliers(name)')
      .order('created_at', { ascending: false }),
    supabase.from('products')
      .select('id, description, brand, model, category, stock_min')
      .eq('is_active', true)
      .gt('stock_min', 0),
    supabase.from('inventory_items')
      .select('product_id, status')
      .eq('status', 'stock'),
  ])

  const pos = posRaw ?? []

  // KPIs
  const pending  = pos.filter(p => ['draft', 'sent', 'confirmed', 'partial'].includes(p.status))
  const overdue  = pending.filter(p => isOverdue(p.expected_date, p.status))
  const received = pos.filter(p => p.status === 'received')

  // Stock alerts: products with stock_min > actual stock count
  const stockCount = new Map<string, number>()
  for (const item of (stockRaw ?? [])) {
    const cur = stockCount.get(item.product_id) ?? 0
    stockCount.set(item.product_id, cur + 1)
  }
  const stockAlerts = (productsRaw ?? []).filter(p => {
    const inStock = stockCount.get(p.id) ?? 0
    return inStock < p.stock_min
  }).map(p => ({
    ...p,
    inStock: stockCount.get(p.id) ?? 0,
  }))

  // Group by status for display
  const groups = [
    { key: 'pending',  label: 'Pendientes',  items: pending                                        },
    { key: 'received', label: 'Recibidas',   items: received                                       },
    { key: 'cancelled',label: 'Anuladas',    items: pos.filter(p => p.status === 'cancelled')      },
  ] as const

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Órdenes de compra</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{pos.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/suppliers"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              <Building2 size={15} />Proveedores
            </Link>
            <Link href="/purchases/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={16} strokeWidth={2.5} />Nueva OC
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className={cn('rounded-lg px-3 py-2 text-center', overdue.length > 0 ? 'bg-critical/10' : 'bg-surface-2')}>
            <p className={cn('text-lg font-bold', overdue.length > 0 ? 'text-critical' : 'text-ink-secondary')}>
              {overdue.length}
            </p>
            <p className="text-xs text-ink-tertiary">Atrasadas</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-400">{pending.length}</p>
            <p className="text-xs text-ink-tertiary">Pendientes</p>
          </div>
          <div className={cn('rounded-lg px-3 py-2 text-center', stockAlerts.length > 0 ? 'bg-amber-500/10' : 'bg-surface-2')}>
            <p className={cn('text-lg font-bold', stockAlerts.length > 0 ? 'text-amber-400' : 'text-ink-tertiary')}>
              {stockAlerts.length}
            </p>
            <p className="text-xs text-ink-tertiary">Bajo mínimo</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Alertas de stock */}
        {stockAlerts.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-bold text-amber-400">Stock bajo mínimo · {stockAlerts.length}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {stockAlerts.map(p => (
                <div key={p.id}
                  className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-primary truncate">
                      {p.brand ? `${p.brand} ` : ''}{p.description}
                    </p>
                    {p.model && <p className="text-xs text-ink-tertiary">{p.model}</p>}
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <p className="text-xs font-bold text-amber-400">{p.inStock} / {p.stock_min}</p>
                    <p className="text-[10px] text-ink-tertiary">stock / mín</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/purchases/new"
              className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-sm font-semibold text-white hover:bg-amber-400 transition-colors">
              <Plus size={15} />Crear OC de reposición
            </Link>
          </section>
        )}

        {/* OC atrasadas */}
        {overdue.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Clock size={13} className="text-critical" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-critical">Atrasadas · {overdue.length}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {overdue.map(po => <PoCard key={po.id} po={po} overdue />)}
            </div>
          </section>
        )}

        {/* Pendientes (excluyendo atrasadas ya mostradas) */}
        {pending.filter(p => !isOverdue(p.expected_date, p.status)).length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">En curso</h2>
            <div className="flex flex-col gap-2">
              {pending
                .filter(p => !isOverdue(p.expected_date, p.status))
                .map(po => <PoCard key={po.id} po={po} />)}
            </div>
          </section>
        )}

        {/* Recibidas */}
        {received.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Recibidas</h2>
            <div className="flex flex-col gap-2 opacity-70">
              {received.slice(0, 10).map(po => <PoCard key={po.id} po={po} />)}
            </div>
          </section>
        )}

        {pos.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <PackageCheck size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin órdenes de compra</p>
              <p className="mt-1 text-sm text-ink-tertiary">Crea la primera OC para registrar tus compras a proveedores</p>
            </div>
            <Link href="/purchases/new"
              className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
              <Plus size={15} />Nueva OC
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

type Po = {
  id: string
  po_number: string
  status: string
  order_date: string
  expected_date: string | null
  received_date: string | null
  total: number
  suppliers: unknown
}

function PoCard({ po, overdue }: { po: Po; overdue?: boolean }) {
  const cfg   = STATUS_CFG[po.status] ?? STATUS_CFG.draft!
  const supp  = po.suppliers as { name: string } | null

  return (
    <Link href={`/purchases/${po.id}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface-1 px-4 py-3 hover:border-border transition-colors',
        overdue ? 'border-critical/30 bg-critical/5' : 'border-border-subtle',
      )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', cfg.dot)} />
          <p className="font-mono text-sm font-bold text-ink-primary">{po.po_number}</p>
        </div>
        <p className="mt-0.5 text-xs text-ink-secondary truncate">{supp?.name ?? '—'}</p>
        <p className="mt-0.5 text-xs text-ink-tertiary">
          {overdue && po.expected_date
            ? `⚠️ Esperada ${fmtDate(po.expected_date)}`
            : po.expected_date
            ? `Esperada ${fmtDate(po.expected_date)}`
            : fmtDate(po.order_date)}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-bold text-ink-primary">{fmtCurrency(po.total)}</p>
        <p className={cn('text-xs font-medium', cfg.cls)}>{cfg.label}</p>
      </div>
      <ChevronRight size={14} className="flex-shrink-0 text-ink-tertiary" />
    </Link>
  )
}
