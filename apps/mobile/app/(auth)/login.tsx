import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-6xl mb-3">🌱</Text>
            <Text className="text-3xl font-bold text-primary-700">AgroTech SN</Text>
            <Text className="text-gray-500 mt-1 text-sm">Gestion agricole intelligente</Text>
          </View>

          {/* Formulaire */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <Text className="text-2xl font-bold text-gray-900 mb-6">Connexion</Text>

            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 text-base"
                placeholder="vous@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">Mot de passe</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 text-base"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600">Pas encore de compte ? </Text>
            <Link href="/(auth)/register">
              <Text className="text-primary-600 font-semibold">Créer un compte</Text>
            </Link>
          </View>

          {/* Compte démo */}
          <View className="bg-primary-50 border border-primary-100 rounded-xl p-4 mt-6">
            <Text className="text-primary-700 text-sm font-semibold mb-1">🔑 Compte démo</Text>
            <Text className="text-primary-600 text-xs">admin@demo-coop.sn</Text>
            <Text className="text-primary-600 text-xs">Admin1234!</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
