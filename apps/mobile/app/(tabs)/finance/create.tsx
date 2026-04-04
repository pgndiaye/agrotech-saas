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
import { financeApi } from '@/lib/api';

const INCOME_CATEGORIES = ['Vente produits', 'Subvention', 'Crédit', 'Autre revenu'];
const EXPENSE_CATEGORIES = ['Intrants', 'Main d\'œuvre', 'Transport', 'Équipement', 'Irrigation', 'Autre dépense'];

export default function CreateTransactionScreen() {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [form, setForm] = useState({ amount: '', category: '', description: '' });
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async () => {
    if (!form.amount || !form.category.trim()) {
      Alert.alert('Erreur', 'Montant et catégorie obligatoires');
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    try {
      setLoading(true);
      await financeApi.create({
        type,
        amount,
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        date: new Date().toISOString(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'enregistrer');
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
        {/* Type */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-gray-700 mb-2">Type *</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => { setType('INCOME'); setForm((p) => ({ ...p, category: '' })); }}
              className={`flex-1 py-3 rounded-xl items-center border ${type === 'INCOME' ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}
            >
              <Text className={`font-semibold ${type === 'INCOME' ? 'text-white' : 'text-gray-600'}`}>📈 Revenu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setType('EXPENSE'); setForm((p) => ({ ...p, category: '' })); }}
              className={`flex-1 py-3 rounded-xl items-center border ${type === 'EXPENSE' ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}
            >
              <Text className={`font-semibold ${type === 'EXPENSE' ? 'text-white' : 'text-gray-600'}`}>📉 Dépense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Montant */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Montant (FCFA) *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white text-base"
            placeholder="0"
            value={form.amount}
            onChangeText={update('amount')}
            keyboardType="numeric"
          />
        </View>

        {/* Catégorie — Quick-select */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Catégorie *</Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setForm((p) => ({ ...p, category: cat }))}
                className={`px-3 py-1.5 rounded-full border ${form.category === cat ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`text-xs font-medium ${form.category === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="Ou saisissez une catégorie..."
            value={form.category}
            onChangeText={update('category')}
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
            <Text className="text-white font-bold text-base">Enregistrer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
