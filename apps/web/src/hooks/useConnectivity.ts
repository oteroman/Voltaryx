'use client'

import { useEffect, useState } from 'react'

export type ConnectivityStatus = 'online' | 'offline' | 'syncing'

export function useConnectivity() {
  const [status, setStatus] = useState<ConnectivityStatus>('online')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => setStatus(navigator.onLine ? 'online' : 'offline')
    update()

    window.addEventListener('online',  update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online',  update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return status
}
