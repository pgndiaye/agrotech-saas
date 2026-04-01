import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WaveService } from './wave.service';
import { OrangeMoneyService } from './orange-money.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WaveService, OrangeMoneyService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
