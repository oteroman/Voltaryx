'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { createClient } from '@/lib/supabase/client'
import 'leaflet/dist/leaflet.css'

const LIMA: [number, number] = [-12.0464, -77.0428]

interface TechLoc {
  profile_id:    string
  work_order_id: string | null
  lat:           number
  lng:           number
  recorded_at:   string
  profiles:      { full_name: string | null } | null
  work_orders:   { order_number: string; status: string; customers: { name: string } | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  in_transit:  '#3B82F6',
  on_site:     '#F59E0B',
  in_progress: '#C8FF00',
}

const STATUS_LABEL: Record<string, string> = {
  in_transit:  'En camino',
  on_site:     'En sitio',
  in_progress: 'Ejecutando',
}

function pinIcon(color: string, initial: string) {
  return divIcon({
    className: '',
    html: `<div style="
      width:38px;height:38px;border-radius:50%;
      background:${color};border:3px solid white;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:15px;color:#080A0D;
      box-shadow:0 2px 10px rgba(0,0,0,0.45);
      font-family:system-ui,sans-serif;
    ">${initial}</div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 19],
  })
}

export default function TechnicianMap() {
  const [locs, setLocs] = useState<TechLoc[]>([])

  useEffect(() => {
    const sb = createClient()

    const fetch = () =>
      sb
        .from('technician_locations')
        .select('*, profiles(full_name), work_orders(order_number, status, customers(name))')
        .then(({ data }) => setLocs((data ?? []) as TechLoc[]))

    fetch()

    const ch = sb
      .channel('tech-locs-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technician_locations' }, fetch)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return (
    <MapContainer center={LIMA} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locs.map((loc) => {
        const name    = loc.profiles?.full_name ?? '?'
        const initial = name.charAt(0).toUpperCase()
        const status  = loc.work_orders?.status ?? 'in_transit'
        const color   = STATUS_COLOR[status] ?? '#8B97A8'
        const icon    = pinIcon(color, initial)
        const mins    = Math.round((Date.now() - new Date(loc.recorded_at).getTime()) / 60_000)

        return (
          <Marker key={loc.profile_id} position={[loc.lat, loc.lng]} icon={icon}>
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, minWidth: 140 }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{name}</p>
                {loc.work_orders?.customers?.name && (
                  <p style={{ color: '#6B7280', marginBottom: 2 }}>{loc.work_orders.customers.name}</p>
                )}
                {loc.work_orders?.order_number && (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF' }}>
                    {loc.work_orders.order_number}
                  </p>
                )}
                <p style={{ marginTop: 4, fontSize: 11, color: '#9CA3AF' }}>
                  {STATUS_LABEL[status] ?? status} · hace {mins} min
                </p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
