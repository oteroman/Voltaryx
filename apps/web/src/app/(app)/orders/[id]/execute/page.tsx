import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, CheckSquare, AlertTriangle,
  PenLine, ChevronRight, Cpu,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExecutePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: order } = await supabase
    .from('work_orders')
    .select(`
      id, status, order_number, requires_signature, signed_at,
      customers ( name ),
      sites     ( name ),
      work_order_assets:work_order_assets (
        id, asset_id, completed_at,
        assets ( id, brand, model, serial_number, status )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  if (!['on_site', 'in_progress'].includes(order.status)) {
    redirect(`/orders/${params.id}`)
  }

  const customer = order.customers as unknown as { name: string } | null
  const site     = order.sites    as unknown as { name: string } | null
  const woAssets = (order.work_order_assets ?? []) as unknown as Array<{
    id: string; asset_id: string; completed_at: string | null
    assets: { id: string; brand: string | null; model: string | null; serial_number: string | null; status: string } | null
  }>

  const findingsRes = await supabase
    .from('findings')
    .select('id, severity, title, status')
    .eq('work_order_id', params.id)
    .order('created_at', { ascending: false })

  const findings = findingsRes.data ?? []

  const allAssetsComplete = woAssets.length > 0 && woAssets.every(a => a.completed_at)
  const canSign = allAssetsComplete && order.requires_signature && !order.signed_at

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/orders/${params.id}`}
          className="flex h-touch w-touch items-center justify-center rounded text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="truncate font-mono text-xs text-ink-tertiary">{order.order_number}</p>
          <p className="truncate text-base font-medium text-ink-primary">
            {customer?.name} · {site?.name}
          </p>
        </div>
        <Badge variant={order.status as Parameters<typeof Badge>[0]['variant']} />
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* Equipos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-tertiary">
              Equipos · {woAssets.filter(a => a.completed_at).length}/{woAssets.length}
            </h2>
            <span className="font-mono text-xs text-ink-tertiary">
              {allAssetsComplete ? '✓ completo' : 'pendiente'}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {woAssets.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-tertiary">
                No hay equipos asignados
              </p>
            )}
            {woAssets.map(({ id: woaId, asset_id, completed_at, assets: asset }) => (
              <Link
                key={woaId}
                href={`/orders/${params.id}/assets/${woaId}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-volt-500/30 hover:bg-surface-2"
              >
                <div className={[
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                  completed_at
                    ? 'bg-success/10 text-success'
                    : 'bg-surface-3 text-ink-tertiary',
                ].join(' ')}>
                  {completed_at ? <CheckSquare size={16} /> : <Cpu size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-base font-medium text-ink-primary">
                    {asset ? `${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || 'Equipo' : 'Equipo'}
                  </p>
                  {asset?.serial_number && (
                    <p className="font-mono text-xs text-ink-tertiary">SN: {asset.serial_number}</p>
                  )}
                </div>
                <ChevronRight size={16} className="flex-shrink-0 text-ink-tertiary" />
              </Link>
            ))}
          </div>
        </section>

        {/* Hallazgos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-tertiary">
              Hallazgos · {findings.length}
            </h2>
            <Link
              href={`/orders/${params.id}/findings/new`}
              className="flex items-center gap-1 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink-primary"
            >
              + Agregar
            </Link>
          </div>
          {findings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
              <AlertTriangle size={20} className="mx-auto mb-2 text-ink-tertiary" />
              <p className="text-sm text-ink-tertiary">Sin hallazgos registrados</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {findings.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4"
                >
                  <div className={[
                    'h-2 w-2 flex-shrink-0 rounded-full',
                    f.severity === 'critical' ? 'bg-critical' :
                    f.severity === 'high'     ? 'bg-warning'  :
                    f.severity === 'medium'   ? 'bg-info'     : 'bg-ink-tertiary',
                  ].join(' ')} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">{f.title}</p>
                    <p className="text-xs capitalize text-ink-tertiary">{f.severity} · {f.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Firma / Completar */}
        <section className="flex flex-col gap-3 pb-8">
          {canSign && (
            <Link
              href={`/orders/${params.id}/signature`}
              className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse transition-colors hover:bg-volt-400 active:bg-volt-600"
            >
              <PenLine size={18} strokeWidth={2} />
              Capturar firma del cliente
            </Link>
          )}
          {order.signed_at && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
              <CheckSquare size={16} className="text-success" />
              <span className="text-sm text-success">Orden firmada y completada</span>
            </div>
          )}
          {!allAssetsComplete && woAssets.length > 0 && (
            <p className="text-center text-sm text-ink-tertiary">
              Completa todos los equipos para poder firmar
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
