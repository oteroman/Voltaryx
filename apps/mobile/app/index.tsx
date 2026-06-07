import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { View, ActivityIndicator } from 'react-native'
import { C } from '@/lib/colors'

export default function Index() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  if (loggedIn === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.void, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.volt} />
      </View>
    )
  }

  return <Redirect href={loggedIn ? '/(app)/orders' : '/(auth)/login'} />
}
