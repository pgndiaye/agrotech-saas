import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
