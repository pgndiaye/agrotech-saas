import { View, Text, TouchableOpacity } from 'react-native';

interface Stock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

interface StockCardProps {
  stock: Stock;
  onPress?: () => void;
}

export function StockCard({ stock, onPress }: StockCardProps) {
  const isLow = stock.quantity <= stock.minQuantity;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 border border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="font-semibold text-gray-900 text-base flex-1 mr-2">{stock.name}</Text>
        {isLow && (
          <View className="bg-orange-100 px-2 py-0.5 rounded-full">
            <Text className="text-orange-600 text-xs font-medium">⚠️ Faible</Text>
          </View>
        )}
      </View>
      <Text className="text-gray-400 text-xs mb-2">{CATEGORY_LABELS[stock.category] ?? stock.category}</Text>
      <Text className={`text-2xl font-bold ${isLow ? 'text-orange-600' : 'text-primary-700'}`}>
        {stock.quantity}
        <Text className="text-sm font-normal text-gray-500"> {stock.unit}</Text>
      </Text>
    </TouchableOpacity>
  );
}
