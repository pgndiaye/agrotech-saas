import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanDefinition, PlanFeatures, PlanQuotas } from './plan-definition.type';

/**
 * Valeurs de repli, utilisées uniquement si la table `PlanConfig` est vide
 * (base non seedée). Elles évitent que l'API refuse tout paiement au démarrage
 * d'un environnement neuf.
 */
const REPLI: Record<Plan, PlanDefinition> = {
  FREE: {
    code: 'FREE',
    label: 'Gratuit',
    description: 'Météo, stocks et finance de base',
    priceXof: 0,
    quotas: { users: 3, stocks: 50, listings: 0, smsPerMonth: 0 },
    features: {
      exportCsv: false,
      smsAlerts: false,
      marketplacePublish: false,
      aiRecommendations: false,
    },
  },
  PREMIUM: {
    code: 'PREMIUM',
    label: 'Premium',
    description: 'Marketplace illimité, exports, IA et alertes SMS',
    priceXof: 12000,
    quotas: { users: -1, stocks: -1, listings: -1, smsPerMonth: -1 },
    features: {
      exportCsv: true,
      smsAlerts: true,
      marketplacePublish: true,
      aiRecommendations: true,
    },
  },
};

/** Durée de vie du cache, filet de sécurité si une invalidation est oubliée. */
const TTL_MS = 60_000;

/**
 * Catalogue des plans — source de vérité du prix, des quotas et des features.
 *
 * Le prix ne vient JAMAIS du client : `PaymentsService.initiatePayment` le
 * résout ici à partir du seul `planCode` transmis.
 *
 * Depuis le lot 4, les valeurs sont lues dans la table `PlanConfig` et mises
 * en cache mémoire. La signature de `getPlan()` n'a pas changé : `PlanGuard`,
 * `PaymentsService` et les contrôleurs des lots précédents sont inchangés.
 */
@Injectable()
export class PlanCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PlanCatalogService.name);
  private cache = new Map<Plan, PlanDefinition>();
  private expiration = 0;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Précharge au démarrage : la première requête payante n'attend pas.
    await this.recharger().catch((err) =>
      this.logger.warn(`Catalogue non préchargé : ${err}`),
    );
  }

  /**
   * Lève plutôt que de retourner `undefined` : un plan introuvable ne doit
   * jamais faire passer le PlanGuard silencieusement (fail-closed).
   */
  getPlan(code: Plan): PlanDefinition {
    const plan = this.cache.get(code) ?? REPLI[code];
    if (!plan) {
      throw new InternalServerErrorException(
        `Plan « ${code} » absent du catalogue`,
      );
    }
    return plan;
  }

  getAll(): PlanDefinition[] {
    return this.cache.size ? [...this.cache.values()] : Object.values(REPLI);
  }

  /** Le plan `code` donne-t-il accès à la fonctionnalité demandée ? */
  hasFeature(code: Plan, feature: keyof PlanFeatures): boolean {
    return this.getPlan(code).features[feature] === true;
  }

  /** Quota du plan pour une ressource. -1 = illimité. */
  getQuota(code: Plan, ressource: keyof PlanQuotas): number {
    return this.getPlan(code).quotas[ressource] ?? -1;
  }

  /** Plans exposés publiquement (page tarifs). */
  async getPublics(): Promise<PlanDefinition[]> {
    const lignes = await this.prisma.planConfig.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
    return lignes.map((l) => this.versDefinition(l));
  }

  /**
   * À appeler après toute écriture sur `PlanConfig`, sinon l'ancien prix
   * resterait facturé jusqu'à l'expiration du TTL.
   */
  async invalider() {
    this.expiration = 0;
    await this.recharger();
  }

  /** Rafraîchit le cache si le TTL est dépassé. */
  private async recharger() {
    if (Date.now() < this.expiration) return;

    const lignes = await this.prisma.planConfig.findMany();
    if (lignes.length === 0) {
      this.logger.warn(
        'Table PlanConfig vide — utilisation des valeurs de repli. Lancez `npm run prisma:seed`.',
      );
      return;
    }

    this.cache = new Map(
      lignes.map((l) => [l.code, this.versDefinition(l)] as const),
    );
    this.expiration = Date.now() + TTL_MS;
  }

  private versDefinition(ligne: {
    code: Plan;
    label: string;
    description: string | null;
    priceXof: number;
    quotas: unknown;
    features: unknown;
  }): PlanDefinition {
    // Les colonnes Json sont non typées : on complète avec le repli plutôt que
    // de laisser un quota ou une feature à `undefined`.
    const repli = REPLI[ligne.code];
    return {
      code: ligne.code,
      label: ligne.label,
      description: ligne.description ?? '',
      priceXof: ligne.priceXof,
      quotas: { ...repli.quotas, ...((ligne.quotas ?? {}) as Partial<PlanQuotas>) },
      features: {
        ...repli.features,
        ...((ligne.features ?? {}) as Partial<PlanFeatures>),
      },
    };
  }
}
