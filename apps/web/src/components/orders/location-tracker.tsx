'use client'

import { useLocationTracking } from '@/lib/geolocation/use-tracking'

const ACTIVE = ['in_transit', 'on_site', 'in_progress']

export function LocationTracker({ orderId, status }: { orderId: string; status: string }) {
  useLocationTracking(orderId, ACTIVE.includes(status))
  return null
}
