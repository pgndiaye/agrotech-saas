import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OrangeMoneyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OrangeMoneyTransactionStatus {
  status: string; // INITIATED | PENDING | SUCCESS | SUCCESSFULL | FAILED | EXPIRED
  txnid?: string;
  amount?: number;
}

export interface OrangeMoneyPaymentRequest {
  notifToken: string;
  payToken: string;
  status: string;
  txnid: string;
  txnmode: string;
  inittxnmessage: string;
  inittxnstatus: string;
}

@Injectable()
export class OrangeMoneyService {
  private readonly logger = new Logger(OrangeMoneyService.name);
  // Orange Money Sénégal — API Orange Money Web Payment
  private readonly baseUrl = 'https://api.orange.com/orange-money-webpay/sn/v1';
  private readonly authUrl = 'https://api.orange.com/oauth/v3/token';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly merchantKey: string;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get<string>('ORANGE_MONEY_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('ORANGE_MONEY_CLIENT_SECRET') ?? '';
    this.merchantKey = this.config.get<string>('ORANGE_MONEY_MERCHANT_KEY') ?? '';
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new BadRequestException('Échec authentification Orange Money');
    }

    const data = (await response.json()) as OrangeMoneyTokenResponse;
    return data.access_token;
  }

  async initiatePayment(params: {
    amount: number;
    currency?: string;
    orderId: string;
    returnUrl: string;
    cancelUrl: string;
    notifUrl: string;
    lang?: string;
  }): Promise<OrangeMoneyPaymentRequest> {
    if (!this.clientId || !this.clientSecret || !this.merchantKey) {
      throw new BadRequestException('Orange Money non configuré (variables manquantes)');
    }

    const token = await this.getAccessToken();

    const body = {
      merchant_key: this.merchantKey,
      currency: params.currency ?? 'OGP',
      order_id: params.orderId,
      amount: params.amount,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notif_url: params.notifUrl,
      lang: params.lang ?? 'fr',
    };

    const response = await fetch(`${this.baseUrl}/webpayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Orange Money error: ${response.status} ${error}`);
      throw new BadRequestException(`Erreur Orange Money: ${response.statusText}`);
    }

    return response.json() as Promise<OrangeMoneyPaymentRequest>;
  }

  /**
   * Interroge Orange sur l'état réel d'une transaction.
   *
   * Orange ne signant pas ses notifications, le payload du webhook n'est qu'un
   * signal : c'est cette réponse qui fait foi avant d'activer un abonnement.
   */
  async getTransactionStatus(params: {
    orderId: string;
    amount: number;
    payToken: string;
  }): Promise<OrangeMoneyTransactionStatus> {
    if (!this.clientId || !this.clientSecret || !this.merchantKey) {
      throw new BadRequestException('Orange Money non configuré (variables manquantes)');
    }

    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/transactionstatus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        order_id: params.orderId,
        amount: params.amount,
        pay_token: params.payToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(
        `Orange Money statut transaction: ${response.status} ${error}`,
      );
      throw new BadRequestException(
        `Erreur Orange Money: ${response.statusText}`,
      );
    }

    return response.json() as Promise<OrangeMoneyTransactionStatus>;
  }
}
