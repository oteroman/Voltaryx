import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

type Severity = 'low' | 'medium' | 'high' | 'critical'

const SEVERITY: { value: Severity; label: string; color: string; bg: string }[] = [
  { value: 'low',      label: 'Bajo',     color: C.inkTertiary, bg: C.surface3 },
  { value: 'medium',   label: 'Medio',    color: C.blue,        bg: '#3b82f620' },
  { value: 'high',     label: 'Alto',     color: C.amber,       bg: '#f59e0b20' },
  { value: 'critical', label: 'Crítico',  color: C.critical,    bg: '#ef444420' },
]

export default function FindingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [severity,    setSeverity]    = useState<Severity>('medium')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [estValue,    setEstValue]    = useState('')
  const [saving,      setSaving]      = useState(false)

  async function save() {
    if (!title.trim()) {
      Alert.alert('Requerido', 'Ingresa un título para el hallazgo.')
      return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
    const tenantId = (prof as unknown as { tenant_id: string } | null)?.tenant_id

    const { error } = await supabase.from('findings').insert({
      tenant_id:       tenantId,
      work_order_id:   id,
      severity,
      title:           title.trim(),
      description:     description.trim() || null,
      estimated_value: estValue ? parseFloat(estValue.replace(',', '.')) : null,
      reported_by:     user?.id,
    })

    setSaving(false)

    if (error) {
      Alert.alert('Error', 'No se pudo guardar el hallazgo.')
      return
    }

    Alert.alert('Hallazgo registrado', 'El hallazgo fue guardado correctamente.', [
      { text: 'Otro hallazgo', onPress: () => { setTitle(''); setDescription(''); setEstValue(''); setSeverity('medium') } },
      { text: 'Volver', style: 'default', onPress: () => router.back() },
    ])
  }

  const selSev = SEVERITY.find(s => s.value === severity)!

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.inkSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Nuevo hallazgo</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Severity selector */}
        <View style={s.group}>
          <Text style={s.label}>Severidad</Text>
          <View style={s.severityRow}>
            {SEVERITY.map(sv => (
              <TouchableOpacity
                key={sv.value}
                style={[s.sevChip, { backgroundColor: sv.bg, borderColor: severity === sv.value ? sv.color : 'transparent' }]}
                onPress={() => setSeverity(sv.value)}
              >
                <Text style={[s.sevChipText, { color: sv.color }]}>{sv.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity indicator */}
        <View style={[s.sevBanner, { backgroundColor: selSev.bg, borderColor: selSev.color + '40' }]}>
          <Ionicons name="warning-outline" size={18} color={selSev.color} />
          <Text style={[s.sevBannerText, { color: selSev.color }]}>Severidad: {selSev.label}</Text>
        </View>

        {/* Title */}
        <View style={s.group}>
          <Text style={s.label}>Título del hallazgo *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Batería en estado crítico"
            placeholderTextColor={C.inkTertiary}
            returnKeyType="next"
            maxLength={120}
          />
        </View>

        {/* Description */}
        <View style={s.group}>
          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, s.inputMulti]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalla el hallazgo, síntomas observados, posibles causas..."
            placeholderTextColor={C.inkTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Estimated value */}
        <View style={s.group}>
          <Text style={s.label}>Valor estimado (S/.)</Text>
          <TextInput
            style={s.input}
            value={estValue}
            onChangeText={setEstValue}
            placeholder="0.00"
            placeholderTextColor={C.inkTertiary}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <Text style={s.hint}>Costo estimado de reparación o reemplazo</Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={C.inkInverse} />
            : <><Ionicons name="warning-outline" size={20} color={C.inkInverse} /><Text style={s.saveBtnText}>Guardar hallazgo</Text></>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 6 },
  title:   { fontSize: 18, fontWeight: '700', color: C.inkPrimary },

  content: { padding: 20, gap: 20, paddingBottom: 120 },

  group: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: C.inkTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },

  severityRow: { flexDirection: 'row', gap: 8 },
  sevChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 2,
  },
  sevChipText: { fontSize: 13, fontWeight: '700' },

  sevBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  sevBannerText: { fontSize: 14, fontWeight: '600' },

  input: {
    backgroundColor: C.surface1, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: 15, color: C.inkPrimary,
  },
  inputMulti: { height: 120, paddingTop: 14 },
  hint: { fontSize: 12, color: C.inkTertiary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: C.void,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, backgroundColor: C.amber },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:    { fontSize: 16, fontWeight: '700', color: C.inkInverse },
})
