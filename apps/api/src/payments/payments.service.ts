import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WaveService } from './wave.service';
import { OrangeMoneyService } from './orange-money.service';
import { InitiatePaymentDto, PaymentProviderDto } from './dto/initiate-payment.dto';

const PLAN_PRICES: Record<string, number> = {
  PREMIUM: 2000, // 2 000 XOF/mois
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private wave: WaveService,
    private orangeMoney: OrangeMoneyService,
    private config: ConfigService,
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
    if (payment.status === 'SUCCEEDED') {
      return { success: true, message: 'Paiement déjà confirmé' };
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCEEDED' },
    });

    await this.activateSubscription(payment.tenantId, payment.id);
    return { success: true, message: 'Abonnement Premium activé (simulation)' };
  }

  async initiatePayment(dto: InitiatePaymentDto, tenantId: string) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const isSimulation = this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';

    // Créer l'enregistrement Payment en base (statut PENDING)
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        provider: dto.provider,
        amount: dto.amount,
        currency: 'XOF',
        status: 'PENDING',
        phoneNumber: dto.phoneNumber,
      },
    });

    // Mode simulation : retourner une URL locale de confirmation
    if (isSimulation) {
      const simulateUrl = `${appUrl}/payments/simulate?paymentId=${payment.id}`;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl: simulateUrl },
      });
      return { payment, checkoutUrl: simulateUrl, simulation: true };
    }

    if (dto.provider === PaymentProviderDto.WAVE) {
      const successUrl = dto.successUrl ?? `${appUrl}/dashboard/payments?success=true&id=${payment.id}`;
      const errorUrl = dto.errorUrl ?? `${appUrl}/dashboard/payments?error=true&id=${payment.id}`;

      const session = await this.wave.createCheckoutSession({
        amount: dto.amount,
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

      const notifUrl = `${this.config.get('API_URL') ?? 'http://localhost:3001/api/v1'}/payments/webhook/orange`;

      const result = await this.orangeMoney.initiatePayment({
        amount: dto.amount,
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

  async handleWaveWebhook(payload: { id: string; client_reference?: string; payment_status?: string }) {
    if (!payload.client_reference) return { received: true };

    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.client_reference },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for Wave webhook: ${payload.client_reference}`);
      return { received: true };
    }

    const status =
      payload.payment_status === 'succeeded'
        ? 'SUCCEEDED'
        : payload.payment_status === 'failed'
          ? 'FAILED'
          : 'PENDING';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });

    if (status === 'SUCCEEDED') {
      await this.activateSubscription(payment.tenantId, payment.id);
    }

    return { received: true };
  }

  async handleOrangeWebhook(payload: { notifToken: string; status?: string }) {
    const payment = await this.prisma.payment.findFirst({
      where: { externalId: payload.notifToken },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for Orange webhook: ${payload.notifToken}`);
      return { received: true };
    }

    const status = payload.status === 'SUCCESSFULL' ? 'SUCCEEDED' : 'FAILED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });

    if (status === 'SUCCEEDED') {
      await this.activateSubscription(payment.tenantId, payment.id);
    }

    return { received: true };
  }

  private async activateSubscription(tenantId: string, paymentId: string) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // +1 mois

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        startDate,
        endDate,
      },
      update: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        startDate,
        endDate,
      },
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { subscriptionId: sub.id },
    });

    // Mettre à jour le plan du tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: 'PREMIUM' },
    });

    this.logger.log(`Subscription PREMIUM activée pour tenant ${tenantId}`);
  }
}
