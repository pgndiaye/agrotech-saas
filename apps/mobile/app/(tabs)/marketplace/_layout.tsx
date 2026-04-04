import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Marketplace' }} />
      <Stack.Screen name="create" options={{ title: 'Nouvelle annonce', presentation: 'modal' }} />
    </Stack>
  );
}
