import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

type Photo = { id: string; storage_path: string; caption: string | null; taken_at: string }

function getPublicUrl(storagePath: string) {
  return supabase.storage.from('work-order-files').getPublicUrl(storagePath).data.publicUrl
}

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [photos,    setPhotos]    = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading,   setLoading]   = useState(true)

  async function loadPhotos() {
    const { data } = await supabase
      .from('photos')
      .select('id, storage_path, caption, taken_at')
      .eq('work_order_id', id)
      .order('taken_at')
    setPhotos((data as unknown as Photo[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPhotos() }, [id])

  async function pickAndUpload() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Sin acceso', 'Activa el permiso de cámara en Configuración.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    })
    if (result.canceled) return

    setUploading(true)
    const asset = result.assets[0]!
    const ext   = asset.uri.split('.').pop() ?? 'jpg'
    const path  = `work-orders/${id}/${Date.now()}.${ext}`

    // Read file as base64
    const response = await fetch(asset.uri)
    const blob     = await response.blob()

    const { error: upErr } = await supabase.storage
      .from('work-order-files')
      .upload(path, blob, { contentType: `image/${ext}`, upsert: false })

    if (upErr) {
      Alert.alert('Error', 'No se pudo subir la foto.')
      setUploading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

    await supabase.from('photos').insert({
      work_order_id: id,
      storage_path:  path,
      uploaded_by:   user?.id,
      tenant_id:     (prof as unknown as { tenant_id: string } | null)?.tenant_id,
    })

    await loadPhotos()
    setUploading(false)
  }

  async function deletePhoto(photoId: string) {
    Alert.alert('Eliminar foto', '¿Deseas eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('photos').delete().eq('id', photoId)
          setPhotos(prev => prev.filter(p => p.id !== photoId))
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.inkSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Fotos de campo</Text>
        <Text style={s.count}>{photos.length}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={C.volt} style={{ marginTop: 40 }} />
        ) : photos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="camera-outline" size={48} color={C.inkTertiary} />
            <Text style={s.emptyText}>Sin fotos aún</Text>
            <Text style={s.emptyHint}>Captura el estado de los equipos antes y después del servicio</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {photos.map(p => (
              <TouchableOpacity key={p.id} style={s.imgWrap} onLongPress={() => deletePhoto(p.id)}>
                <Image source={{ uri: getPublicUrl(p.storage_path) }} style={s.img} />
                {p.caption && <Text style={s.caption} numberOfLines={1}>{p.caption}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={s.fab}>
        <TouchableOpacity style={[s.fabBtn, uploading && s.fabDisabled]} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color={C.inkInverse} />
            : <><Ionicons name="camera" size={24} color={C.inkInverse} /><Text style={s.fabText}>Tomar foto</Text></>
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
  title:   { flex: 1, fontSize: 18, fontWeight: '700', color: C.inkPrimary },
  count:   { fontSize: 14, color: C.inkTertiary },

  content: { padding: 16, paddingBottom: 120 },
  empty:   { alignItems: 'center', gap: 10, marginTop: 60 },
  emptyText:  { fontSize: 16, color: C.inkSecondary },
  emptyHint:  { fontSize: 13, color: C.inkTertiary, textAlign: 'center', maxWidth: 260 },

  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imgWrap: { width: '48%', borderRadius: 12, overflow: 'hidden' },
  img:     { width: '100%', aspectRatio: 1, backgroundColor: C.surface2 },
  caption: { padding: 6, fontSize: 11, color: C.inkTertiary, backgroundColor: C.surface1 },

  fab: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: C.void,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  fabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 16, backgroundColor: C.volt,
  },
  fabDisabled: { opacity: 0.5 },
  fabText: { fontSize: 16, fontWeight: '700', color: C.inkInverse },
})
