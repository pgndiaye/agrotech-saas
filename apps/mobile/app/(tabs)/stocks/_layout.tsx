import { Stack } from 'expo-router';

export default function StocksLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Stocks' }} />
      <Stack.Screen name="[id]" options={{ title: 'Détail stock' }} />
      <Stack.Screen name="create" options={{ title: 'Nouveau stock', presentation: 'modal' }} />
    </Stack>
  );
}
