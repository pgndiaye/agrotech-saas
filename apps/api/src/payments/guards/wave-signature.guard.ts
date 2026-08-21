import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** Tolérance anti-rejeu sur l'horodatage de la signature. */
const FENETRE_SECONDES = 300;

/**
 * Vérifie la signature HMAC-SHA256 des webhooks Wave.
 *
 * En-tête `Wave-Signature` au format `t=<timestamp>,v1=<hmac>`, le HMAC portant
 * sur `<timestamp>.<corps brut>`. Le corps brut est indispensable : le JSON
 * reparsé puis re-sérialisé ne produit pas le même octet-à-octet, d'où le
 * `rawBody: true` posé dans main.ts.
 */
@Injectable()
export class WaveSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WaveSignatureGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('WAVE_WEBHOOK_SECRET');
    const simulation =
      this.config.get<string>('PAYMENT_SIMULATION_MODE') === 'true';

    // Mode dégradé assumé : sans secret ET en simulation, on laisse passer pour
    // permettre le développement hors ligne. Jamais en production.
    if (!secret) {
      if (simulation) {
        this.logger.warn(
          'WAVE_WEBHOOK_SECRET absent — signature non vérifiée (mode simulation)',
        );
        return true;
      }
      throw new UnauthorizedException({
        code: 'WEBHOOK_NON_CONFIGURE',
        message: 'Vérification de signature indisponible',
      });
    }

    const request = context.switchToHttp().getRequest();
    const entete = request.headers['wave-signature'] as string | undefined;
    if (!entete) {
      throw new UnauthorizedException({
        code: 'SIGNATURE_MANQUANTE',
        message: 'En-tête Wave-Signature absent',
      });
    }

    const parties = Object.fromEntries(
      entete.split(',').map((p) => p.split('=').map((s) => s.trim())),
    ) as { t?: string; v1?: string };

    if (!parties.t || !parties.v1) {
      throw new UnauthorizedException({
        code: 'SIGNATURE_INVALIDE',
        message: 'Format de signature non reconnu',
      });
    }

    const ageSecondes = Math.abs(Date.now() / 1000 - Number(parties.t));
    if (!Number.isFinite(ageSecondes) || ageSecondes > FENETRE_SECONDES) {
      throw new UnauthorizedException({
        code: 'SIGNATURE_EXPIREE',
        message: 'Horodatage de signature hors fenêtre de tolérance',
      });
    }

    const corpsBrut: Buffer | undefined = request.rawBody;
    if (!corpsBrut) {
      throw new UnauthorizedException({
        code: 'CORPS_BRUT_INDISPONIBLE',
        message: 'Impossible de vérifier la signature',
      });
    }

    const attendu = crypto
      .createHmac('sha256', secret)
      .update(`${parties.t}.${corpsBrut.toString('utf8')}`)
      .digest('hex');

    const recu = Buffer.from(parties.v1, 'utf8');
    const calcule = Buffer.from(attendu, 'utf8');

    // timingSafeEqual exige des longueurs égales : la comparer d'abord évite
    // qu'il lève au lieu de renvoyer false.
    if (
      recu.length !== calcule.length ||
      !crypto.timingSafeEqual(recu, calcule)
    ) {
      this.logger.warn('Signature Wave invalide sur un webhook entrant');
      throw new UnauthorizedException({
        code: 'SIGNATURE_INVALIDE',
        message: 'Signature du webhook invalide',
      });
    }

    return true;
  }
}
