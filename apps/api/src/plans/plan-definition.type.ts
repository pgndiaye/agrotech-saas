import { Plan } from '@prisma/client';

/**
 * Fonctionnalités activables par plan. La clé est utilisée telle quelle par
 * `@RequireFeature('exportCsv')` — ajouter une entrée ici suffit à créer un
 * nouveau verrou fonctionnel.
 */
export interface PlanFeatures {
  exportCsv: boolean;
  smsAlerts: boolean;
  marketplacePublish: boolean;
  aiRecommendations: boolean;
}

/**
 * Quotas par plan. La valeur -1 signifie « illimité ».
 * Non appliqués au lot 1 : le QuotaGuard arrive au lot 4.
 */
export interface PlanQuotas {
  users: number;
  stocks: number;
  listings: number;
  smsPerMonth: number;
}

export interface PlanDefinition {
  code: Plan;
  label: string;
  description: string;
  /** Prix en XOF, entier — jamais de flottant pour de la monnaie. */
  priceXof: number;
  quotas: PlanQuotas;
  features: PlanFeatures;
}
