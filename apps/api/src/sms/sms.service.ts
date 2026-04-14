import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { UpsertSmsConfigDto } from './dto/upsert-sms-config.dto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly atApiKey: string;
  private readonly atUsername: string;
  private readonly isValidKey: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService,
  ) {
    this.atApiKey = this.configService.get<string>('AT_API_KEY') ?? '';
    this.atUsername = this.configService.get<string>('AT_USERNAME') ?? 'sandbox';
    this.isValidKey = this.atApiKey.length > 8;
    if (!this.isValidKey) {
      this.logger.warn(
        'AT_API_KEY absente ou invalide — envoi SMS simulé actif. ' +
        'Obtenez une clé sur https://africastalking.com',
      );
    } else if (this.atUsername === 'sandbox') {
      this.logger.warn('Mode SANDBOX AfricasTalking actif — les SMS ne sont PAS envoyés aux vrais numéros.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Config
  // ──────────────────────────────────────────────────────────────────────────

  async getConfig(tenantId: string) {
    return this.prisma.smsAlertConfig.findUnique({ where: { tenantId } });
  }

  async upsertConfig(dto: UpsertSmsConfigDto, tenantId: string) {
    await this.requirePremium(tenantId);
    return this.prisma.smsAlertConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dto, enabled: dto.enabled ?? true, city: dto.city ?? 'Dakar' },
      update: { ...dto },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Envoi SMS
  // ──────────────────────────────────────────────────────────────────────────

  async sendTestSms(tenantId: string) {
    await this.requirePremium(tenantId);
    const config = await this.prisma.smsAlertConfig.findUnique({ where: { tenantId } });
    if (!config) {
      throw new ForbiddenException('Aucune configuration SMS — veuillez configurer un numéro de téléphone');
    }
    const message = `✅ TEST AgroTech SN — Alertes SMS actives sur ce numéro. Stocks, météo et finances surveillés. ${new Date().toLocaleDateString('fr-SN')}`;
    return this.sendSms(config.phoneNumber, message, tenantId, 'TEST');
  }

  async triggerAlertsForTenant(tenantId: string) {
    await this.requirePremium(tenantId);
    const config = await this.prisma.smsAlertConfig.findUnique({ where: { tenantId } });
    if (!config || !config.enabled) return { sent: 0, skipped: true };
    return this.runAlertsForConfig(config);
  }

  async triggerAllAlerts() {
    const configs = await this.prisma.smsAlertConfig.findMany({
      where: { enabled: true },
      include: { tenant: { select: { plan: true } } },
    });
    const premiumConfigs = configs.filter((c) => c.tenant.plan === 'PREMIUM');
    let totalSent = 0;
    for (const config of premiumConfigs) {
      try {
        const result = await this.runAlertsForConfig(config);
        totalSent += result.sent;
      } catch (err) {
        this.logger.error(`Erreur alertes pour tenant ${config.tenantId}: ${err}`);
      }
    }
    this.logger.log(`Alertes quotidiennes : ${totalSent} SMS envoyés sur ${premiumConfigs.length} coopératives`);
    return { totalSent };
  }

  async triggerAllWeeklyDigests() {
    const configs = await this.prisma.smsAlertConfig.findMany({
      where: { enabled: true, weeklyDigest: true },
      include: { tenant: { select: { plan: true } } },
    });
    const premiumConfigs = configs.filter((c) => c.tenant.plan === 'PREMIUM');
    let totalSent = 0;
    for (const config of premiumConfigs) {
      try {
        await this.sendWeeklyDigest(config);
        totalSent++;
      } catch (err) {
        this.logger.error(`Erreur digest hebdo pour tenant ${config.tenantId}: ${err}`);
      }
    }
    this.logger.log(`Digest hebdomadaire : ${totalSent} SMS envoyés`);
    return { totalSent };
  }

  async getLogs(tenantId: string) {
    return this.prisma.smsLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Logique d'analyse et de déclenchement
  // ──────────────────────────────────────────────────────────────────────────

  private async runAlertsForConfig(config: any): Promise<{ sent: number }> {
    let sent = 0;

    // Stocks critiques
    if (config.stockAlerts) {
      const stocks = await this.prisma.stock.findMany({ where: { tenantId: config.tenantId } });
      const critical = stocks.filter((s) => s.minQuantity > 0 && s.quantity <= s.minQuantity * 0.5);
      const low = stocks.filter(
        (s) => s.minQuantity > 0 && s.quantity > s.minQuantity * 0.5 && s.quantity <= s.minQuantity,
      );

      for (const s of critical.slice(0, 2)) {
        const msg = this.truncate(
          `🚨 STOCK CRITIQUE - ${s.name}: ${s.quantity}${s.unit} (min ${s.minQuantity}${s.unit}). Réapprovisionner urgent. AgroTech SN`,
        );
        await this.sendSms(config.phoneNumber, msg, config.tenantId, 'STOCK_CRITICAL');
        sent++;
      }
      if (low.length > 0 && critical.length === 0) {
        const names = low.slice(0, 3).map((s) => s.name).join(', ');
        const msg = this.truncate(`⚠️ STOCK BAS - ${names}. Réapprovisionnez bientôt. AgroTech SN`);
        await this.sendSms(config.phoneNumber, msg, config.tenantId, 'STOCK_LOW');
        sent++;
      }
    }

    // Météo
    if (config.weatherAlerts) {
      try {
        const weather = await this.weatherService.getWeatherByCity(config.city);
        if (weather.humidity < 35) {
          const msg = this.truncate(
            `🌵 SÉCHERESSE ${weather.city}: ${weather.humidity}% humidité, ${weather.temperature}°C. Irrigation urgente! AgroTech SN`,
          );
          await this.sendSms(config.phoneNumber, msg, config.tenantId, 'WEATHER_ALERT');
          sent++;
        } else if (weather.temperature >= 38) {
          const msg = this.truncate(
            `🌡️ CANICULE ${weather.city}: ${weather.temperature}°C. Protégez vos cultures et votre bétail. AgroTech SN`,
          );
          await this.sendSms(config.phoneNumber, msg, config.tenantId, 'WEATHER_ALERT');
          sent++;
        }
      } catch {
        this.logger.warn(`Météo indisponible pour alertes SMS (tenant ${config.tenantId})`);
      }
    }

    // Finance
    if (config.financeAlerts) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const transactions = await this.prisma.transaction.findMany({
        where: { tenantId: config.tenantId, createdAt: { gte: thirtyDaysAgo } },
      });
      const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const balance = income - expense;
      if (balance < 0) {
        const fmtBalance = new Intl.NumberFormat('fr-SN').format(Math.abs(balance));
        const msg = this.truncate(
          `💰 SOLDE NÉGATIF: -${fmtBalance} FCFA. Dépenses supérieures aux revenus. AgroTech SN`,
        );
        await this.sendSms(config.phoneNumber, msg, config.tenantId, 'FINANCE_ALERT');
        sent++;
      }
    }

    return { sent };
  }

  private async sendWeeklyDigest(config: any) {
    const [stocks, transactions, weather] = await Promise.allSettled([
      this.prisma.stock.findMany({ where: { tenantId: config.tenantId } }),
      this.prisma.transaction.findMany({ where: { tenantId: config.tenantId } }),
      this.weatherService.getWeatherByCity(config.city),
    ]);

    const stockList = stocks.status === 'fulfilled' ? stocks.value : [];
    const txList = transactions.status === 'fulfilled' ? transactions.value : [];
    const w = weather.status === 'fulfilled' ? weather.value : null;

    const lowCount = stockList.filter((s: any) => s.minQuantity > 0 && s.quantity <= s.minQuantity).length;
    const income = txList.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0);
    const expense = txList.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0);
    const balance = income - expense;
    const balFmt = new Intl.NumberFormat('fr-SN').format(balance);

    const weatherPart = w ? ` | ${w.city} ${w.temperature}°C` : '';
    const msg = this.truncate(
      `📊 RÉSUMÉ HEBDO AgroTech SN - Stocks bas: ${lowCount} | Solde: ${balance >= 0 ? '' : '-'}${balFmt} FCFA${weatherPart}. Bonne semaine!`,
    );
    await this.sendSms(config.phoneNumber, msg, config.tenantId, 'WEEKLY_DIGEST');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Envoi technique
  // ──────────────────────────────────────────────────────────────────────────

  async sendSms(
    phoneNumber: string,
    message: string,
    tenantId: string,
    type: any,
  ) {
    let status: any = 'PENDING';
    let provider: string | undefined;
    let externalId: string | undefined;
    let error: string | undefined;

    try {
      if (this.isValidKey) {
        const result = await this.sendViaAfricasTalking(phoneNumber, message);
        status = result.success ? 'SENT' : 'FAILED';
        provider = 'AFRICASTALKING';
        externalId = result.messageId;
        if (!result.success) error = result.error;
      } else {
        await this.sendSimulated(phoneNumber, message);
        status = 'SIMULATED';
        provider = 'SIMULATION';
      }
    } catch (err) {
      status = 'FAILED';
      error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec envoi SMS à ${phoneNumber}: ${error}`);
    }

    return this.prisma.smsLog.create({
      data: { tenantId, phoneNumber, message, type, status, provider, externalId, error },
    });
  }

  private async sendViaAfricasTalking(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isSandbox = this.atUsername === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const params = new URLSearchParams({
      username: this.atUsername,
      to: phoneNumber,
      message,
    });

    try {
      const response = await axios.post(
        baseUrl,
        params.toString(),
        {
          headers: {
            apiKey: this.atApiKey,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8_000,
        },
      );

      const recipients = response.data?.SMSMessageData?.Recipients ?? [];
      if (recipients.length === 0) {
        return { success: false, error: 'Aucun destinataire confirmé' };
      }
      const recipient = recipients[0];
      const success = recipient.status === 'Success' || recipient.statusCode === 101;
      return { success, messageId: recipient.messageId, error: success ? undefined : recipient.status };
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if (status === 401) {
        const hint =
          'Credentials AfricasTalking invalides (401). ' +
          'Vérifiez AT_API_KEY et que AT_USERNAME est bien le nom du compte AT ' +
          '(pas l\'adresse e-mail) — visible dans Settings > Account du dashboard AfricasTalking.';
        this.logger.error(hint);
        return { success: false, error: hint };
      }
      if (status === 403) {
        return { success: false, error: 'Accès refusé AfricasTalking (403) — compte suspendu ou non activé.' };
      }
      throw err; // reraise les autres erreurs réseau
    }
  }

  private async sendSimulated(phoneNumber: string, message: string): Promise<void> {
    this.logger.log(
      `[SMS SIMULÉ] → ${phoneNumber} | "${message.substring(0, 80)}${message.length > 80 ? '…' : ''}"`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private truncate(msg: string, maxLen = 160): string {
    if (msg.length <= maxLen) return msg;
    return msg.substring(0, maxLen - 1) + '…';
  }

  private async requirePremium(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.plan !== 'PREMIUM') {
      throw new ForbiddenException('Les alertes SMS sont réservées aux abonnés Premium');
    }
  }
}
