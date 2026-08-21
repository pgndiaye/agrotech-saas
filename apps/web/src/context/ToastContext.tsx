'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type TypeToast = 'succes' | 'erreur' | 'info';

interface Toast {
  id: number;
  type: TypeToast;
  message: string;
}

interface ContexteToast {
  succes: (message: string) => void;
  erreur: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ContexteToast | undefined>(undefined);

const STYLES: Record<TypeToast, { classe: string; icone: React.ReactNode }> = {
  succes: {
    classe: 'bg-green-600 text-white',
    icone: <CheckCircle size={16} />,
  },
  erreur: { classe: 'bg-red-600 text-white', icone: <XCircle size={16} /> },
  info: { classe: 'bg-gray-800 text-white', icone: <Info size={16} /> },
};

const DUREE_MS = 4500;

/**
 * Notifications applicatives. Remplace les `alert()` natifs de la console
 * d'administration, qui bloquaient le fil d'exécution et sortaient du style
 * du produit.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const retirer = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const ajouter = useCallback(
    (type: TypeToast, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => retirer(id), DUREE_MS);
    },
    [retirer],
  );

  const valeur = useMemo<ContexteToast>(
    () => ({
      succes: (m) => ajouter('succes', m),
      erreur: (m) => ajouter('erreur', m),
      info: (m) => ajouter('info', m),
    }),
    [ajouter],
  );

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      <div
        // aria-live : le message est annoncé aux lecteurs d'écran, ce que ne
        // faisait aucun des messages d'erreur en ligne existants.
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm animate-in',
              STYLES[t.type].classe,
            )}
          >
            <span className="shrink-0 mt-0.5">{STYLES[t.type].icone}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => retirer(t.id)}
              aria-label="Fermer la notification"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ContexteToast {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l’intérieur de ToastProvider');
  }
  return ctx;
}
