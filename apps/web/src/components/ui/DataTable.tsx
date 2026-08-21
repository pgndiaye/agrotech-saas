'use client';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Ton } from '@/lib/badges';
import { Carte, ChargementCentre, EtatVide } from './primitives';

export interface Colonne<T> {
  cle: string;
  /** ReactNode et non string : les colonnes triables y placent un bouton. */
  entete: React.ReactNode;
  /** Rendu personnalisé ; à défaut, la valeur brute de `cle` est affichée. */
  rendu?: (ligne: T) => React.ReactNode;
  alignement?: 'gauche' | 'centre' | 'droite';
  className?: string;
}

const ALIGNEMENTS = {
  gauche: 'text-left',
  centre: 'text-center',
  droite: 'text-right',
} as const;

/**
 * Table paginée générique.
 *
 * Absorbe le bloc table + pagination qui était copié-collé à l'identique dans
 * les trois pages de la console d'administration.
 */
export function DataTable<T extends { id: string }>({
  colonnes,
  lignes,
  loading,
  ton = 'clair',
  messageVide = 'Aucun élément',
  iconeVide,
  onLigneClick,
  ligneOuverte,
  renduDetail,
}: {
  colonnes: Colonne<T>[];
  lignes: T[];
  loading?: boolean;
  ton?: Ton;
  messageVide?: string;
  iconeVide?: React.ReactNode;
  onLigneClick?: (ligne: T) => void;
  /** Id de la ligne dont le détail est déplié. */
  ligneOuverte?: string | null;
  renduDetail?: (ligne: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <Carte ton={ton}>
        <ChargementCentre ton={ton} />
      </Carte>
    );
  }

  if (lignes.length === 0) {
    return (
      <Carte ton={ton}>
        <EtatVide message={messageVide} icone={iconeVide} ton={ton} />
      </Carte>
    );
  }

  const sombre = ton === 'sombre';

  return (
    <Carte ton={ton}>
      {/* Conteneur défilant : les tables larges ne doivent pas élargir la page. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className={clsx(
                'border-b',
                sombre ? 'border-gray-800 text-gray-400' : 'border-gray-100 text-gray-500',
              )}
            >
              {colonnes.map((c) => (
                <th
                  key={c.cle}
                  className={clsx(
                    'px-5 py-3 font-medium whitespace-nowrap',
                    ALIGNEMENTS[c.alignement ?? 'gauche'],
                  )}
                >
                  {c.entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => (
              <FragmentLigne
                key={ligne.id}
                ligne={ligne}
                colonnes={colonnes}
                sombre={sombre}
                onLigneClick={onLigneClick}
                ouverte={ligneOuverte === ligne.id}
                renduDetail={renduDetail}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Carte>
  );
}

function FragmentLigne<T extends { id: string }>({
  ligne,
  colonnes,
  sombre,
  onLigneClick,
  ouverte,
  renduDetail,
}: {
  ligne: T;
  colonnes: Colonne<T>[];
  sombre: boolean;
  onLigneClick?: (ligne: T) => void;
  ouverte: boolean;
  renduDetail?: (ligne: T) => React.ReactNode;
}) {
  return (
    <>
      <tr
        onClick={onLigneClick ? () => onLigneClick(ligne) : undefined}
        className={clsx(
          'border-b',
          sombre ? 'border-gray-800/60 hover:bg-gray-800/30' : 'border-gray-50 hover:bg-gray-50',
          onLigneClick && 'cursor-pointer',
        )}
      >
        {colonnes.map((c) => (
          <td
            key={c.cle}
            className={clsx('px-5 py-3', ALIGNEMENTS[c.alignement ?? 'gauche'], c.className)}
          >
            {c.rendu ? c.rendu(ligne) : String((ligne as Record<string, unknown>)[c.cle] ?? '—')}
          </td>
        ))}
      </tr>
      {ouverte && renduDetail && (
        <tr className={clsx('border-b', sombre ? 'border-gray-800/60 bg-gray-950/60' : 'border-gray-50 bg-gray-50')}>
          <td colSpan={colonnes.length} className="px-5 py-4">
            {renduDetail(ligne)}
          </td>
        </tr>
      )}
    </>
  );
}

/** Pagination — même contrôle pour toutes les listes. */
export function Pagination({
  page,
  totalPages,
  total,
  libelle = 'éléments',
  onChange,
  ton = 'clair',
}: {
  page: number;
  totalPages: number;
  total: number;
  libelle?: string;
  onChange: (page: number) => void;
  ton?: Ton;
}) {
  if (totalPages <= 1) return null;
  const sombre = ton === 'sombre';

  const bouton = clsx(
    'p-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed',
    sombre
      ? 'bg-gray-800 text-gray-400 hover:text-white'
      : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900',
  );

  return (
    <div className="flex items-center justify-between mt-4">
      <p className={clsx('text-sm', sombre ? 'text-gray-400' : 'text-gray-500')}>
        Page {page} / {totalPages} — {total} {libelle}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Page précédente"
          className={bouton}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          className={bouton}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
