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
import { stocksApi } from '@/lib/api';

interface Stock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  description?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: 'bg-green-100 text-green-700',
  FERTILIZER: 'bg-blue-100 text-blue-700',
  HARVEST: 'bg-yellow-100 text-yellow-700',
  EQUIPMENT: 'bg-gray-100 text-gray-700',
  OTHER: 'bg-purple-100 text-purple-700',
};

export default function StocksScreen() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stats, setStats] = useState<{ total: number; lowStock: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const navigation = useNavigation();

  const loadStocks = useCallback(async () => {
    try {
      const [stocksRes, statsRes] = await Promise.all([
        stocksApi.getAll(),
        stocksApi.getStats(),
      ]);
      setStocks(stocksRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadStocks);
    return unsubscribe;
  }, [navigation, loadStocks]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Supprimer le stock',
      `Supprimer "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await stocksApi.delete(id);
            loadStocks();
          },
        },
      ],
    );
  };

  const filtered = filter ? stocks.filter((s) => s.category === filter) : stocks;
  const categories = [...new Set(stocks.map((s) => s.category))];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50">
      {/* Stats */}
      {stats && (
        <View className="flex-row px-5 pt-3 pb-2 gap-3">
          <View className="flex-1 bg-primary-50 rounded-xl p-3 border border-primary-100">
            <Text className="text-primary-700 font-bold text-lg">{stats.total}</Text>
            <Text className="text-primary-600 text-xs">Références</Text>
          </View>
          <View className={`flex-1 rounded-xl p-3 border ${stats.lowStock > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-100 border-gray-200'}`}>
            <Text className={`font-bold text-lg ${stats.lowStock > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{stats.lowStock}</Text>
            <Text className={`text-xs ${stats.lowStock > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Stock{stats.lowStock > 1 ? 's' : ''} faible{stats.lowStock > 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {/* Filtres catégorie */}
      {categories.length > 1 && (
        <View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}
            data={[null, ...categories]}
            keyExtractor={(item) => item ?? 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setFilter(item)}
                className={`px-3 py-1.5 rounded-full border ${filter === item ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`text-xs font-medium ${filter === item ? 'text-white' : 'text-gray-600'}`}>
                  {item === null ? 'Tous' : CATEGORY_LABELS[item] ?? item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStocks(); }} tintColor="#16a34a" />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">📦</Text>
            <Text className="text-gray-500 font-medium">Aucun stock trouvé</Text>
            <Text className="text-gray-400 text-sm mt-1">Ajoutez votre premier stock</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.quantity <= item.minQuantity;
          const categoryStyle = CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-700';
          return (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/stocks/${item.id}`)}
              className="bg-white rounded-2xl p-4 border border-gray-100"
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900 text-base">{item.name}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className={`px-2 py-0.5 rounded-full ${categoryStyle.split(' ')[0]}`}>
                      <Text className={`text-xs font-medium ${categoryStyle.split(' ')[1]}`}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Text>
                    </View>
                    {isLow && (
                      <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                        <Text className="text-orange-600 text-xs font-medium">⚠️ Faible</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  className="p-2 -mt-1 -mr-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-end justify-between mt-3">
                <Text className={`text-2xl font-bold ${isLow ? 'text-orange-600' : 'text-primary-700'}`}>
                  {item.quantity}
                  <Text className="text-sm font-normal text-gray-500"> {item.unit}</Text>
                </Text>
                <Text className="text-gray-400 text-xs">Min. {item.minQuantity} {item.unit}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/stocks/create')}
        className="absolute bottom-6 right-5 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
