export enum RecommendationType {
  STOCK = 'STOCK',
  FINANCE = 'FINANCE',
  WEATHER = 'WEATHER',
  PLANTING = 'PLANTING',
  GENERAL = 'GENERAL',
}

export enum RecommendationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface AiRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  actions: string[];
  data?: Record<string, any>;
}

export interface AiRecommendationsResponse {
  recommendations: AiRecommendation[];
  generatedAt: string;
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}
