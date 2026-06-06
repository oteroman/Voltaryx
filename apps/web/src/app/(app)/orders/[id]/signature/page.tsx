'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SignaturePad } from '@/components/ui/signature-pad'
import { db } from '@/lib/offline/db'
import { enqueueSync } from '@/lib/offline/db'

interface Params { id: string }

export default function SignaturePage({ params }: { params: Params }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [signedBy,    setSignedBy]   = useState('')
  const [signDataUrl, setSignDataUrl] = useState<string | null>(null)
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState<string | null>(null)

  async function handleComplete() {
    if (!signedBy.trim()) { setError('Ingresa el nombre del firmante'); return }
    if (!signDataUrl)     { setError('Captura la firma para continuar'); return }
    setSaving(true)
    setError(null)

    const supabase  = createClient()
    const timestamp = new Date().toISOString()

    // Convert dataUrl to Blob for storage
    const res   = await fetch(signDataUrl)
    const blob  = await res.blob()
    const path  = `signatures/${params.id}/${timestamp}.png`

    const { error: uploadErr } = await supabase.storage
      .from('work-order-files')
      .upload(path, blob, { contentType: 'image/png', upsert: true })

    if (uploadErr) {
      // Queue for offline sync
      const localId = await db.signatures.add({
        workOrderRemoteId: params.id,
        dataUrl:           signDataUrl,
        signatoryName:     signedBy.trim(),
        signedAt:          timestamp,
        syncStatus:        'pending',
      })
      await enqueueSync('signature', localId, 'INSERT')
      // Mark WO as complete locally and proceed
    } else {
      const { publicUrl } = supabase.storage.from('work-order-files').getPublicUrl(path).data
      await supabase.from('work_orders').update({
        status:        'completed',
        signed_by:     signedBy.trim(),
        signed_at:     timestamp,
        signature_url: publicUrl,
        completed_at:  timestamp,
      }).eq('id', params.id)
    }

    setSaving(false)
    startTransition(() => router.push('/orders'))
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/orders/${params.id}/execute`}
          className="flex h-touch w-touch items-center justify-center rounded text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft size={20} />
        </Link>
        <p className="flex-1 text-base font-medium text-ink-primary">Firma del cliente</p>
      </header>

      <div className="flex flex-col gap-6 px-4 py-6 pb-8">
        <p className="text-sm text-ink-secondary">
          Al firmar, el cliente confirma que el servicio fue ejecutado satisfactoriamente.
        </p>

        {/* Nombre firmante */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">
            Nombre del firmante <span className="text-critical">*</span>
          </label>
          <input
            type="text"
            value={signedBy}
            onChange={e => setSignedBy(e.target.value)}
            placeholder="Nombre completo"
            className="h-touch w-full rounded-lg border border-border-subtle bg-surface-1 px-4 text-base text-ink-primary placeholder-ink-tertiary focus:border-volt-500 focus:outline-none"
          />
        </div>

        {/* Pad firma */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-secondary">
            Firma <span className="text-critical">*</span>
          </label>
          <SignaturePad
            onSign={url => setSignDataUrl(url)}
          />
          {signDataUrl && (
            <p className="text-xs text-success">Firma capturada ✓</p>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-critical/10 px-4 py-3 text-sm text-critical">{error}</p>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={saving || isPending || !signedBy.trim() || !signDataUrl}
          className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-volt-500 text-base font-semibold text-ink-inverse transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:opacity-50"
        >
          {(saving || isPending) ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Completar servicio
        </button>
      </div>
    </div>
  )
}
