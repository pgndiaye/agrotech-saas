import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health';

/**
 * Sonde de disponibilité — sans authentification (les orchestrateurs et les
 * sondes de supervision n'ont pas de token) et hors rate limiting, sinon la
 * supervision déclencherait elle-même des 429.
 */
@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "État de santé de l'API et de ses dépendances" })
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
