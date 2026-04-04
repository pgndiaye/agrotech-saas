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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { marketplaceApi } from '@/lib/api';

const CATEGORIES = [
  { value: 'SEEDS', label: '🌱 Semences' },
  { value: 'FERTILIZER', label: '🧪 Engrais' },
  { value: 'HARVEST', label: '🌾 Récoltes' },
  { value: 'EQUIPMENT', label: '🔧 Équipement' },
  { value: 'OTHER', label: '📦 Autre' },
];

export default function CreateListingScreen() {
  const { user } = useAuth();
  const isPremium = user?.tenant?.plan === 'PREMIUM';

  // Garde Premium
  if (!isPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="storefront-outline" size={30} color="white" />
          </View>
          <Text style={{ fontSize: 19, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 10 }}>
            Publication réservée au Premium
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            Passez au plan Premium pour publier des annonces et vendre vos produits aux autres coopératives.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/payments')}
            style={{ backgroundColor: '#16a34a', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="star-outline" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Passer au Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: '#9ca3af', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    unit: 'kg',
    quantity: '',
    category: 'HARVEST',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.price || !form.quantity || !form.unit.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    const price = parseFloat(form.price);
    const qty = parseFloat(form.quantity);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      Alert.alert('Erreur', 'Prix et quantité invalides');
      return;
    }
    try {
      setLoading(true);
      await marketplaceApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price,
        unit: form.unit.trim(),
        quantity: qty,
        category: form.category,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de créer l\'annonce');
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
        {/* Titre */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Titre de l'annonce *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="Ex: Tomates fraîches de Thiès"
            value={form.title}
            onChangeText={update('title')}
          />
        </View>

        {/* Catégorie */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Catégorie *</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setForm((p) => ({ ...p, category: cat.value }))}
                className={`px-3 py-2 rounded-xl border ${form.category === cat.value ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`text-sm font-medium ${form.category === cat.value ? 'text-white' : 'text-gray-600'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prix + Unité */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Prix (FCFA) *</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
              placeholder="0"
              value={form.price}
              onChangeText={update('price')}
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

        {/* Quantité */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Quantité disponible *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="0"
            value={form.quantity}
            onChangeText={update('quantity')}
            keyboardType="numeric"
          />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
            placeholder="Détails sur le produit, conditions de vente..."
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
            <Text className="text-white font-bold text-base">Publier l'annonce</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
