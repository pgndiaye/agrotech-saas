import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSmsConfigDto {
  @ApiProperty({ example: '+221771234567', description: 'Numéro de téléphone au format international' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Format invalide. Exemple: +221771234567' })
  phoneNumber: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Dakar' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  stockAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  weatherAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  financeAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  weeklyDigest?: boolean;
}
