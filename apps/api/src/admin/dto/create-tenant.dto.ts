import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({ example: 'Coopérative du Cayor' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'coop-cayor', description: 'Identifiant URL, unique' })
  @IsString()
  @MinLength(2)
  // Le slug apparaît dans les URL et sert de confirmation de suppression :
  // il doit rester strictement minuscule, sans espace ni caractère spécial.
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'Le slug ne peut contenir que des minuscules, des chiffres et des tirets',
  })
  slug: string;

  @ApiPropertyOptional({ enum: Plan, default: Plan.FREE })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({ example: 'contact@coop-cayor.sn' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+221771234567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Thiès' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
