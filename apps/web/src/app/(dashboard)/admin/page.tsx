'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Building2, Users, TrendingUp, CreditCard, Clock, AlertCircle } from 'lucide-react';

interface Stats {
  totalTenants: number;
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalPayments: number;
  pendingPayments: number;
  plans: { FREE?: number; PREMIUM?: number };
}

interface Activity {
  recentPayments: any[];
  recentUsers: any[];
  recentTenants: any[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: 'text-green-400',
  PENDING: 'text-yellow-400',
  FAILED: 'text-red-400',
  CANCELLED: 'text-gray-400',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getActivity()])
      .then(([statsRes, actRes]) => {
        setStats(statsRes.data);
        setActivity(actRes.data);
      })
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Vue d'ensemble plateforme</h1>
        <p className="text-gray-400 text-sm mt-1">Statistiques globales de AgroTech SN</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Coopératives"
          value={stats?.totalTenants ?? 0}
          icon={Building2}
          color="bg-blue-600"
          sub={`${stats?.plans?.FREE ?? 0} Free · ${stats?.plans?.PREMIUM ?? 0} Premium`}
        />
        <StatCard
          label="Utilisateurs"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="bg-purple-600"
        />
        <StatCard
          label="Revenus totaux"
          value={`${(stats?.totalRevenue ?? 0).toLocaleString('fr-FR')} FCFA`}
          icon={TrendingUp}
          color="bg-green-600"
        />
        <StatCard
          label="Abonnements actifs"
          value={stats?.activeSubscriptions ?? 0}
          icon={CreditCard}
          color="bg-yellow-600"
        />
        <StatCard
          label="Paiements totaux"
          value={stats?.totalPayments ?? 0}
          icon={CreditCard}
          color="bg-indigo-600"
          sub={`${stats?.pendingPayments ?? 0} en attente`}
        />
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Dernières coopératives */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-blue-400" />
            Dernières coopératives
          </h2>
          <div className="space-y-3">
            {activity?.recentTenants?.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.slug}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    t.plan === 'PREMIUM'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {t.plan}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers utilisateurs */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-purple-400" />
            Derniers utilisateurs
          </h2>
          <div className="space-y-3">
            {activity?.recentUsers?.map((u) => (
              <div key={u.id} className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers paiements */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-green-400" />
            Derniers paiements
          </h2>
          <div className="space-y-3">
            {activity?.recentPayments?.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">
                    {p.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-xs text-gray-500">{p.tenant?.name} · {p.provider}</p>
                </div>
                <span className={`text-xs font-medium ${STATUS_COLORS[p.status] ?? 'text-gray-400'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
