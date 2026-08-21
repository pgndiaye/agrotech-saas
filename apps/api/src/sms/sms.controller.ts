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
import { PlanGuard } from '../auth/guards/plan.guard';
import { RequireFeature } from '../auth/decorators/require-plan.decorator';
import { SmsService } from './sms.service';
import { UpsertSmsConfigDto } from './dto/upsert-sms-config.dto';

@UseGuards(JwtAuthGuard, PlanGuard)
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  // La consultation de la config et des logs reste ouverte à tous les plans :
  // seules les actions qui consomment des SMS exigent la fonctionnalité.
  @Get('config')
  getConfig(@Req() req: any) {
    return this.smsService.getConfig(req.user.tenantId);
  }

  @Put('config')
  @RequireFeature('smsAlerts')
  upsertConfig(@Body() dto: UpsertSmsConfigDto, @Req() req: any) {
    return this.smsService.upsertConfig(dto, req.user.tenantId);
  }

  @Post('test')
  @RequireFeature('smsAlerts')
  sendTestSms(@Req() req: any) {
    return this.smsService.sendTestSms(req.user.tenantId);
  }

  @Post('trigger')
  @RequireFeature('smsAlerts')
  triggerAlerts(@Req() req: any) {
    return this.smsService.triggerAlertsForTenant(req.user.tenantId);
  }

  @Get('logs')
  getLogs(@Req() req: any) {
    return this.smsService.getLogs(req.user.tenantId);
  }
}
