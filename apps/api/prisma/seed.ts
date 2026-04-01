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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
