import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { WeatherModule } from '../weather/weather.module';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SmsSchedulerService } from './sms-scheduler.service';

@Module({
  imports: [PrismaModule, WeatherModule, ConfigModule],
  providers: [SmsService, SmsSchedulerService],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule {}
