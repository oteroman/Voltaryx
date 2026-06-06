import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { DispatchBoard } from './board'

export const dynamic = 'force-dynamic'

function todayISO() { return new Date().toISOString().split('T')[0]! }
function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]!
}

export default async function DispatchPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const today    = todayISO()
  const tomorrow = addDays(1)
  const in7days  = addDays(7)

  // Órdenes abiertas para los próximos 7 días
  const [{ data: orders }, { data: technicians }] = await Promise.all([
    supabase
      .from('work_orders')
      .select(`
        id, order_number, type, status, priority,
        scheduled_date, scheduled_time, estimated_duration_min,
        assigned_to, description,
        customers(id, name),
        sites(name, address)
      `)
      .not('status', 'in', '("completed","cancelled")')
      .gte('scheduled_date', today)
      .lte('scheduled_date', in7days)
      .order('scheduled_date')
      .order('scheduled_time', { ascending: true, nullsFirst: false }),

    supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['technician', 'supervisor'])
      .order('role').order('full_name'),
  ])

  return (
    <DispatchBoard
      initialOrders={(orders ?? []) as any[]}
      technicians={(technicians ?? []) as any[]}
      today={today}
      tomorrow={tomorrow}
    />
  )
}
