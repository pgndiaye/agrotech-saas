import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WaveCheckoutSession {
  id: string;
  wave_launch_url: string;
  client_reference: string;
  payment_status: 'processing' | 'succeeded' | 'failed';
  amount: string;
  currency: string;
}

@Injectable()
export class WaveService {
  private readonly logger = new Logger(WaveService.name);
  private readonly baseUrl = 'https://api.wave.com/v1';
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('WAVE_API_KEY') ?? '';
  }

  async createCheckoutSession(params: {
    amount: number;
    currency?: string;
    clientReference: string;
    successUrl: string;
    errorUrl: string;
  }): Promise<WaveCheckoutSession> {
    if (!this.apiKey) {
      throw new BadRequestException('WAVE_API_KEY non configurée');
    }

    const body = {
      amount: String(params.amount),
      currency: params.currency ?? 'XOF',
      client_reference: params.clientReference,
      success_url: params.successUrl,
      error_url: params.errorUrl,
    };

    const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Wave API error: ${response.status} ${error}`);
      throw new BadRequestException(`Erreur Wave: ${response.statusText}`);
    }

    return response.json() as Promise<WaveCheckoutSession>;
  }

  async getCheckoutSession(sessionId: string): Promise<WaveCheckoutSession> {
    if (!this.apiKey) {
      throw new BadRequestException('WAVE_API_KEY non configurée');
    }

    const response = await fetch(`${this.baseUrl}/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new BadRequestException(`Erreur Wave: ${response.statusText}`);
    }

    return response.json() as Promise<WaveCheckoutSession>;
  }
}
