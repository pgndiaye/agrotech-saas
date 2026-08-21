/**
 * Formatages partagés. Jusqu'ici chaque page redéclarait son propre
 * `Intl.NumberFormat`, avec des locales incohérentes (`fr-SN` ici, `fr-FR` là).
 */

const XOF = new Intl.NumberFormat('fr-SN', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});

const NOMBRE = new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 });

/** « 12 000 F CFA » */
export const formatXof = (montant: number) => XOF.format(montant ?? 0);

/** « 12 000 » — sans devise, pour les tableaux denses. */
export const formatNombre = (n: number) => NOMBRE.format(n ?? 0);

/** « 19 août 2026 » */
export const formatDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('fr-SN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** « 19 août 2026 à 15:42 » */
export const formatDateHeure = (date: string | Date) =>
  new Date(date).toLocaleString('fr-SN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** « il y a 3 jours » — pour les colonnes d'activité. */
export function formatRelatif(date: string | Date): string {
  const secondes = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const paliers: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
  ];

  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  let precedent = 1;
  for (const [limite, unite] of paliers) {
    if (secondes < limite) {
      return rtf.format(-Math.floor(secondes / precedent), unite);
    }
    precedent = limite;
  }
  return rtf.format(-Math.floor(secondes / 31536000), 'year');
}

/** Tronque un identifiant technique pour l'affichage. */
export const formatId = (id?: string | null, taille = 12) =>
  id ? `${id.slice(0, taille)}…` : '—';
