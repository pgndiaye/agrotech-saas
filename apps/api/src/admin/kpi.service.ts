import { Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanCatalogService } from '../plans/plan-catalog.service';

/**
 * Coopérative technique du seed : elle porte le compte SUPER_ADMIN et est
 * marquée PREMIUM, mais n'est pas un client. La compter fausserait le taux de
 * conversion, la répartition par plan et le total de coopératives.
 */
const SLUG_TENANT_SYSTEME = 'agrotech-system';

/** Filtre commun : clients réels uniquement. */
const CLIENTS = {
  status: { not: 'DELETED' as const },
  slug: { not: SLUG_TENANT_SYSTEME },
} as const;

/** Premier jour du mois, à minuit. */
function debutMois(decalage = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + decalage, 1);
}

@Injectable()
export class KpiService {
  constructor(
    private prisma: PrismaService,
    private planCatalog: PlanCatalogService,
  ) {}

  /**
   * MRR : somme des prix des plans effectivement actifs.
   * On ne somme pas les paiements encaissés — ceux-ci mesurent le revenu passé,
   * pas le revenu récurrent attendu.
   */
  private async calculerMrr(): Promise<{ mrr: number; tenantsPayants: number }> {
    const actifs = await this.prisma.subscription.groupBy({
      by: ['plan'],
      where: {
        status: 'ACTIVE',
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        tenant: { status: 'ACTIVE', slug: { not: SLUG_TENANT_SYSTEME } },
      },
      _count: { _all: true },
    });

    let mrr = 0;
    let tenantsPayants = 0;
    for (const ligne of actifs) {
      const prix = this.planCatalog.getPlan(ligne.plan).priceXof;
      if (prix > 0) {
        mrr += prix * ligne._count._all;
        tenantsPayants += ligne._count._all;
      }
    }
    return { mrr, tenantsPayants };
  }

  async overview() {
    const maintenant = new Date();
    const il30j = new Date(Date.now() - 30 * 86_400_000);
    const dans30j = new Date(Date.now() + 30 * 86_400_000);

    const [
      { mrr, tenantsPayants },
      tenantsTotal,
      revenus30j,
      perdus30j,
      convertisTotal,
      expirantJ30,
    ] = await Promise.all([
      this.calculerMrr(),
      this.prisma.tenant.count({ where: CLIENTS }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED', createdAt: { gte: il30j } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.subscriptionEvent.count({
        where: { type: { in: ['EXPIRED', 'CANCELLED'] }, occurredAt: { gte: il30j } },
      }),
      this.prisma.subscriptionEvent.findMany({
        where: { type: 'CREATED' },
        distinct: ['tenantId'],
        select: { tenantId: true },
      }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', endDate: { gte: maintenant, lte: dans30j } },
      }),
    ]);

    // Churn = résiliations sur la base active au début de la fenêtre.
    // `tenantsPayants` est la base de fin ; on la reconstitue en y rajoutant
    // les partants, faute de quoi le churn serait sous-estimé.
    const basePeriode = tenantsPayants + perdus30j;
    const churn30j = basePeriode > 0 ? perdus30j / basePeriode : 0;

    return {
      mrr,
      arr: mrr * 12,
      arpa: tenantsPayants > 0 ? Math.round(mrr / tenantsPayants) : 0,
      tenantsTotal,
      tenantsPayants,
      tauxConversion: tenantsTotal > 0 ? convertisTotal.length / tenantsTotal : 0,
      churn30j,
      revenus30j: revenus30j._sum.amount ?? 0,
      paiements30j: revenus30j._count._all,
      abonnementsExpirantJ30: expirantJ30,
    };
  }

  /**
   * Revenus encaissés par mois.
   * `$queryRaw` car `groupBy` de Prisma ne sait pas tronquer une date.
   */
  async revenus(months: number) {
    const depuis = debutMois(-(months - 1));

    const lignes = await this.prisma.$queryRaw<
      { mois: Date; total: number; nb: number }[]
    >`
      SELECT date_trunc('month', "createdAt") AS mois,
             SUM(amount)::float             AS total,
             COUNT(*)::int                  AS nb
      FROM "Payment"
      WHERE status = 'SUCCEEDED' AND "createdAt" >= ${depuis}
      GROUP BY 1
      ORDER BY 1
    `;

    const parMois = new Map(
      lignes.map((l) => [l.mois.toISOString().slice(0, 7), l]),
    );

    // Série complète : un mois sans paiement doit apparaître à zéro, sinon le
    // graphique masque les creux.
    return Array.from({ length: months }, (_, i) => {
      const d = debutMois(-(months - 1) + i);
      const cle = d.toISOString().slice(0, 7);
      const l = parMois.get(cle);
      return { mois: cle, total: l?.total ?? 0, nb: l?.nb ?? 0 };
    });
  }

  /** Nouveaux, expirés, annulés et churn par mois. */
  async abonnements(months: number) {
    const depuis = debutMois(-(months - 1));

    const lignes = await this.prisma.$queryRaw<
      { mois: Date; type: string; nb: number }[]
    >`
      SELECT date_trunc('month', "occurredAt") AS mois,
             type::text                       AS type,
             COUNT(*)::int                    AS nb
      FROM "SubscriptionEvent"
      WHERE "occurredAt" >= ${depuis}
      GROUP BY 1, 2
      ORDER BY 1
    `;

    const parMois = new Map<string, Record<string, number>>();
    for (const l of lignes) {
      const cle = l.mois.toISOString().slice(0, 7);
      const entree = parMois.get(cle) ?? {};
      entree[l.type] = l.nb;
      parMois.set(cle, entree);
    }

    let actifs = 0;
    return Array.from({ length: months }, (_, i) => {
      const d = debutMois(-(months - 1) + i);
      const cle = d.toISOString().slice(0, 7);
      const e = parMois.get(cle) ?? {};

      const nouveaux = (e.CREATED ?? 0) + (e.REACTIVATED ?? 0);
      const expires = e.EXPIRED ?? 0;
      const annules = e.CANCELLED ?? 0;
      const partants = expires + annules;

      const actifsDebut = actifs;
      actifs = Math.max(0, actifs + nouveaux - partants);

      return {
        mois: cle,
        nouveaux,
        expires,
        annules,
        renouveles: e.RENEWED ?? 0,
        actifsFin: actifs,
        churn: actifsDebut > 0 ? partants / actifsDebut : 0,
      };
    });
  }

  /** Répartition des coopératives par plan, pour le graphique en anneau. */
  async repartitionPlans() {
    const lignes = await this.prisma.tenant.groupBy({
      by: ['plan'],
      where: CLIENTS,
      _count: { id: true },
    });

    return lignes.map((l) => ({
      plan: l.plan as Plan,
      label: this.planCatalog.getPlan(l.plan).label,
      nb: l._count.id,
    }));
  }

  /** Croissance cumulée du nombre de coopératives. */
  async croissance(months: number) {
    const depuis = debutMois(-(months - 1));

    const [lignes, avant] = await Promise.all([
      this.prisma.$queryRaw<{ mois: Date; nb: number }[]>`
        SELECT date_trunc('month', "createdAt") AS mois, COUNT(*)::int AS nb
        FROM "Tenant"
        WHERE "createdAt" >= ${depuis}
          AND status <> 'DELETED'
          AND slug <> ${SLUG_TENANT_SYSTEME}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.tenant.count({
        where: { ...CLIENTS, createdAt: { lt: depuis } },
      }),
    ]);

    const parMois = new Map(
      lignes.map((l) => [l.mois.toISOString().slice(0, 7), l.nb]),
    );

    let cumul = avant;
    return Array.from({ length: months }, (_, i) => {
      const cle = debutMois(-(months - 1) + i).toISOString().slice(0, 7);
      const nouveaux = parMois.get(cle) ?? 0;
      cumul += nouveaux;
      return { mois: cle, nouveaux, cumul };
    });
  }
}
