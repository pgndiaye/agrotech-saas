import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanCatalogService } from '../../plans/plan-catalog.service';
import { PlanQuotas } from '../../plans/plan-definition.type';
import { REQUIRED_QUOTA_KEY } from '../decorators/require-quota.decorator';

/** Comment compter l'usage courant, par ressource. */
type Compteur = (tenantId: string) => Promise<number>;

@Injectable()
export class QuotaGuard implements CanActivate {
  private readonly compteurs: Record<keyof PlanQuotas, Compteur>;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private planCatalog: PlanCatalogService,
  ) {
    this.compteurs = {
      users: (t) => this.prisma.user.count({ where: { tenantId: t } }),
      stocks: (t) => this.prisma.stock.count({ where: { tenantId: t } }),
      // Seules les annonces actives comptent : une annonce vendue ou annulée
      // ne consomme plus le quota.
      listings: (t) =>
        this.prisma.listing.count({ where: { tenantId: t, status: 'ACTIVE' } }),
      smsPerMonth: (t) =>
        this.prisma.smsLog.count({
          where: {
            tenantId: t,
            createdAt: { gte: debutDuMois() },
          },
        }),
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ressource = this.reflector.getAllAndOverride<keyof PlanQuotas>(
      REQUIRED_QUOTA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!ressource) return true;

    const { user } = context.switchToHttp().getRequest();
    const plan = user?.tenant?.plan;
    const tenantId = user?.tenantId;
    if (!plan || !tenantId) return true;

    const limite = this.planCatalog.getQuota(plan, ressource);
    if (limite < 0) return true; // -1 = illimité

    const actuel = await this.compteurs[ressource](tenantId);
    if (actuel >= limite) {
      throw new ForbiddenException({
        code: 'QUOTA_DEPASSE',
        message: `Quota atteint pour votre plan (${actuel}/${limite})`,
        ressource,
        limite,
        actuel,
      });
    }

    return true;
  }
}

/** Premier jour du mois courant, à minuit — borne du quota mensuel de SMS. */
export function debutDuMois(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
