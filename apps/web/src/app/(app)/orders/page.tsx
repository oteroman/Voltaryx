import { createClient } from '@/lib/supabase/server'
import { OrderCard }    from '@/components/orders/order-card'
import { CalendarDays, Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

export default async function OrdersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Traer órdenes del técnico para hoy y próximas pendientes
  const { data: orders } = await supabase
    .from('work_orders')
    .select(`
      *,
      customers ( name ),
      sites     ( name, address )
    `)
    .eq('assigned_to', user!.id)
    .not('status', 'in', '("completed","approved","cancelled")')
    .gte('scheduled_date', todayISO())
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .limit(20)

  // Mapear joins planos
  const flat = (orders ?? []).map((o) => ({
    ...o,
    customer_name: (o.customers as { name: string } | null)?.name,
    site_name:     (o.sites as { name: string; address: string | null } | null)?.name,
    site_address:  (o.sites as { name: string; address: string | null } | null)?.address ?? undefined,
  }))

  const today = flat.filter((o) => o.scheduled_date === todayISO())
  const upcoming = flat.filter((o) => o.scheduled_date !== todayISO())

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <h1 className="font-display text-xl font-bold text-ink-primary">
          Mis Órdenes
        </h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          {new Date().toLocaleDateString('es-PE', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">
        {/* Hoy */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={15} className="text-volt-500" />
            <h2 className="text-sm font-medium text-ink-secondary uppercase tracking-wide">
              Hoy · {today.length} {today.length === 1 ? 'orden' : 'órdenes'}
            </h2>
          </div>

          {today.length > 0 ? (
            <div className="flex flex-col gap-2">
              {today.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <EmptyState message="No tienes órdenes asignadas para hoy" />
          )}
        </section>

        {/* Próximas */}
        {upcoming.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={15} className="text-ink-tertiary" />
              <h2 className="text-sm font-medium text-ink-secondary uppercase tracking-wide">
                Próximas · {upcoming.length}
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {upcoming.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {flat.length === 0 && (
          <EmptyState
            icon={<Inbox size={32} className="text-ink-tertiary" />}
            message="No tienes órdenes pendientes"
            hint="Contacta a tu coordinador si esperabas ver órdenes aquí"
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon?: React.ReactNode
  message: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-10 text-center">
      {icon}
      <p className="text-base text-ink-secondary">{message}</p>
      {hint && <p className="text-sm text-ink-tertiary">{hint}</p>}
    </div>
  )
}
