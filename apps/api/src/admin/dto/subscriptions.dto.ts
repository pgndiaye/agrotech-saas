import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan, SubscriptionStatus } from '@prisma/client';

export class ListSubscriptionsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: 30, description: 'Abonnements arrivant à échéance sous N jours' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiringInDays?: number;
}

export class GrantSubscriptionDto {
  @ApiProperty({ enum: Plan })
  @IsEnum(Plan)
  plan: Plan;

  @ApiProperty({ example: 3, description: 'Durée offerte, en mois' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months: number;

  @ApiProperty({ example: 'Geste commercial suite à incident' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class CancelSubscriptionDto {
  @ApiProperty({ example: 'Résiliation demandée par la coopérative' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class KpiQueryDto {
  @ApiPropertyOptional({ default: 12, description: "Nombre de mois d'historique" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months = 12;
}
