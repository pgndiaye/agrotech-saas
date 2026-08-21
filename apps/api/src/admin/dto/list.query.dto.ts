import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Plan, Role, TenantStatus, UserStatus } from '@prisma/client';

export enum SensTri {
  asc = 'asc',
  desc = 'desc',
}

class PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: SensTri, default: SensTri.desc })
  @IsOptional()
  @IsEnum(SensTri)
  sortOrder: SensTri = SensTri.desc;
}

/** Colonnes triables — liste blanche, jamais la valeur brute du client. */
export enum TriTenant {
  name = 'name',
  slug = 'slug',
  plan = 'plan',
  status = 'status',
  createdAt = 'createdAt',
}

export class ListTenantsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le slug' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Plan })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: TriTenant, default: TriTenant.createdAt })
  @IsOptional()
  @IsEnum(TriTenant)
  sortBy: TriTenant = TriTenant.createdAt;
}

export enum TriUser {
  name = 'name',
  email = 'email',
  role = 'role',
  status = 'status',
  createdAt = 'createdAt',
  lastLoginAt = 'lastLoginAt',
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Recherche sur le nom ou l'e-mail" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: TriUser, default: TriUser.createdAt })
  @IsOptional()
  @IsEnum(TriUser)
  sortBy: TriUser = TriUser.createdAt;
}

export class PurgeTenantDto {
  @ApiPropertyOptional({
    description:
      "Slug exact du tenant — confirmation explicite avant destruction définitive",
  })
  @IsString()
  confirmSlug: string;
}
