import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import { View, ActivityIndicator } from 'react-native'
import { C } from '@/lib/colors'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Loading state while checking session
  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.void, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.volt} />
        <StatusBar style="light" />
      </View>
    )
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.void } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="light" />
    </>
  )
}
