import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  pressure: number;
  alerts?: string[];
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly isValidKey: boolean;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENWEATHERMAP_API_KEY') ?? '';
    // Une clé OWM valide est exactement 32 caractères hexadécimaux
    this.isValidKey = /^[0-9a-f]{32}$/i.test(this.apiKey);
    if (!this.isValidKey) {
      this.logger.warn(
        'OPENWEATHERMAP_API_KEY absente ou invalide — données météo simulées actives. ' +
        'Obtenez une clé gratuite sur https://openweathermap.org/api',
      );
    }
  }

  async getWeatherByCity(city: string): Promise<WeatherData> {
    if (!this.isValidKey) {
      return this.getMockWeather(city);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: { q: city, appid: this.apiKey, units: 'metric', lang: 'fr' },
        timeout: 5000,
      });
      const d = response.data;
      return {
        city: d.name,
        temperature: Math.round(d.main.temp),
        feelsLike: Math.round(d.main.feels_like),
        humidity: d.main.humidity,
        description: d.weather[0].description,
        icon: d.weather[0].icon,
        windSpeed: d.wind.speed,
        pressure: d.main.pressure,
        alerts: this.generateAgroAlerts(d),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Météo API indisponible, utilisation des données simulées: ${message}`);
      return this.getMockWeather(city);
    }
  }

  async getForecast(city: string) {
    if (!this.isValidKey) {
      return this.getMockForecast(city);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: { q: city, appid: this.apiKey, units: 'metric', lang: 'fr', cnt: 5 },
        timeout: 5000,
      });
      return response.data.list.map((item: any) => ({
        date: item.dt_txt,
        temperature: Math.round(item.main.temp),
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        humidity: item.main.humidity,
      }));
    } catch {
      return this.getMockForecast(city);
    }
  }

  private generateAgroAlerts(weatherData: any): string[] {
    const alerts: string[] = [];
    if (weatherData.main.humidity < 30) {
      alerts.push('⚠️ Humidité faible - Irrigation recommandée');
    }
    if (weatherData.main.temp > 38) {
      alerts.push('🌡️ Température élevée - Protéger les cultures');
    }
    if (weatherData.wind.speed > 10) {
      alerts.push('💨 Vents forts - Surveiller les cultures hautes');
    }
    return alerts;
  }

  private getMockWeather(city: string): WeatherData {
    return {
      city: city || 'Dakar',
      temperature: 28,
      feelsLike: 32,
      humidity: 68,
      description: 'Partiellement nuageux',
      icon: '02d',
      windSpeed: 4.5,
      pressure: 1013,
      alerts: ['💧 Saison des pluies - Préparation recommandée'],
    };
  }

  private getMockForecast(city: string) {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
    return days.map((day, i) => ({
      date: day,
      temperature: 26 + i,
      description: i % 2 === 0 ? 'Ensoleillé' : 'Nuageux',
      icon: i % 2 === 0 ? '01d' : '03d',
      humidity: 65 + i * 2,
    }));
  }
}
