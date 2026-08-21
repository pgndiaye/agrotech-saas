import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionLifecycleService],
  exports: [SubscriptionLifecycleService],
})
export class SubscriptionsModule {}
