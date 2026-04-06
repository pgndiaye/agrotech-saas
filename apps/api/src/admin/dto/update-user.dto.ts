import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  FARMER = 'FARMER',
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ enum: Role, description: 'Rôle de l\'utilisateur' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
