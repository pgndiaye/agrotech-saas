import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.stock.findMany({
      where: { tenantId },
      include: { movements: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const stock = await this.prisma.stock.findFirst({
      where: { id, tenantId },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    if (!stock) throw new NotFoundException('Stock non trouvé');
    return stock;
  }

  async create(dto: CreateStockDto, tenantId: string) {
    return this.prisma.stock.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, dto: Partial<CreateStockDto>, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.stock.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.stock.delete({ where: { id } });
  }

  async addMovement(id: string, dto: StockMovementDto, tenantId: string) {
    const stock = await this.findOne(id, tenantId);
    const newQty =
      dto.type === 'IN' ? stock.quantity + dto.quantity : stock.quantity - dto.quantity;
    if (newQty < 0) {
      throw new BadRequestException('Stock insuffisant pour ce mouvement de sortie');
    }
    await this.prisma.stock.update({ where: { id }, data: { quantity: newQty } });
    return this.prisma.stockMovement.create({
      data: { stockId: id, type: dto.type, quantity: dto.quantity, note: dto.note },
    });
  }

  async getLowStockAlerts(tenantId: string) {
    const stocks = await this.prisma.stock.findMany({ where: { tenantId } });
    return stocks.filter((s) => s.quantity <= s.minQuantity);
  }

  async getStats(tenantId: string) {
    const stocks = await this.prisma.stock.findMany({ where: { tenantId } });
    const total = stocks.length;
    const lowStock = stocks.filter((s) => s.quantity <= s.minQuantity).length;
    const byCategory = stocks.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {});
    return { total, lowStock, byCategory };
  }
}
