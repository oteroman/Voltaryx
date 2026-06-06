'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const THROTTLE_MS = 30_000

export function useLocationTracking(workOrderId: string | null, active: boolean) {
  const watchIdRef  = useRef<number | null>(null)
  const lastSentRef = useRef<number>(0)
  const userIdRef   = useRef<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [])

  useEffect(() => {
    if (!active || !workOrderId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now()
        if (now - lastSentRef.current < THROTTLE_MS) return
        lastSentRef.current = now

        const userId = userIdRef.current
        if (!userId) return

        const sb = createClient()
        await sb.from('technician_locations').upsert({
          profile_id:    userId,
          work_order_id: workOrderId,
          lat:           pos.coords.latitude,
          lng:           pos.coords.longitude,
          accuracy:      pos.coords.accuracy  ?? null,
          heading:       pos.coords.heading   ?? null,
          recorded_at:   new Date().toISOString(),
        }, { onConflict: 'profile_id' })
      },
      () => { /* permission denied — silent */ },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [active, workOrderId])
}
