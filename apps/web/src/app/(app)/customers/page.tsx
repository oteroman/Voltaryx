import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { Plus } from 'lucide-react'
import { CustomersList } from './customers-list'

export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = {
  vip:      'VIP',
  premium:  'Premium',
  standard: 'Standard',
}
const TIER_CLASS: Record<string, string> = {
  vip:      'bg-volt-500/20 text-volt-400',
  premium:  'bg-purple-500/20 text-purple-400',
  standard: 'bg-surface-3 text-ink-tertiary',
}

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) {
    redirect('/orders')
  }

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, tax_id, industry, tier, is_active,
      sites(count)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Clientes</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {customers?.length ?? 0} clientes activos
            </p>
          </div>
          {canEdit && (
            <Link
              href="/customers/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 active:bg-volt-600 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nuevo
            </Link>
          )}
        </div>
      </header>

      <CustomersList customers={customers ?? []} canEdit={canEdit} />
    </div>
  )
}
