import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Plan } from '@prisma/client';
import {
  REQUIRED_PLAN_KEY,
  REQUIRED_FEATURE_KEY,
} from '../decorators/require-plan.decorator';
import { PlanCatalogService } from '../../plans/plan-catalog.service';
import { PlanFeatures } from '../../plans/plan-definition.type';

/**
 * Contrôle centralisé du plan. Remplace les trois implémentations divergentes
 * qui existaient dans marketplace.service, finance.controller et sms.service.
 *
 * Le plan est lu sur `req.user.tenant.plan` : JwtStrategy.validate() recharge
 * l'utilisateur et son tenant à chaque requête, la valeur est donc toujours
 * fraîche (un passage à FREE est effectif immédiatement) et aucune requête
 * supplémentaire n'est nécessaire. Le guard ne lit jamais un autre tenant que
 * celui du porteur du token : l'isolation multi-tenant est respectée par
 * construction.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private planCatalog: PlanCatalogService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlans = this.reflector.getAllAndOverride<Plan[]>(
      REQUIRED_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredFeature = this.reflector.getAllAndOverride<keyof PlanFeatures>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlans?.length && !requiredFeature) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const plan: Plan | undefined = user?.tenant?.plan;
    if (!plan) {
      throw new ForbiddenException({
        code: 'PLAN_INTROUVABLE',
        message: 'Impossible de déterminer le plan de votre organisation',
      });
    }

    if (requiredPlans?.length && !requiredPlans.includes(plan)) {
      throw new ForbiddenException({
        code: 'PLAN_INSUFFISANT',
        message: `Cette fonctionnalité nécessite le plan ${requiredPlans.join(' ou ')}`,
        planRequis: requiredPlans,
        planActuel: plan,
      });
    }

    if (requiredFeature && !this.planCatalog.hasFeature(plan, requiredFeature)) {
      throw new ForbiddenException({
        code: 'FONCTIONNALITE_NON_INCLUSE',
        message: "Cette fonctionnalité n'est pas incluse dans votre plan",
        fonctionnalite: requiredFeature,
        planActuel: plan,
      });
    }

    return true;
  }
}
