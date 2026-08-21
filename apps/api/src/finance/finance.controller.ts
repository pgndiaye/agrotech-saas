import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { RequireFeature } from '../auth/decorators/require-plan.decorator';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanGuard)
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
  @RequireFeature('exportCsv')
  async exportCsv(@Request() req, @Res() res: Response) {
    const csv = await this.financeService.exportCsv(req.user.tenantId);
    const filename = `finances-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
