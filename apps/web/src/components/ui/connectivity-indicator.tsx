'use client'

import { useConnectivity } from '@/hooks/useConnectivity'
import { cn } from './cn'

export function ConnectivityIndicator() {
  const status = useConnectivity()

  if (status === 'online') return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-xs font-sans',
        status === 'offline' && 'bg-warning/10 text-warning',
        status === 'syncing' && 'bg-volt-100 text-volt-500',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'offline' && 'bg-warning',
          status === 'syncing' && 'bg-volt-500 animate-pulse-volt',
        )}
      />
      {status === 'offline' && 'Sin conexión · guardando local'}
      {status === 'syncing' && 'Sincronizando...'}
    </div>
  )
}
