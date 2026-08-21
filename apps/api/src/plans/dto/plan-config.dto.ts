import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod, Plan } from '@prisma/client';

export class CreatePlanConfigDto {
  @ApiProperty({ enum: Plan })
  @IsEnum(Plan)
  code: Plan;

  @ApiProperty({ example: 'Premium' })
  @IsString()
  @MinLength(2)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12000, description: 'Prix en XOF, entier' })
  @IsInt({ message: 'Le prix doit être un entier de francs CFA' })
  @Min(0)
  priceXof: number;

  @ApiPropertyOptional({ enum: BillingPeriod })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiPropertyOptional({ example: { users: -1, stocks: -1, listings: -1, smsPerMonth: -1 } })
  @IsOptional()
  @IsObject()
  quotas?: Record<string, number>;

  @ApiPropertyOptional({
    example: { exportCsv: true, smsAlerts: true, marketplacePublish: true, aiRecommendations: true },
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** Le `code` est immuable : il lie la ligne à l'enum Plan du schéma. */
export class UpdatePlanConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsInt({ message: 'Le prix doit être un entier de francs CFA' })
  @Min(0)
  priceXof?: number;

  @ApiPropertyOptional({ enum: BillingPeriod })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  quotas?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
