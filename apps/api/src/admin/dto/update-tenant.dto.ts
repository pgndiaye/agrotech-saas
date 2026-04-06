import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum Plan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Nom de la coopérative' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Plan, description: 'Plan de la coopérative' })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
