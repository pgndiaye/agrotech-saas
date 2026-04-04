import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { aiApi } from '@/lib/api';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type RecType = 'STOCK' | 'FINANCE' | 'WEATHER' | 'PLANTING' | 'GENERAL';

interface Recommendation {
  id: string;
  type: RecType;
  priority: Priority;
  title: string;
  description: string;
  actions: string[];
}

interface Summary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface RecommendationsData {
  recommendations: Recommendation[];
  generatedAt: string;
  summary: Summary;
}

const TYPE_CONFIG: Record<RecType, { label: string; icon: string; color: string }> = {
  STOCK:    { label: 'Stocks',     icon: 'cube-outline',        color: '#ea580c' },
  FINANCE:  { label: 'Finance',    icon: 'trending-up-outline', color: '#2563eb' },
  WEATHER:  { label: 'Météo',      icon: 'cloud-outline',       color: '#0284c7' },
  PLANTING: { label: 'Plantation', icon: 'leaf-outline',        color: '#16a34a' },
  GENERAL:  { label: 'Général',    icon: 'sparkles-outline',    color: '#7c3aed' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  HIGH:   { label: 'Urgent', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  MEDIUM: { label: 'Moyen',  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  LOW:    { label: 'Faible', color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(rec.priority === 'HIGH');
  const typeConf = TYPE_CONFIG[rec.type];
  const prioConf = PRIORITY_CONFIG[rec.priority];

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Icône type */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: `${typeConf.color}15`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons name={typeConf.icon as any} size={18} color={typeConf.color} />
          </View>

          <View style={{ flex: 1 }}>
            {/* Badges */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View
                style={{
                  backgroundColor: prioConf.bg,
                  borderWidth: 1,
                  borderColor: prioConf.border,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: prioConf.color }}>
                  {prioConf.label}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500', marginTop: 2 }}>
                {typeConf.label}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 }}>
              {rec.title}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#9ca3af"
            style={{ marginTop: 2 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 }}>
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 }} />
          <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 12 }}>
            {rec.description}
          </Text>
          {rec.actions.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Actions recommandées
              </Text>
              {rec.actions.map((action, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: typeConf.color,
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: '#374151', flex: 1, lineHeight: 20 }}>
                    {action}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function RecommendationsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('Dakar');
  const [filter, setFilter] = useState<'ALL' | RecType>('ALL');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getRecommendations(city);
      setData(res.data);
    } catch {
      setError('Impossible de charger les recommandations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => { loadData(); }, [loadData]);

  // Garde Premium
  if (user && user.tenant?.plan !== 'PREMIUM') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="bulb-outline" size={34} color="white" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 }}>
            IA Conseils — Premium
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            Les recommandations agricoles personnalisées sont réservées aux abonnés Premium.
            Passez au plan Premium pour bénéficier d'analyses en temps réel.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/payments')}
            style={{ backgroundColor: '#16a34a', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="star-outline" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Passer au Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const filtered = data?.recommendations.filter(
    (r) => filter === 'ALL' || r.type === filter,
  ) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="bulb-outline" size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Recommandations IA</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Analyse de votre exploitation</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
      >
        {/* Ville + bouton actualiser */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Ville météo"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              backgroundColor: '#ffffff',
              color: '#111827',
            }}
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
            onSubmitEditing={() => loadData()}
          />
          <TouchableOpacity
            onPress={() => loadData()}
            style={{
              backgroundColor: '#16a34a',
              borderRadius: 12,
              paddingHorizontal: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Erreur */}
        {error && (
          <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ color: '#b91c1c', fontSize: 13 }}>⚠️ {error}</Text>
          </View>
        )}

        {/* Chargement */}
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Analyse en cours…</Text>
          </View>
        )}

        {/* Résumé */}
        {data && !loading && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Total', value: data.summary.total, color: '#374151', bg: '#f3f4f6' },
                { label: 'Urgents', value: data.summary.high, color: '#b91c1c', bg: '#fef2f2' },
                { label: 'Moyens', value: data.summary.medium, color: '#b45309', bg: '#fffbeb' },
                { label: 'Faibles', value: data.summary.low, color: '#4b5563', bg: '#f9fafb' },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: s.color, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Filtres */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setFilter('ALL')}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: filter === 'ALL' ? '#16a34a' : '#ffffff',
                    borderWidth: 1,
                    borderColor: filter === 'ALL' ? '#16a34a' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: filter === 'ALL' ? '#ffffff' : '#374151' }}>
                    Toutes ({data.recommendations.length})
                  </Text>
                </TouchableOpacity>
                {(Object.keys(TYPE_CONFIG) as RecType[]).map((type) => {
                  const count = data.recommendations.filter((r) => r.type === type).length;
                  if (count === 0) return null;
                  const conf = TYPE_CONFIG[type];
                  const isActive = filter === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFilter(type)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: isActive ? conf.color : '#ffffff',
                        borderWidth: 1,
                        borderColor: isActive ? conf.color : '#e5e7eb',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#ffffff' : '#374151' }}>
                        {conf.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Liste */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="bulb-outline" size={48} color="#d1d5db" />
                <Text style={{ color: '#9ca3af', marginTop: 12, fontWeight: '600' }}>Aucune recommandation</Text>
              </View>
            ) : (
              filtered.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
            )}

            {/* Footer */}
            <Text style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 8, marginBottom: 16 }}>
              Générées le {new Date(data.generatedAt).toLocaleString('fr-SN')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
