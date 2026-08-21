'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReponsePaginee<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Encapsule le contrat `{ data, total, page, limit }` renvoyé par toutes les
 * listes de l'API admin.
 *
 * Remplace le bloc `useState` + `useEffect` + calcul de `totalPages` qui était
 * copié à l'identique dans les trois pages admin. Pas de React Query : le
 * dépôt n'a aucune bibliothèque de data-fetching et on n'en introduit pas une
 * pour ce seul besoin.
 */
export function usePaginatedResource<T>(
  /**
   * IMPORTANT : `charger` doit être mémoïsée par l'appelant avec `useCallback`,
   * en y déclarant les filtres dont elle dépend (recherche, entité…).
   * C'est ce changement d'identité qui déclenche le rechargement — une lambda
   * recréée à chaque rendu provoquerait au contraire une boucle de requêtes.
   */
  charger: (page: number, limit: number) => Promise<{ data: ReponsePaginee<T> }>,
  options: { limit?: number; messageErreur?: string } = {},
) {
  const { limit = 20, messageErreur = 'Impossible de charger les données' } = options;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  // Ignore la réponse d'une requête devenue obsolète (changement de filtre
  // pendant qu'une requête est encore en vol).
  const numeroRequete = useRef(0);

  const rafraichir = useCallback(async () => {
    const n = ++numeroRequete.current;
    setLoading(true);
    setErreur('');
    try {
      const res = await charger(page, limit);
      if (n !== numeroRequete.current) return;
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch {
      if (n !== numeroRequete.current) return;
      setErreur(messageErreur);
    } finally {
      if (n === numeroRequete.current) setLoading(false);
    }
  }, [charger, page, limit, messageErreur]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  return {
    items,
    total,
    page,
    setPage,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    loading,
    erreur,
    rafraichir,
  };
}
