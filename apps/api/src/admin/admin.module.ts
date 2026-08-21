import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BillingController } from './billing.controller';
import { AdminService } from './admin.service';
import { KpiService } from './kpi.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [AdminController, BillingController],
  // L'interceptor est déclaré ici pour que Nest puisse l'instancier avec ses
  // dépendances lorsqu'il est référencé par @UseInterceptors sur un contrôleur.
  providers: [AdminService, KpiService, AuditInterceptor],
})
export class AdminModule {}
