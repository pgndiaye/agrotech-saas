import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WaveWebhookDto, OrangeWebhookDto } from './dto/webhook.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('providers')
  @ApiOperation({ summary: "Providers de paiement disponibles (configurés)" })
  getProviders() {
    return this.paymentsService.getAvailableProviders();
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Abonnement actuel du tenant" })
  getSubscription(@Request() req) {
    return this.paymentsService.getSubscription(req.user.tenantId);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Historique des paiements" })
  getHistory(@Request() req) {
    return this.paymentsService.getPaymentHistory(req.user.tenantId);
  }

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Initier un paiement Wave ou Orange Money" })
  initiatePayment(@Body() dto: InitiatePaymentDto, @Request() req) {
    return this.paymentsService.initiatePayment(dto, req.user.tenantId);
  }

  @Post('simulate-confirm/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Confirme un paiement (mode simulation dev uniquement)" })
  simulateConfirm(@Param('id') id: string, @Request() req) {
    return this.paymentsService.simulateConfirm(id, req.user.tenantId);
  }

  // Webhooks — pas de guard JWT (appelés par les APIs externes)
  @Post('webhook/wave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook Wave (appelé par Wave)" })
  waveWebhook(@Body() dto: WaveWebhookDto) {
    return this.paymentsService.handleWaveWebhook(dto);
  }

  @Post('webhook/orange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook Orange Money (appelé par Orange)" })
  orangeWebhook(@Body() dto: OrangeWebhookDto) {
    return this.paymentsService.handleOrangeWebhook(dto);
  }
}
