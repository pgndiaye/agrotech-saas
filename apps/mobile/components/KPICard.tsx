import { View, Text } from 'react-native';

interface KPICardProps {
  title: string;
  value: string;
  emoji: string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const VARIANTS = {
  default: { bg: 'bg-white', border: 'border-gray-100', value: 'text-gray-900', subtitle: 'text-gray-400' },
  success: { bg: 'bg-primary-50', border: 'border-primary-100', value: 'text-primary-700', subtitle: 'text-primary-500' },
  warning: { bg: 'bg-orange-50', border: 'border-orange-100', value: 'text-orange-600', subtitle: 'text-orange-400' },
  danger: { bg: 'bg-red-50', border: 'border-red-100', value: 'text-red-600', subtitle: 'text-red-400' },
};

export function KPICard({ title, value, emoji, subtitle, variant = 'default' }: KPICardProps) {
  const style = VARIANTS[variant];
  return (
    <View className={`flex-1 rounded-2xl p-4 border ${style.bg} ${style.border}`}>
      <Text className="text-2xl mb-1">{emoji}</Text>
      <Text className="text-gray-500 text-xs font-medium mb-1">{title}</Text>
      <Text className={`font-bold text-base ${style.value}`} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text className={`text-xs mt-0.5 ${style.subtitle}`}>{subtitle}</Text> : null}
    </View>
  );
}
