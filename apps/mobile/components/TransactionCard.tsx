import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

interface TransactionCardProps {
  transaction: Transaction;
  onDelete?: () => void;
}

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' FCFA';
}

export function TransactionCard({ transaction: t, onDelete }: TransactionCardProps) {
  const isIncome = t.type === 'INCOME';

  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center gap-3">
      <View className={`w-10 h-10 rounded-full items-center justify-center ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
        <Ionicons
          name={isIncome ? 'trending-up-outline' : 'trending-down-outline'}
          size={18}
          color={isIncome ? '#16a34a' : '#ef4444'}
        />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-900 text-sm">{t.category}</Text>
        {t.description ? <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>{t.description}</Text> : null}
        <Text className="text-gray-400 text-xs mt-0.5">
          {new Date(t.date).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`font-bold text-sm ${isIncome ? 'text-green-700' : 'text-red-600'}`} numberOfLines={1}>
          {isIncome ? '+' : '-'}{formatCFA(t.amount)}
        </Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mt-1">
            <Ionicons name="trash-outline" size={15} color="#d1d5db" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
