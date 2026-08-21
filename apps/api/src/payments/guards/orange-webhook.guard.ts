import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Orange Money ne signe pas ses notifications. Deux protections se cumulent :
 *
 * 1. Ce guard — un secret partagé placé dans le chemin de l'URL de notification.
 *    Cette URL est construite côté serveur dans `initiatePayment` et n'est
 *    jamais exposée au client.
 * 2. `PaymentsService.handleOrangeWebhook` re-interroge l'API Orange avant de
 *    marquer un paiement comme réussi : le webhook n'est qu'un signal, la
 *    source de vérité reste le provider.
 */
@Injectable()
export class OrangeWebhookGuard implements CanActivate {
  private readonly logger = new Logger(OrangeWebhookGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const attendu = this.config.get<string>('ORANGE_WEBHOOK_SECRET');
    const simulation =
      this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';

    if (!attendu) {
      if (simulation) {
        this.logger.warn(
          'ORANGE_WEBHOOK_SECRET absent — secret d’URL non vérifié (mode simulation)',
        );
        return true;
      }
      throw new UnauthorizedException({
        code: 'WEBHOOK_NON_CONFIGURE',
        message: 'Vérification du webhook indisponible',
      });
    }

    const request = context.switchToHttp().getRequest();
    const recu: string | undefined = request.params?.secret;
    if (!recu) {
      throw new UnauthorizedException({
        code: 'SECRET_MANQUANT',
        message: 'Secret de notification absent',
      });
    }

    const a = Buffer.from(recu, 'utf8');
    const b = Buffer.from(attendu, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      this.logger.warn('Secret d’URL Orange invalide sur un webhook entrant');
      throw new UnauthorizedException({
        code: 'SECRET_INVALIDE',
        message: 'Secret de notification invalide',
      });
    }

    return true;
  }
}
