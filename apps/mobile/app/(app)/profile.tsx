import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

type Profile = {
  full_name: string | null
  email:     string | null
  role:      string | null
  avatar_url: string | null
}

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Administrador',
  supervisor:   'Supervisor',
  commercial:   'Comercial',
  technician:   'Técnico',
  client:       'Cliente',
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/(auth)/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, role, avatar_url')
        .eq('id', user.id)
        .single()

      setProfile(data as unknown as Profile ?? {
        full_name: user.email ?? null,
        email:     user.email ?? null,
        role:      null,
        avatar_url: null,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={C.volt} size="large" />
      </View>
    )
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const roleLabel = ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? 'Sin rol'

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Mi perfil</Text>
      </View>

      {/* Avatar section */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{profile?.full_name ?? '—'}</Text>
        <View style={s.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.volt} />
          <Text style={s.roleText}>{roleLabel}</Text>
        </View>
        {profile?.email && (
          <Text style={s.email}>{profile.email}</Text>
        )}
      </View>

      {/* Info cards */}
      <View style={s.cards}>
        <InfoCard icon="person-outline" label="Nombre" value={profile?.full_name ?? '—'} />
        <InfoCard icon="mail-outline"   label="Correo" value={profile?.email ?? '—'} />
        <InfoCard icon="briefcase-outline" label="Rol" value={roleLabel} />
      </View>

      {/* App info */}
      <View style={s.appInfo}>
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>V</Text>
          </View>
          <Text style={s.appName}>Voltaryx</Text>
        </View>
        <Text style={s.appVersion}>Versión 0.1.0 · App técnicos</Text>
      </View>

      {/* Sign out */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.signOutBtn, signingOut && s.signOutBtnDisabled]}
          onPress={signOut}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator color={C.critical} />
            : <><Ionicons name="log-out-outline" size={20} color={C.critical} /><Text style={s.signOutText}>Cerrar sesión</Text></>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoCard}>
      <Ionicons name={icon as any} size={20} color={C.inkTertiary} />
      <View style={s.infoCardText}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },
  center:    { justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.inkPrimary, letterSpacing: -0.5 },

  avatarSection: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.volt + '25', borderWidth: 2, borderColor: C.volt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: C.volt },
  name:       { fontSize: 22, fontWeight: '700', color: C.inkPrimary },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.volt + '15', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText:   { fontSize: 13, fontWeight: '600', color: C.volt },
  email:      { fontSize: 13, color: C.inkTertiary },

  cards: { paddingHorizontal: 20, gap: 8 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface1, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  infoCardText: { flex: 1, gap: 2 },
  infoLabel:    { fontSize: 11, color: C.inkTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue:    { fontSize: 15, color: C.inkPrimary, fontWeight: '500' },

  appInfo: { alignItems: 'center', gap: 6, marginTop: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center',
  },
  logoText:   { fontSize: 20, fontWeight: '900', color: C.void },
  appName:    { fontSize: 20, fontWeight: '800', color: C.inkPrimary },
  appVersion: { fontSize: 12, color: C.inkTertiary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: C.void,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 52, borderRadius: 14,
    backgroundColor: C.critical + '15', borderWidth: 1, borderColor: C.critical + '40',
  },
  signOutBtnDisabled: { opacity: 0.5 },
  signOutText: { fontSize: 16, fontWeight: '700', color: C.critical },
})
