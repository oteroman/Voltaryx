'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

export default function NewSitePage() {
  const router = useRouter()
  const { id: customerId } = useParams<{ id: string }>()

  const [name,           setName]           = useState('')
  const [address,        setAddress]        = useState('')
  const [city,           setCity]           = useState('Lima')
  const [primaryContact, setPrimaryContact] = useState('')
  const [primaryPhone,   setPrimaryPhone]   = useState('')
  const [accessNotes,    setAccessNotes]    = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.from('sites').insert({
      customer_id:     customerId,
      name:            name.trim(),
      address:         address.trim() || null,
      city:            city.trim() || null,
      primary_contact: primaryContact.trim() || null,
      primary_phone:   primaryPhone.trim() || null,
      access_notes:    accessNotes.trim() || null,
    })

    if (err) {
      setError('No se pudo guardar la sede. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/customers/${customerId}`)
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href={`/customers/${customerId}`} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Nueva Sede</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">
        <Field label="Nombre de la sede *">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Sede Central, Sucursal Norte..." required className={inputCls} />
        </Field>

        <Field label="Dirección">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Av. Principal 123, Distrito" className={inputCls} />
        </Field>

        <Field label="Ciudad">
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            placeholder="Lima" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contacto principal">
            <input type="text" value={primaryContact} onChange={e => setPrimaryContact(e.target.value)}
              placeholder="Nombre y cargo" className={inputCls} />
          </Field>
          <Field label="Teléfono">
            <input type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)}
              placeholder="+51 999 000 000" className={inputCls} />
          </Field>
        </div>

        <Field label="Notas de acceso">
          <textarea value={accessNotes} onChange={e => setAccessNotes(e.target.value)}
            placeholder="Instrucciones para el técnico: accesos, llaves, coordinaciones..."
            rows={3} className={cn(inputCls, 'h-auto resize-none py-3')} />
        </Field>

        {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <button type="submit" disabled={loading || !name.trim()}
          className={cn(
            'h-touch w-full rounded-lg bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
            'transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:cursor-not-allowed disabled:opacity-40',
          )}>
          {loading ? 'Guardando...' : 'Crear sede'}
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
