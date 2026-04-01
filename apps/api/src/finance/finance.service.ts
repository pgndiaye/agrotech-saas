import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, type?: 'INCOME' | 'EXPENSE') {
    return this.prisma.transaction.findMany({
      where: { tenantId, ...(type ? { type } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateTransactionDto, tenantId: string) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : new Date(),
        tenantId,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, tenantId } });
    if (!tx) throw new NotFoundException('Transaction non trouvée');
    return this.prisma.transaction.delete({ where: { id } });
  }

  async getSummary(tenantId: string) {
    const transactions = await this.prisma.transaction.findMany({ where: { tenantId } });
    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;
    const byCategory = transactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { income: 0, expense: 0 };
      if (t.type === 'INCOME') acc[t.category].income += t.amount;
      else acc[t.category].expense += t.amount;
      return acc;
    }, {});
    return { income, expense, balance, byCategory, count: transactions.length };
  }

  async getMonthlyStats(tenantId: string) {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const txs = await this.prisma.transaction.findMany({
        where: { tenantId, date: { gte: start, lte: end } },
      });
      months.push({
        month: d.toLocaleDateString('fr-SN', { month: 'short', year: 'numeric' }),
        income: txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
        expense: txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }

  async exportCsv(tenantId: string): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });

    const header = ['Date', 'Type', 'Catégorie', 'Description', 'Montant (FCFA)'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString('fr-SN'),
      t.type === 'INCOME' ? 'Revenu' : 'Dépense',
      t.category,
      t.description ?? '',
      t.amount.toString(),
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
    return '\uFEFF' + csv; // BOM UTF-8 pour Excel
  }
}
