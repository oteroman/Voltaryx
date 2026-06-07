import { Stack } from 'expo-router'
import { C } from '@/lib/colors'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.void } }} />
  )
}
