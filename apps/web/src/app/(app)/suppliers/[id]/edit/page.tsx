'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

export default function EditSupplierPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [name,        setName]        = useState('')
  const [contactName, setContactName] = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [ruc,         setRuc]         = useState('')
  const [address,     setAddress]     = useState('')
  const [paymentDays, setPaymentDays] = useState('30')
  const [notes,       setNotes]       = useState('')
  const [isActive,    setIsActive]    = useState(true)
  const [loading,     setLoading]     = useState(false)
  const [fetching,    setFetching]    = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => {
    createClient().from('suppliers')
      .select('name, contact_name, email, phone, ruc, address, payment_days, notes, is_active')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? '')
          setContactName(data.contact_name ?? '')
          setEmail(data.email ?? '')
          setPhone(data.phone ?? '')
          setRuc(data.ruc ?? '')
          setAddress(data.address ?? '')
          setPaymentDays(String(data.payment_days ?? 30))
          setNotes(data.notes ?? '')
          setIsActive(data.is_active ?? true)
        }
        setFetching(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')

    const { error: err } = await createClient()
      .from('suppliers')
      .update({
        name:         name.trim(),
        contact_name: contactName.trim() || null,
        email:        email.trim() || null,
        phone:        phone.trim() || null,
        ruc:          ruc.trim() || null,
        address:      address.trim() || null,
        payment_days: parseInt(paymentDays, 10) || 30,
        notes:        notes.trim() || null,
        is_active:    isActive,
      })
      .eq('id', id)

    if (err) { setError('No se pudo guardar.'); setLoading(false); return }
    router.push(`/suppliers/${id}`)
  }

  if (fetching) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
          <Link href={`/suppliers/${id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold text-ink-primary">Editar proveedor</h1>
        </header>
        <p className="px-4 py-8 text-sm text-ink-tertiary">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href={`/suppliers/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Editar proveedor</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

        <Field label="Razón social / Nombre *">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nombre del proveedor" required className={inputCls} />
        </Field>

        <Field label="RUC">
          <input value={ruc} onChange={e => setRuc(e.target.value)}
            placeholder="20123456789" maxLength={11} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contacto">
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder="Nombre del contacto" className={inputCls} />
          </Field>
          <Field label="Crédito (días)">
            <input type="number" value={paymentDays} onChange={e => setPaymentDays(e.target.value)}
              min="0" max="365" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+51 999 999 999" type="tel" className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ventas@proveedor.com" type="email" className={inputCls} />
          </Field>
        </div>

        <Field label="Dirección">
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Av. ..." className={inputCls} />
        </Field>

        <Field label="Notas">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Condiciones especiales, observaciones..." rows={3}
            className={cn(inputCls, 'h-auto resize-none py-3')} />
        </Field>

        {/* Estado activo/inactivo */}
        <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Proveedor activo</p>
            <p className="text-xs text-ink-tertiary">Los proveedores inactivos no aparecen en búsquedas</p>
          </div>
          <button type="button" onClick={() => setIsActive(!isActive)}
            className={cn('relative h-6 w-10 flex-shrink-0 rounded-full transition-colors',
              isActive ? 'bg-volt-500' : 'bg-surface-3')}>
            <div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
              isActive ? 'translate-x-5' : 'translate-x-1')} />
          </button>
        </div>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={!name.trim() || loading}
          className={cn(
            'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 disabled:cursor-not-allowed disabled:opacity-40',
          )}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink-secondary">{label}</label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary',
  'border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500',
)
