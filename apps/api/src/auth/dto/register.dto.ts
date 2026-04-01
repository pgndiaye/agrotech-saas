import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Mamadou Diallo' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'mamadou@coop.sn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Coopérative du Cayor', required: false })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiProperty({ example: 'coop-cayor', required: false })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
