import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SmsService } from './sms.service';
import { TaskLockService } from '../common/tasks/task-lock.service';

/** Noms de tâches — servent de clé de verrou, ne pas les renommer à la légère. */
export const TACHE_ALERTES_QUOTIDIENNES = 'sms-alertes-quotidiennes';
export const TACHE_DIGEST_HEBDOMADAIRE = 'sms-digest-hebdomadaire';

/**
 * Planificateur des envois SMS.
 *
 * Remplace l'ancien couple `setTimeout` + `setInterval` toutes les 10 minutes,
 * dont la déduplication reposait sur deux champs en mémoire : elle était perdue
 * à chaque redémarrage et produisait des doublons dès qu'une seconde instance
 * de l'API tournait.
 *
 * Désormais : un vrai cron, et une exécution revendiquée en base via
 * `TaskLockService`. Plusieurs instances peuvent tourner en parallèle, une
 * seule enverra les SMS.
 */
@Injectable()
export class SmsSchedulerService {
  private readonly logger = new Logger(SmsSchedulerService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly taskLock: TaskLockService,
  ) {}

  // Chaque jour à 8h, heure de Dakar (le serveur peut être en UTC).
  @Cron('0 8 * * *', { timeZone: 'Africa/Dakar' })
  async alertesQuotidiennes() {
    await this.executer(
      TACHE_ALERTES_QUOTIDIENNES,
      TaskLockService.cleJour(),
      'alertes quotidiennes',
      () => this.smsService.triggerAllAlerts(),
    );
  }

  // Chaque lundi à 7h, heure de Dakar.
  @Cron('0 7 * * 1', { timeZone: 'Africa/Dakar' })
  async digestHebdomadaire() {
    await this.executer(
      TACHE_DIGEST_HEBDOMADAIRE,
      TaskLockService.cleSemaine(),
      'digest hebdomadaire',
      () => this.smsService.triggerAllWeeklyDigests(),
    );
  }

  private async executer(
    tache: string,
    cle: string,
    libelle: string,
    travail: () => Promise<unknown>,
  ) {
    this.logger.log(`Déclenchement ${libelle} (${cle})`);
    try {
      const { execute } = await this.taskLock.runExclusive(tache, cle, travail);
      if (!execute) {
        this.logger.log(
          `${libelle} : occurrence ${cle} déjà traitée, envoi ignoré`,
        );
      }
    } catch (err) {
      // Déjà journalisé et marqué FAILED par TaskLockService : on absorbe ici
      // pour qu'une tâche en échec ne remonte pas en exception non gérée.
      this.logger.error(`Erreur ${libelle} : ${err}`);
    }
  }
}
