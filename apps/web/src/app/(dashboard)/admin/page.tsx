'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { adminApi } from '@/lib/api';
import {
  Building2,
  Users,
  TrendingUp,
  CreditCard,
  Clock,
  AlertCircle,
  Repeat,
  TrendingDown,
  CalendarClock,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  PlanBadge,
  RoleBadge,
  StatutPaiementBadge,
} from '@/components/admin';
import { Carte, ChargementCentre, EtatVide } from '@/components/ui/primitives';
import { formatRelatif, formatXof } from '@/lib/format';

// ssr: false — recharts mesure le DOM, il ne peut pas être rendu côté serveur.
const AdminRevenueChart = dynamic(
  () => import('@/components/charts/AdminCharts').then((m) => m.AdminRevenueChart),
  { ssr: false },
);
const AdminGrowthChart = dynamic(
  () => import('@/components/charts/AdminCharts').then((m) => m.AdminGrowthChart),
  { ssr: false },
);
const AdminPlanDonut = dynamic(
  () => import('@/components/charts/AdminCharts').then((m) => m.AdminPlanDonut),
  { ssr: false },
);

const pourcent = (v: number) => `${(v * 100).toFixed(1)} %`;

function BlocActivite({
  titre,
  icone,
  vide,
  children,
}: {
  titre: string;
  icone: React.ReactNode;
  vide: boolean;
  children: React.ReactNode;
}) {
  return (
    <Carte ton="sombre" className="p-5">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        {icone}
        {titre}
      </h2>
      {vide ? (
        <EtatVide message="Rien à afficher" ton="sombre" />
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </Carte>
  );
}

export default function AdminDashboardPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [revenus, setRevenus] = useState<any[]>([]);
  const [croissance, setCroissance] = useState<any[]>([]);
  const [repartition, setRepartition] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.getKpiOverview(),
      adminApi.getKpiRevenue(12),
      adminApi.getKpiGrowth(12),
      adminApi.getKpiPlans(),
      adminApi.getActivity(),
    ])
      .then(([o, r, g, p, a]) => {
        setKpi(o.data);
        setRevenus(r.data);
        setCroissance(g.data);
        setRepartition(p.data);
        setActivity(a.data);
      })
      .catch(() => setErreur('Impossible de charger les indicateurs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChargementCentre ton="sombre" />;

  if (erreur) {
    return (
      <div className="p-8 flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        {erreur}
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Vue d'ensemble plateforme"
        sousTitre="Santé commerciale de AgroTech SN"
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <AdminStatCard
          label="MRR — revenu récurrent mensuel"
          valeur={formatXof(kpi?.mrr ?? 0)}
          icone={<Repeat size={18} className="text-white" />}
          couleur="bg-green-600"
          detail={`ARR ${formatXof(kpi?.arr ?? 0)} · ARPA ${formatXof(kpi?.arpa ?? 0)}`}
        />
        <AdminStatCard
          label="Coopératives payantes"
          valeur={kpi?.tenantsPayants ?? 0}
          icone={<Building2 size={18} className="text-white" />}
          couleur="bg-blue-600"
          detail={`sur ${kpi?.tenantsTotal ?? 0} au total`}
        />
        <AdminStatCard
          label="Taux de conversion"
          valeur={pourcent(kpi?.tauxConversion ?? 0)}
          icone={<TrendingUp size={18} className="text-white" />}
          couleur="bg-indigo-600"
          detail="coopératives ayant déjà souscrit"
        />
        <AdminStatCard
          label="Churn 30 jours"
          valeur={pourcent(kpi?.churn30j ?? 0)}
          icone={<TrendingDown size={18} className="text-white" />}
          couleur="bg-red-600"
          detail="résiliations et expirations"
        />
        <AdminStatCard
          label="Revenus 30 jours"
          valeur={formatXof(kpi?.revenus30j ?? 0)}
          icone={<CreditCard size={18} className="text-white" />}
          couleur="bg-yellow-600"
          detail={`${kpi?.paiements30j ?? 0} paiement(s) encaissé(s)`}
        />
        <AdminStatCard
          label="Échéances sous 30 jours"
          valeur={kpi?.abonnementsExpirantJ30 ?? 0}
          icone={<CalendarClock size={18} className="text-white" />}
          couleur="bg-orange-600"
          detail="abonnements à renouveler"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <Carte ton="sombre" className="p-5 xl:col-span-2">
          <h2 className="font-semibold mb-4">Revenus encaissés (12 mois)</h2>
          <AdminRevenueChart donnees={revenus} />
        </Carte>
        <Carte ton="sombre" className="p-5">
          <h2 className="font-semibold mb-4">Répartition par plan</h2>
          <AdminPlanDonut donnees={repartition} />
        </Carte>
      </div>

      <Carte ton="sombre" className="p-5 mb-6">
        <h2 className="font-semibold mb-4">Croissance des coopératives</h2>
        <AdminGrowthChart donnees={croissance} />
      </Carte>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <BlocActivite
          titre="Dernières coopératives"
          icone={<Building2 size={16} className="text-blue-400" />}
          vide={!activity?.recentTenants?.length}
        >
          {activity?.recentTenants?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{t.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {t.slug} · {formatRelatif(t.createdAt)}
                </p>
              </div>
              <PlanBadge plan={t.plan} />
            </div>
          ))}
        </BlocActivite>

        <BlocActivite
          titre="Derniers utilisateurs"
          icone={<Users size={16} className="text-purple-400" />}
          vide={!activity?.recentUsers?.length}
        >
          {activity?.recentUsers?.map((u: any) => (
            <div key={u.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <RoleBadge role={u.role} />
            </div>
          ))}
        </BlocActivite>

        <BlocActivite
          titre="Derniers paiements"
          icone={<Clock size={16} className="text-green-400" />}
          vide={!activity?.recentPayments?.length}
        >
          {activity?.recentPayments?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">{formatXof(p.amount)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {p.tenant?.name} · {p.provider}
                </p>
              </div>
              <StatutPaiementBadge statut={p.status} />
            </div>
          ))}
        </BlocActivite>
      </div>
    </div>
  );
}
