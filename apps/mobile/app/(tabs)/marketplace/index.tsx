import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { marketplaceApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  unit: string;
  quantity: number;
  category: string;
  status: string;
  tenant?: { name: string };
  tenantId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' FCFA';
}

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        marketplaceApi.getAll(),
        marketplaceApi.getMy(),
      ]);
      setListings(allRes.data);
      setMyListings(myRes.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleMarkSold = (id: string, title: string) => {
    Alert.alert('Marquer vendu', `Marquer "${title}" comme vendu ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vendu',
        onPress: async () => {
          await marketplaceApi.markSold(id);
          loadData();
        },
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette annonce ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await marketplaceApi.delete(id);
          loadData();
        },
      },
    ]);
  };

  const displayed = tab === 'all' ? listings : myListings;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50">
      {/* Tabs */}
      <View className="flex-row px-5 pt-3 pb-1 gap-3">
        {(['all', 'mine'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl items-center border ${tab === t ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
          >
            <Text className={`text-sm font-semibold ${tab === t ? 'text-white' : 'text-gray-600'}`}>
              {t === 'all' ? `Toutes (${listings.length})` : `Mes annonces (${myListings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#16a34a" />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">🏪</Text>
            <Text className="text-gray-500 font-medium">
              {tab === 'all' ? 'Aucune annonce disponible' : 'Vous n\'avez pas encore d\'annonces'}
            </Text>
            {tab === 'mine' && user?.tenant?.plan === 'PREMIUM' && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/marketplace/create')}
                className="mt-4 bg-primary-600 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">Créer une annonce</Text>
              </TouchableOpacity>
            )}
            {tab === 'mine' && user?.tenant?.plan !== 'PREMIUM' && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/payments')}
                className="mt-4 bg-gray-100 border border-gray-200 px-5 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
                <Text className="text-gray-400 font-semibold text-sm">Premium requis pour publier</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isMine = item.tenantId === user?.tenantId;
          return (
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900 text-base" numberOfLines={1}>{item.title}</Text>
                  {item.tenant && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Ionicons name="business-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs">{item.tenant.name}</Text>
                    </View>
                  )}
                </View>
                <View className={`px-2 py-1 rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100' : item.status === 'SOLD' ? 'bg-gray-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-medium ${item.status === 'ACTIVE' ? 'text-green-700' : item.status === 'SOLD' ? 'text-gray-500' : 'text-red-600'}`}>
                    {item.status === 'ACTIVE' ? 'Disponible' : item.status === 'SOLD' ? 'Vendu' : 'Annulé'}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-primary-700 font-bold text-lg">{formatCFA(item.price)}</Text>
                  <Text className="text-gray-400 text-xs">par {item.unit} · Qté: {item.quantity} {item.unit}</Text>
                </View>
                <View className="bg-gray-50 px-2 py-1 rounded-lg">
                  <Text className="text-gray-600 text-xs">{CATEGORY_LABELS[item.category] ?? item.category}</Text>
                </View>
              </View>

              {isMine && item.status === 'ACTIVE' && (
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                  <TouchableOpacity
                    onPress={() => handleMarkSold(item.id, item.title)}
                    className="flex-1 bg-primary-50 border border-primary-200 rounded-xl py-2 items-center"
                  >
                    <Text className="text-primary-700 text-xs font-semibold">✅ Marquer vendu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    className="w-10 bg-red-50 border border-red-200 rounded-xl items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* FAB — Premium uniquement */}
      {user?.tenant?.plan === 'PREMIUM' ? (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/marketplace/create')}
          className="absolute bottom-6 right-5 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/payments')}
          className="absolute bottom-6 right-5 w-14 h-14 bg-gray-300 rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed-outline" size={22} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
