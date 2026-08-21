/**
 * Styles de badges centralisés.
 *
 * Ces tables étaient dupliquées dans quatre pages (STATUS_COLORS,
 * STATUS_STYLES, PROVIDER_STYLES, ROLE_COLORS), avec des couleurs divergentes
 * pour un même statut selon la page.
 *
 * Chaque table existe en deux tons : `clair` pour l'application, `sombre` pour
 * la console d'administration.
 */

export type Ton = 'clair' | 'sombre';

export interface StyleBadge {
  label: string;
  clair: string;
  sombre: string;
}

const INCONNU: StyleBadge = {
  label: '—',
  clair: 'text-gray-600 bg-gray-100',
  sombre: 'bg-gray-700 text-gray-400',
};

export const STATUTS_PAIEMENT: Record<string, StyleBadge> = {
  SUCCEEDED: { label: 'Réussi', clair: 'text-green-600 bg-green-50', sombre: 'bg-green-500/20 text-green-300' },
  PENDING: { label: 'En attente', clair: 'text-yellow-600 bg-yellow-50', sombre: 'bg-yellow-500/20 text-yellow-300' },
  FAILED: { label: 'Échoué', clair: 'text-red-600 bg-red-50', sombre: 'bg-red-500/20 text-red-300' },
  CANCELLED: { label: 'Annulé', clair: 'text-gray-500 bg-gray-100', sombre: 'bg-gray-600/30 text-gray-400' },
};

export const FOURNISSEURS: Record<string, StyleBadge> = {
  WAVE: { label: 'Wave', clair: 'text-blue-600 bg-blue-50', sombre: 'bg-blue-500/20 text-blue-300' },
  ORANGE_MONEY: { label: 'Orange Money', clair: 'text-orange-600 bg-orange-50', sombre: 'bg-orange-500/20 text-orange-300' },
};

export const PLANS: Record<string, StyleBadge> = {
  PREMIUM: { label: 'Premium', clair: 'text-yellow-700 bg-yellow-100', sombre: 'bg-yellow-500/20 text-yellow-300' },
  FREE: { label: 'Gratuit', clair: 'text-gray-600 bg-gray-100', sombre: 'bg-gray-700 text-gray-400' },
};

export const ROLES: Record<string, StyleBadge> = {
  SUPER_ADMIN: { label: 'Super admin', clair: 'text-red-700 bg-red-100', sombre: 'bg-red-500/20 text-red-300' },
  ADMIN: { label: 'Admin', clair: 'text-indigo-700 bg-indigo-100', sombre: 'bg-indigo-500/20 text-indigo-300' },
  MANAGER: { label: 'Gestionnaire', clair: 'text-blue-700 bg-blue-100', sombre: 'bg-blue-500/20 text-blue-300' },
  FARMER: { label: 'Agriculteur', clair: 'text-green-700 bg-green-100', sombre: 'bg-green-500/20 text-green-300' },
};

/** Statut de compte / d'organisation (lot 1). */
export const STATUTS_COMPTE: Record<string, StyleBadge> = {
  ACTIVE: { label: 'Actif', clair: 'text-green-700 bg-green-100', sombre: 'bg-green-500/20 text-green-300' },
  SUSPENDED: { label: 'Suspendu', clair: 'text-orange-700 bg-orange-100', sombre: 'bg-orange-500/20 text-orange-300' },
  DELETED: { label: 'Supprimé', clair: 'text-red-700 bg-red-100', sombre: 'bg-red-500/20 text-red-300' },
};

export const STATUTS_TACHE: Record<string, StyleBadge> = {
  SUCCESS: { label: 'Réussie', clair: 'text-green-700 bg-green-100', sombre: 'bg-green-500/20 text-green-300' },
  RUNNING: { label: 'En cours', clair: 'text-blue-700 bg-blue-100', sombre: 'bg-blue-500/20 text-blue-300' },
  FAILED: { label: 'Échouée', clair: 'text-red-700 bg-red-100', sombre: 'bg-red-500/20 text-red-300' },
};

/** Résout un style, avec repli sur un badge neutre plutôt qu'un rendu cassé. */
export function styleBadge(
  table: Record<string, StyleBadge>,
  cle: string | undefined | null,
  ton: Ton = 'clair',
): { label: string; classe: string } {
  const entree = (cle && table[cle]) || { ...INCONNU, label: cle ?? '—' };
  return { label: entree.label, classe: entree[ton] };
}
