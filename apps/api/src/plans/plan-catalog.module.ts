import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanCatalogService } from './plan-catalog.service';
import { PlansController } from './plans.controller';

/**
 * Global : le PlanGuard et le QuotaGuard sont utilisés dans plusieurs modules
 * (marketplace, finance, sms, stocks) et doivent pouvoir injecter le catalogue
 * sans que chacun ait à importer ce module.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlanCatalogService],
  exports: [PlanCatalogService],
})
export class PlanCatalogModule {}
