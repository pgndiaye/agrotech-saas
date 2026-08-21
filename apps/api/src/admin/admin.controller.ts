import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateAdminUserDto } from './dto/update-user.dto';
import { SuspendDto } from './dto/suspend.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateAdminUserDto, MoveUserDto } from './dto/create-user.dto';
import {
  ListTenantsQueryDto,
  ListUsersQueryDto,
  PurgeTenantDto,
} from './dto/list.query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
// L'interceptor est posé sur toute la classe mais ne journalise que les
// handlers portant @Audit() : les lectures ci-dessous n'écrivent rien.
@UseInterceptors(AuditInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Stats & Activité ──────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales de la plateforme' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Activité récente (derniers users, tenants, paiements)' })
  getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  // ─── Tenants ───────────────────────────────────────────────────────────────
  @Get('tenants')
  @ApiOperation({ summary: 'Liste paginée, filtrable et triable des coopératives' })
  getTenants(@Query() query: ListTenantsQueryDto) {
    return this.adminService.getTenants(query);
  }

  // Déclaré avant `tenants/:id` : sinon « export » serait capté comme un id.
  @Get('tenants/export/csv')
  @Audit({ action: 'EXPORT_TENANTS', entity: 'tenant' })
  @ApiOperation({ summary: 'Exporter les coopératives filtrées en CSV' })
  async exportTenantsCsv(@Query() query: ListTenantsQueryDto, @Res() res: Response) {
    const csv = await this.adminService.exportTenantsCsv(query);
    const nom = `cooperatives-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.send(csv);
  }

  @Post('tenants')
  @Audit({ action: 'TENANT_CREE', entity: 'tenant' })
  @ApiOperation({ summary: 'Créer une coopérative' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: "Détails complets d'une coopérative" })
  getTenant(@Param('id') id: string) {
    return this.adminService.getTenant(id);
  }

  @Get('tenants/:id/usage')
  @ApiOperation({ summary: "Volumétrie d'une coopérative" })
  getTenantUsage(@Param('id') id: string) {
    return this.adminService.getTenantUsage(id);
  }

  @Patch('tenants/:id')
  @Audit({ action: 'TENANT_MODIFIE', entity: 'tenant' })
  @ApiOperation({ summary: "Modifier le plan ou la fiche d'une coopérative" })
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.adminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/suspend')
  @Audit({ action: 'TENANT_SUSPENDU', entity: 'tenant' })
  @ApiOperation({ summary: 'Suspendre une coopérative (accès bloqué immédiatement)' })
  suspendTenant(@Param('id') id: string, @Body() dto: SuspendDto, @Req() req: any) {
    return this.adminService.suspendTenant(id, dto.reason, req.user.id);
  }

  @Patch('tenants/:id/reactivate')
  @Audit({ action: 'TENANT_REACTIVE', entity: 'tenant' })
  @ApiOperation({ summary: 'Réactiver une coopérative suspendue' })
  reactivateTenant(@Param('id') id: string) {
    return this.adminService.reactivateTenant(id);
  }

  @Delete('tenants/:id')
  @Audit({ action: 'TENANT_SUPPRIME', entity: 'tenant' })
  @ApiOperation({ summary: 'Supprimer une coopérative (suppression logique)' })
  deleteTenant(@Param('id') id: string, @Body() dto: PurgeTenantDto) {
    return this.adminService.deleteTenant(id, dto.confirmSlug);
  }

  @Delete('tenants/:id/purge')
  @Audit({ action: 'TENANT_PURGE', entity: 'tenant' })
  @ApiOperation({ summary: 'Détruire définitivement une coopérative et ses données' })
  purgeTenant(@Param('id') id: string, @Body() dto: PurgeTenantDto) {
    return this.adminService.purgeTenant(id, dto.confirmSlug);
  }

  // ─── Utilisateurs ──────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Liste paginée, filtrable et triable des utilisateurs' })
  getUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/export/csv')
  @Audit({ action: 'EXPORT_USERS', entity: 'user' })
  @ApiOperation({ summary: 'Exporter les utilisateurs filtrés en CSV' })
  async exportUsersCsv(@Query() query: ListUsersQueryDto, @Res() res: Response) {
    const csv = await this.adminService.exportUsersCsv(query);
    const nom = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.send(csv);
  }

  @Post('users')
  @Audit({ action: 'USER_CREE', entity: 'user' })
  @ApiOperation({ summary: 'Créer un utilisateur dans une coopérative' })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: "Fiche détaillée d'un utilisateur" })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @Audit({ action: 'USER_ROLE_MODIFIE', entity: 'user' })
  @ApiOperation({ summary: "Modifier le rôle d'un utilisateur" })
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto, @Req() req: any) {
    return this.adminService.updateUser(id, dto, req.user.id);
  }

  @Patch('users/:id/tenant')
  @Audit({ action: 'USER_DEPLACE', entity: 'user' })
  @ApiOperation({ summary: 'Rattacher un utilisateur à une autre coopérative' })
  moveUser(@Param('id') id: string, @Body() dto: MoveUserDto) {
    return this.adminService.moveUser(id, dto);
  }

  @Patch('users/:id/suspend')
  @Audit({ action: 'USER_SUSPENDU', entity: 'user' })
  @ApiOperation({ summary: 'Suspendre un utilisateur (sessions coupées immédiatement)' })
  suspendUser(@Param('id') id: string, @Body() dto: SuspendDto, @Req() req: any) {
    return this.adminService.suspendUser(id, dto.reason, req.user.id);
  }

  @Patch('users/:id/reactivate')
  @Audit({ action: 'USER_REACTIVE', entity: 'user' })
  @ApiOperation({ summary: 'Réactiver un utilisateur suspendu' })
  reactivateUser(@Param('id') id: string) {
    return this.adminService.reactivateUser(id);
  }

  @Delete('users/:id')
  @Audit({ action: 'USER_SUPPRIME', entity: 'user' })
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  // ─── Journal d'audit ───────────────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: "Journal des actions d'administration" })
  getAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  // ─── Tâches planifiées ─────────────────────────────────────────────────────
  @Get('tasks')
  @ApiOperation({ summary: 'Historique des exécutions de tâches planifiées' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTaskRuns(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getTaskRuns(page, limit);
  }

  // ─── Paiements ─────────────────────────────────────────────────────────────
  @Get('payments')
  @ApiOperation({ summary: 'Historique global de tous les paiements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getPayments(page, limit);
  }
}
