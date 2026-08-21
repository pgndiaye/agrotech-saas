import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WaveWebhookDto {
  @ApiPropertyOptional()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  client_reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_status?: string; // processing | succeeded | failed

  /** Wave renvoie le montant sous forme de chaîne. Comparé au prix attendu. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class OrangeWebhookDto {
  @ApiPropertyOptional()
  @IsString()
  notifToken: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string; // SUCCESSFULL | FAILED
}
