import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (err) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.replace('/(app)/orders')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <View style={s.inner}>
        {/* Logo / brand */}
        <View style={s.brand}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>V</Text>
          </View>
          <Text style={s.appName}>Voltaryx</Text>
          <Text style={s.tagline}>Campo técnico</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Correo electrónico</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@empresa.com"
              placeholderTextColor={C.inkTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={C.inkTertiary}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error !== '' && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, (!email || !password || loading) && s.btnDisabled]}
            onPress={handleLogin}
            disabled={!email || !password || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.inkInverse} />
              : <Text style={s.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Voltaryx Field Service · Illari Labs</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.void },
  inner:     { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 40 },

  brand: { alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 28, fontWeight: '800', color: C.inkInverse },
  appName:  { fontSize: 28, fontWeight: '800', color: C.inkPrimary, letterSpacing: -0.5 },
  tagline:  { fontSize: 14, color: C.inkTertiary },

  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.inkSecondary },
  input: {
    height: 52, borderRadius: 12, backgroundColor: C.surface2,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, fontSize: 16, color: C.inkPrimary,
  },

  errorBox: { backgroundColor: '#ef444420', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: C.critical, textAlign: 'center' },

  btn: {
    height: 52, borderRadius: 14, backgroundColor: C.volt,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { fontSize: 16, fontWeight: '700', color: C.inkInverse },

  footer: { textAlign: 'center', fontSize: 12, color: C.inkTertiary },
})
