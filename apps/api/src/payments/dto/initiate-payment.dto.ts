import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentProviderDto {
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

/** Plans facturables. FREE n'est pas payable, donc absent. */
export enum PlanDto {
  PREMIUM = 'PREMIUM',
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentProviderDto })
  @IsEnum(PaymentProviderDto)
  provider: PaymentProviderDto;

  /**
   * Le client choisit un plan, jamais un montant : le prix est résolu côté
   * serveur par PlanCatalogService. Auparavant `amount` était accepté tel quel,
   * ce qui permettait d'obtenir PREMIUM pour 100 XOF.
   */
  @ApiProperty({ enum: PlanDto, example: PlanDto.PREMIUM })
  @IsEnum(PlanDto)
  planCode: PlanDto;

  @ApiPropertyOptional({ example: '+221771234567', description: 'Requis pour Orange Money' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/payments?success=true' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/payments?error=true' })
  @IsOptional()
  @IsString()
  errorUrl?: string;
}
