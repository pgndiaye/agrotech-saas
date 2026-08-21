'use client';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatXof } from '@/lib/format';

/**
 * Graphiques de la console d'administration.
 * Chargés en `dynamic(..., { ssr: false })` par la page appelante, comme les
 * graphiques existants du tableau de bord.
 */

/** Palette sombre, alignée sur le fond gray-900 de la console. */
const AXE = { stroke: '#6b7280', fontSize: 11 };
const GRILLE = '#1f2937';

const STYLE_TOOLTIP = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 12,
  fontSize: 12,
  color: '#e5e7eb',
};

/** « 2026-08 » → « août 26 » */
function libelleMois(cle: string): string {
  const [annee, mois] = cle.split('-');
  const d = new Date(Number(annee), Number(mois) - 1, 1);
  return d.toLocaleDateString('fr-SN', { month: 'short', year: '2-digit' });
}

const compact = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)} M`
    : v >= 1000
      ? `${Math.round(v / 1000)} k`
      : String(v);

// ─── Revenus encaissés par mois ─────────────────────────────────────────────
export function AdminRevenueChart({
  donnees,
}: {
  donnees: { mois: string; total: number; nb: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={donnees} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRILLE} vertical={false} />
        <XAxis dataKey="mois" tickFormatter={libelleMois} {...AXE} tickLine={false} />
        <YAxis tickFormatter={compact} {...AXE} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={STYLE_TOOLTIP}
          labelFormatter={libelleMois}
          formatter={(valeur: number, nom: string) =>
            nom === 'Revenus' ? formatXof(valeur) : valeur
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        <Bar dataKey="total" name="Revenus" fill="#22c55e" radius={[6, 6, 0, 0]} />
        <Line
          dataKey="nb"
          name="Paiements"
          stroke="#818cf8"
          strokeWidth={2}
          dot={false}
          yAxisId={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Croissance cumulée des coopératives ────────────────────────────────────
export function AdminGrowthChart({
  donnees,
}: {
  donnees: { mois: string; nouveaux: number; cumul: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={donnees} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="degradeCroissance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRILLE} vertical={false} />
        <XAxis dataKey="mois" tickFormatter={libelleMois} {...AXE} tickLine={false} />
        <YAxis {...AXE} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={STYLE_TOOLTIP} labelFormatter={libelleMois} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        <Area
          dataKey="cumul"
          name="Total coopératives"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#degradeCroissance)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Répartition par plan ───────────────────────────────────────────────────
const COULEURS_PLAN: Record<string, string> = {
  PREMIUM: '#eab308',
  FREE: '#6b7280',
};

export function AdminPlanDonut({
  donnees,
}: {
  donnees: { plan: string; label: string; nb: number }[];
}) {
  const total = donnees.reduce((s, d) => s + d.nb, 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={donnees}
          dataKey="nb"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          // Le pourcentage évite d'avoir à comparer des angles à l'œil.
          label={({ label, nb }) =>
            total > 0 ? `${label} ${Math.round((nb / total) * 100)} %` : label
          }
          labelLine={false}
        >
          {donnees.map((d) => (
            <Cell key={d.plan} fill={COULEURS_PLAN[d.plan] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip contentStyle={STYLE_TOOLTIP} />
      </PieChart>
    </ResponsiveContainer>
  );
}
