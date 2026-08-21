import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlanCatalogService } from '../plans/plan-catalog.service';
import { TaskLockService } from '../common/tasks/task-lock.service';

export const TACHE_EXPIRATION = 'abonnements-expiration';

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private planCatalog: PlanCatalogService,
    private taskLock: TaskLockService,
  ) {}

  /**
   * Sans ce cron, `SubscriptionStatus.EXPIRED` n'était jamais écrit : un
   * abonnement dont l'échéance était passée restait ACTIVE indéfiniment et le
   * tenant conservait son plan PREMIUM sans payer.
   */
  @Cron('0 2 * * *', { timeZone: 'Africa/Dakar' })
  async cronExpiration() {
    const cle = TaskLockService.cleJour();
    try {
      const { execute } = await this.taskLock.runExclusive(
        TACHE_EXPIRATION,
        cle,
        () => this.expirerAbonnementsEchus(),
      );
      if (!execute) {
        this.logger.log(`Expiration ${cle} déjà traitée, exécution ignorée`);
      }
    } catch (err) {
      this.logger.error(`Erreur d'expiration des abonnements : ${err}`);
    }
  }

  /**
   * Repasse en FREE tout tenant dont l'abonnement est échu.
   * Exposé aussi via `POST /admin/subscriptions/run-expiration` pour vérifier
   * sans attendre 2 h du matin.
   */
  async expirerAbonnementsEchus() {
    const maintenant = new Date();
    const echus = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', endDate: { lt: maintenant } },
      include: { tenant: { select: { id: true, slug: true, plan: true } } },
    });

    let expires = 0;
    for (const sub of echus) {
      try {
        // Transaction : l'abonnement et le plan du tenant doivent basculer
        // ensemble, sinon un tenant garde PREMIUM avec un abonnement expiré.
        await this.prisma.$transaction([
          this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          }),
          this.prisma.tenant.update({
            where: { id: sub.tenantId },
            data: { plan: 'FREE' },
          }),
          this.prisma.subscriptionEvent.create({
            data: {
              tenantId: sub.tenantId,
              subscriptionId: sub.id,
              type: 'EXPIRED',
              fromPlan: sub.plan,
              toPlan: 'FREE',
              source: 'SYSTEM',
            },
          }),
        ]);

        await this.audit.log({
          actorRole: 'SYSTEM',
          action: 'ABONNEMENT_EXPIRE',
          entity: 'tenant',
          entityId: sub.tenantId,
          targetTenantId: sub.tenantId,
          before: { plan: sub.plan, statutAbonnement: 'ACTIVE' },
          after: { plan: 'FREE', statutAbonnement: 'EXPIRED' },
        });

        expires++;
      } catch (err) {
        this.logger.error(
          `Échec d'expiration pour le tenant ${sub.tenantId} : ${err}`,
        );
      }
    }

    this.logger.log(`Expiration des abonnements : ${expires} traité(s)`);
    return { expires };
  }

  /** Liste des abonnements, avec filtre « expire sous N jours ». */
  async lister(params: {
    page: number;
    limit: number;
    status?: string;
    expiringInDays?: number;
  }) {
    const { page, limit, status, expiringInDays } = params;

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(expiringInDays !== undefined
        ? {
            status: 'ACTIVE' as const,
            endDate: {
              gte: new Date(),
              lte: new Date(Date.now() + expiringInDays * 86_400_000),
            },
          }
        : {}),
      tenant: { status: { not: 'DELETED' as const } },
    };

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: { endDate: 'asc' },
        include: {
          tenant: { select: { id: true, name: true, slug: true, plan: true, status: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Offre commerciale : accorde un plan sans passer par un paiement. */
  async grant(tenantId: string, plan: Plan, mois: number, reason: string, acteur: {
    id: string;
    email: string;
  }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status === 'DELETED') {
      throw new NotFoundException('Coopérative introuvable');
    }
    if (mois < 1 || mois > 36) {
      throw new BadRequestException('La durée doit être comprise entre 1 et 36 mois');
    }

    const existant = await this.prisma.subscription.findUnique({ where: { tenantId } });
    const depart = this.departProlongation(existant?.endDate ?? null);
    const echeance = new Date(depart);
    echeance.setMonth(echeance.getMonth() + mois);

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: { tenantId, plan, status: 'ACTIVE', startDate: new Date(), endDate: echeance },
      update: { plan, status: 'ACTIVE', endDate: echeance, cancelledAt: null },
    });

    await this.prisma.tenant.update({ where: { id: tenantId }, data: { plan } });

    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId,
        subscriptionId: sub.id,
        type: existant ? 'RENEWED' : 'CREATED',
        fromPlan: tenant.plan,
        toPlan: plan,
        amountXof: 0,
        source: 'ADMIN',
        metadata: { motif: reason, mois, acteur: acteur.email },
      },
    });

    return sub;
  }

  async cancel(tenantId: string, reason: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException('Aucun abonnement pour cette coopérative');

    const [maj] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { tenantId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), autoRenew: false },
      }),
      this.prisma.tenant.update({ where: { id: tenantId }, data: { plan: 'FREE' } }),
      this.prisma.subscriptionEvent.create({
        data: {
          tenantId,
          subscriptionId: sub.id,
          type: 'CANCELLED',
          fromPlan: sub.plan,
          toPlan: 'FREE',
          source: 'ADMIN',
          metadata: { motif: reason },
        },
      }),
    ]);

    return maj;
  }

  /**
   * Point de départ d'une prolongation : le temps restant est conservé.
   * Repartir de `now` ferait perdre les jours déjà payés lors d'un
   * renouvellement anticipé.
   */
  departProlongation(echeanceCourante: Date | null): Date {
    const maintenant = new Date();
    if (echeanceCourante && echeanceCourante > maintenant) return echeanceCourante;
    return maintenant;
  }
}
