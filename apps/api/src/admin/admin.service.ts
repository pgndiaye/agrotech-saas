import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateAdminUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.tenant.groupBy({ by: ['plan'], _count: { id: true } }),
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
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      }),
    ]);

    return { recentPayments, recentUsers, recentTenants };
  }

  // ─── Tenants ───────────────────────────────────────────────────────────────
  async getTenants(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, stocks: true, transactions: true } },
          subscription: { select: { status: true, plan: true, endDate: true } },
        },
      }),
      this.prisma.tenant.count(),
    ]);
    return { data, total, page, limit };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        },
        subscription: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { stocks: true, transactions: true, listings: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');

    const updated = await this.prisma.tenant.update({ where: { id }, data: dto });

    // Synchronise le plan de la subscription si elle existe
    if (dto.plan && updated) {
      await this.prisma.subscription.updateMany({
        where: { tenantId: id },
        data: { plan: dto.plan },
      });
    }

    return updated;
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant non trouvé');
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'Tenant supprimé avec succès' };
  }

  // ─── Utilisateurs ──────────────────────────────────────────────────────────
  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          language: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true, plan: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, role: true, language: true, tenantId: true },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé avec succès' };
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
}
