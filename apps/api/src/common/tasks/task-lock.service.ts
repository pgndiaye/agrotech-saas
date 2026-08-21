import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResultatExecution<T> {
  /** false si une autre instance tenait le verrou, ou si l'occurrence a déjà été jouée. */
  execute: boolean;
  resultat?: T;
}

@Injectable()
export class TaskLockService {
  private readonly logger = new Logger(TaskLockService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Exécute `travail` au plus une fois pour le couple (taskName, runKey).
   *
   * Deux garanties distinctes se combinent :
   *
   * 1. **Verrou consultatif PostgreSQL** — `pg_try_advisory_xact_lock` sérialise
   *    les instances concurrentes. La variante `xact` est libérée
   *    automatiquement à la fin de la transaction : aucune fuite de verrou sur
   *    une connexion rendue au pool, contrairement à `pg_advisory_lock` en
   *    session.
   * 2. **Contrainte d'unicité `(taskName, runKey)`** — déduplication
   *    persistante. Elle survit au redémarrage, là où l'ancien état en mémoire
   *    (`lastDailyAlertDate`) était perdu et laissait rejouer l'occurrence.
   *
   * La revendication se fait dans une transaction COURTE ; le travail lui-même
   * s'exécute en dehors, pour ne pas garder une transaction ouverte pendant des
   * envois réseau.
   */
  async runExclusive<T>(
    taskName: string,
    runKey: string,
    travail: () => Promise<T>,
  ): Promise<ResultatExecution<T>> {
    const cle = this.cleVerrou(taskName);

    let runId: string | null = null;
    try {
      runId = await this.prisma.$transaction(async (tx) => {
        const [{ verrou }] = await tx.$queryRaw<{ verrou: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${cle}::bigint) AS verrou
        `;
        if (!verrou) return null;

        const dejaJoue = await tx.taskRun.findUnique({
          where: { taskName_runKey: { taskName, runKey } },
        });
        if (dejaJoue) return null;

        const run = await tx.taskRun.create({
          data: { taskName, runKey, status: 'RUNNING' },
        });
        return run.id;
      });
    } catch (err) {
      // Course perdue de justesse : une autre instance a inséré la même ligne
      // entre notre lecture et notre écriture. Ce n'est pas une erreur.
      this.logger.warn(
        `Revendication de ${taskName}/${runKey} abandonnée : ${err}`,
      );
      return { execute: false };
    }

    if (!runId) {
      return { execute: false };
    }

    try {
      const resultat = await travail();
      await this.prisma.taskRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCESS',
          endedAt: new Date(),
          result: (resultat ?? {}) as object,
        },
      });
      return { execute: true, resultat };
    } catch (err) {
      await this.prisma.taskRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          error: (err as Error)?.message ?? String(err),
        },
      });
      this.logger.error(`Échec de la tâche ${taskName}/${runKey} : ${err}`);
      throw err;
    }
  }

  /** Clé de verrou 64 bits dérivée du nom de tâche, stable entre instances. */
  private cleVerrou(taskName: string): bigint {
    const empreinte = crypto.createHash('sha256').update(taskName).digest();
    // Signé sur 64 bits : c'est le type attendu par pg_try_advisory_xact_lock.
    return empreinte.readBigInt64BE(0);
  }

  /** Clé d'occurrence quotidienne, ex. « 2026-08-19 ». */
  static cleJour(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  /** Clé d'occurrence hebdomadaire ISO, ex. « 2026-W34 ». */
  static cleSemaine(date = new Date()): string {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semaine = Math.ceil(
      ((d.getTime() - debutAnnee.getTime()) / 86_400_000 + 1) / 7,
    );
    return `${d.getUTCFullYear()}-W${String(semaine).padStart(2, '0')}`;
  }
}
