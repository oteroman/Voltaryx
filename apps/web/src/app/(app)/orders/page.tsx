import { createClient } from '@/lib/supabase/server'
import { OrderCard }    from '@/components/orders/order-card'
import { CalendarDays, Inbox, Plus } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function todayISO() {
  return new Date().toISOString().split('T')[0]!
}

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user!.id)
    .single()

  const role      = (profile?.role ?? 'technician') as string
  const isManager = ['tenant_admin', 'supervisor'].includes(role)
  const title     = isManager ? 'Todas las Órdenes' : 'Mis Órdenes'

  let query = supabase
    .from('work_orders')
    .select(`*, customers(name), sites(name, address)`)
    .not('status', 'in', '("completed","cancelled")')
    .gte('scheduled_date', todayISO())
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .limit(50)

  // Técnicos solo ven sus propias órdenes
  if (!isManager) {
    query = query.eq('assigned_to', user!.id)
  }

  const { data: orders } = await query

  const flat = (orders ?? []).map((o) => ({
    ...o,
    customer_name: (o.customers as { name: string } | null)?.name,
    site_name:     (o.sites as { name: string; address: string | null } | null)?.name,
    site_address:  (o.sites as { name: string; address: string | null } | null)?.address ?? undefined,
  }))

  const today    = flat.filter((o) => o.scheduled_date === todayISO())
  const upcoming = flat.filter((o) => o.scheduled_date !== todayISO())

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">{title}</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          </div>
          {isManager && (
            <Link
              href="/orders/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 active:bg-volt-600 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva
            </Link>
          )}
        </div>
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
              {today.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          ) : (
            <EmptySlot message="No hay órdenes programadas para hoy" />
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
              {upcoming.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </section>
        )}

        {flat.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Inbox size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">No hay órdenes pendientes</p>
              {isManager && (
                <p className="mt-1 text-sm text-ink-tertiary">
                  Crea la primera orden con el botón &quot;Nueva&quot;
                </p>
              )}
            </div>
            {isManager && (
              <Link
                href="/orders/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400"
              >
                <Plus size={16} />
                Crear orden
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptySlot({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-surface-1 px-4 py-8 text-center">
      <p className="text-sm text-ink-tertiary">{message}</p>
    </div>
  )
}
