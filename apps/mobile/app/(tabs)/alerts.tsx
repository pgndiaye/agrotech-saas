import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { smsApi } from '../../lib/api';

const SENEGALESE_CITIES = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack',
  'Diourbel', 'Louga', 'Tambacounda', 'Kolda', 'Fatick',
];

const TYPE_LABELS: Record<string, string> = {
  STOCK_CRITICAL: '🚨 Stock critique',
  STOCK_LOW: '⚠️ Stock bas',
  WEATHER_ALERT: '🌡️ Météo',
  FINANCE_ALERT: '💰 Finance',
  WEEKLY_DIGEST: '📊 Digest hebdo',
  TEST: '✅ Test',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: '#16a34a',
  SIMULATED: '#2563eb',
  FAILED: '#dc2626',
  PENDING: '#d97706',
};

interface SmsLog {
  id: string;
  phoneNumber: string;
  message: string;
  type: string;
  status: string;
  provider: string | null;
  error: string | null;
  createdAt: string;
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isPremium = user?.tenant?.plan === 'PREMIUM';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [cityOpen, setCityOpen] = useState(false);

  const [form, setForm] = useState({
    phoneNumber: '',
    city: 'Dakar',
    enabled: true,
    stockAlerts: true,
    weatherAlerts: true,
    financeAlerts: true,
    weeklyDigest: false,
  });

  const load = useCallback(async () => {
    if (!isPremium) { setLoading(false); return; }
    try {
      const [cfgRes, logsRes] = await Promise.all([smsApi.getConfig(), smsApi.getLogs()]);
      if (cfgRes.data) {
        setHasConfig(true);
        setForm({
          phoneNumber: cfgRes.data.phoneNumber,
          city: cfgRes.data.city,
          enabled: cfgRes.data.enabled,
          stockAlerts: cfgRes.data.stockAlerts,
          weatherAlerts: cfgRes.data.weatherAlerts,
          financeAlerts: cfgRes.data.financeAlerts,
          weeklyDigest: cfgRes.data.weeklyDigest,
        });
      }
      setLogs(logsRes.data ?? []);
    } catch {
      /* pas de config encore */
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  useEffect(() => { load(); }, [load]);

  // Écran verrouillé pour les FREE
  if (!isPremium) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-5xl mb-4">🔒</Text>
        <Text className="text-xl font-bold text-gray-800 text-center mb-2">
          Alertes SMS Premium
        </Text>
        <Text className="text-gray-500 text-center mb-6 leading-6">
          Recevez des alertes SMS automatiques pour stocks critiques, météo agricole et finances.
          Fonctionne sans connexion internet.
        </Text>
        <TouchableOpacity
          className="bg-green-600 px-8 py-3 rounded-xl"
          onPress={() => router.push('/(tabs)/payments')}
        >
          <Text className="text-white font-semibold text-base">Passer au Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const handleSave = async () => {
    if (!form.phoneNumber.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return;
    }
    setSaving(true);
    try {
      await smsApi.upsertConfig(form);
      setHasConfig(true);
      await load();
      Alert.alert('✅ Succès', 'Configuration enregistrée');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!hasConfig) {
      Alert.alert('Info', 'Enregistrez d\'abord la configuration');
      return;
    }
    setTesting(true);
    try {
      await smsApi.sendTestSms();
      await load();
      Alert.alert('✅ SMS envoyé', 'Vérifiez votre téléphone');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible d\'envoyer');
    } finally {
      setTesting(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await smsApi.triggerAlerts();
      await load();
      const sent = res.data?.sent ?? 0;
      Alert.alert(
        '✅ Analyse terminée',
        sent === 0 ? 'Aucune alerte nécessaire — tout va bien 👍' : `${sent} alerte(s) envoyée(s)`,
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de déclencher');
    } finally {
      setTriggering(false);
    }
  };

  const toggles = [
    { key: 'stockAlerts', label: '🌾 Alertes stocks' },
    { key: 'weatherAlerts', label: '🌦️ Alertes météo' },
    { key: 'financeAlerts', label: '💰 Alertes finances' },
    { key: 'weeklyDigest', label: '📊 Résumé hebdomadaire' },
    { key: 'enabled', label: '🔔 Alertes activées' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="px-4 pt-6 pb-10">
        {/* Titre */}
        <Text className="text-2xl font-bold text-gray-800 mb-1">🔔 Alertes SMS</Text>
        <Text className="text-gray-500 text-sm mb-6">
          Alertes automatiques même sans connexion internet
        </Text>

        {/* Formulaire */}
        <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <Text className="font-semibold text-gray-700 text-base mb-4">Configuration</Text>

          {/* Numéro */}
          <Text className="text-sm text-gray-600 mb-1">Numéro de téléphone *</Text>
          <TextInput
            value={form.phoneNumber}
            onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
            placeholder="+221771234567"
            keyboardType="phone-pad"
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-4"
          />

          {/* Ville */}
          <Text className="text-sm text-gray-600 mb-1">Ville</Text>
          <TouchableOpacity
            onPress={() => setCityOpen(!cityOpen)}
            className="border border-gray-200 rounded-xl px-4 py-3 mb-1 flex-row items-center justify-between"
          >
            <Text className="text-sm text-gray-800">{form.city}</Text>
            <Text className="text-gray-400">{cityOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {cityOpen && (
            <View className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              {SENEGALESE_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  onPress={() => { setForm({ ...form, city }); setCityOpen(false); }}
                  className={`px-4 py-3 ${form.city === city ? 'bg-green-50' : 'bg-white'}`}
                >
                  <Text className={`text-sm ${form.city === city ? 'text-green-700 font-semibold' : 'text-gray-800'}`}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Toggles */}
          <View className="space-y-3 pt-1 mb-2">
            {toggles.map(({ key, label }) => (
              <View key={key} className="flex-row items-center justify-between py-1">
                <Text className="text-sm text-gray-700 flex-1">{label}</Text>
                <Switch
                  value={form[key as keyof typeof form] as boolean}
                  onValueChange={(v) => setForm({ ...form, [key]: v })}
                  trackColor={{ false: '#d1d5db', true: '#16a34a' }}
                  thumbColor="#ffffff"
                />
              </View>
            ))}
          </View>

          {/* Boutons */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-green-600 rounded-xl py-3 items-center mt-4 mb-2"
          >
            <Text className="text-white font-semibold text-sm">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleTest}
              disabled={testing || !hasConfig}
              className="flex-1 bg-blue-600 rounded-xl py-3 items-center opacity-100 disabled:opacity-50"
              style={{ opacity: testing || !hasConfig ? 0.5 : 1 }}
            >
              <Text className="text-white font-semibold text-sm">
                {testing ? 'Envoi…' : '📲 SMS test'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTrigger}
              disabled={triggering || !hasConfig}
              className="flex-1 bg-orange-500 rounded-xl py-3 items-center"
              style={{ opacity: triggering || !hasConfig ? 0.5 : 1 }}
            >
              <Text className="text-white font-semibold text-sm">
                {triggering ? 'Analyse…' : '⚡ Déclencher'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Journal SMS */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="font-semibold text-gray-700 text-base mb-4">
            📋 Journal SMS ({logs.length})
          </Text>
          {logs.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-3xl mb-2">🔕</Text>
              <Text className="text-gray-400 text-sm">Aucun SMS envoyé pour l'instant</Text>
            </View>
          ) : (
            logs.map((log) => (
              <View
                key={log.id}
                className="border border-gray-100 rounded-xl p-4 mb-3 bg-gray-50"
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-semibold text-gray-600">
                    {TYPE_LABELS[log.type] ?? log.type}
                  </Text>
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (STATUS_COLORS[log.status] ?? '#6b7280') + '20' }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: STATUS_COLORS[log.status] ?? '#6b7280' }}
                    >
                      {log.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-700 mb-1" numberOfLines={2}>{log.message}</Text>
                <Text className="text-xs text-gray-400">
                  {log.phoneNumber} · {log.provider ?? 'N/A'} · {new Date(log.createdAt).toLocaleString('fr-SN')}
                </Text>
                {log.error && (
                  <Text className="text-xs text-red-500 mt-1">⚠️ {log.error}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
