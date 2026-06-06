'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Play, Navigation } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

const STATUS_FLOW: Record<string, { label: string; next: string; icon: React.ElementType }> = {
  scheduled:   { label: 'En camino al sitio', next: 'in_transit', icon: Navigation },
  in_transit:  { label: 'Llegué al sitio',    next: 'on_site',    icon: Navigation },
  on_site:     { label: 'Iniciar servicio',   next: 'in_progress', icon: Play       },
  in_progress: { label: 'Continuar servicio', next: 'in_progress', icon: Play       },
}

interface ExecuteButtonProps {
  orderId: string
  status:  string
}

export function ExecuteButton({ orderId, status }: ExecuteButtonProps) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const flow = STATUS_FLOW[status]
  if (!flow) return null

  const Icon = flow.icon

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()

    const updatePayload: Record<string, string> = { status: flow.next }
    if (flow.next === 'in_transit') updatePayload.started_at  = new Date().toISOString()
    if (flow.next === 'on_site')    updatePayload.arrived_at   = new Date().toISOString()

    await supabase.from('work_orders').update(updatePayload).eq('id', orderId)

    if (status === 'in_progress' || flow.next === 'in_progress') {
      router.push(`/orders/${orderId}/execute`)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex h-touch w-full items-center justify-center gap-2 rounded-lg',
        'bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
        'transition-colors hover:bg-volt-400 active:bg-volt-600',
        'disabled:opacity-50',
      )}
    >
      {loading ? (
        <span className="animate-pulse">Actualizando...</span>
      ) : (
        <>
          <Icon size={18} strokeWidth={2} />
          {flow.label}
        </>
      )}
    </button>
  )
}
