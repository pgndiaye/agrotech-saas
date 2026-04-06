import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalTenants: number;
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalPayments: number;
  pendingPayments: number;
  plans: { FREE?: number; PREMIUM?: number };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PREMIUM';
  createdAt: string;
  _count: { users: number; stocks: number; transactions: number };
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  tenant: { name: string; plan: string };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  tenant: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' FCFA';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  SUCCEEDED: '#16a34a',
  PENDING: '#d97706',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

const PAYMENT_STATUS_BG: Record<string, string> = {
  SUCCEEDED: '#dcfce7',
  PENDING: '#fef3c7',
  FAILED: '#fee2e2',
  CANCELLED: '#f3f4f6',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: '#dc2626',
  ADMIN: '#2563eb',
  MANAGER: '#7c3aed',
  FARMER: '#16a34a',
};

// ─── Tab: Stats ───────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dc2626" size="large" />
      </View>
    );
  }

  const cards = [
    { label: 'Coopératives', value: stats?.totalTenants ?? 0, icon: 'business-outline', color: '#2563eb', sub: `${stats?.plans?.FREE ?? 0} Free · ${stats?.plans?.PREMIUM ?? 0} Premium` },
    { label: 'Utilisateurs', value: stats?.totalUsers ?? 0, icon: 'people-outline', color: '#7c3aed', sub: null },
    { label: 'Revenus totaux', value: formatCFA(stats?.totalRevenue ?? 0), icon: 'trending-up-outline', color: '#16a34a', sub: null },
    { label: 'Abonnements actifs', value: stats?.activeSubscriptions ?? 0, icon: 'card-outline', color: '#d97706', sub: null },
    { label: 'Paiements', value: stats?.totalPayments ?? 0, icon: 'receipt-outline', color: '#0891b2', sub: `${stats?.pendingPayments ?? 0} en attente` },
  ];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} />}
    >
      {cards.map((c) => (
        <View key={c.label} className="bg-white rounded-2xl p-4 mb-3 flex-row items-center" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <View className="w-11 h-11 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: c.color + '20' }}>
            <Ionicons name={c.icon as any} size={22} color={c.color} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-xs mb-0.5">{c.label}</Text>
            <Text className="text-gray-900 font-bold text-lg">{c.value}</Text>
            {c.sub && <Text className="text-gray-400 text-xs">{c.sub}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Tab: Tenants ─────────────────────────────────────────────────────────────

function TenantsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTenants = useCallback(async (p: number, clear = false) => {
    try {
      const res = await adminApi.getTenants(p, 15);
      setTenants((prev) => (clear || p === 1 ? res.data.data : [...prev, ...res.data.data]));
      setTotal(res.data.total);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les coopératives');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadTenants(1, true); }, [loadTenants]);

  const handleTogglePlan = (t: Tenant) => {
    const newPlan = t.plan === 'FREE' ? 'PREMIUM' : 'FREE';
    Alert.alert(
      'Modifier le plan',
      `Passer ${t.name} en ${newPlan} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await adminApi.updateTenant(t.id, { plan: newPlan });
              loadTenants(1, true);
              setPage(1);
            } catch { Alert.alert('Erreur', 'Mise à jour échouée'); }
          },
        },
      ],
    );
  };

  const handleDelete = (t: Tenant) => {
    Alert.alert(
      'Supprimer la coopérative',
      `Supprimer définitivement "${t.name}" et toutes ses données ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteTenant(t.id);
              loadTenants(1, true);
              setPage(1);
            } catch { Alert.alert('Erreur', 'Suppression échouée'); }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dc2626" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={tenants}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); loadTenants(1, true); }} />}
      onEndReached={() => {
        if (tenants.length < total) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadTenants(nextPage);
        }
      }}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <Text className="text-gray-500 text-xs mb-3">{total} coopératives</Text>
      }
      renderItem={({ item: t }) => (
        <View className="bg-white rounded-2xl p-4 mb-3" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="font-bold text-gray-900">{t.name}</Text>
              <Text className="text-gray-400 text-xs">{t.slug}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleTogglePlan(t)}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: t.plan === 'PREMIUM' ? '#fef3c7' : '#f3f4f6' }}
            >
              <Text style={{ color: t.plan === 'PREMIUM' ? '#d97706' : '#6b7280', fontSize: 11, fontWeight: '700' }}>
                {t.plan}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-4 mb-3">
            <Text className="text-gray-500 text-xs">👤 {t._count.users} membres</Text>
            <Text className="text-gray-500 text-xs">📦 {t._count.stocks} stocks</Text>
            <Text className="text-gray-500 text-xs">💰 {t._count.transactions} tx</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-gray-400 text-xs">Créée le {formatDate(t.createdAt)}</Text>
            <TouchableOpacity onPress={() => handleDelete(t)} className="p-1.5 rounded-lg bg-red-50">
              <Ionicons name="trash-outline" size={15} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

// ─── Tab: Utilisateurs ────────────────────────────────────────────────────────

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER'];

function UsersTab() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async (p: number, q: string, clear = false) => {
    try {
      const res = await adminApi.getUsers(p, 15, q || undefined);
      setUsers((prev) => (clear || p === 1 ? res.data.data : [...prev, ...res.data.data]));
      setTotal(res.data.total);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUsers(1, search, true); }, [search, loadUsers]);

  const handleChangeRole = (u: PlatformUser) => {
    Alert.alert(
      'Modifier le rôle',
      `Choisir le rôle pour ${u.name}`,
      [
        ...ROLES.map((r) => ({
          text: r === u.role ? `✓ ${r}` : r,
          onPress: async () => {
            if (r === u.role) return;
            try {
              await adminApi.updateUser(u.id, { role: r });
              loadUsers(1, search, true);
              setPage(1);
            } catch { Alert.alert('Erreur', 'Mise à jour échouée'); }
          },
        })),
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const handleDelete = (u: PlatformUser) => {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Supprimer définitivement ${u.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteUser(u.id);
              loadUsers(1, search, true);
              setPage(1);
            } catch { Alert.alert('Erreur', 'Suppression échouée'); }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1">
      {/* Barre de recherche */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3">
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => { setPage(1); setSearch(searchInput); }}
            placeholder="Nom ou email..."
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            className="flex-1 py-2.5 px-2 text-sm text-gray-800"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dc2626" size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); loadUsers(1, search, true); }} />}
          onEndReached={() => {
            if (users.length < total) {
              const nextPage = page + 1;
              setPage(nextPage);
              loadUsers(nextPage, search);
            }
          }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <Text className="text-gray-500 text-xs mb-3">{total} utilisateurs</Text>
          }
          renderItem={({ item: u }) => (
            <View className="bg-white rounded-2xl p-4 mb-3" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
              <View className="flex-row items-start justify-between mb-1">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                    <Text className="text-gray-700 font-bold text-sm">{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 text-sm">{u.name}</Text>
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>{u.email}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleChangeRole(u)}
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: (ROLE_COLOR[u.role] ?? '#6b7280') + '18' }}
                >
                  <Text style={{ color: ROLE_COLOR[u.role] ?? '#6b7280', fontSize: 10, fontWeight: '700' }}>
                    {u.role}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mt-2">
                <View>
                  <Text className="text-gray-500 text-xs">{u.tenant.name}</Text>
                  <Text className="text-gray-400 text-xs">Inscrit le {formatDate(u.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(u)} className="p-1.5 rounded-lg bg-red-50">
                  <Ionicons name="trash-outline" size={15} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── Tab: Paiements ───────────────────────────────────────────────────────────

function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async (p: number, clear = false) => {
    try {
      const res = await adminApi.getPayments(p, 15);
      setPayments((prev) => (clear || p === 1 ? res.data.data : [...prev, ...res.data.data]));
      setTotal(res.data.total);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les paiements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPayments(1, true); }, [loadPayments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dc2626" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={payments}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); loadPayments(1, true); }} />}
      onEndReached={() => {
        if (payments.length < total) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPayments(nextPage);
        }
      }}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <Text className="text-gray-500 text-xs mb-3">{total} paiements</Text>
      }
      renderItem={({ item: p }) => (
        <View className="bg-white rounded-2xl p-4 mb-3" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <View className="flex-row items-start justify-between mb-1">
            <View className="flex-1 mr-2">
              <Text className="font-bold text-gray-900">{formatCFA(p.amount)}</Text>
              <Text className="text-gray-400 text-xs">{p.tenant.name}</Text>
            </View>
            <View className="items-end gap-1">
              <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: PAYMENT_STATUS_BG[p.status] ?? '#f3f4f6' }}>
                <Text style={{ color: PAYMENT_STATUS_COLOR[p.status] ?? '#6b7280', fontSize: 10, fontWeight: '700' }}>
                  {p.status}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">{p.provider}</Text>
            </View>
          </View>
          <Text className="text-gray-400 text-xs mt-1">{formatDate(p.createdAt)}</Text>
        </View>
      )}
    />
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'stats', label: 'Stats', icon: 'stats-chart-outline' },
  { key: 'tenants', label: 'Coopér.', icon: 'business-outline' },
  { key: 'users', label: 'Membres', icon: 'people-outline' },
  { key: 'payments', label: 'Paiements', icon: 'receipt-outline' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function AdminScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('stats');

  // Rediriger si pas SUPER_ADMIN
  if (user && user.role !== 'SUPER_ADMIN') {
    router.replace('/(tabs)/dashboard');
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-red-700 pt-2 pb-1">
        <View className="flex-row items-center px-4 pb-2">
          <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center mr-2">
            <Ionicons name="shield-checkmark-outline" size={18} color="white" />
          </View>
          <View>
            <Text className="text-white font-bold text-base">Admin Plateforme</Text>
            <Text className="text-red-200 text-xs">AgroTech SN</Text>
          </View>
        </View>

        {/* Onglets internes */}
        <View className="flex-row px-2">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className="flex-1 items-center py-2"
              style={{ borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? 'white' : 'transparent' }}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.5)'}
              />
              <Text style={{ color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginTop: 1 }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contenu de l'onglet actif */}
      <View className="flex-1">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'payments' && <PaymentsTab />}
      </View>
    </SafeAreaView>
  );
}
