import { SetMetadata } from '@nestjs/common';
import { PlanQuotas } from '../../plans/plan-definition.type';

export const REQUIRED_QUOTA_KEY = 'requiredQuota';

/**
 * Bloque la création si le tenant a atteint le quota de son plan.
 * À poser sur les handlers de création uniquement — jamais sur une lecture.
 */
export const RequireQuota = (ressource: keyof PlanQuotas) =>
  SetMetadata(REQUIRED_QUOTA_KEY, ressource);
