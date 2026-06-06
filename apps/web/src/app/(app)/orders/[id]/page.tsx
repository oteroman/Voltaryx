import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, MapPin, Phone, Clock,
  AlertTriangle, Wrench, FileText,
} from 'lucide-react'
import { ExecuteButton } from '@/components/orders/execute-button'
import { LocationTracker } from '@/components/orders/location-tracker'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('work_orders')
    .select(`
      *,
      customers ( name, tax_id ),
      sites     ( name, address, city, access_notes, primary_contact, primary_phone ),
      work_order_assets:work_order_assets ( id, assets ( id, brand, model, serial_number, status ) )
    `)
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const customer = order.customers as { name: string; tax_id: string | null } | null
  const site     = order.sites as {
    name: string; address: string | null; city: string | null
    access_notes: string | null; primary_contact: string | null; primary_phone: string | null
  } | null

  const woAssets = (order.work_order_assets ?? []) as Array<{
    id: string
    assets: { id: string; brand: string | null; model: string | null; serial_number: string | null; status: string } | null
  }>

  const canExecute = ['scheduled', 'in_transit', 'on_site', 'in_progress'].includes(order.status)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/orders"
          className="flex h-touch w-touch items-center justify-center rounded text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="truncate font-mono text-xs text-ink-tertiary">{order.order_number}</p>
          <p className="truncate text-base font-medium text-ink-primary">
            {customer?.name}
          </p>
        </div>
        <Badge variant={order.status as Parameters<typeof Badge>[0]['variant']} />
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* Site info */}
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-tertiary">
            Ubicación
          </h2>
          <p className="text-base font-medium text-ink-primary">{site?.name}</p>
          {site?.address && (
            <div className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-secondary">
              <MapPin size={14} className="mt-0.5 flex-shrink-0 text-ink-tertiary" />
              <span>{site.address}{site.city ? `, ${site.city}` : ''}</span>
            </div>
          )}
          {site?.primary_contact && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-secondary">
              <Phone size={14} className="flex-shrink-0 text-ink-tertiary" />
              <span>{site.primary_contact}</span>
              {site.primary_phone && (
                <span className="font-mono text-ink-tertiary">· {site.primary_phone}</span>
              )}
            </div>
          )}
        </section>

        {/* Notas de acceso */}
        {site?.access_notes && (
          <section className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-warning" />
              <h2 className="text-sm font-medium text-warning">Instrucciones de acceso</h2>
            </div>
            <p className="text-sm text-ink-secondary">{site.access_notes}</p>
          </section>
        )}

        {/* Detalles de la orden */}
        <section className="rounded-lg border border-border-subtle bg-surface-1 p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-tertiary">
            Detalle
          </h2>
          <div className="flex flex-col gap-2.5">
            <Row label="Tipo">
              <div className="flex items-center gap-1.5">
                <Wrench size={13} className="text-ink-tertiary" />
                <span className="capitalize text-ink-primary">{order.type}</span>
              </div>
            </Row>
            <Row label="Prioridad">
              <Badge variant={order.priority as Parameters<typeof Badge>[0]['variant']} />
            </Row>
            {order.scheduled_date && (
              <Row label="Fecha programada">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-ink-tertiary" />
                  <span className="font-mono text-ink-primary">
                    {order.scheduled_date}
                    {order.scheduled_time ? ` · ${order.scheduled_time.slice(0, 5)}` : ''}
                  </span>
                </div>
              </Row>
            )}
          </div>
        </section>

        {/* Equipos */}
        {woAssets.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-tertiary">
              Equipos a revisar · {woAssets.length}
            </h2>
            <div className="flex flex-col gap-2">
              {woAssets.map(({ id, assets: asset }) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-base font-medium text-ink-primary">
                      {asset ? `${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || '—' : '—'}
                    </p>
                    {asset?.serial_number && (
                      <p className="mt-0.5 font-mono text-xs text-ink-tertiary">
                        SN: {asset.serial_number}
                      </p>
                    )}
                  </div>
                  {asset?.status && (
                    <Badge
                      variant={asset.status === 'operational' ? 'completed' : 'high'}
                      label={asset.status === 'operational' ? 'OK' : asset.status}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tracking GPS activo cuando el técnico está en ruta o ejecutando */}
        {canExecute && <LocationTracker orderId={order.id} status={order.status} />}

        {/* CTA ejecutar */}
        {canExecute && (
          <ExecuteButton orderId={order.id} status={order.status} />
        )}

        {/* Generar informe — visible cuando está completado */}
        {order.status === 'completed' && (
          <Link
            href={`/orders/${order.id}/report`}
            className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border-2 border-volt-500 text-volt-500 font-semibold text-base hover:bg-volt-500/10 transition-colors"
          >
            <FileText size={18} />
            Ver Informe Técnico
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink-secondary">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}
