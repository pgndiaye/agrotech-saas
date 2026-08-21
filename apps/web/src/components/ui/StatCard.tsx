'use client';
import clsx from 'clsx';
import type { Ton } from '@/lib/badges';

/**
 * Carte de statistique unique du projet.
 *
 * Deux versions divergentes coexistaient : une claire dans le tableau de bord
 * et une sombre dans la console d'administration, avec des noms de props
 * différents pour le même contenu.
 */
export function StatCard({
  label,
  valeur,
  icone,
  couleur,
  detail,
  ton = 'clair',
}: {
  label: string;
  valeur: string | number;
  icone: React.ReactNode;
  /** Classe de fond de la pastille d'icône, ex. `bg-blue-600`. */
  couleur: string;
  detail?: React.ReactNode;
  ton?: Ton;
}) {
  const sombre = ton === 'sombre';

  return (
    <div
      className={clsx(
        'rounded-2xl p-5',
        sombre
          ? 'bg-gray-900 border border-gray-800'
          : 'bg-white border border-gray-100 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={clsx('text-sm font-medium', sombre ? 'text-gray-400' : 'text-gray-500')}>
          {label}
        </p>
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            couleur,
          )}
        >
          {icone}
        </div>
      </div>
      <p className={clsx('text-2xl font-bold', sombre ? 'text-white' : 'text-gray-900')}>
        {valeur}
      </p>
      {detail && (
        <div className={clsx('text-xs mt-1.5', sombre ? 'text-gray-500' : 'text-gray-400')}>
          {detail}
        </div>
      )}
    </div>
  );
}
