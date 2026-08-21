import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuotaGuard } from '../common/guards/quota.guard';
import { RequireQuota } from '../common/decorators/require-quota.decorator';
import { StocksService } from './stocks.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

@ApiTags('Stocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, QuotaGuard)
@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des stocks du tenant' })
  findAll(@Request() req) {
    return this.stocksService.findAll(req.user.tenantId);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.stocksService.getStats(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.stocksService.findOne(id, req.user.tenantId);
  }

  @Post()
  @RequireQuota('stocks')
  create(@Body() dto: CreateStockDto, @Request() req) {
    return this.stocksService.create(dto, req.user.tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateStockDto>, @Request() req) {
    return this.stocksService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.stocksService.remove(id, req.user.tenantId);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Ajouter un mouvement de stock (entrée/sortie)' })
  addMovement(@Param('id') id: string, @Body() dto: StockMovementDto, @Request() req) {
    return this.stocksService.addMovement(id, dto, req.user.tenantId);
  }
}
