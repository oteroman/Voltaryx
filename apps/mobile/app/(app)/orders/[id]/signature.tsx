import { useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert, ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import SignatureCanvas from 'react-native-signature-canvas'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

export default function SignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const sigRef  = useRef<SignatureCanvas>(null)
  const [saving,     setSaving]     = useState(false)
  const [clientName, setClientName] = useState('')
  const [hasSig,     setHasSig]     = useState(false)

  async function handleSignature(sig: string) {
    // sig is a base64 PNG data URI
    setSaving(true)

    // Upload signature image to storage
    const base64 = sig.split(',')[1]!
    const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const path   = `work-orders/${id}/signature-${Date.now()}.png`

    const { error: upErr } = await supabase.storage
      .from('work-order-files')
      .upload(path, bytes, { contentType: 'image/png', upsert: true })

    if (upErr) {
      Alert.alert('Error', 'No se pudo guardar la firma.')
      setSaving(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('work-order-files')
      .getPublicUrl(path)

    // Save signature data directly on work_orders
    await supabase.from('work_orders').update({
      signature_url: publicUrl,
      signed_by:     clientName.trim() || null,
      signed_at:     new Date().toISOString(),
    }).eq('id', id)

    setSaving(false)
    Alert.alert('Firma guardada', 'La conformidad del cliente fue registrada.', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  function handleEmpty() {
    Alert.alert('Sin firma', 'El cliente debe firmar antes de guardar.')
  }

  function handleBegin() {
    setHasSig(true)
  }

  function clearSig() {
    sigRef.current?.clearSignature()
    setHasSig(false)
  }

  function saveSig() {
    sigRef.current?.readSignature()
  }

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; background: transparent; }
    .m-signature-pad--body { border: none; background: transparent; }
    .m-signature-pad--footer { display: none; }
    body { background: transparent; margin: 0; }
  `

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.inkSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Firma de conformidad</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} scrollEnabled={false}>
        <Text style={s.instruction}>
          El cliente debe firmar para confirmar la conformidad con el servicio realizado.
        </Text>

        {/* Client name */}
        <View style={s.group}>
          <Text style={s.fieldLabel}>Nombre del cliente (opcional)</Text>
          <TextInput
            style={s.nameInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Nombre y apellido"
            placeholderTextColor={C.inkTertiary}
            returnKeyType="done"
          />
        </View>

        {/* Signature canvas */}
        <View style={s.canvasWrap}>
          <SignatureCanvas
            ref={sigRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onBegin={handleBegin}
            webStyle={webStyle}
            backgroundColor="transparent"
            penColor={C.inkPrimary}
            minWidth={2}
            maxWidth={4}
            imageType="image/png"
            style={s.canvas}
          />
          <View style={s.canvasPlaceholder} pointerEvents="none">
            {!hasSig && (
              <Text style={s.canvasHint}>Firme aquí</Text>
            )}
          </View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.clearBtn} onPress={clearSig}>
            <Ionicons name="refresh-outline" size={18} color={C.inkSecondary} />
            <Text style={s.clearText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (saving || !hasSig) && s.saveBtnDisabled]}
          onPress={saveSig}
          disabled={saving || !hasSig}
        >
          {saving
            ? <ActivityIndicator color={C.inkInverse} />
            : <><Ionicons name="checkmark-circle-outline" size={22} color={C.inkInverse} /><Text style={s.saveBtnText}>Guardar conformidad</Text></>
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

  content: { flex: 1, padding: 20, gap: 16 },

  instruction: { fontSize: 14, color: C.inkSecondary, lineHeight: 20, textAlign: 'center' },

  group:      { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.inkTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
  nameInput: {
    backgroundColor: C.surface1, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: 15, color: C.inkPrimary,
  },

  canvasWrap: {
    height: 280, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.surface1, borderWidth: 1, borderColor: C.border,
    position: 'relative',
  },
  canvas:  { flex: 1 },
  canvasPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  canvasHint: { fontSize: 18, color: C.inkTertiary, fontStyle: 'italic' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  clearText: { fontSize: 14, fontWeight: '600', color: C.inkSecondary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: C.void,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, backgroundColor: C.success },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { fontSize: 16, fontWeight: '700', color: C.inkInverse },
})
