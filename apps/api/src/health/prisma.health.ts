import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sonde base de données : exécute un `SELECT 1` réel plutôt que de se fier à
 * l'état du pool, pour que la sonde échoue quand PostgreSQL est injoignable.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async pingCheck(cle: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(cle, true);
    } catch (err) {
      throw new HealthCheckError(
        'Base de données injoignable',
        this.getStatus(cle, false, { message: (err as Error).message }),
      );
    }
  }
}
