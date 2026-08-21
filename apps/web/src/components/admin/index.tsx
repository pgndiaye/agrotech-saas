'use client';
import clsx from 'clsx';
import type { Ton } from '@/lib/badges';
import {
  PLANS,
  ROLES,
  STATUTS_COMPTE,
  STATUTS_PAIEMENT,
  STATUTS_TACHE,
  FOURNISSEURS,
  styleBadge,
} from '@/lib/badges';
import { Badge } from '@/components/ui/primitives';
import { StatCard } from '@/components/ui/StatCard';

// ─── Badges métier ──────────────────────────────────────────────────────────
// Un composant par famille : les pages n'ont plus à connaître les tables de styles.

export const PlanBadge = ({ plan, ton = 'sombre' }: { plan?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(PLANS, plan, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

export const RoleBadge = ({ role, ton = 'sombre' }: { role?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(ROLES, role, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

export const StatutCompteBadge = ({ statut, ton = 'sombre' }: { statut?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(STATUTS_COMPTE, statut, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

export const StatutPaiementBadge = ({ statut, ton = 'sombre' }: { statut?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(STATUTS_PAIEMENT, statut, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

export const FournisseurBadge = ({ fournisseur, ton = 'sombre' }: { fournisseur?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(FOURNISSEURS, fournisseur, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

export const StatutTacheBadge = ({ statut, ton = 'sombre' }: { statut?: string; ton?: Ton }) => {
  const { label, classe } = styleBadge(STATUTS_TACHE, statut, ton);
  return <Badge classe={classe}>{label}</Badge>;
};

// ─── En-tête de page ────────────────────────────────────────────────────────
export function AdminPageHeader({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{titre}</h1>
        {sousTitre && <p className="text-gray-400 text-sm mt-1">{sousTitre}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

// ─── Carte de statistique ───────────────────────────────────────────────────
// Variante sombre de la StatCard partagée : une seule implémentation pour la
// console d'administration et le tableau de bord.
export function AdminStatCard(
  props: Omit<React.ComponentProps<typeof StatCard>, 'ton'>,
) {
  return <StatCard {...props} ton="sombre" />;
}

// ─── Cellule « identité » ───────────────────────────────────────────────────
// Motif avatar + nom + sous-titre, présent dans les trois tables admin.
export function CelluleIdentite({
  titre,
  sousTitre,
  icone,
  couleurIcone = 'bg-indigo-600/20',
}: {
  titre: string;
  sousTitre?: string;
  icone: React.ReactNode;
  couleurIcone?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          couleurIcone,
        )}
      >
        {icone}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-white text-sm truncate">{titre}</p>
        {sousTitre && <p className="text-xs text-gray-500 truncate">{sousTitre}</p>}
      </div>
    </div>
  );
}
