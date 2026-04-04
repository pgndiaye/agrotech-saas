import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmsService } from './sms.service';
import { UpsertSmsConfigDto } from './dto/upsert-sms-config.dto';

@UseGuards(JwtAuthGuard)
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('config')
  getConfig(@Req() req: any) {
    return this.smsService.getConfig(req.user.tenantId);
  }

  @Put('config')
  upsertConfig(@Body() dto: UpsertSmsConfigDto, @Req() req: any) {
    return this.smsService.upsertConfig(dto, req.user.tenantId);
  }

  @Post('test')
  sendTestSms(@Req() req: any) {
    return this.smsService.sendTestSms(req.user.tenantId);
  }

  @Post('trigger')
  triggerAlerts(@Req() req: any) {
    return this.smsService.triggerAlertsForTenant(req.user.tenantId);
  }

  @Get('logs')
  getLogs(@Req() req: any) {
    return this.smsService.getLogs(req.user.tenantId);
  }
}
