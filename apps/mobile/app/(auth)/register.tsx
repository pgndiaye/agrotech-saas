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

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tenantName: '',
    tenantSlug: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const update = (field: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Veuillez remplir les champs obligatoires');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await register(form);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de l\'inscription');
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
        <View className="flex-1 px-6 pt-16 pb-10">
          <View className="items-center mb-8">
            <Text className="text-5xl mb-3">🌱</Text>
            <Text className="text-2xl font-bold text-primary-700">Créer un compte</Text>
            <Text className="text-gray-500 mt-1 text-sm">Rejoignez AgroTech SN</Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            <Field label="Nom complet *" placeholder="Ibrahima Diallo" value={form.name} onChangeText={update('name')} />
            <Field label="Email *" placeholder="vous@example.com" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Mot de passe *" placeholder="Min. 8 caractères" value={form.password} onChangeText={update('password')} secureTextEntry />
            <Field label="Nom de la coopérative" placeholder="Coopérative de Thiès" value={form.tenantName} onChangeText={update('tenantName')} />
            <Field label="Identifiant coopérative" placeholder="coop-thies" value={form.tenantSlug} onChangeText={update('tenantSlug')} autoCapitalize="none" last />

            <TouchableOpacity
              className={`rounded-xl py-4 items-center mt-2 ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600">Déjà un compte ? </Text>
            <Link href="/(auth)/login">
              <Text className="text-primary-600 font-semibold">Se connecter</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, last = false, ...props
}: {
  label: string;
  last?: boolean;
  [key: string]: any;
}) {
  return (
    <View className={last ? 'mb-0' : 'mb-4'}>
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 text-base"
        {...props}
      />
    </View>
  );
}
