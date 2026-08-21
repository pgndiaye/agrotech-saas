/**
 * Déclenche le téléchargement d'un blob renvoyé par l'API.
 * Le motif était réécrit dans chaque page proposant un export.
 */
export function telechargerBlob(donnees: Blob, nomFichier: string) {
  const url = window.URL.createObjectURL(donnees);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Sans révocation, le blob reste en mémoire jusqu'au rechargement de la page.
  window.URL.revokeObjectURL(url);
}

/** Nom de fichier daté, ex. « cooperatives-2026-08-19.csv ». */
export const nomFichierDate = (prefixe: string, extension = 'csv') =>
  `${prefixe}-${new Date().toISOString().slice(0, 10)}.${extension}`;
