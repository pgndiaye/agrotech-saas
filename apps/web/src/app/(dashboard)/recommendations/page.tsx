'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { aiApi } from '@/lib/api';
import {
  Brain,
  Package,
  TrendingUp,
  CloudSun,
  Sprout,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type RecType = 'STOCK' | 'FINANCE' | 'WEATHER' | 'PLANTING' | 'GENERAL';

interface Recommendation {
  id: string;
  type: RecType;
  priority: Priority;
  title: string;
  description: string;
  actions: string[];
  data?: Record<string, any>;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  generatedAt: string;
  summary: { total: number; high: number; medium: number; low: number };
}

const TYPE_CONFIG: Record<RecType, { label: string; icon: any; color: string; bg: string }> = {
  STOCK:    { label: 'Stocks',    icon: Package,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  FINANCE:  { label: 'Finance',   icon: TrendingUp, color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
  WEATHER:  { label: 'Météo',     icon: CloudSun,  color: 'text-sky-600',   bg: 'bg-sky-50 border-sky-200' },
  PLANTING: { label: 'Plantation',icon: Sprout,    color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  GENERAL:  { label: 'Général',   icon: Sparkles,  color: 'text-purple-600',bg: 'bg-purple-50 border-purple-200' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: any; badge: string }> = {
  HIGH:   { label: 'Urgent',  icon: AlertTriangle, badge: 'bg-red-100 text-red-700 border-red-200' },
  MEDIUM: { label: 'Moyen',   icon: AlertCircle,   badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  LOW:    { label: 'Faible',  icon: Info,          badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(rec.priority === 'HIGH');
  const typeConf = TYPE_CONFIG[rec.type];
  const prioConf = PRIORITY_CONFIG[rec.priority];
  const TypeIcon = typeConf.icon;
  const PrioIcon = prioConf.icon;

  return (
    <div className={clsx('rounded-2xl border p-5 transition-shadow hover:shadow-md', typeConf.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={clsx('mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/70 border border-white/80')}>
            <TypeIcon size={18} className={typeConf.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', prioConf.badge)}>
                <PrioIcon size={10} className="inline mr-1" />{prioConf.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{typeConf.label}</span>
            </div>
            <p className="font-semibold text-gray-900 leading-snug">{rec.title}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-1"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pl-12">
          <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>
          {rec.actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Actions recommandées</p>
              <ul className="space-y-1.5">
                {rec.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('Dakar');
  const [filter, setFilter] = useState<'ALL' | RecType>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getRecommendations(city);
      setData(res.data);
    } catch {
      setError('Impossible de charger les recommandations. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => { load(); }, [load]);

  // Garde Premium — rediriger si plan FREE
  if (user && user.tenant?.plan !== 'PREMIUM') {
    return (
      <div className="p-6 max-w-lg mx-auto mt-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow mx-auto">
          <Brain size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">IA Conseils — Fonctionnalité Premium</h1>
        <p className="text-gray-500 leading-relaxed">
          Les recommandations agricoles personnalisées sont réservées aux abonnés Premium.
          Passez au plan Premium pour bénéficier d'analyses en temps réel de vos stocks,
          finances et conditions météo.
        </p>
        <button
          onClick={() => router.push('/payments')}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition"
        >
          <Sparkles size={18} />
          Passer au Premium
        </button>
      </div>
    );
  }

  const filtered = data?.recommendations.filter(
    (r) => filter === 'ALL' || r.type === filter,
  ) ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recommandations IA</h1>
            <p className="text-sm text-gray-500">Analyse personnalisée de votre exploitation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville météo"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyse…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Résumé */}
      {data && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: data.summary.total, color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Urgents', value: data.summary.high, color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Moyens', value: data.summary.medium, color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'Faibles', value: data.summary.low, color: 'bg-green-50 border-green-200 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={clsx('rounded-xl border p-4 text-center', s.color)}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      {data && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
              filter === 'ALL' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300')}
          >
            Toutes ({data.recommendations.length})
          </button>
          {(Object.keys(TYPE_CONFIG) as RecType[]).map((type) => {
            const count = data.recommendations.filter((r) => r.type === type).length;
            if (count === 0) return null;
            const conf = TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                  filter === type ? `${conf.color} border-current bg-white` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
              >
                {conf.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl h-24" />
          ))}
        </div>
      )}

      {/* Liste */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Brain size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune recommandation pour ce filtre</p>
          <p className="text-sm mt-1">Essayez d'ajouter des stocks ou des transactions</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}

      {/* Footer */}
      {data && !loading && (
        <p className="text-center text-xs text-gray-400">
          Générées le {new Date(data.generatedAt).toLocaleString('fr-SN')} · Basées sur vos données en temps réel
        </p>
      )}
    </div>
  );
}
