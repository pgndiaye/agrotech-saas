import { Stack } from 'expo-router';

export default function FinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: 'white' },
        headerTintColor: '#16a34a',
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Finance' }} />
      <Stack.Screen name="create" options={{ title: 'Nouvelle transaction', presentation: 'modal' }} />
    </Stack>
  );
}
