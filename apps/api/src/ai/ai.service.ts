import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import {
  AiRecommendation,
  AiRecommendationsResponse,
  RecommendationPriority,
  RecommendationType,
} from './dto/recommendation.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService,
  ) {}

  async generateRecommendations(
    tenantId: string,
    city = 'Dakar',
  ): Promise<AiRecommendationsResponse> {
    const [stocks, transactions, weather] = await Promise.all([
      this.prisma.stock.findMany({ where: { tenantId } }),
      this.prisma.transaction.findMany({
        where: { tenantId },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.weatherService.getWeatherByCity(city).catch(() => null),
    ]);

    const recommendations: AiRecommendation[] = [
      ...this.analyzeStocks(stocks),
      ...this.analyzeFinance(transactions),
      ...this.analyzeWeather(weather),
      ...this.analyzeSeasonalCalendar(),
    ];

    // Essayer d'enrichir avec OpenAI si la clé est disponible
    const openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openAiKey && recommendations.length < 5) {
      try {
        const enriched = await this.enrichWithOpenAi(openAiKey, stocks, transactions, weather);
        if (enriched) recommendations.push(enriched);
      } catch (err) {
        this.logger.warn('OpenAI enrichissement échoué, recommandations heuristiques utilisées');
      }
    }

    // Tri par priorité
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort((a, b) => order[a.priority] - order[b.priority]);

    const summary = {
      total: recommendations.length,
      high: recommendations.filter((r) => r.priority === RecommendationPriority.HIGH).length,
      medium: recommendations.filter((r) => r.priority === RecommendationPriority.MEDIUM).length,
      low: recommendations.filter((r) => r.priority === RecommendationPriority.LOW).length,
    };

    return { recommendations, generatedAt: new Date().toISOString(), summary };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Analyse des stocks
  // ──────────────────────────────────────────────────────────────────────────
  private analyzeStocks(stocks: any[]): AiRecommendation[] {
    const recs: AiRecommendation[] = [];

    const lowStocks = stocks.filter((s) => s.quantity <= s.minQuantity && s.minQuantity > 0);
    const criticalStocks = stocks.filter(
      (s) => s.minQuantity > 0 && s.quantity <= s.minQuantity * 0.5,
    );
    const seedsLow = lowStocks.filter((s) => s.category === 'SEEDS');
    const fertilizersLow = lowStocks.filter((s) => s.category === 'FERTILIZER');

    if (criticalStocks.length > 0) {
      recs.push({
        id: 'stock-critical',
        type: RecommendationType.STOCK,
        priority: RecommendationPriority.HIGH,
        title: `Stock critique : ${criticalStocks.length} article(s) en rupture imminente`,
        description: `Les articles suivants ont atteint un niveau critique (< 50 % du seuil minimum) : ${criticalStocks.map((s) => s.name).join(', ')}.`,
        actions: [
          'Passer une commande de réapprovisionnement immédiatement',
          'Contacter vos fournisseurs habituels',
          'Vérifier les alternatives disponibles sur le Marketplace',
        ],
        data: { items: criticalStocks.map((s) => ({ name: s.name, quantity: s.quantity, min: s.minQuantity, unit: s.unit })) },
      });
    } else if (lowStocks.length > 0) {
      recs.push({
        id: 'stock-low',
        type: RecommendationType.STOCK,
        priority: RecommendationPriority.MEDIUM,
        title: `Stock bas : ${lowStocks.length} article(s) sous le seuil minimum`,
        description: `Les articles suivants ont atteint leur seuil minimum : ${lowStocks.map((s) => s.name).join(', ')}.`,
        actions: [
          'Planifier un réapprovisionnement dans les 7 prochains jours',
          'Consulter les offres du Marketplace pour ces produits',
        ],
        data: { items: lowStocks.map((s) => ({ name: s.name, quantity: s.quantity, min: s.minQuantity, unit: s.unit })) },
      });
    }

    if (seedsLow.length > 0) {
      recs.push({
        id: 'stock-seeds',
        type: RecommendationType.STOCK,
        priority: RecommendationPriority.HIGH,
        title: 'Semences insuffisantes pour la prochaine saison',
        description: `Avec ${seedsLow.length} référence(s) de semences en stock bas, anticiper les prochains cycles de plantation.`,
        actions: [
          'Calculer les besoins en semences selon la superficie cultivée',
          'Commander les semences certifiées auprès de fournisseurs agréés',
          'Conserver une réserve de 20 % en cas de replantation',
        ],
        data: { seeds: seedsLow.map((s) => ({ name: s.name, quantity: s.quantity, unit: s.unit })) },
      });
    }

    if (fertilizersLow.length > 0) {
      recs.push({
        id: 'stock-fertilizer',
        type: RecommendationType.STOCK,
        priority: RecommendationPriority.MEDIUM,
        title: 'Engrais à réapprovisionner',
        description: `${fertilizersLow.length} type(s) d'engrais sont en quantité insuffisante. Une fertilisation adéquate est essentielle pour les rendements.`,
        actions: [
          'Effectuer un test de sol pour adapter les apports en engrais',
          'Privilégier les engrais organiques pour réduire les coûts',
          'Commander avant le début de la saison des pluies',
        ],
        data: { fertilizers: fertilizersLow.map((s) => ({ name: s.name, quantity: s.quantity, unit: s.unit })) },
      });
    }

    if (stocks.length === 0) {
      recs.push({
        id: 'stock-empty',
        type: RecommendationType.STOCK,
        priority: RecommendationPriority.MEDIUM,
        title: 'Aucun stock enregistré',
        description: 'Commencez à saisir vos stocks pour bénéficier de recommandations personnalisées.',
        actions: [
          'Ajouter vos semences actuelles',
          'Enregistrer vos engrais et intrants',
          'Inventorier votre matériel agricole',
        ],
      });
    }

    return recs;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Analyse financière
  // ──────────────────────────────────────────────────────────────────────────
  private analyzeFinance(transactions: any[]): AiRecommendation[] {
    const recs: AiRecommendation[] = [];

    const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    if (transactions.length === 0) {
      recs.push({
        id: 'finance-empty',
        type: RecommendationType.FINANCE,
        priority: RecommendationPriority.LOW,
        title: 'Aucune transaction financière enregistrée',
        description: 'Le suivi financier permet d\'identifier les postes de coût et d\'optimiser la rentabilité.',
        actions: [
          'Commencer à enregistrer vos revenus de ventes',
          'Documenter vos dépenses (semences, engrais, main-d\'œuvre)',
          'Consulter le module Finance pour plus d\'options',
        ],
      });
      return recs;
    }

    if (balance < 0) {
      recs.push({
        id: 'finance-negative',
        type: RecommendationType.FINANCE,
        priority: RecommendationPriority.HIGH,
        title: 'Solde financier négatif',
        description: `Votre solde actuel est de ${this.formatCFA(balance)}. Les dépenses (${this.formatCFA(expense)}) dépassent les revenus (${this.formatCFA(income)}).`,
        actions: [
          'Identifier et réduire les postes de dépenses non essentiels',
          'Accélérer la mise en vente des récoltes via le Marketplace',
          'Contacter une coopérative ou microfinance pour un crédit de campagne',
        ],
        data: { balance, income, expense },
      });
    } else if (expense / (income || 1) > 0.8) {
      recs.push({
        id: 'finance-margin-low',
        type: RecommendationType.FINANCE,
        priority: RecommendationPriority.MEDIUM,
        title: 'Marge bénéficiaire faible',
        description: `Les charges représentent ${Math.round((expense / income) * 100)} % des revenus. Une marge saine se situe en dessous de 70 %.`,
        actions: [
          'Négocier les prix d\'achat des intrants en groupement',
          'Réduire les pertes post-récolte par un meilleur stockage',
          'Diversifier les cultures pour lisser les revenus',
        ],
        data: { ratio: Math.round((expense / income) * 100) },
      });
    }

    // Analyse des catégories de dépenses
    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      });

    const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topExpense && topExpense[1] > expense * 0.5) {
      recs.push({
        id: 'finance-top-expense',
        type: RecommendationType.FINANCE,
        priority: RecommendationPriority.MEDIUM,
        title: `Poste dominant : "${topExpense[0]}" représente plus de 50 % des dépenses`,
        description: `La catégorie "${topExpense[0]}" représente ${this.formatCFA(topExpense[1])} sur ${this.formatCFA(expense)} de dépenses totales.`,
        actions: [
          'Analyser les possibilités de réduction dans cette catégorie',
          'Comparer les prix avec d\'autres fournisseurs',
          'Envisager une approche collective pour mutualiser les achats',
        ],
        data: { category: topExpense[0], amount: topExpense[1] },
      });
    }

    // Conseil d'épargne si bonne santé financière
    if (balance > 100_000 && expense / (income || 1) < 0.6) {
      recs.push({
        id: 'finance-save',
        type: RecommendationType.FINANCE,
        priority: RecommendationPriority.LOW,
        title: 'Bonne santé financière — Investir pour la prochaine saison',
        description: `Votre solde de ${this.formatCFA(balance)} permet d'envisager des investissements productifs.`,
        actions: [
          'Investir dans du matériel d\'irrigation pour la contra-saison',
          'Acheter des semences améliorées pour augmenter les rendements',
          'Constituer un fonds de réserve (3 mois de dépenses)',
        ],
        data: { balance },
      });
    }

    return recs;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Analyse météorologique
  // ──────────────────────────────────────────────────────────────────────────
  private analyzeWeather(weather: any): AiRecommendation[] {
    const recs: AiRecommendation[] = [];
    if (!weather) return recs;

    if (weather.humidity < 35) {
      recs.push({
        id: 'weather-dry',
        type: RecommendationType.WEATHER,
        priority: RecommendationPriority.HIGH,
        title: 'Sécheresse — Irrigation urgente requise',
        description: `L'humidité relative est à ${weather.humidity} % à ${weather.city}. Les cultures sont en stress hydrique.`,
        actions: [
          'Activer l\'irrigation dès que possible',
          'Pailler les cultures pour limiter l\'évaporation',
          'Irriguer de préférence tôt le matin ou le soir',
          'Vérifier l\'état des réservoirs et forages',
        ],
        data: { humidity: weather.humidity, city: weather.city },
      });
    } else if (weather.humidity < 50) {
      recs.push({
        id: 'weather-low-humidity',
        type: RecommendationType.WEATHER,
        priority: RecommendationPriority.MEDIUM,
        title: 'Humidité modérée — Surveiller l\'irrigation',
        description: `L'humidité est à ${weather.humidity} % à ${weather.city}. Maintenir un arrosage régulier.`,
        actions: [
          'Arroser tous les 2 jours selon les cultures',
          'Surveiller les signes de flétrissement sur les feuilles',
        ],
        data: { humidity: weather.humidity },
      });
    }

    if (weather.temperature >= 38) {
      recs.push({
        id: 'weather-heat',
        type: RecommendationType.WEATHER,
        priority: RecommendationPriority.HIGH,
        title: `Canicule — ${weather.temperature}°C à ${weather.city}`,
        description: 'Températures extrêmes menaçant les cultures sensibles et réduisant les rendements.',
        actions: [
          'Ombrager les cultures les plus sensibles (légumes, pépinières)',
          'Augmenter la fréquence d\'irrigation',
          'Éviter les traitements phytosanitaires en plein soleil',
          'Protéger le bétail avec de l\'ombre et de l\'eau fraîche',
        ],
        data: { temperature: weather.temperature },
      });
    } else if (weather.temperature >= 34) {
      recs.push({
        id: 'weather-warm',
        type: RecommendationType.WEATHER,
        priority: RecommendationPriority.LOW,
        title: `Chaleur élevée — ${weather.temperature}°C`,
        description: 'Les températures chaudes accélèrent l\'évapotranspiration. Adapter l\'irrigation.',
        actions: [
          'Augmenter légèrement les doses d\'irrigation',
          'Surveiller les maladies fongiques favorisées par la chaleur',
        ],
        data: { temperature: weather.temperature },
      });
    }

    if (weather.windSpeed > 10) {
      recs.push({
        id: 'weather-wind',
        type: RecommendationType.WEATHER,
        priority: RecommendationPriority.MEDIUM,
        title: `Vents forts — ${weather.windSpeed} m/s`,
        description: 'Des vents forts peuvent endommager les cultures hautes et accélérer l\'assèchement des sols.',
        actions: [
          'Installer des brise-vents si possible',
          'Tutorer et soutenir les cultures hautes (maïs, sorgho)',
          'Reporter les épandages de pesticides',
        ],
        data: { windSpeed: weather.windSpeed },
      });
    }

    return recs;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Calendrier cultural sénégalais
  // ──────────────────────────────────────────────────────────────────────────
  private analyzeSeasonalCalendar(): AiRecommendation[] {
    const month = new Date().getMonth() + 1; // 1-12

    // Hivernage (juillet–octobre) : saison des pluies, cultures pluviales
    if (month >= 7 && month <= 10) {
      return [
        {
          id: 'season-hivernage',
          type: RecommendationType.PLANTING,
          priority: month === 7 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
          title: `Hivernage en cours — ${this.getMonthName(month)} : ${this.getHivernageAdvice(month)}`,
          description: 'La saison des pluies est la période principale de production agricole au Sénégal. Optimiser chaque semaine compte.',
          actions: this.getHivernageActions(month),
          data: { season: 'hivernage', month },
        },
      ];
    }

    // Contra-saison fraîche (novembre–février) : cultures maraîchères irriguées
    if (month >= 11 || month <= 2) {
      return [
        {
          id: 'season-contra-froide',
          type: RecommendationType.PLANTING,
          priority: RecommendationPriority.MEDIUM,
          title: 'Contra-saison froide — Idéale pour le maraîchage',
          description: 'Les températures fraîches favorisent les cultures maraîchères irriguées. C\'est le moment d\'optimiser la production de légumes.',
          actions: [
            'Planter : tomate, oignon, chou, carotte, aubergine, poivron',
            'Assurer une irrigation régulière (2–3 fois/semaine)',
            'Préparer les marchés de vente locale et export',
            'Traiter préventivement contre les maladies fongiques',
          ],
          data: { season: 'contra-froide', month },
        },
      ];
    }

    // Saison sèche chaude (mars–juin) : préparation, cultures de décrue
    return [
      {
        id: 'season-seche-chaude',
        type: RecommendationType.PLANTING,
        priority: RecommendationPriority.MEDIUM,
        title: 'Saison sèche chaude — Préparer la campagne hivernale',
        description: 'C\'est la période de préparation des terres et d\'acquisition des intrants avant les pluies.',
        actions: [
          'Labourer et préparer les champs (avril–juin)',
          'Commander semences, engrais et produits phytosanitaires',
          'Réparer et entretenir le matériel agricole',
          'Sur zones inondables : pratiquer les cultures de décrue (sorgho, niébé)',
        ],
        data: { season: 'seche-chaude', month },
      },
    ];
  }

  private getMonthName(month: number): string {
    const names = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return names[month] ?? '';
  }

  private getHivernageAdvice(month: number): string {
    if (month === 7) return 'Premiers semis';
    if (month === 8) return 'Développement végétatif';
    if (month === 9) return 'Floraison et fructification';
    return 'Récoltes et stockage';
  }

  private getHivernageActions(month: number): string[] {
    if (month === 7) return [
      'Semer mil, sorgho, arachide, maïs dès les premières pluies',
      'Appliquer l\'engrais de fond au semis',
      'Désherber 2 semaines après la levée',
    ];
    if (month === 8) return [
      'Effectuer le sarclage et le buttage du maïs et sorgho',
      'Appliquer l\'engrais de couverture (azote)',
      'Surveiller les attaques de chenilles légionnaires',
    ];
    if (month === 9) return [
      'Traiter contre les maladies fongiques (mildiou, rouille)',
      'Protéger les greniers pour le stockage post-récolte',
      'Estimer les rendements et planifier les ventes',
    ];
    return [
      'Récolter l\'arachide à maturité pour éviter les aflatoxines',
      'Sécher et stocker correctement les grains (humidité < 12 %)',
      'Vendre les excédents sur le Marketplace ou aux coopératives',
    ];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Enrichissement optionnel via OpenAI
  // ──────────────────────────────────────────────────────────────────────────
  private async enrichWithOpenAi(
    apiKey: string,
    stocks: any[],
    transactions: any[],
    weather: any,
  ): Promise<AiRecommendation | null> {
    const { default: axios } = await import('axios');

    const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

    const prompt = `Tu es un conseiller agricole expert au Sénégal. Donne une recommandation concise (titre + description + 3 actions) en JSON pour une exploitation ayant : ${stocks.length} types de produits en stock, un solde financier de ${income - expense} FCFA, météo: ${weather?.description ?? 'inconnue'}, ${weather?.temperature ?? '?'}°C, humidité ${weather?.humidity ?? '?'}%. Format: {"title":"...","description":"...","actions":["...","...","..."]}`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10_000,
      },
    );

    const raw = response.data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      id: 'openai-advice',
      type: RecommendationType.GENERAL,
      priority: RecommendationPriority.MEDIUM,
      title: parsed.title,
      description: parsed.description,
      actions: parsed.actions ?? [],
    };
  }

  private formatCFA(amount: number): string {
    return new Intl.NumberFormat('fr-SN').format(Math.abs(amount)) + ' FCFA';
  }
}
