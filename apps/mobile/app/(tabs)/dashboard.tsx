import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { weatherApi, financeApi, stocksApi } from '@/lib/api';

interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

interface StockStats {
  total: number;
  lowStock: number;
  byCategory: Record<string, number>;
}

const WEATHER_ICONS: Record<string, string> = {
  Clear: '☀️',
  Clouds: '⛅',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
};

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' FCFA';
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [stocks, setStocks] = useState<StockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [weatherRes, financeRes, stocksRes] = await Promise.allSettled([
        weatherApi.getCurrent('Dakar'),
        financeApi.getSummary(),
        stocksApi.getStats(),
      ]);

      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value.data);
      if (financeRes.status === 'fulfilled') setFinance(financeRes.value.data);
      if (stocksRes.status === 'fulfilled') setStocks(stocksRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const balanceColor =
    finance && finance.balance >= 0 ? 'text-primary-700' : 'text-red-600';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-500 text-sm">Bonjour 👋</Text>
            <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="business-outline" size={13} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">{user?.tenant?.name}</Text>
              {user?.tenant?.plan === 'PREMIUM' && (
                <View className="ml-2 bg-yellow-100 px-2 py-0.5 rounded-full">
                  <Text className="text-yellow-700 text-xs font-semibold">⭐ Premium</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View className="px-5 py-4 gap-4">
          {/* Météo */}
          {weather ? (
            <View className="bg-primary-600 rounded-2xl p-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text className="text-white/80 text-sm">{weather.city}</Text>
                  </View>
                  <Text className="text-white text-5xl font-bold mt-1">{Math.round(weather.temperature)}°C</Text>
                  <Text className="text-white/90 capitalize mt-1">{weather.description}</Text>
                </View>
                <Text className="text-6xl">
                  {WEATHER_ICONS[weather.icon?.split('d')[0]] || '🌤️'}
                </Text>
              </View>
              <View className="flex-row mt-4 gap-4">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="water-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-sm">Humidité {weather.humidity}%</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="speedometer-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-sm">Vent {weather.windSpeed} m/s</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="bg-gray-200 rounded-2xl p-5 items-center">
              <Text className="text-gray-500 text-sm">Météo indisponible</Text>
            </View>
          )}

          {/* KPIs */}
          <Text className="text-gray-700 font-semibold text-base">Aperçu</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="text-gray-500 text-xs mb-1">Solde</Text>
              <Text className={`font-bold text-base ${balanceColor}`} numberOfLines={1}>
                {finance ? formatCFA(finance.balance) : '—'}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">💰 Finance</Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="text-gray-500 text-xs mb-1">Stocks</Text>
              <Text className="font-bold text-base text-gray-900">
                {stocks ? stocks.total : '—'}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">📦 Références</Text>
            </View>
          </View>

          {/* Alertes stocks faibles */}
          {stocks && stocks.lowStock > 0 && (
            <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex-row items-center gap-3">
              <Text className="text-2xl">⚠️</Text>
              <View className="flex-1">
                <Text className="text-orange-700 font-semibold text-sm">Stocks faibles</Text>
                <Text className="text-orange-600 text-xs mt-0.5">
                  {stocks.lowStock} produit{stocks.lowStock > 1 ? 's' : ''} en dessous du seuil minimum
                </Text>
              </View>
            </View>
          )}

          {/* Revenus / Dépenses */}
          {finance && (
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="text-gray-700 font-semibold mb-3">Finance ce mois</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-green-50 rounded-xl p-3">
                  <Text className="text-green-600 text-xs font-medium">Revenus</Text>
                  <Text className="text-green-700 font-bold text-sm mt-1" numberOfLines={1}>
                    {formatCFA(finance.income)}
                  </Text>
                </View>
                <View className="flex-1 bg-red-50 rounded-xl p-3">
                  <Text className="text-red-500 text-xs font-medium">Dépenses</Text>
                  <Text className="text-red-600 font-bold text-sm mt-1" numberOfLines={1}>
                    {formatCFA(finance.expense)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
