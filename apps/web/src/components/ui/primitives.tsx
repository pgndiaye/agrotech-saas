'use client';
import clsx from 'clsx';
import type { Ton } from '@/lib/badges';

/**
 * Primitives partagées entre l'application (ton clair) et la console
 * d'administration (ton sombre). Un seul jeu de composants, deux palettes —
 * plutôt que les deux systèmes visuels sans tokens communs d'avant.
 */

// ─── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({
  taille = 32,
  className,
}: {
  taille?: number;
  className?: string;
}) {
  return (
    <div
      style={{ width: taille, height: taille }}
      className={clsx('animate-spin rounded-full border-b-2', className ?? 'border-primary-600')}
    />
  );
}

export function ChargementCentre({ ton = 'clair' }: { ton?: Ton }) {
  return (
    <div className="flex justify-center py-16">
      <Spinner className={ton === 'sombre' ? 'border-red-500' : 'border-primary-600'} />
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────
export function Badge({
  children,
  classe,
  className,
}: {
  children: React.ReactNode;
  classe: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap',
        classe,
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Bouton ─────────────────────────────────────────────────────────────────
type VarianteBouton = 'principal' | 'secondaire' | 'danger' | 'fantome';

const VARIANTES: Record<VarianteBouton, Record<Ton, string>> = {
  principal: {
    clair: 'bg-primary-600 hover:bg-primary-700 text-white disabled:bg-primary-300',
    sombre: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-900',
  },
  secondaire: {
    clair: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    sombre: 'bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700',
  },
  danger: {
    clair: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300',
    sombre: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-900',
  },
  fantome: {
    clair: 'text-gray-600 hover:bg-gray-100',
    sombre: 'text-gray-400 hover:bg-gray-800 hover:text-white',
  },
};

export function Bouton({
  children,
  variante = 'principal',
  ton = 'clair',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBouton;
  ton?: Ton;
}) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTES[variante][ton],
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Champs ─────────────────────────────────────────────────────────────────
const CHAMP: Record<Ton, string> = {
  clair:
    'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-400',
  sombre:
    'bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 focus:border-gray-600',
};

export function Champ({
  ton = 'clair',
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ton?: Ton }) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-xl px-3.5 py-2 text-sm focus:outline-none transition',
        CHAMP[ton],
        className,
      )}
    />
  );
}

export function Selecteur({
  ton = 'clair',
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { ton?: Ton }) {
  return (
    <select
      {...props}
      className={clsx(
        'rounded-xl px-3 py-2 text-sm focus:outline-none transition',
        CHAMP[ton],
        className,
      )}
    >
      {children}
    </select>
  );
}

// ─── Carte ──────────────────────────────────────────────────────────────────
export function Carte({
  children,
  ton = 'clair',
  className,
}: {
  children: React.ReactNode;
  ton?: Ton;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl overflow-hidden',
        ton === 'sombre'
          ? 'bg-gray-900 border border-gray-800'
          : 'bg-white border border-gray-100 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── État vide ──────────────────────────────────────────────────────────────
export function EtatVide({
  icone,
  message,
  ton = 'clair',
}: {
  icone?: React.ReactNode;
  message: string;
  ton?: Ton;
}) {
  return (
    <div className="text-center py-12">
      {icone && (
        <div className={ton === 'sombre' ? 'text-gray-700' : 'text-gray-300'}>
          <div className="flex justify-center mb-3">{icone}</div>
        </div>
      )}
      <p className={clsx('text-sm', ton === 'sombre' ? 'text-gray-500' : 'text-gray-400')}>
        {message}
      </p>
    </div>
  );
}

// ─── Message d'erreur ───────────────────────────────────────────────────────
export function MessageErreur({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-2 text-red-500 text-sm mb-4">{children}</div>
  );
}
