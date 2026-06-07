import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { C } from '@/lib/colors'
import { Ionicons } from '@expo/vector-icons'

export default function AppLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/(auth)/login')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/(auth)/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface2,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: C.volt,
        tabBarInactiveTintColor: C.inkTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
