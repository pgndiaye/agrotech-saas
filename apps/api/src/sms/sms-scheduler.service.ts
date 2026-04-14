import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SmsService } from './sms.service';

@Injectable()
export class SmsSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SmsSchedulerService.name);

  /** Date YYYY-MM-DD du dernier envoi des alertes quotidiennes */
  private lastDailyAlertDate: string | null = null;
  /** Clé "YYYY-Www" de la dernière semaine traitée pour le digest */
  private lastWeeklyDigestKey: string | null = null;

  constructor(private readonly smsService: SmsService) {}

  onApplicationBootstrap() {
    // Première vérification après 1 min pour ne pas bloquer le démarrage
    setTimeout(() => this.checkAndSend(), 60_000);
    // Puis toutes les 10 minutes pour ne plus rater une fenêtre
    setInterval(() => this.checkAndSend(), 10 * 60 * 1_000);
    this.logger.log('Planificateur SMS démarré (vérification toutes les 10 min)');
  }

  private async checkAndSend() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=dim, 1=lun

    // Clé unique du jour (ex: "2026-04-14")
    const todayKey = now.toISOString().slice(0, 10);

    // Chaque matin entre 8h et 9h — une seule fois par jour
    if (hour === 8 && this.lastDailyAlertDate !== todayKey) {
      this.lastDailyAlertDate = todayKey;
      this.logger.log('Déclenchement alertes quotidiennes (8h)');
      try {
        await this.smsService.triggerAllAlerts();
      } catch (err) {
        this.logger.error(`Erreur alertes quotidiennes: ${err}`);
      }
    }

    // Chaque lundi entre 7h et 8h pour le digest — une seule fois par semaine
    if (day === 1 && hour === 7) {
      // Numéro de semaine ISO pour le dédoublonnage
      const weekKey = `${now.getFullYear()}-W${this.getISOWeek(now)}`;
      if (this.lastWeeklyDigestKey !== weekKey) {
        this.lastWeeklyDigestKey = weekKey;
        this.logger.log('Déclenchement digest hebdomadaire (lundi 7h)');
        try {
          await this.smsService.triggerAllWeeklyDigests();
        } catch (err) {
          this.logger.error(`Erreur digest hebdomadaire: ${err}`);
        }
      }
    }
  }

  /** Retourne le numéro de semaine ISO (1–53) */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }
}
