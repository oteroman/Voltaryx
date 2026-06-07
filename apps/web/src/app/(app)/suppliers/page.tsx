import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { Plus, Phone, Mail, Building2 } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor'].includes(role)) redirect('/dashboard')

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, ruc, payment_days, is_active')
    .order('name')

  const active   = (suppliers ?? []).filter(s => s.is_active)
  const inactive = (suppliers ?? []).filter(s => !s.is_active)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Proveedores</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{active.length} activos</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/purchases"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              Compras
            </Link>
            <Link href="/suppliers/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={16} strokeWidth={2.5} />Nuevo
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {(suppliers ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Building2 size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin proveedores registrados</p>
              <p className="mt-1 text-sm text-ink-tertiary">Agrega proveedores para gestionar tus órdenes de compra</p>
            </div>
            <Link href="/suppliers/new"
              className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
              <Plus size={15} />Agregar proveedor
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Activos · {active.length}</h2>
            <div className="flex flex-col gap-2">
              {active.map(s => <SupplierCard key={s.id} supplier={s} />)}
            </div>
          </section>
        )}

        {inactive.length > 0 && (
          <section className="opacity-60">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Inactivos · {inactive.length}</h2>
            <div className="flex flex-col gap-2">
              {inactive.map(s => <SupplierCard key={s.id} supplier={s} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  ruc: string | null
  payment_days: number | null
  is_active: boolean
}

function SupplierCard({ supplier: s }: { supplier: Supplier }) {
  return (
    <Link href={`/suppliers/${s.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-primary truncate">{s.name}</p>
          {s.ruc && <p className="font-mono text-xs text-ink-tertiary">RUC {s.ruc}</p>}
        </div>
        {s.payment_days != null && (
          <span className="flex-shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-ink-secondary">
            {s.payment_days}d crédito
          </span>
        )}
      </div>
      {(s.contact_name || s.phone || s.email) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {s.contact_name && (
            <span className="text-xs text-ink-secondary">{s.contact_name}</span>
          )}
          {s.phone && (
            <span className="flex items-center gap-1 text-xs text-ink-tertiary">
              <Phone size={11} />{s.phone}
            </span>
          )}
          {s.email && (
            <span className="flex items-center gap-1 text-xs text-ink-tertiary">
              <Mail size={11} />{s.email}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
