import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SmsService } from './sms.service';

@Injectable()
export class SmsSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SmsSchedulerService.name);

  constructor(private readonly smsService: SmsService) {}

  onApplicationBootstrap() {
    // Vérification toutes les 30 minutes
    setInterval(() => this.checkAndSend(), 30 * 60 * 1_000);
    this.logger.log('Planificateur SMS démarré (vérification toutes les 30 min)');
  }

  private async checkAndSend() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay(); // 0=dim, 1=lun

    // Chaque matin à 8h (dans la fenêtre 8h00–8h29)
    if (hour === 8 && minute < 30) {
      this.logger.log('Déclenchement alertes quotidiennes (8h)');
      try {
        await this.smsService.triggerAllAlerts();
      } catch (err) {
        this.logger.error(`Erreur alertes quotidiennes: ${err}`);
      }
    }

    // Chaque lundi à 7h pour le digest hebdomadaire
    if (day === 1 && hour === 7 && minute < 30) {
      this.logger.log('Déclenchement digest hebdomadaire (lundi 7h)');
      try {
        await this.smsService.triggerAllWeeklyDigests();
      } catch (err) {
        this.logger.error(`Erreur digest hebdomadaire: ${err}`);
      }
    }
  }
}
