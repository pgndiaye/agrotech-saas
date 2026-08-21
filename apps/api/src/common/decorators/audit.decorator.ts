import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

/** Entités dont l'AuditInterceptor sait charger l'état « avant ». */
export type AuditEntity = 'tenant' | 'user' | 'payment' | 'planConfig';

export interface AuditOptions {
  /** Libellé métier en français, ex. `TENANT_SUSPENDU`. */
  action: string;
  entity: AuditEntity;
  /** Nom du paramètre de route portant l'id de la cible (défaut : `id`). */
  idParam?: string;
}

/**
 * Marque un handler comme devant être journalisé.
 *
 * Un handler SANS ce décorateur n'écrit aucune ligne d'audit — c'est ainsi que
 * les lectures (`@Get`) sont exclues, sans logique de filtrage sur le verbe HTTP.
 * À ne poser que sur les mutations.
 */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);
