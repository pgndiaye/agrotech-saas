import { PrismaClient, StockCategory, MovementType, TransactionType, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Créer un tenant de démo
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-coop' },
    update: {},
    create: {
      name: 'Coopérative Agricole Dakar',
      slug: 'demo-coop',
      plan: 'FREE',
    },
  });

  // Créer un admin
  const hashedPassword = await bcrypt.hash('Admin1234!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo-coop.sn' },
    update: {},
    create: {
      email: 'admin@demo-coop.sn',
      passwordHash: hashedPassword,
      name: 'Mamadou Diallo',
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  });

  // Créer des stocks de démo
  const stockSeeds = await prisma.stock.create({
    data: {
      name: 'Mil (Pennisetum)',
      category: StockCategory.SEEDS,
      quantity: 500,
      unit: 'kg',
      minQuantity: 50,
      tenantId: tenant.id,
    },
  });

  await prisma.stock.createMany({
    data: [
      {
        name: 'Arachide',
        category: StockCategory.SEEDS,
        quantity: 350,
        unit: 'kg',
        minQuantity: 30,
        tenantId: tenant.id,
      },
      {
        name: 'Engrais NPK 15-15-15',
        category: StockCategory.FERTILIZER,
        quantity: 200,
        unit: 'sac (50kg)',
        minQuantity: 10,
        tenantId: tenant.id,
      },
      {
        name: 'Récolte Tomates',
        category: StockCategory.HARVEST,
        quantity: 1200,
        unit: 'kg',
        minQuantity: 0,
        tenantId: tenant.id,
      },
    ],
    skipDuplicates: true,
  });

  // Transaction de démo
  await prisma.transaction.createMany({
    data: [
      {
        type: TransactionType.INCOME,
        amount: 450000,
        category: 'Vente Tomates',
        description: 'Vente au marché de Dakar',
        tenantId: tenant.id,
      },
      {
        type: TransactionType.EXPENSE,
        amount: 85000,
        category: 'Intrants agricoles',
        description: 'Achat engrais et semences',
        tenantId: tenant.id,
      },
      {
        type: TransactionType.INCOME,
        amount: 120000,
        category: 'Subvention ONG',
        description: 'Subvention projet maraîchage',
        tenantId: tenant.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed terminé !');
  console.log(`Tenant: ${tenant.name} (slug: ${tenant.slug})`);
  console.log(`Admin: ${admin.email} / Admin1234!`);

  // ─── Super Admin de la plateforme ──────────────────────────────────────────
  // Tenant système (non visible dans les coopératives)
  const systemTenant = await prisma.tenant.upsert({
    where: { slug: 'agrotech-system' },
    update: {},
    create: {
      name: 'AgroTech SN — System',
      slug: 'agrotech-system',
      plan: 'PREMIUM',
    },
  });

  const superAdminPassword = await bcrypt.hash('SuperAdmin2026!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@agrotech.sn' },
    update: {},
    create: {
      email: 'superadmin@agrotech.sn',
      passwordHash: superAdminPassword,
      name: 'Super Administrateur',
      role: Role.SUPER_ADMIN,
      tenantId: systemTenant.id,
    },
  });

  // ─── Catalogue tarifaire ──────────────────────────────────────────────────
  // Une ligne par membre de l'enum Plan : PlanCatalogService.getPlan() est
  // fail-closed, un plan absent du catalogue ferait échouer les guards.
  await prisma.planConfig.upsert({
    where: { code: 'FREE' },
    update: {},
    create: {
      code: 'FREE',
      label: 'Gratuit',
      description: 'Météo, stocks et finance de base',
      priceXof: 0,
      sortOrder: 0,
      quotas: { users: 3, stocks: 50, listings: 0, smsPerMonth: 0 },
      features: {
        exportCsv: false,
        smsAlerts: false,
        marketplacePublish: false,
        aiRecommendations: false,
      },
    },
  });

  await prisma.planConfig.upsert({
    where: { code: 'PREMIUM' },
    update: {},
    create: {
      code: 'PREMIUM',
      label: 'Premium',
      description: 'Marketplace illimité, exports, IA et alertes SMS',
      priceXof: 12000,
      sortOrder: 1,
      // -1 = illimité
      quotas: { users: -1, stocks: -1, listings: -1, smsPerMonth: -1 },
      features: {
        exportCsv: true,
        smsAlerts: true,
        marketplacePublish: true,
        aiRecommendations: true,
      },
    },
  });

  console.log('Catalogue tarifaire : FREE (0 XOF) et PREMIUM (12 000 XOF/mois)');

  console.log(`Super Admin: ${superAdmin.email} / SuperAdmin2026!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
