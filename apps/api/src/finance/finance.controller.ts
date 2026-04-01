import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  findAll(@Request() req, @Query('type') type?: 'INCOME' | 'EXPENSE') {
    return this.financeService.findAll(req.user.tenantId, type);
  }

  @Get('summary')
  getSummary(@Request() req) {
    return this.financeService.getSummary(req.user.tenantId);
  }

  @Get('monthly')
  getMonthly(@Request() req) {
    return this.financeService.getMonthlyStats(req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto, @Request() req) {
    return this.financeService.create(dto, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.financeService.remove(id, req.user.tenantId);
  }

  @Get('export/csv')
  async exportCsv(@Request() req, @Res() res: Response) {
    if (req.user.tenant?.plan !== 'PREMIUM') {
      throw new ForbiddenException('Export disponible uniquement en plan Premium');
    }
    const csv = await this.financeService.exportCsv(req.user.tenantId);
    const filename = `finances-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
