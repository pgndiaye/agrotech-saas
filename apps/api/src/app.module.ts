import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { StocksModule } from './stocks/stocks.module';
import { WeatherModule } from './weather/weather.module';
import { FinanceModule } from './finance/finance.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { SmsModule } from './sms/sms.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { PlanCatalogModule } from './plans/plan-catalog.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TasksModule } from './common/tasks/tasks.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Échoue au démarrage avec un message clair plutôt qu'en 500 à la
      // première requête si JWT_SECRET ou DATABASE_URL manque.
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // Format lisible en développement, JSON structuré en production.
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'HH:MM:ss' },
              },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        // Les sondes de supervision ne doivent pas noyer les logs.
        autoLogging: {
          ignore: (req) => (req.url ?? '').startsWith('/api/v1/health'),
        },
      },
    }),
    ScheduleModule.forRoot(),
    // Limite par défaut de toute l'API. Les routes sensibles (login) la
    // resserrent via @Throttle, /health s'en exclut via @SkipThrottle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    TasksModule,
    SubscriptionsModule,
    PlanCatalogModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    StocksModule,
    WeatherModule,
    FinanceModule,
    MarketplaceModule,
    PaymentsModule,
    AiModule,
    SmsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
