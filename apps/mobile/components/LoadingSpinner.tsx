import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 gap-3">
      <ActivityIndicator size="large" color="#16a34a" />
      {message ? <Text className="text-gray-500 text-sm">{message}</Text> : null}
    </View>
  );
}
