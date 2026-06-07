import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
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
  customers: { name: string } | null
  sites: { name: string; address: string | null } | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Programada',   color: C.inkTertiary, bg: C.surface3 },
  in_transit:  { label: 'En tránsito',  color: C.blue,        bg: '#3b82f620' },
  on_site:     { label: 'En sitio',     color: C.amber,       bg: '#f59e0b20' },
  in_progress: { label: 'En progreso',  color: C.volt,        bg: '#00e5a020' },
  completed:   { label: 'Completada',   color: C.success,     bg: '#22c55e20' },
  cancelled:   { label: 'Cancelada',    color: C.critical,    bg: '#ef444420' },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: C.critical,
  high:     C.amber,
  normal:   C.inkTertiary,
  low:      C.inkTertiary,
}

const TYPE_LABEL: Record<string, string> = {
  preventive:   'Preventivo',
  corrective:   'Correctivo',
  emergency:    'Emergencia',
  installation: 'Instalación',
  inspection:   'Inspección',
}

function todayISO() { return new Date().toISOString().split('T')[0]! }

function fmtDate(d: string) {
  const date = new Date(d + 'T12:00')
  const today = new Date()
  if (d === todayISO()) return 'Hoy'
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diff === 1) return 'Mañana'
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export default function OrdersScreen() {
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [filter,      setFilter]      = useState<'pending' | 'all'>('pending')
  const [userId,      setUserId]      = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    let query = supabase
      .from('work_orders')
      .select('id, order_number, type, status, priority, scheduled_date, scheduled_time, description, customers(name), sites(name, address)')
      .eq('assigned_to', user.id)
      .order('scheduled_date')
      .order('scheduled_time', { nullsFirst: true })

    if (filter === 'pending') {
      query = query
        .not('status', 'in', '("completed","cancelled")')
        .gte('scheduled_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!)
    } else {
      query = query.limit(50)
    }

    const { data } = await query
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const today    = orders.filter(o => o.scheduled_date === todayISO())
  const upcoming = orders.filter(o => o.scheduled_date > todayISO())
  const past     = orders.filter(o => o.scheduled_date < todayISO() && filter === 'all')

  function renderOrder({ item: o }: { item: Order }) {
    const st  = STATUS_CFG[o.status] ?? STATUS_CFG.scheduled!
    const cust = o.customers as unknown as { name: string } | null
    const site = o.sites as unknown as { name: string; address: string | null } | null
    const active = ['in_transit', 'on_site', 'in_progress'].includes(o.status)
    return (
      <TouchableOpacity style={[s.card, active && s.cardActive]} onPress={() => router.push(`/(app)/orders/${o.id}`)}>
        <View style={s.cardRow}>
          <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLOR[o.priority] ?? C.inkTertiary }]} />
          <View style={s.cardMain}>
            <Text style={s.cardCustomer} numberOfLines={1}>{cust?.name ?? '—'}</Text>
            <Text style={s.cardSite} numberOfLines={1}>{site?.name ?? '—'}</Text>
            <Text style={s.cardMeta}>{TYPE_LABEL[o.type] ?? o.type} · {o.order_number}</Text>
          </View>
          <View style={s.cardRight}>
            <View style={[s.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={s.cardTime}>
              {fmtDate(o.scheduled_date)}{o.scheduled_time ? ' ' + o.scheduled_time.slice(0, 5) : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const sections = [
    ...(today.length > 0    ? [{ title: `Hoy · ${today.length}`, data: today }] : []),
    ...(upcoming.length > 0 ? [{ title: 'Próximas', data: upcoming }] : []),
    ...(past.length > 0     ? [{ title: 'Anteriores', data: past }] : []),
  ]

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Mis órdenes</Text>
        <View style={s.filterRow}>
          {(['pending', 'all'] as const).map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'pending' ? 'Pendientes' : 'Todas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.volt} size="large" />
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="clipboard-outline" size={48} color={C.inkTertiary} />
          <Text style={s.emptyText}>Sin órdenes {filter === 'pending' ? 'pendientes' : 'asignadas'}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={renderOrder}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.volt} />}
          ListHeaderComponent={() => (
            <View style={s.kpiRow}>
              {[
                { label: 'Hoy',     count: today.length,    color: C.volt    },
                { label: 'Próximas',count: upcoming.length, color: C.blue    },
                { label: 'Total',   count: orders.length,   color: C.inkSecondary },
              ].map(k => (
                <View key={k.label} style={s.kpiCard}>
                  <Text style={[s.kpiNum, { color: k.color }]}>{k.count}</Text>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.inkPrimary, letterSpacing: -0.5 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  filterBtnActive: { backgroundColor: C.volt, borderColor: C.volt },
  filterText:      { fontSize: 13, fontWeight: '600', color: C.inkTertiary },
  filterTextActive: { color: C.inkInverse },

  kpiRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginVertical: 12 },
  kpiCard: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: C.surface1, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  kpiNum:   { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 11, color: C.inkTertiary, marginTop: 2 },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  card: {
    backgroundColor: C.surface1, borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  cardActive: { borderColor: C.volt + '60' },
  cardRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  cardMain:   { flex: 1, gap: 2 },
  cardCustomer: { fontSize: 15, fontWeight: '700', color: C.inkPrimary },
  cardSite:     { fontSize: 13, color: C.inkSecondary },
  cardMeta:     { fontSize: 12, color: C.inkTertiary, marginTop: 2 },
  cardRight:    { alignItems: 'flex-end', gap: 4 },
  statusPill:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 11, fontWeight: '600' },
  cardTime:     { fontSize: 12, color: C.inkTertiary },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.inkTertiary },
})
