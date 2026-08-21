import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
// Enum importée de Prisma, pas redéclarée : une valeur ajoutée au schéma est
// prise en compte sans modifier ce fichier.
import { Plan } from '@prisma/client';

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Nom de la coopérative' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Plan, description: 'Plan de la coopérative' })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
