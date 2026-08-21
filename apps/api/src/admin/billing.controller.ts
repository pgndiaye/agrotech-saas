import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { PlanCatalogService } from '../plans/plan-catalog.service';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service';
import { KpiService } from './kpi.service';
import {
  CreatePlanConfigDto,
  UpdatePlanConfigDto,
} from '../plans/dto/plan-config.dto';
import {
  CancelSubscriptionDto,
  GrantSubscriptionDto,
  KpiQueryDto,
  ListSubscriptionsQueryDto,
} from './dto/subscriptions.dto';

/**
 * Volet facturation de la console : catalogue tarifaire, abonnements et KPI.
 * Séparé d'`AdminController`, qui couvre déjà coopératives et utilisateurs.
 */
@ApiTags('Admin — Facturation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@UseInterceptors(AuditInterceptor)
@Controller('admin')
export class BillingController {
  constructor(
    private prisma: PrismaService,
    private planCatalog: PlanCatalogService,
    private lifecycle: SubscriptionLifecycleService,
    private kpi: KpiService,
  ) {}

  // ─── Catalogue tarifaire ───────────────────────────────────────────────────
  @Get('plans')
  @ApiOperation({ summary: 'Catalogue tarifaire complet' })
  getPlans() {
    return this.prisma.planConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Post('plans')
  @Audit({ action: 'PLAN_CREE', entity: 'planConfig' })
  @ApiOperation({ summary: 'Ajouter un plan au catalogue' })
  async createPlan(@Body() dto: CreatePlanConfigDto) {
    const plan = await this.prisma.planConfig.create({ data: dto });
    // Sans invalidation, l'ancien catalogue resterait facturé jusqu'au TTL.
    await this.planCatalog.invalider();
    return plan;
  }

  @Patch('plans/:id')
  @Audit({ action: 'PLAN_MODIFIE', entity: 'planConfig' })
  @ApiOperation({ summary: 'Modifier le prix, les quotas ou les features d’un plan' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanConfigDto) {
    const plan = await this.prisma.planConfig.update({ where: { id }, data: dto });
    await this.planCatalog.invalider();
    return plan;
  }

  // ─── Abonnements ───────────────────────────────────────────────────────────
  @Get('subscriptions')
  @ApiOperation({ summary: 'Abonnements, filtrables par statut et par échéance' })
  getSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.lifecycle.lister(query);
  }

  @Post('subscriptions/:tenantId/grant')
  @Audit({ action: 'ABONNEMENT_OFFERT', entity: 'tenant', idParam: 'tenantId' })
  @ApiOperation({ summary: 'Accorder un abonnement sans paiement (geste commercial)' })
  grant(
    @Param('tenantId') tenantId: string,
    @Body() dto: GrantSubscriptionDto,
    @Req() req: any,
  ) {
    return this.lifecycle.grant(tenantId, dto.plan, dto.months, dto.reason, {
      id: req.user.id,
      email: req.user.email,
    });
  }

  @Post('subscriptions/:tenantId/cancel')
  @Audit({ action: 'ABONNEMENT_ANNULE', entity: 'tenant', idParam: 'tenantId' })
  @ApiOperation({ summary: 'Annuler un abonnement' })
  cancel(@Param('tenantId') tenantId: string, @Body() dto: CancelSubscriptionDto) {
    return this.lifecycle.cancel(tenantId, dto.reason);
  }

  @Post('subscriptions/run-expiration')
  @Audit({ action: 'EXPIRATION_MANUELLE', entity: 'tenant' })
  @ApiOperation({
    summary: "Lancer l'expiration des abonnements échus sans attendre le cron",
  })
  runExpiration() {
    return this.lifecycle.expirerAbonnementsEchus();
  }

  // ─── KPI ───────────────────────────────────────────────────────────────────
  @Get('kpi/overview')
  @ApiOperation({ summary: 'MRR, ARR, churn, conversion' })
  kpiOverview() {
    return this.kpi.overview();
  }

  @Get('kpi/revenue')
  @ApiOperation({ summary: 'Revenus encaissés par mois' })
  kpiRevenue(@Query() query: KpiQueryDto) {
    return this.kpi.revenus(query.months);
  }

  @Get('kpi/subscriptions')
  @ApiOperation({ summary: 'Mouvements d’abonnements et churn par mois' })
  kpiSubscriptions(@Query() query: KpiQueryDto) {
    return this.kpi.abonnements(query.months);
  }

  @Get('kpi/growth')
  @ApiOperation({ summary: 'Croissance cumulée du nombre de coopératives' })
  kpiGrowth(@Query() query: KpiQueryDto) {
    return this.kpi.croissance(query.months);
  }

  @Get('kpi/plans')
  @ApiOperation({ summary: 'Répartition des coopératives par plan' })
  kpiPlans() {
    return this.kpi.repartitionPlans();
  }
}
