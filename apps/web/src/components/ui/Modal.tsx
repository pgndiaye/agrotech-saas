'use client';
import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { Ton } from '@/lib/badges';
import { Bouton } from './primitives';

/**
 * Modale unique du projet. Le motif
 * `fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4` était
 * réécrit dans cinq pages.
 */
export function Modal({
  titre,
  onClose,
  children,
  ton = 'clair',
  largeur = 'max-w-md',
}: {
  titre: string;
  onClose: () => void;
  children: React.ReactNode;
  ton?: Ton;
  largeur?: string;
}) {
  // Échap ferme la modale, et le défilement de la page est bloqué tant qu'elle
  // est ouverte — deux comportements qu'aucune des modales existantes n'avait.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', surTouche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'w-full rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto',
          largeur,
          ton === 'sombre' ? 'bg-gray-900 border border-gray-800' : 'bg-white',
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className={clsx(
              'text-lg font-bold',
              ton === 'sombre' ? 'text-white' : 'text-gray-900',
            )}
          >
            {titre}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className={ton === 'sombre' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-600'}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation destructive. Unifie les deux motifs concurrents : le
 * `window.confirm()` natif du tableau de bord et la confirmation en ligne
 * « Confirmer ? Oui/Non » de la console d'administration.
 */
export function ConfirmDialog({
  titre,
  message,
  libelleConfirmation = 'Confirmer',
  onConfirm,
  onCancel,
  ton = 'clair',
  enCours = false,
}: {
  titre: string;
  message: React.ReactNode;
  libelleConfirmation?: string;
  onConfirm: () => void;
  onCancel: () => void;
  ton?: Ton;
  enCours?: boolean;
}) {
  return (
    <Modal titre={titre} onClose={onCancel} ton={ton}>
      <div
        className={clsx(
          'text-sm mb-6',
          ton === 'sombre' ? 'text-gray-300' : 'text-gray-600',
        )}
      >
        {message}
      </div>
      <div className="flex justify-end gap-3">
        <Bouton variante="secondaire" ton={ton} onClick={onCancel} disabled={enCours}>
          Annuler
        </Bouton>
        <Bouton variante="danger" ton={ton} onClick={onConfirm} disabled={enCours}>
          {enCours ? 'En cours…' : libelleConfirmation}
        </Bouton>
      </div>
    </Modal>
  );
}
