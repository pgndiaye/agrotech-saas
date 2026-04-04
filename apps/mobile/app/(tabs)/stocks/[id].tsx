import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stocksApi } from '@/lib/api';

interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note?: string;
  createdAt: string;
}

interface StockDetail {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  description?: string;
  stockMovements: Movement[];
}

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [movType, setMovType] = useState<'IN' | 'OUT'>('IN');
  const [movQty, setMovQty] = useState('');
  const [movNote, setMovNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await stocksApi.getOne(id);
      setStock(res.data);
      navigation.setOptions({ title: res.data.name });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddMovement = async () => {
    const qty = parseFloat(movQty);
    if (!movQty || isNaN(qty) || qty <= 0) {
      Alert.alert('Erreur', 'Quantité invalide');
      return;
    }
    try {
      setSaving(true);
      await stocksApi.addMovement(id!, { type: movType, quantity: qty, note: movNote });
      setModalVisible(false);
      setMovQty('');
      setMovNote('');
      await load();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'enregistrer le mouvement');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !stock) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const isLow = stock.quantity <= stock.minQuantity;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* Infos stock */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-500 text-sm">{CATEGORY_LABELS[stock.category] ?? stock.category}</Text>
            {isLow && (
              <View className="bg-orange-100 px-2 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-semibold">⚠️ Stock faible</Text>
              </View>
            )}
          </View>
          <Text className={`text-5xl font-bold ${isLow ? 'text-orange-600' : 'text-primary-700'}`}>
            {stock.quantity}
          </Text>
          <Text className="text-gray-500 text-lg">{stock.unit}</Text>
          <Text className="text-gray-400 text-sm mt-2">Seuil minimum : {stock.minQuantity} {stock.unit}</Text>
          {stock.description ? (
            <Text className="text-gray-600 text-sm mt-3 pt-3 border-t border-gray-100">{stock.description}</Text>
          ) : null}
        </View>

        {/* Bouton ajouter mouvement */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-primary-600 rounded-2xl p-4 flex-row items-center justify-center gap-2 mb-5"
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical-outline" size={20} color="white" />
          <Text className="text-white font-bold text-base">Enregistrer un mouvement</Text>
        </TouchableOpacity>

        {/* Historique mouvements */}
        <Text className="text-gray-700 font-semibold mb-3">Historique des mouvements</Text>
        {stock.stockMovements.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
            <Text className="text-3xl mb-2">📊</Text>
            <Text className="text-gray-400 text-sm">Aucun mouvement enregistré</Text>
          </View>
        ) : (
          stock.stockMovements.map((m) => (
            <View key={m.id} className="bg-white rounded-xl p-4 border border-gray-100 mb-2 flex-row items-center gap-3">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${m.type === 'IN' ? 'bg-green-100' : 'bg-red-100'}`}>
                <Ionicons
                  name={m.type === 'IN' ? 'arrow-down-outline' : 'arrow-up-outline'}
                  size={18}
                  color={m.type === 'IN' ? '#16a34a' : '#ef4444'}
                />
              </View>
              <View className="flex-1">
                <Text className={`font-semibold ${m.type === 'IN' ? 'text-green-700' : 'text-red-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity} {stock.unit}
                </Text>
                {m.note ? <Text className="text-gray-500 text-xs mt-0.5">{m.note}</Text> : null}
              </View>
              <Text className="text-gray-400 text-xs">
                {new Date(m.createdAt).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal mouvement */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">Enregistrer un mouvement</Text>

            {/* Type IN/OUT */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
            <View className="flex-row gap-3 mb-4">
              {(['IN', 'OUT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMovType(t)}
                  className={`flex-1 py-3 rounded-xl items-center border ${movType === t ? (t === 'IN' ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500') : 'bg-white border-gray-300'}`}
                >
                  <Text className={`font-semibold ${movType === t ? 'text-white' : 'text-gray-600'}`}>
                    {t === 'IN' ? '↓ Entrée' : '↑ Sortie'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantité */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Quantité ({stock.unit})</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 mb-4"
              placeholder="0"
              value={movQty}
              onChangeText={setMovQty}
              keyboardType="numeric"
            />

            {/* Note */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Note (optionnel)</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 mb-5"
              placeholder="Ex: achat marché, récolte..."
              value={movNote}
              onChangeText={setMovNote}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-600 font-semibold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddMovement}
                disabled={saving}
                className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
              >
                {saving ? <ActivityIndicator color="white" size="small" /> : (
                  <Text className="text-white font-bold">Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
