import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Subscription {
  plan?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface Payment {
  id: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: string;
}

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' FCFA';
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'text-green-700' },
  EXPIRED: { label: 'Expiré', color: 'text-red-600' },
  CANCELLED: { label: 'Annulé', color: 'text-gray-500' },
  PENDING: { label: 'En attente', color: 'text-yellow-600' },
};

const PAYMENT_STATUS_BG: Record<string, string> = {
  SUCCEEDED: 'bg-green-100',
  FAILED: 'bg-red-100',
  PENDING: 'bg-yellow-100',
};

const PAYMENT_STATUS_TEXT: Record<string, string> = {
  SUCCEEDED: 'text-green-700',
  FAILED: 'text-red-600',
  PENDING: 'text-yellow-600',
};

export default function PaymentsScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [providers, setProviders] = useState<{ WAVE: boolean; ORANGE_MONEY: boolean; simulation: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [subRes, histRes, provRes] = await Promise.allSettled([
        paymentsApi.getSubscription(),
        paymentsApi.getHistory(),
        paymentsApi.getProviders(),
      ]);
      if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data);
      if (provRes.status === 'fulfilled') setProviders(provRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpgrade = async () => {
    try {
      setPaying(true);
      const res = await paymentsApi.initiate({
        provider: selectedProvider,
        amount: 2000,
        phoneNumber: phone || undefined,
      });
      const { payment, checkoutUrl } = res.data;

      if (providers?.simulation && payment?.id) {
        // Mode simulation : confirmer directement
        await paymentsApi.simulateConfirm(payment.id);
        await refreshUser();
        await loadData();
        setUpgradeModal(false);
        Alert.alert('✅ Succès', 'Votre abonnement Premium est maintenant actif !');
      } else {
        setUpgradeModal(false);
        Alert.alert(
          'Paiement initié',
          `Veuillez compléter le paiement via ${selectedProvider}.\n\nURL: ${checkoutUrl || 'Vérifiez votre téléphone'}`,
        );
        await loadData();
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible d\'initier le paiement');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const isPremium = user?.tenant?.plan === 'PREMIUM';
  const subStatus = subscription?.status ? STATUS_LABELS[subscription.status] : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900 mb-1">Abonnement</Text>
        <Text className="text-gray-500 text-sm mb-5">Gérez votre plan et l'historique des paiements</Text>

        {/* Plan actuel */}
        <View className={`rounded-2xl p-5 mb-4 ${isPremium ? 'bg-primary-600' : 'bg-white border border-gray-200'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-sm font-medium ${isPremium ? 'text-primary-100' : 'text-gray-500'}`}>Plan actuel</Text>
            {subStatus && (
              <View className="bg-white/20 rounded-full px-2 py-0.5">
                <Text className={`text-xs font-semibold ${isPremium ? 'text-white' : subStatus.color}`}>{subStatus.label}</Text>
              </View>
            )}
          </View>
          <Text className={`text-3xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
            {isPremium ? '⭐ Premium' : '🆓 Gratuit'}
          </Text>
          {isPremium && subscription?.endDate && (
            <Text className="text-primary-100 text-sm mt-2">
              Expire le {new Date(subscription.endDate).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          )}
          {!isPremium && (
            <Text className="text-gray-500 text-sm mt-1">Accès aux fonctionnalités de base</Text>
          )}
        </View>

        {/* Raccourcis Premium */}
        {isPremium && (
          <View className="mb-4 flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/alerts')}
              className="flex-1 bg-white border border-green-200 rounded-2xl p-4 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-2xl mb-1">🔔</Text>
              <Text className="text-sm font-semibold text-gray-800">Alertes SMS</Text>
              <Text className="text-xs text-gray-500 text-center mt-0.5">Configurer les alertes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/recommendations')}
              className="flex-1 bg-white border border-purple-200 rounded-2xl p-4 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-2xl mb-1">🤖</Text>
              <Text className="text-sm font-semibold text-gray-800">IA Conseils</Text>
              <Text className="text-xs text-gray-500 text-center mt-0.5">Recommandations IA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Avantages Premium */}
        {!isPremium && (
          <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <Text className="text-gray-800 font-semibold mb-3">🚀 Passez à Premium</Text>
            {[
              '✅ Export CSV des données financières',
              '✅ Accès illimité au Marketplace',
              '✅ IA Conseils agricoles',
              '✅ Alertes SMS automatiques',
              '✅ Multi-utilisateurs par coopérative',
              '✅ Support prioritaire',
            ].map((f) => (
              <Text key={f} className="text-gray-600 text-sm mb-1.5">{f}</Text>
            ))}
            <View className="bg-primary-50 rounded-xl p-3 mt-2">
              <Text className="text-primary-700 font-bold text-center">2 000 – 5 000 FCFA / mois</Text>
            </View>
            <TouchableOpacity
              onPress={() => setUpgradeModal(true)}
              className="bg-primary-600 rounded-xl py-3.5 items-center mt-3"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold">S'abonner maintenant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Providers disponibles */}
        {providers && (
          <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <Text className="text-gray-700 font-semibold mb-3">Moyens de paiement</Text>
            <View className="flex-row gap-3">
              <View className={`flex-1 rounded-xl p-3 items-center border ${providers.WAVE ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-2xl">🌊</Text>
                <Text className={`text-xs font-medium mt-1 ${providers.WAVE ? 'text-blue-700' : 'text-gray-400'}`}>Wave</Text>
                <Text className={`text-xs ${providers.WAVE ? 'text-blue-500' : 'text-gray-400'}`}>{providers.WAVE ? 'Disponible' : 'Indisponible'}</Text>
              </View>
              <View className={`flex-1 rounded-xl p-3 items-center border ${providers.ORANGE_MONEY ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-2xl">🟠</Text>
                <Text className={`text-xs font-medium mt-1 ${providers.ORANGE_MONEY ? 'text-orange-700' : 'text-gray-400'}`}>Orange Money</Text>
                <Text className={`text-xs ${providers.ORANGE_MONEY ? 'text-orange-500' : 'text-gray-400'}`}>{providers.ORANGE_MONEY ? 'Disponible' : 'Indisponible'}</Text>
              </View>
            </View>
            {providers.simulation && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3">
                <Text className="text-yellow-700 text-xs font-medium">⚙️ Mode simulation actif — les paiements sont confirmés automatiquement</Text>
              </View>
            )}
          </View>
        )}

        {/* Historique paiements */}
        {history.length > 0 && (
          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-gray-700 font-semibold mb-3">Historique des paiements</Text>
            {history.map((p) => (
              <View key={p.id} className="flex-row items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                <View className="flex-row items-center gap-3">
                  <View className={`w-9 h-9 rounded-full items-center justify-center ${PAYMENT_STATUS_BG[p.status] ?? 'bg-gray-100'}`}>
                    <Ionicons
                      name={p.status === 'SUCCEEDED' ? 'checkmark' : p.status === 'FAILED' ? 'close' : 'time-outline'}
                      size={16}
                      color={p.status === 'SUCCEEDED' ? '#16a34a' : p.status === 'FAILED' ? '#ef4444' : '#ca8a04'}
                    />
                  </View>
                  <View>
                    <Text className="text-gray-800 text-sm font-medium">{p.provider === 'WAVE' ? 'Wave' : 'Orange Money'}</Text>
                    <Text className="text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-gray-800 font-semibold text-sm">{formatCFA(p.amount)}</Text>
                  <Text className={`text-xs ${PAYMENT_STATUS_TEXT[p.status] ?? 'text-gray-500'}`}>
                    {p.status === 'SUCCEEDED' ? 'Réussi' : p.status === 'FAILED' ? 'Échoué' : 'En attente'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal upgrade */}
      <Modal visible={upgradeModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-1">S'abonner à Premium</Text>
            <Text className="text-gray-500 text-sm mb-5">2 000 FCFA / mois</Text>

            {/* Choix provider */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Moyen de paiement</Text>
            <View className="flex-row gap-3 mb-4">
              {(['WAVE', 'ORANGE_MONEY'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setSelectedProvider(p)}
                  className={`flex-1 py-3 rounded-xl items-center border ${selectedProvider === p ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'}`}
                >
                  <Text className={`font-semibold text-sm ${selectedProvider === p ? 'text-white' : 'text-gray-600'}`}>
                    {p === 'WAVE' ? '🌊 Wave' : '🟠 Orange Money'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Numéro téléphone */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Numéro de téléphone (optionnel)</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-gray-50 mb-5"
              placeholder="+221 77 XXX XX XX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setUpgradeModal(false)}
                className="flex-1 border border-gray-300 rounded-xl py-3.5 items-center"
              >
                <Text className="text-gray-600 font-semibold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpgrade}
                disabled={paying}
                className="flex-1 bg-primary-600 rounded-xl py-3.5 items-center"
              >
                {paying ? <ActivityIndicator color="white" size="small" /> : (
                  <Text className="text-white font-bold">Payer 2 000 FCFA</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
