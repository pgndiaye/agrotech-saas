import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentProviderDto {
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

export enum PlanDto {
  PREMIUM = 'PREMIUM',
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentProviderDto })
  @IsEnum(PaymentProviderDto)
  provider: PaymentProviderDto;

  @ApiProperty({ example: 2000, description: 'Montant en XOF' })
  @IsNumber()
  @Min(100)
  amount: number;

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
