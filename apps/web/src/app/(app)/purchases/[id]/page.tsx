import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import { notFound }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft, PackageCheck, Building2, Calendar, Clock, FileText } from 'lucide-react'
import { cn }            from '@/components/ui/cn'
import { ReceiveActions } from './receive-actions'

export const dynamic = 'force-dynamic'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_CFG: Record<string, { label: string; cls: string; bg: string }> = {
  draft:     { label: 'Borrador',   cls: 'text-ink-tertiary',  bg: 'bg-surface-3'          },
  sent:      { label: 'Enviada',    cls: 'text-blue-400',      bg: 'bg-blue-500/15'        },
  confirmed: { label: 'Confirmada', cls: 'text-amber-400',     bg: 'bg-amber-500/15'       },
  partial:   { label: 'Parcial',    cls: 'text-purple-400',    bg: 'bg-purple-500/15'      },
  received:  { label: 'Recibida',   cls: 'text-success',       bg: 'bg-success/15'         },
  cancelled: { label: 'Anulada',    cls: 'text-critical',      bg: 'bg-critical/15'        },
}

export default async function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const { data: po } = await supabase
    .from('purchase_orders')
    .select(`
      id, po_number, status, order_date, expected_date, received_date,
      subtotal, igv_pct, igv, total, notes,
      suppliers(id, name, contact_name, phone, email, ruc),
      profiles:created_by(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!po) notFound()

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('id, description, quantity_ordered, quantity_received, unit_cost, subtotal, product_id')
    .eq('purchase_order_id', params.id)
    .order('sort_order')

  const supplier = po.suppliers as unknown as {
    id: string; name: string; contact_name: string | null
    phone: string | null; email: string | null; ruc: string | null
  } | null
  const creator  = po.profiles as unknown as { full_name: string | null } | null
  const cfg      = STATUS_CFG[po.status] ?? STATUS_CFG.draft!

  const canReceive = ['draft', 'sent', 'confirmed', 'partial'].includes(po.status)
  const canCancel  = ['draft', 'sent', 'confirmed'].includes(po.status)

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/purchases"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-mono text-lg font-bold text-ink-primary">{po.po_number}</h1>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', cfg.cls, cfg.bg)}>
          {cfg.label}
        </span>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Info proveedor */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={15} className="text-ink-tertiary" />
            <h2 className="text-sm font-semibold text-ink-primary">{supplier?.name ?? '—'}</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            {supplier?.ruc && (
              <>
                <span className="text-ink-tertiary">RUC</span>
                <span className="font-mono text-ink-secondary">{supplier.ruc}</span>
              </>
            )}
            {supplier?.contact_name && (
              <>
                <span className="text-ink-tertiary">Contacto</span>
                <span className="text-ink-secondary">{supplier.contact_name}</span>
              </>
            )}
            {supplier?.phone && (
              <>
                <span className="text-ink-tertiary">Teléfono</span>
                <span className="text-ink-secondary">{supplier.phone}</span>
              </>
            )}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-3 gap-2">
          <InfoTile icon={<Calendar size={14} className="text-ink-tertiary" />}
            label="Orden" value={fmtDate(po.order_date)} />
          <InfoTile icon={<Clock size={14} className={po.expected_date && new Date(po.expected_date) < new Date() && canReceive ? 'text-critical' : 'text-ink-tertiary'} />}
            label="Esperada" value={fmtDate(po.expected_date)}
            cls={po.expected_date && new Date(po.expected_date) < new Date() && canReceive ? 'text-critical' : undefined} />
          <InfoTile icon={<PackageCheck size={14} className="text-ink-tertiary" />}
            label="Recibida" value={fmtDate(po.received_date)} />
        </div>

        {/* Líneas */}
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Ítems · {items?.length ?? 0}
          </h2>
          <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle overflow-hidden">
            {(items ?? []).map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-primary flex-1">{item.description}</p>
                  <p className="text-sm font-bold text-ink-primary flex-shrink-0">
                    {fmtCurrency(item.subtotal ?? item.quantity_ordered * item.unit_cost)}
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-ink-tertiary">
                  <span>{item.quantity_ordered} × S/ {item.unit_cost.toFixed(2)}</span>
                  {po.status !== 'draft' && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 font-medium',
                      item.quantity_received >= item.quantity_ordered
                        ? 'bg-success/15 text-success'
                        : item.quantity_received > 0
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-surface-3 text-ink-tertiary',
                    )}>
                      Recibido: {item.quantity_received}/{item.quantity_ordered}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-ink-secondary">
              <span>Subtotal</span><span>{fmtCurrency(po.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>IGV ({po.igv_pct}%)</span><span>{fmtCurrency(po.igv)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold text-ink-primary">
              <span>Total</span><span>{fmtCurrency(po.total)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {po.notes && (
          <div className="flex gap-2 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <FileText size={14} className="mt-0.5 flex-shrink-0 text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">{po.notes}</p>
          </div>
        )}

        {/* Acciones de recepción (client component) */}
        {(canReceive || canCancel) && (
          <ReceiveActions
            poId={po.id}
            status={po.status}
            items={(items ?? []).map(i => ({
              id: i.id,
              description: i.description,
              quantityOrdered: i.quantity_ordered,
              quantityReceived: i.quantity_received,
            }))}
            canReceive={canReceive}
            canCancel={canCancel}
          />
        )}

        {creator?.full_name && (
          <p className="text-center text-xs text-ink-tertiary">
            Creada por {creator.full_name}
          </p>
        )}
      </div>
    </div>
  )
}

function InfoTile({ icon, label, value, cls }: {
  icon: React.ReactNode; label: string; value: string; cls?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-ink-tertiary">{label}</span>
      </div>
      <p className={cn('text-xs font-semibold text-ink-primary', cls)}>{value}</p>
    </div>
  )
}
