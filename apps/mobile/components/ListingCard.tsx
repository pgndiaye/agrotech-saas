import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export function ListingCard({ listing: l }: { listing: Listing }) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-100">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="font-semibold text-gray-900 text-base flex-1 mr-2" numberOfLines={1}>{l.title}</Text>
        <View className={`px-2 py-0.5 rounded-full ${l.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Text className={`text-xs font-medium ${l.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-500'}`}>
            {l.status === 'ACTIVE' ? 'Disponible' : l.status === 'SOLD' ? 'Vendu' : 'Annulé'}
          </Text>
        </View>
      </View>
      {l.tenant && (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="business-outline" size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-xs">{l.tenant.name}</Text>
        </View>
      )}
      {l.description ? (
        <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>{l.description}</Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-primary-700 font-bold text-lg">{formatCFA(l.price)}</Text>
          <Text className="text-gray-400 text-xs">par {l.unit} · Qté: {l.quantity} {l.unit}</Text>
        </View>
        <View className="bg-gray-50 px-2 py-1 rounded-lg">
          <Text className="text-gray-600 text-xs">{CATEGORY_LABELS[l.category] ?? l.category}</Text>
        </View>
      </View>
    </View>
  );
}
