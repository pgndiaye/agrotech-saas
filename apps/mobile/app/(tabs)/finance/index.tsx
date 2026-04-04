import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { financeApi } from '@/lib/api';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

interface Summary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(Math.abs(amount)) + ' FCFA';
}

const { width } = Dimensions.get('window');

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      const [txRes, summaryRes, monthlyRes] = await Promise.all([
        financeApi.getAll(),
        financeApi.getSummary(),
        financeApi.getMonthly(),
      ]);
      setTransactions(txRes.data);
      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data);
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

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette transaction ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await financeApi.delete(id);
          loadData();
        },
      },
    ]);
  };

  const filtered = filter === 'ALL' ? transactions : transactions.filter((t) => t.type === filter);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const chartData = monthly.length > 0 ? {
    labels: monthly.map((m) => m.month.substring(0, 3)),
    datasets: [
      { data: monthly.map((m) => m.income / 1000), color: () => '#16a34a', strokeWidth: 2 },
      { data: monthly.map((m) => m.expense / 1000), color: () => '#ef4444', strokeWidth: 2 },
    ],
    legend: ['Revenus (k)', 'Dépenses (k)'],
  } : null;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, padding: 20, paddingTop: 0, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#16a34a" />
        }
        ListHeaderComponent={
          <View className="pt-4 gap-4">
            {/* Résumé */}
            {summary && (
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-green-50 rounded-xl p-3">
                    <Text className="text-green-600 text-xs font-medium">Revenus</Text>
                    <Text className="text-green-700 font-bold text-sm mt-1" numberOfLines={1}>{formatCFA(summary.income)}</Text>
                  </View>
                  <View className="flex-1 bg-red-50 rounded-xl p-3">
                    <Text className="text-red-500 text-xs font-medium">Dépenses</Text>
                    <Text className="text-red-600 font-bold text-sm mt-1" numberOfLines={1}>{formatCFA(summary.expense)}</Text>
                  </View>
                </View>
                <View className={`rounded-xl p-3 ${summary.balance >= 0 ? 'bg-primary-50' : 'bg-red-50'}`}>
                  <Text className={`text-xs font-medium ${summary.balance >= 0 ? 'text-primary-600' : 'text-red-500'}`}>Solde</Text>
                  <Text className={`font-bold text-lg mt-0.5 ${summary.balance >= 0 ? 'text-primary-700' : 'text-red-600'}`}>
                    {summary.balance >= 0 ? '+' : '-'}{formatCFA(summary.balance)}
                  </Text>
                </View>
              </View>
            )}

            {/* Graphique mensuel */}
            {chartData && monthly.length >= 2 && (
              <View className="bg-white rounded-2xl pt-4 pb-2 border border-gray-100 overflow-hidden">
                <Text className="text-gray-700 font-semibold text-sm px-4 mb-2">Évolution (6 derniers mois)</Text>
                <LineChart
                  data={chartData}
                  width={width - 40}
                  height={180}
                  chartConfig={{
                    backgroundGradientFrom: 'white',
                    backgroundGradientTo: 'white',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                    labelColor: () => '#9ca3af',
                    propsForDots: { r: '4' },
                    propsForBackgroundLines: { stroke: '#f3f4f6' },
                  }}
                  bezier
                  withInnerLines
                  withOuterLines={false}
                  fromZero
                  style={{ borderRadius: 12 }}
                />
              </View>
            )}

            {/* Filtres */}
            <View className="flex-row gap-2">
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-xl items-center border ${filter === f ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
                >
                  <Text className={`text-xs font-semibold ${filter === f ? 'text-white' : 'text-gray-600'}`}>
                    {f === 'ALL' ? 'Toutes' : f === 'INCOME' ? 'Revenus' : 'Dépenses'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-700 font-semibold">Transactions ({filtered.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">💰</Text>
            <Text className="text-gray-500 font-medium">Aucune transaction</Text>
            <Text className="text-gray-400 text-sm mt-1">Ajoutez votre première transaction</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${item.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Ionicons
                name={item.type === 'INCOME' ? 'trending-up-outline' : 'trending-down-outline'}
                size={18}
                color={item.type === 'INCOME' ? '#16a34a' : '#ef4444'}
              />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 text-sm">{item.category}</Text>
              {item.description ? <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>{item.description}</Text> : null}
              <Text className="text-gray-400 text-xs mt-0.5">
                {new Date(item.date).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View className="items-end">
              <Text className={`font-bold text-sm ${item.type === 'INCOME' ? 'text-green-700' : 'text-red-600'}`} numberOfLines={1}>
                {item.type === 'INCOME' ? '+' : '-'}{formatCFA(item.amount)}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mt-1">
                <Ionicons name="trash-outline" size={15} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/finance/create')}
        className="absolute bottom-6 right-5 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
