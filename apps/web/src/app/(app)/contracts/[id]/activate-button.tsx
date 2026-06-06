'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ActivateContractButton({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function activate() {
    setLoading(true)
    const sb = createClient()
    await sb.from('contracts').update({ status: 'active' }).eq('id', contractId)
    router.refresh()
  }

  return (
    <button onClick={activate} disabled={loading}
      className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-success font-semibold text-void hover:bg-success/90 transition-colors disabled:opacity-50">
      <CheckCircle2 size={16} />
      {loading ? 'Activando...' : 'Activar contrato'}
    </button>
  )
}
