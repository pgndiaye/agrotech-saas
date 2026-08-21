import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, FiltresAudit } from '../audit/audit.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateAdminUserDto } from './dto/update-user.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateAdminUserDto, MoveUserDto } from './dto/create-user.dto';
import { ListTenantsQueryDto, ListUsersQueryDto } from './dto/list.query.dto';

/** Projection commune des utilisateurs renvoyés par l'admin — jamais le hash. */
const SELECT_USER = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  language: true,
  phone: true,
  tenantId: true,
  suspendedAt: true,
  suspendedReason: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/**
 * Tenant technique créé par le seed. Il porte le compte SUPER_ADMIN : le
 * suspendre ou le supprimer rendrait la console d'administration inaccessible.
 */
const SLUG_TENANT_SYSTEME = 'agrotech-system';

/** Les tenants supprimés (soft delete) sont exclus de toutes les listes. */
const NON_SUPPRIME = { status: { not: TenantStatus.DELETED } } as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Stats globales ────────────────────────────────────────────────────────
  async getStats() {
    const [
      totalTenants,
      totalUsers,
      revenueAgg,
      activeSubscriptions,
      totalPayments,
      pendingPayments,
      plansBreakdown,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: NON_SUPPRIME }),
      this.prisma.user.count({ where: { tenant: NON_SUPPRIME } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.tenant.groupBy({
        by: ['plan'],
        where: NON_SUPPRIME,
        _count: { id: true },
      }),
    ]);

    return {
      totalTenants,
      totalUsers,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      activeSubscriptions,
      totalPayments,
      pendingPayments,
      plans: plansBreakdown.reduce(
        (acc, item) => ({ ...acc, [item.plan]: item._count.id }),
        {} as Record<string, number>,
      ),
    };
  }

  // ─── Activité récente ──────────────────────────────────────────────────────
  async getRecentActivity() {
    const [recentPayments, recentUsers, recentTenants] = await Promise.all([
      this.prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.user.findMany({
        take: 5,
        where: { tenant: NON_SUPPRIME },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          tenant: { select: { name: true } },
        },
      }),
      this.prisma.tenant.findMany({
        take: 5,
        where: NON_SUPPRIME,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      }),
    ]);

    return { recentPayments, recentUsers, recentTenants };
  }

  // ─── Tenants ───────────────────────────────────────────────────────────────

  private whereTenants(q: ListTenantsQueryDto): Prisma.TenantWhereInput {
    return {
      // Un filtre de statut explicite peut cibler DELETED ; sinon on les masque.
      ...(q.status ? { status: q.status } : NON_SUPPRIME),
      ...(q.plan ? { plan: q.plan } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { slug: { contains: q.search, mode: 'insensitive' as const } },
              { contactEmail: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  async getTenants(q: ListTenantsQueryDto) {
    const where = this.whereTenants(q);
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        include: {
          _count: { select: { users: true, stocks: true, transactions: true } },
          subscription: { select: { status: true, plan: true, endDate: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: SELECT_USER, orderBy: { createdAt: 'desc' } },
        subscription: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { stocks: true, transactions: true, listings: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');

    // Journal des actions d'administration ayant visé cette coopérative.
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { targetTenantId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { ...tenant, auditLogs };
  }

  async getTenantUsage(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');

    const [users, stocks, transactions, listings, smsLogs] = await Promise.all([
      this.prisma.user.count({ where: { tenantId: id } }),
      this.prisma.stock.count({ where: { tenantId: id } }),
      this.prisma.transaction.count({ where: { tenantId: id } }),
      this.prisma.listing.count({ where: { tenantId: id } }),
      this.prisma.smsLog.count({ where: { tenantId: id } }),
    ]);

    return { users, stocks, transactions, listings, smsLogs };
  }

  async createTenant(dto: CreateTenantDto) {
    const existant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existant) {
      throw new ConflictException('Ce slug de coopérative est déjà utilisé');
    }
    return this.prisma.tenant.create({ data: dto });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');

    const updated = await this.prisma.tenant.update({ where: { id }, data: dto });

    // Synchronise le plan de la subscription si elle existe
    if (dto.plan) {
      await this.prisma.subscription.updateMany({
        where: { tenantId: id },
        data: { plan: dto.plan },
      });
    }

    return updated;
  }

  /**
   * Suppression logique. Le tenant disparaît des listes et ses membres ne
   * peuvent plus se connecter (contrôle dans JwtStrategy), mais les données
   * restent en base — la suppression définitive passe par `purgeTenant`.
   */
  async deleteTenant(id: string, confirmSlug: string) {
    const tenant = await this.assertTenantModifiable(id);
    this.assertSlugConfirme(tenant.slug, confirmSlug);

    const supprime = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'DELETED', suspendedAt: new Date() },
    });

    // Coupe immédiatement les sessions de tous les membres.
    await this.prisma.user.updateMany({
      where: { tenantId: id },
      data: { tokensRevokedAt: new Date() },
    });

    return supprime;
  }

  /** Destruction définitive, en cascade. Irréversible. */
  async purgeTenant(id: string, confirmSlug: string) {
    const tenant = await this.assertTenantModifiable(id);
    this.assertSlugConfirme(tenant.slug, confirmSlug);

    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'Coopérative et toutes ses données supprimées définitivement' };
  }

  // ─── Utilisateurs ──────────────────────────────────────────────────────────

  private whereUsers(q: ListUsersQueryDto): Prisma.UserWhereInput {
    return {
      tenant: NON_SUPPRIME,
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.tenantId ? { tenantId: q.tenantId } : {}),
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search, mode: 'insensitive' as const } },
              { name: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  async getUsers(q: ListUsersQueryDto) {
    const where = this.whereUsers(q);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        select: {
          ...SELECT_USER,
          tenant: { select: { id: true, name: true, slug: true, plan: true, status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page: q.page, limit: q.limit };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...SELECT_USER,
        tenant: { select: { id: true, name: true, slug: true, plan: true, status: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entity: 'user', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { ...user, auditLogs };
  }

  async createUser(dto: CreateAdminUserDto) {
    const [emailPris, tenant] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
    ]);
    if (emailPris) {
      throw new ConflictException('Un compte avec cet e-mail existe déjà');
    }
    if (!tenant || tenant.status === 'DELETED') {
      throw new BadRequestException('Coopérative de rattachement introuvable');
    }

    const { password, ...reste } = dto;
    return this.prisma.user.create({
      data: { ...reste, passwordHash: await bcrypt.hash(password, 10) },
      select: SELECT_USER,
    });
  }

  async updateUser(id: string, dto: UpdateAdminUserDto, acteurId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const roleModifie = dto.role !== undefined && dto.role !== user.role;

    // Retirer le dernier super-admin de la plateforme la rendrait
    // inadministrable ; se rétrograder soi-même est une erreur classique.
    if (roleModifie && user.role === 'SUPER_ADMIN') {
      if (id === acteurId) {
        throw new ForbiddenException(
          'Vous ne pouvez pas modifier votre propre rôle',
        );
      }
      await this.assertPasLeDernierSuperAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        // Un changement de rôle doit prendre effet immédiatement : on révoque
        // les tokens déjà émis, sinon l'ancien rôle resterait valable 7 jours.
        ...(roleModifie ? { tokensRevokedAt: new Date() } : {}),
      },
      select: SELECT_USER,
    });
  }

  async deleteUser(id: string, acteurId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (id === acteurId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }
    if (user.role === 'SUPER_ADMIN') {
      await this.assertPasLeDernierSuperAdmin(id);
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé avec succès' };
  }

  async moveUser(id: string, dto: MoveUserDto) {
    const [user, tenant] = await Promise.all([
      this.prisma.user.findUnique({ where: { id } }),
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
    ]);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!tenant || tenant.status === 'DELETED') {
      throw new BadRequestException('Coopérative de destination introuvable');
    }
    if (user.tenantId === dto.tenantId) {
      throw new BadRequestException('Cet utilisateur appartient déjà à cette coopérative');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        tenantId: dto.tenantId,
        // Le plan et les données accessibles changent : les sessions en cours
        // porteraient encore l'ancien tenantId dans leur JWT.
        tokensRevokedAt: new Date(),
      },
      select: SELECT_USER,
    });
  }

  // ─── Suspension / réactivation ─────────────────────────────────────────────
  // La suspension prend effet à la requête suivante : JwtStrategy relit le
  // statut du user et de son tenant à chaque appel authentifié.

  async suspendTenant(id: string, reason: string, acteurId: string) {
    await this.assertTenantModifiable(id);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedBy: acteurId,
      },
    });
  }

  async reactivateTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
      },
    });
  }

  async suspendUser(id: string, reason: string, acteurId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (id === acteurId) {
      throw new ForbiddenException('Vous ne pouvez pas suspendre votre propre compte');
    }
    if (user.role === 'SUPER_ADMIN') {
      await this.assertPasLeDernierSuperAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: reason,
        // Coupe aussi les sessions en cours, sans attendre l'expiration du JWT.
        tokensRevokedAt: new Date(),
      },
      select: SELECT_USER,
    });
  }

  async reactivateUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null, suspendedReason: null },
      select: SELECT_USER,
    });
  }

  // ─── Exports CSV ───────────────────────────────────────────────────────────

  async exportTenantsCsv(q: ListTenantsQueryDto) {
    const tenants = await this.prisma.tenant.findMany({
      where: this.whereTenants(q),
      orderBy: { [q.sortBy]: q.sortOrder },
      include: { _count: { select: { users: true, stocks: true, transactions: true } } },
    });

    return this.versCsv(
      ['Nom', 'Slug', 'Plan', 'Statut', 'Contact', 'Région', 'Membres', 'Stocks', 'Transactions', 'Créée le'],
      tenants.map((t) => [
        t.name,
        t.slug,
        t.plan,
        t.status,
        t.contactEmail ?? '',
        t.region ?? '',
        t._count.users,
        t._count.stocks,
        t._count.transactions,
        t.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  async exportUsersCsv(q: ListUsersQueryDto) {
    const users = await this.prisma.user.findMany({
      where: this.whereUsers(q),
      orderBy: { [q.sortBy]: q.sortOrder },
      select: { ...SELECT_USER, tenant: { select: { name: true, slug: true } } },
    });

    return this.versCsv(
      ['Nom', 'E-mail', 'Rôle', 'Statut', 'Téléphone', 'Coopérative', 'Slug', 'Dernière connexion', 'Inscrit le'],
      users.map((u) => [
        u.name,
        u.email,
        u.role,
        u.status,
        u.phone ?? '',
        u.tenant?.name ?? '',
        u.tenant?.slug ?? '',
        u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 10) : '',
        u.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  // ─── Journal d'audit ───────────────────────────────────────────────────────
  getAuditLogs(filtres: FiltresAudit) {
    return this.audit.findAll(filtres);
  }

  // ─── Tâches planifiées ─────────────────────────────────────────────────────
  async getTaskRuns(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.taskRun.findMany({
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.taskRun.count(),
    ]);
    return { data, total, page, limit };
  }

  // ─── Paiements ─────────────────────────────────────────────────────────────
  async getPayments(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true, slug: true } } },
      }),
      this.prisma.payment.count(),
    ]);
    return { data, total, page, limit };
  }

  // ─── Garde-fous ────────────────────────────────────────────────────────────

  /** Le tenant système porte le compte SUPER_ADMIN : il est intouchable. */
  private async assertTenantModifiable(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');
    if (tenant.slug === SLUG_TENANT_SYSTEME) {
      throw new ForbiddenException(
        'La coopérative système ne peut pas être suspendue ni supprimée',
      );
    }
    return tenant;
  }

  private assertSlugConfirme(slugAttendu: string, confirmSlug: string) {
    if (confirmSlug !== slugAttendu) {
      throw new BadRequestException(
        `Confirmation invalide : saisissez exactement « ${slugAttendu} »`,
      );
    }
  }

  private async assertPasLeDernierSuperAdmin(idExclu: string) {
    const autres = await this.prisma.user.count({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { not: idExclu } },
    });
    if (autres === 0) {
      throw new ForbiddenException(
        "Impossible : c'est le dernier super-administrateur actif de la plateforme",
      );
    }
  }

  /**
   * Sérialisation CSV. Le BOM UTF-8 et le séparateur `;` sont indispensables
   * pour qu'Excel en configuration française ouvre le fichier correctement,
   * accents compris.
   */
  private versCsv(entetes: string[], lignes: (string | number)[][]): string {
    const echapper = (v: string | number) => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const corps = [entetes, ...lignes]
      .map((l) => l.map(echapper).join(';'))
      .join('\r\n');
    return `﻿sep=;\r\n${corps}`;
  }
}
