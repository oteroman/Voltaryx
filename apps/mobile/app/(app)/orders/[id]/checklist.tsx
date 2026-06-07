import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

type ChecklistItem = { id: string; label: string; checked: boolean }
type AssetChecklist = {
  id: string
  asset_id: string
  checklist_data: Record<string, boolean>
  assets: { name: string; model: string | null; serial_number: string | null } | null
  completed_at: string | null
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'visual_ok',       label: 'Inspección visual sin daños',       checked: false },
  { id: 'connections_ok',  label: 'Conexiones eléctricas seguras',      checked: false },
  { id: 'battery_ok',      label: 'Estado de baterías verificado',      checked: false },
  { id: 'bypass_tested',   label: 'Bypass probado y funcional',         checked: false },
  { id: 'alarms_clear',    label: 'Sin alarmas activas',                checked: false },
  { id: 'load_measured',   label: 'Carga medida y dentro de límites',   checked: false },
  { id: 'temp_ok',         label: 'Temperatura de operación normal',    checked: false },
  { id: 'filters_clean',   label: 'Filtros limpios',                    checked: false },
  { id: 'firmware_ok',     label: 'Firmware actualizado',               checked: false },
  { id: 'log_reviewed',    label: 'Historial de eventos revisado',      checked: false },
]

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [assets,   setAssets]   = useState<AssetChecklist[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [items,    setItems]    = useState<ChecklistItem[]>(DEFAULT_CHECKLIST.map(i => ({ ...i })))

  async function loadAssets() {
    const { data } = await supabase
      .from('work_order_assets')
      .select('id, asset_id, checklist_data, completed_at, assets(name, model, serial_number)')
      .eq('work_order_id', id)
      .order('created_at')
    setAssets((data as unknown as AssetChecklist[]) ?? [])
    setLoading(false)
    if (data && data.length > 0) {
      selectAsset(data[0] as unknown as AssetChecklist)
    }
  }

  useEffect(() => { loadAssets() }, [id])

  function selectAsset(asset: AssetChecklist) {
    setSelected(asset.id)
    const data = asset.checklist_data as Record<string, boolean>
    setItems(DEFAULT_CHECKLIST.map(i => ({ ...i, checked: data[i.id] ?? false })))
  }

  function toggleItem(itemId: string) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i))
  }

  async function saveChecklist() {
    if (!selected) return
    setSaving(selected)

    const checklist_data = Object.fromEntries(items.map(i => [i.id, i.checked]))
    const allDone = items.every(i => i.checked)

    await supabase
      .from('work_order_assets')
      .update({
        checklist_data,
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq('id', selected)

    await loadAssets()
    setSaving(null)
  }

  const checkedCount = items.filter(i => i.checked).length
  const progress     = items.length > 0 ? checkedCount / items.length : 0

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.inkSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Checklist</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.volt} size="large" /></View>
      ) : assets.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="hardware-chip-outline" size={48} color={C.inkTertiary} />
          <Text style={s.emptyText}>Sin equipos asignados</Text>
          <Text style={s.emptyHint}>Agrega equipos a esta OT desde el panel web</Text>
        </View>
      ) : (
        <>
          {/* Asset selector */}
          {assets.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.assetScroll} contentContainerStyle={s.assetList}>
              {assets.map(a => {
                const asset = a.assets as unknown as { name: string; model: string | null } | null
                const done  = a.completed_at !== null
                return (
                  <TouchableOpacity key={a.id} onPress={() => selectAsset(a)}
                    style={[s.assetChip, selected === a.id && s.assetChipActive, done && s.assetChipDone]}>
                    {done && <Ionicons name="checkmark-circle" size={14} color={C.success} />}
                    <Text style={[s.assetChipText, selected === a.id && s.assetChipTextActive]} numberOfLines={1}>
                      {asset?.name ?? 'Equipo'}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={s.progressText}>{checkedCount}/{items.length}</Text>
          </View>

          {/* Checklist items */}
          <ScrollView contentContainerStyle={s.list}>
            {items.map(item => (
              <TouchableOpacity key={item.id} style={s.item} onPress={() => toggleItem(item.id)}>
                <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
                  {item.checked && <Ionicons name="checkmark" size={16} color={C.inkInverse} />}
                </View>
                <Text style={[s.itemLabel, item.checked && s.itemLabelDone]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.saveBtn, saving === selected && s.saveBtnDisabled]}
              onPress={saveChecklist}
              disabled={saving === selected}
            >
              {saving === selected
                ? <ActivityIndicator color={C.inkInverse} />
                : <><Ionicons name="save-outline" size={20} color={C.inkInverse} /><Text style={s.saveBtnText}>Guardar checklist</Text></>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 6 },
  title:   { fontSize: 18, fontWeight: '700', color: C.inkPrimary },

  emptyText: { fontSize: 16, color: C.inkSecondary },
  emptyHint: { fontSize: 13, color: C.inkTertiary, textAlign: 'center', maxWidth: 260 },

  assetScroll:      { maxHeight: 52, flexGrow: 0 },
  assetList:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  assetChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  assetChipActive:  { borderColor: C.volt, backgroundColor: C.volt + '20' },
  assetChipDone:    { borderColor: C.success + '60' },
  assetChipText:    { fontSize: 13, fontWeight: '600', color: C.inkTertiary },
  assetChipTextActive: { color: C.volt },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  progressBar:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surface3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.volt },
  progressText: { fontSize: 12, fontWeight: '600', color: C.inkTertiary, width: 36, textAlign: 'right' },

  list: { paddingHorizontal: 16, paddingBottom: 120, gap: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderSubtle,
  },
  checkbox:        { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.volt, borderColor: C.volt },
  itemLabel:       { flex: 1, fontSize: 15, color: C.inkSecondary },
  itemLabelDone:   { color: C.inkTertiary, textDecorationLine: 'line-through' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: C.void, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, backgroundColor: C.volt },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:    { fontSize: 16, fontWeight: '700', color: C.inkInverse },
})
