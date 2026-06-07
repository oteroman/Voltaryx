import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'
import { ArrowLeft, Plus, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { cn }           from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PO_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Borrador',   cls: 'text-ink-tertiary' },
  sent:      { label: 'Enviada',    cls: 'text-blue-400'     },
  confirmed: { label: 'Confirmada', cls: 'text-amber-400'    },
  partial:   { label: 'Parcial',    cls: 'text-purple-400'   },
  received:  { label: 'Recibida',   cls: 'text-success'      },
  cancelled: { label: 'Anulada',    cls: 'text-critical'     },
}

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, ruc, address, payment_days, notes, is_active')
    .eq('id', params.id)
    .single()

  if (!supplier) notFound()

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('id, po_number, status, order_date, total')
    .eq('supplier_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const totalSpend = (orders ?? [])
    .filter(o => o.status === 'received')
    .reduce((s, o) => s + (o.total ?? 0), 0)

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/suppliers"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-primary truncate">{supplier.name}</h1>
          {!supplier.is_active && (
            <span className="text-xs text-ink-tertiary">Inactivo</span>
          )}
        </div>
        <Link
          href={`/purchases/new?supplierId=${supplier.id}`}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
          <Plus size={15} />OC
        </Link>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Info */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="flex flex-col gap-2.5">
            {supplier.ruc && (
              <InfoRow icon={<FileText size={14} className="text-ink-tertiary" />}
                label="RUC" value={supplier.ruc} mono />
            )}
            {supplier.contact_name && (
              <InfoRow icon={<span className="text-ink-tertiary text-xs">👤</span>}
                label="Contacto" value={supplier.contact_name} />
            )}
            {supplier.phone && (
              <InfoRow icon={<Phone size={14} className="text-ink-tertiary" />}
                label="Teléfono" value={supplier.phone} />
            )}
            {supplier.email && (
              <InfoRow icon={<Mail size={14} className="text-ink-tertiary" />}
                label="Email" value={supplier.email} />
            )}
            {supplier.address && (
              <InfoRow icon={<MapPin size={14} className="text-ink-tertiary" />}
                label="Dirección" value={supplier.address} />
            )}
            {supplier.payment_days != null && (
              <InfoRow icon={<span className="text-ink-tertiary text-xs">💳</span>}
                label="Crédito" value={`${supplier.payment_days} días`} />
            )}
          </div>
          {supplier.notes && (
            <p className="mt-3 border-t border-border-subtle pt-3 text-xs text-ink-tertiary">
              {supplier.notes}
            </p>
          )}
        </div>

        {/* Resumen compras */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-center">
            <p className="text-xl font-bold text-ink-primary">{orders?.length ?? 0}</p>
            <p className="text-xs text-ink-tertiary">OCs totales</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-center">
            <p className="text-xl font-bold text-success">{fmtCurrency(totalSpend)}</p>
            <p className="text-xs text-ink-tertiary">Total recibido</p>
          </div>
        </div>

        {/* Historial OCs */}
        {(orders?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Órdenes de compra
            </h2>
            <div className="flex flex-col gap-2">
              {orders!.map(o => {
                const cfg = PO_STATUS_CFG[o.status] ?? PO_STATUS_CFG.draft!
                return (
                  <Link key={o.id} href={`/purchases/${o.id}`}
                    className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                    <div>
                      <p className="font-mono text-sm font-bold text-ink-primary">{o.po_number}</p>
                      <p className="text-xs text-ink-tertiary">{fmtDate(o.order_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-primary">{fmtCurrency(o.total)}</p>
                      <p className={cn('text-xs font-medium', cfg.cls)}>{cfg.label}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-tertiary">{label}</p>
        <p className={cn('text-sm text-ink-primary', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  )
}
