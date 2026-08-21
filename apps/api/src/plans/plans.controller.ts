import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanCatalogService } from './plan-catalog.service';

/**
 * Grille tarifaire publique — alimente la page d'abonnement, qui affichait
 * jusqu'ici des prix et des fonctionnalités codés en dur dans le composant.
 *
 * Route non authentifiée (une page tarifs doit être consultable avant
 * inscription), mais throttlée plus sévèrement que la limite globale.
 */
@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private planCatalog: PlanCatalogService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Grille tarifaire publique' })
  getPublics() {
    return this.planCatalog.getPublics();
  }
}
