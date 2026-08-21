'use client';
import { Search, X } from 'lucide-react';
import { Champ, Selecteur } from '@/components/ui/primitives';

export interface OptionFiltre {
  valeur: string;
  label: string;
}

export interface DefinitionFiltre {
  cle: string;
  label: string;
  options: OptionFiltre[];
}

/**
 * Barre de recherche + filtres des listes d'administration.
 * La recherche est debouncée par la page appelante (`useDebounce`).
 */
export function AdminFilters({
  recherche,
  onRecherche,
  placeholderRecherche = 'Rechercher…',
  filtres = [],
  valeurs,
  onFiltre,
  children,
}: {
  recherche: string;
  onRecherche: (v: string) => void;
  placeholderRecherche?: string;
  filtres?: DefinitionFiltre[];
  valeurs: Record<string, string>;
  onFiltre: (cle: string, valeur: string) => void;
  children?: React.ReactNode;
}) {
  const actifs =
    (recherche ? 1 : 0) + Object.values(valeurs).filter(Boolean).length;

  const reinitialiser = () => {
    onRecherche('');
    filtres.forEach((f) => onFiltre(f.cle, ''));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <Champ
          ton="sombre"
          value={recherche}
          onChange={(e) => onRecherche(e.target.value)}
          placeholder={placeholderRecherche}
          aria-label={placeholderRecherche}
          className="!pl-9 w-72"
        />
      </div>

      {filtres.map((f) => (
        <Selecteur
          key={f.cle}
          ton="sombre"
          value={valeurs[f.cle] ?? ''}
          onChange={(e) => onFiltre(f.cle, e.target.value)}
          aria-label={f.label}
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.label}
            </option>
          ))}
        </Selecteur>
      ))}

      {actifs > 0 && (
        <button
          onClick={reinitialiser}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
        >
          <X size={13} />
          Réinitialiser ({actifs})
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">{children}</div>
    </div>
  );
}

/** En-tête de colonne cliquable pour le tri serveur. */
export function EnteteTriable({
  label,
  cle,
  sortBy,
  sortOrder,
  onTri,
}: {
  label: string;
  cle: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onTri: (cle: string) => void;
}) {
  const actif = sortBy === cle;
  return (
    <button
      onClick={() => onTri(cle)}
      className={`inline-flex items-center gap-1 transition ${
        actif ? 'text-white' : 'hover:text-gray-200'
      }`}
    >
      {label}
      <span className="text-[10px]">{actif ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  );
}
