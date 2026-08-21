import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Typé sur l'enum Prisma : une faute de frappe devient une erreur de compilation. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
