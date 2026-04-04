import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { stocksApi } from '@/lib/api';

const CATEGORIES = [
  { value: 'SEEDS', label: '🌱 Semences' },
  { value: 'FERTILIZER', label: '🧪 Engrais' },
  { value: 'HARVEST', label: '🌾 Récoltes' },
  { value: 'EQUIPMENT', label: '🔧 Équipement' },
  { value: 'OTHER', label: '📦 Autre' },
];

export default function CreateStockScreen() {
  const [form, setForm] = useState({
    name: '',
    category: 'SEEDS',
    quantity: '',
    unit: 'kg',
    minQuantity: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.quantity || !form.unit.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }
    const qty = parseFloat(form.quantity);
    const minQty = parseFloat(form.minQuantity) || 0;
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Erreur', 'Quantité invalide');
      return;
    }
    try {
      setLoading(true);
      await stocksApi.create({
        name: form.name.trim(),
        category: form.category,
        quantity: qty,
        unit: form.unit.trim(),
        minQuantity: minQty,
        description: form.description.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de créer le stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Nom */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Nom *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="Ex: Mil, Engrais NPK..."
            value={form.name}
            onChangeText={update('name')}
          />
        </View>

        {/* Catégorie */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Catégorie *</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setForm((prev) => ({ ...prev, category: cat.value }))}
                className={`px-3 py-2 rounded-xl border ${form.category === cat.value ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`text-sm font-medium ${form.category === cat.value ? 'text-white' : 'text-gray-600'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantité + Unité */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Quantité initiale *</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
              placeholder="0"
              value={form.quantity}
              onChangeText={update('quantity')}
              keyboardType="numeric"
            />
          </View>
          <View className="w-28">
            <Text className="text-sm font-medium text-gray-700 mb-2">Unité *</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
              placeholder="kg, L, sac…"
              value={form.unit}
              onChangeText={update('unit')}
            />
          </View>
        </View>

        {/* Seuil minimum */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Seuil d'alerte minimum</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="0"
            value={form.minQuantity}
            onChangeText={update('minQuantity')}
            keyboardType="numeric"
          />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="Notes optionnelles..."
            value={form.description}
            onChangeText={update('description')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Créer le stock</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
