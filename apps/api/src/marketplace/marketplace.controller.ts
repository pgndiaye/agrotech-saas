import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { QuotaGuard } from '../common/guards/quota.guard';
import { RequireQuota } from '../common/decorators/require-quota.decorator';
import { RequireFeature } from '../auth/decorators/require-plan.decorator';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanGuard, QuotaGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Get()
  @ApiQuery({ name: 'category', required: false })
  findAll(@Query('category') category?: string) {
    return this.marketplaceService.findAll(category);
  }

  @Get('my')
  findMyListings(@Request() req) {
    return this.marketplaceService.findMyListings(req.user.tenantId);
  }

  @Post()
  @RequireFeature('marketplacePublish')
  @RequireQuota('listings')
  create(@Body() dto: CreateListingDto, @Request() req) {
    return this.marketplaceService.create(dto, req.user.tenantId);
  }

  @Put(':id/sold')
  markAsSold(@Param('id') id: string, @Request() req) {
    return this.marketplaceService.markAsSold(id, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.marketplaceService.remove(id, req.user.tenantId);
  }
}
