import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('IA Recommandations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('recommendations')
  @ApiOperation({
    summary: 'Générer des recommandations agricoles IA pour le tenant',
    description:
      'Analyse les stocks, finances et météo du tenant pour produire des recommandations personnalisées basées sur des heuristiques agronomiques et le calendrier cultural sénégalais. Intègre optionnellement OpenAI si la clé OPENAI_API_KEY est configurée.',
  })
  @ApiQuery({ name: 'city', required: false, description: 'Ville pour la météo (défaut: Dakar)' })
  getRecommendations(@Request() req, @Query('city') city?: string) {
    return this.aiService.generateRecommendations(req.user.tenantId, city ?? 'Dakar');
  }
}
