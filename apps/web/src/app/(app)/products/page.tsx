import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProductsList } from './products-list'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: products } = await supabase
    .from('products')
    .select('id, description, brand, model, power_kva, category, final_price, is_rentable, rental_price_monthly, phase')
    .eq('is_active', true)
    .order('category').order('description')

  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Catálogo</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{products?.length ?? 0} productos</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inventory"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              Stock
            </Link>
            {canEdit && (
              <Link href="/products/new"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Plus size={16} strokeWidth={2.5} />Nuevo
              </Link>
            )}
          </div>
        </div>
      </header>

      <ProductsList products={products ?? []} canEdit={canEdit} />
    </div>
  )
}
