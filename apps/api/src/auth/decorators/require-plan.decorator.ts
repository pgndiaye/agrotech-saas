import { SetMetadata } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PlanFeatures } from '../../plans/plan-definition.type';

export const REQUIRED_PLAN_KEY = 'requiredPlan';
export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * Exige que le tenant du porteur du token soit sur l'un des plans listés.
 * Remplace les contrôles `tenant.plan !== 'PREMIUM'` dispersés dans les services.
 */
export const RequirePlan = (...plans: Plan[]) =>
  SetMetadata(REQUIRED_PLAN_KEY, plans);

/**
 * Exige que le plan du tenant active la fonctionnalité demandée.
 * Préférable à `@RequirePlan` quand le verrou porte sur une capacité précise :
 * changer le plan qui y donne droit ne touche alors que le catalogue.
 */
export const RequireFeature = (feature: keyof PlanFeatures) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
