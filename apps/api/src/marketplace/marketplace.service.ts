import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    return this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { category: category as any } : {}),
      },
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyListings(tenantId: string) {
    return this.prisma.listing.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateListingDto, tenantId: string) {
    return this.prisma.listing.create({
      data: { ...dto, tenantId, category: dto.category as any },
    });
  }

  async markAsSold(id: string, tenantId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, tenantId } });
    if (!listing) throw new NotFoundException('Annonce non trouvée');
    return this.prisma.listing.update({ where: { id }, data: { status: 'SOLD' } });
  }

  async remove(id: string, tenantId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, tenantId } });
    if (!listing) throw new NotFoundException('Annonce non trouvée');
    return this.prisma.listing.delete({ where: { id } });
  }
}
