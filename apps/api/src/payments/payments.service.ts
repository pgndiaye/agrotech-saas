import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlanCatalogService } from '../plans/plan-catalog.service';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service';
import { WaveService } from './wave.service';
import { OrangeMoneyService } from './orange-money.service';
import { InitiatePaymentDto, PaymentProviderDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private wave: WaveService,
    private orangeMoney: OrangeMoneyService,
    private config: ConfigService,
    private planCatalog: PlanCatalogService,
    private audit: AuditService,
    private lifecycle: SubscriptionLifecycleService,
  ) {}

  getAvailableProviders() {
    const isSimulation = this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';
    if (isSimulation) {
      return { WAVE: true, ORANGE_MONEY: true, simulation: true };
    }
    return {
      WAVE: !!this.config.get<string>('WAVE_API_KEY'),
      ORANGE_MONEY:
        !!this.config.get<string>('ORANGE_MONEY_CLIENT_ID') &&
        !!this.config.get<string>('ORANGE_MONEY_CLIENT_SECRET') &&
        !!this.config.get<string>('ORANGE_MONEY_MERCHANT_KEY'),
      simulation: false,
    };
  }

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!sub) {
      // Retourner un abonnement FREE par défaut
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      return { plan: 'FREE', status: 'ACTIVE', payments: [], tenant };
    }
    return sub;
  }

  async getPaymentHistory(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async simulateConfirm(paymentId: string, tenantId: string) {
    const isSimulation = this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';
    if (!isSimulation) {
      throw new BadRequestException('Simulation désactivée en production');
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.tenantId !== tenantId) throw new BadRequestException('Accès refusé');

    const active = await this.activateSubscription(payment.id);
    return {
      success: true,
      message: active
        ? 'Abonnement Premium activé (simulation)'
        : 'Paiement déjà confirmé',
    };
  }

  async initiatePayment(dto: InitiatePaymentDto, tenantId: string) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const isSimulation = this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';

    // Le montant est résolu ici, à partir du seul code de plan transmis :
    // le client n'a aucun moyen d'influencer le prix.
    const plan = this.planCatalog.getPlan(dto.planCode as unknown as Plan);
    if (plan.priceXof <= 0) {
      throw new BadRequestException(`Le plan ${plan.code} n'est pas payant`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        provider: dto.provider,
        amount: plan.priceXof,
        currency: 'XOF',
        status: 'PENDING',
        planCode: plan.code,
        phoneNumber: dto.phoneNumber,
      },
    });

    // Mode simulation : retourner une URL locale de confirmation
    if (isSimulation) {
      const simulateUrl = `${appUrl}/payments/simulate?paymentId=${payment.id}`;
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl: simulateUrl },
      });
      return { payment: updated, checkoutUrl: simulateUrl, simulation: true };
    }

    if (dto.provider === PaymentProviderDto.WAVE) {
      const successUrl = dto.successUrl ?? `${appUrl}/dashboard/payments?success=true&id=${payment.id}`;
      const errorUrl = dto.errorUrl ?? `${appUrl}/dashboard/payments?error=true&id=${payment.id}`;

      const session = await this.wave.createCheckoutSession({
        amount: plan.priceXof,
        clientReference: payment.id,
        successUrl,
        errorUrl,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { externalId: session.id, checkoutUrl: session.wave_launch_url },
      });

      return { payment: updated, checkoutUrl: session.wave_launch_url };
    }

    if (dto.provider === PaymentProviderDto.ORANGE_MONEY) {
      if (!dto.phoneNumber) {
        throw new BadRequestException('phoneNumber requis pour Orange Money');
      }

      // Le secret fait partie de l'URL de notification, construite ici et
      // jamais exposée au client : c'est la première barrière du webhook Orange.
      const apiUrl = this.config.get('API_URL') ?? 'http://localhost:3001/api/v1';
      const secret = this.config.get<string>('ORANGE_WEBHOOK_SECRET') ?? 'dev';
      const notifUrl = `${apiUrl}/payments/webhook/orange/${secret}`;

      const result = await this.orangeMoney.initiatePayment({
        amount: plan.priceXof,
        orderId: payment.id,
        returnUrl: dto.successUrl ?? `${appUrl}/dashboard/payments?success=true`,
        cancelUrl: dto.errorUrl ?? `${appUrl}/dashboard/payments?error=true`,
        notifUrl,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: result.payToken,
          checkoutUrl: result.inittxnmessage,
          metadata: result as object,
        },
      });

      return { payment: updated, payToken: result.payToken };
    }

    throw new BadRequestException('Provider non supporté');
  }

  async handleWaveWebhook(payload: {
    id: string;
    client_reference?: string;
    payment_status?: string;
    amount?: string | number;
  }) {
    if (!payload.client_reference) return { received: true };

    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.client_reference },
    });
    if (!payment) {
      this.logger.warn(`Paiement introuvable pour le webhook Wave : ${payload.client_reference}`);
      return { received: true };
    }

    if (payload.payment_status !== 'succeeded') {
      if (payload.payment_status === 'failed') {
        await this.prisma.payment.updateMany({
          where: { id: payment.id, status: { not: 'SUCCEEDED' } },
          data: { status: 'FAILED' },
        });
      }
      return { received: true };
    }

    // Le montant confirmé par le provider doit correspondre au prix attendu.
    if (!(await this.verifierMontant(payment.id, payload.amount))) {
      return { received: true };
    }

    await this.activateSubscription(payment.id);
    return { received: true };
  }

  async handleOrangeWebhook(payload: { notifToken: string; status?: string }) {
    const payment = await this.prisma.payment.findFirst({
      where: { externalId: payload.notifToken },
    });
    if (!payment) {
      this.logger.warn(`Paiement introuvable pour le webhook Orange : ${payload.notifToken}`);
      return { received: true };
    }

    const succesAnnonce = payload.status === 'SUCCESSFULL' || payload.status === 'SUCCESS';
    if (!succesAnnonce) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { not: 'SUCCEEDED' } },
        data: { status: 'FAILED' },
      });
      return { received: true };
    }

    // Orange ne signant pas ses notifications, on ne se fie pas au payload :
    // on redemande l'état réel de la transaction avant d'activer quoi que ce soit.
    const simulation = this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';
    if (!simulation) {
      try {
        const etat = await this.orangeMoney.getTransactionStatus({
          orderId: payment.id,
          amount: payment.amount,
          payToken: payload.notifToken,
        });
        const confirme = etat.status === 'SUCCESS' || etat.status === 'SUCCESSFULL';
        if (!confirme) {
          this.logger.warn(
            `Webhook Orange annonce un succès non confirmé par l'API (${etat.status}) — paiement ${payment.id}`,
          );
          return { received: true };
        }
        if (!(await this.verifierMontant(payment.id, etat.amount))) {
          return { received: true };
        }
      } catch (err) {
        this.logger.error(
          `Impossible de vérifier la transaction Orange ${payment.id} : ${err}`,
        );
        return { received: true };
      }
    }

    await this.activateSubscription(payment.id);
    return { received: true };
  }

  /**
   * Compare le montant confirmé par le provider au prix attendu du plan.
   * Un écart marque le paiement en échec et laisse une trace d'audit, sans
   * jamais activer l'abonnement.
   */
  private async verifierMontant(
    paymentId: string,
    montantConfirme?: string | number | null,
  ): Promise<boolean> {
    if (montantConfirme === undefined || montantConfirme === null) {
      // Le provider ne renvoie pas toujours le montant : dans ce cas on s'en
      // tient au montant enregistré à l'initiation, qui vient déjà du catalogue.
      return true;
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return false;

    const recu = Number(montantConfirme);
    const attendu = payment.planCode
      ? this.planCatalog.getPlan(payment.planCode).priceXof
      : payment.amount;

    if (!Number.isFinite(recu) || Math.round(recu) !== Math.round(attendu)) {
      await this.prisma.payment.updateMany({
        where: { id: paymentId, status: { not: 'SUCCEEDED' } },
        data: { status: 'FAILED' },
      });
      await this.audit.log({
        actorRole: 'SYSTEM',
        action: 'PAIEMENT_MONTANT_INVALIDE',
        entity: 'payment',
        entityId: paymentId,
        targetTenantId: payment.tenantId,
        after: { montantRecu: recu, montantAttendu: attendu },
        status: 'FAILURE',
        errorMessage: `Montant confirmé ${recu} ≠ prix attendu ${attendu}`,
      });
      this.logger.error(
        `Montant invalide sur le paiement ${paymentId} : reçu ${recu}, attendu ${attendu}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Active l'abonnement du paiement donné.
   *
   * Idempotent : le passage à SUCCEEDED est une revendication atomique
   * (`updateMany` conditionné au statut). Si un webhook est rejoué, le second
   * appel ne modifie aucune ligne et sort immédiatement — l'abonnement n'est
   * ni activé deux fois, ni prolongé indûment.
   *
   * @returns true si ce sont bien ces appels-ci qui ont activé l'abonnement.
   */
  private async activateSubscription(paymentId: string): Promise<boolean> {
    const revendication = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { not: 'SUCCEEDED' } },
      data: { status: 'SUCCEEDED' },
    });

    if (revendication.count === 0) {
      this.logger.log(`Paiement ${paymentId} déjà traité — activation ignorée`);
      return false;
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return false;

    const plan = payment.planCode ?? 'PREMIUM';
    const existant = await this.prisma.subscription.findUnique({
      where: { tenantId: payment.tenantId },
    });

    // L'échéance se CUMULE au temps restant : repartir de « maintenant » ferait
    // perdre les jours déjà payés lors d'un renouvellement anticipé.
    const depart = this.lifecycle.departProlongation(existant?.endDate ?? null);
    const endDate = new Date(depart);
    endDate.setMonth(endDate.getMonth() + 1); // +1 mois

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId: payment.tenantId },
      create: {
        tenantId: payment.tenantId,
        plan,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
      },
      update: {
        plan,
        status: 'ACTIVE',
        endDate,
        cancelledAt: null,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: sub.id },
    });

    await this.prisma.tenant.update({
      where: { id: payment.tenantId },
      data: { plan },
    });

    // Historique indispensable au calcul du churn et de la conversion :
    // Subscription ne conserve que l'état courant.
    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId: payment.tenantId,
        subscriptionId: sub.id,
        type: existant ? 'RENEWED' : 'CREATED',
        fromPlan: existant?.plan ?? 'FREE',
        toPlan: plan,
        amountXof: Math.round(payment.amount),
        source: this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true'
          ? 'SIMULATION'
          : 'WEBHOOK',
      },
    });

    await this.audit.log({
      actorRole: 'SYSTEM',
      action: 'ABONNEMENT_ACTIVE',
      entity: 'payment',
      entityId: payment.id,
      targetTenantId: payment.tenantId,
      after: { plan, montant: payment.amount, provider: payment.provider },
    });

    this.logger.log(`Abonnement ${plan} activé pour le tenant ${payment.tenantId}`);
    return true;
  }
}
