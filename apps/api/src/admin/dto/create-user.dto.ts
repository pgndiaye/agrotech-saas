import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language, Role } from '@prisma/client';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'fatou@coop-cayor.sn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Fatou Sarr' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ description: 'Coopérative de rattachement' })
  @IsString()
  tenantId: string;

  @ApiPropertyOptional({ example: '+221771234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Language, default: Language.FR })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

export class MoveUserDto {
  @ApiProperty({ description: 'Coopérative de destination' })
  @IsString()
  tenantId: string;
}
