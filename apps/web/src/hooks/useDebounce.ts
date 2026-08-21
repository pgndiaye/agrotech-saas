'use client';
import { useEffect, useState } from 'react';

/**
 * Retarde la propagation d'une valeur.
 *
 * Utilisé par la recherche des pages admin : elle déclenchait auparavant une
 * requête à chaque frappe (ou imposait de valider un formulaire).
 */
export function useDebounce<T>(valeur: T, delai = 400): T {
  const [retardee, setRetardee] = useState(valeur);

  useEffect(() => {
    const t = setTimeout(() => setRetardee(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);

  return retardee;
}
