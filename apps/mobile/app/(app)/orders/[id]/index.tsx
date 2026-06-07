import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams, Link } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

type Order = {
  id: string
  order_number: string
  type: string
  status: string
  priority: string
  scheduled_date: string
  scheduled_time: string | null
  description: string | null
  internal_notes: string | null
  completion_notes: string | null
  customers: { name: string; id: string } | null
  sites: { name: string; address: string | null } | null
  profiles: { full_name: string } | null
  started_at: string | null
  arrived_at: string | null
  completed_at: string | null
}

const STATUS_NEXT: Record<string, { next: string; label: string; icon: string; color: string }> = {
  scheduled:   { next: 'in_transit',  label: 'Salir al sitio',        icon: 'car-outline',       color: C.blue   },
  in_transit:  { next: 'on_site',     label: 'Llegué al sitio',       icon: 'location-outline',  color: C.amber  },
  on_site:     { next: 'in_progress', label: 'Iniciar trabajo',        icon: 'construct-outline', color: C.volt   },
  in_progress: { next: 'completed',   label: 'Marcar completada',      icon: 'checkmark-circle-outline', color: C.success },
}

const TYPE_LABEL: Record<string, string> = {
  preventive:'Preventivo', corrective:'Correctivo', emergency:'Emergencia',
  installation:'Instalación', inspection:'Inspección',
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: C.critical },
  high:     { label: 'Alta',    color: C.amber    },
  normal:   { label: 'Normal',  color: C.inkSecondary },
  low:      { label: 'Baja',    color: C.inkTertiary  },
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  async function loadOrder() {
    const { data } = await supabase
      .from('work_orders')
      .select(`
        id, order_number, type, status, priority, scheduled_date, scheduled_time,
        description, internal_notes, completion_notes,
        started_at, arrived_at, completed_at,
        customers(name, id),
        sites(name, address),
        profiles:assigned_to(full_name)
      `)
      .eq('id', id)
      .single()
    setOrder(data as unknown as Order)
    setLoading(false)
  }

  useEffect(() => { loadOrder() }, [id])

  async function advanceStatus() {
    if (!order) return
    const cfg = STATUS_NEXT[order.status]
    if (!cfg) return

    if (cfg.next === 'completed') {
      Alert.alert('Completar orden', '¿Estás seguro? Esta acción marcará la OT como completada.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Completar', style: 'default', onPress: doAdvance },
      ])
      return
    }
    doAdvance()
  }

  async function doAdvance() {
    if (!order) return
    const cfg = STATUS_NEXT[order.status]
    if (!cfg) return
    setAdvancing(true)

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status: cfg.next }

    if (cfg.next === 'in_transit') {
      // Try to get GPS location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          patch.internal_notes = `Salida registrada: ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
        }
      } catch { /* GPS optional */ }
    }
    if (cfg.next === 'on_site')     patch.arrived_at  = now
    if (cfg.next === 'in_progress') patch.started_at  = now
    if (cfg.next === 'completed')   patch.completed_at = now

    await supabase.from('work_orders').update(patch).eq('id', order.id)
    await loadOrder()
    setAdvancing(false)
  }

  if (loading || !order) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={C.volt} size="large" />
      </View>
    )
  }

  const cust   = order.customers as unknown as { name: string; id: string } | null
  const site   = order.sites as unknown as { name: string; address: string | null } | null
  const tech   = order.profiles as unknown as { full_name: string } | null
  const nextCfg = STATUS_NEXT[order.status]
  const priCfg  = PRIORITY_CFG[order.priority] ?? PRIORITY_CFG.normal!

  const isActive = ['in_transit', 'on_site', 'in_progress'].includes(order.status)
  const isDone   = ['completed', 'cancelled'].includes(order.status)

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.inkSecondary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.orderNum}>{order.order_number}</Text>
          <Text style={s.headerSub}>{TYPE_LABEL[order.type] ?? order.type}</Text>
        </View>
        <View style={[s.priBadge, { backgroundColor: priCfg.color + '25' }]}>
          <Text style={[s.priText, { color: priCfg.color }]}>{priCfg.label}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Customer / site */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Cliente</Text>
          <Text style={s.bigText}>{cust?.name ?? '—'}</Text>
          <Text style={s.subText}>{site?.name}{site?.address ? ' · ' + site.address : ''}</Text>
        </View>

        {/* Date / time */}
        <View style={s.infoGrid}>
          <InfoTile label="Fecha">
            {new Date(order.scheduled_date + 'T12:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
          </InfoTile>
          <InfoTile label="Hora">
            {order.scheduled_time ? order.scheduled_time.slice(0, 5) : 'Sin hora'}
          </InfoTile>
        </View>

        {/* Description */}
        {order.description && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Descripción</Text>
            <Text style={s.bodyText}>{order.description}</Text>
          </View>
        )}

        {/* Actions navigation */}
        {!isDone && (
          <View style={s.actionsSection}>
            <Text style={s.sectionLabel}>Acciones en campo</Text>
            <View style={s.actionGrid}>
              <ActionTile
                icon="camera-outline"
                label="Fotos"
                onPress={() => router.push(`/(app)/orders/${id}/photos`)}
              />
              <ActionTile
                icon="clipboard-outline"
                label="Checklist"
                onPress={() => router.push(`/(app)/orders/${id}/checklist`)}
              />
              <ActionTile
                icon="warning-outline"
                label="Hallazgo"
                onPress={() => router.push(`/(app)/orders/${id}/findings`)}
              />
              <ActionTile
                icon="pencil-outline"
                label="Firma"
                onPress={() => router.push(`/(app)/orders/${id}/signature`)}
              />
            </View>
          </View>
        )}

        {/* View report if done */}
        {order.status === 'completed' && (
          <View style={s.section}>
            <ActionTile
              icon="document-text-outline"
              label="Ver informe"
              onPress={() => router.push(`/(app)/orders/${id}/signature`)}
            />
          </View>
        )}

        {/* Timestamps */}
        {(order.arrived_at || order.started_at || order.completed_at) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Tiempos</Text>
            {order.arrived_at   && <TimeRow label="Llegada" ts={order.arrived_at} />}
            {order.started_at   && <TimeRow label="Inicio"  ts={order.started_at} />}
            {order.completed_at && <TimeRow label="Fin"     ts={order.completed_at} />}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {nextCfg && (
        <View style={s.ctaContainer}>
          <TouchableOpacity
            style={[s.cta, { backgroundColor: nextCfg.color }, advancing && s.ctaDisabled]}
            onPress={advanceStatus}
            disabled={advancing}
            activeOpacity={0.85}
          >
            {advancing
              ? <ActivityIndicator color={C.inkInverse} />
              : <>
                  <Ionicons name={nextCfg.icon as any} size={22} color={C.inkInverse} />
                  <Text style={s.ctaText}>{nextCfg.label}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.infoTile}>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.tileValue}>{children}</Text>
    </View>
  )
}

function ActionTile({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.actionTile} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon as any} size={24} color={C.volt} />
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function TimeRow({ label, ts }: { label: string; ts: string }) {
  return (
    <View style={s.timeRow}>
      <Text style={s.timeLabel}>{label}</Text>
      <Text style={s.timeValue}>
        {new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },
  center:    { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { padding: 6 },
  headerCenter:{ flex: 1, gap: 2 },
  orderNum:    { fontSize: 16, fontWeight: '800', color: C.inkPrimary, fontFamily: 'monospace' },
  headerSub:   { fontSize: 12, color: C.inkTertiary },
  priBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  priText:     { fontSize: 12, fontWeight: '700' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 120 },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.inkTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  bigText:      { fontSize: 18, fontWeight: '700', color: C.inkPrimary },
  subText:      { fontSize: 13, color: C.inkSecondary },
  bodyText:     { fontSize: 14, color: C.inkSecondary, lineHeight: 20 },

  infoGrid: { flexDirection: 'row', gap: 10 },
  infoTile: {
    flex: 1, gap: 4, backgroundColor: C.surface1,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border,
  },
  tileValue: { fontSize: 15, fontWeight: '600', color: C.inkPrimary },

  actionsSection: { gap: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: {
    flex: 1, minWidth: '45%', alignItems: 'center', gap: 6,
    backgroundColor: C.surface1, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: C.inkSecondary },

  timeRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  timeLabel: { fontSize: 13, color: C.inkTertiary },
  timeValue: { fontSize: 13, fontWeight: '600', color: C.inkPrimary },

  ctaContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: C.void,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 16,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText:     { fontSize: 16, fontWeight: '700', color: C.inkInverse },
})
