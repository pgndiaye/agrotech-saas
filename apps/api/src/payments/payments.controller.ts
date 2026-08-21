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
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WaveWebhookDto, OrangeWebhookDto } from './dto/webhook.dto';
import { WaveSignatureGuard } from './guards/wave-signature.guard';
import { OrangeWebhookGuard } from './guards/orange-webhook.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('providers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  // Webhooks — pas de guard JWT (appelés par les APIs externes), mais un guard
  // de signature dédié. Hors rate limiting : un provider qui relance ses
  // notifications ne doit pas se faire couper par un 429.
  @Post('webhook/wave')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(WaveSignatureGuard)
  @ApiOperation({ summary: "Webhook Wave (signature HMAC vérifiée)" })
  waveWebhook(@Body() dto: WaveWebhookDto) {
    return this.paymentsService.handleWaveWebhook(dto);
  }

  // Le secret fait partie du chemin : l'URL de notification est construite
  // côté serveur dans initiatePayment et n'est jamais exposée au client.
  @Post('webhook/orange/:secret')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(OrangeWebhookGuard)
  @ApiOperation({ summary: "Webhook Orange Money (secret d'URL + revérification)" })
  orangeWebhook(@Body() dto: OrangeWebhookDto) {
    return this.paymentsService.handleOrangeWebhook(dto);
  }
}
