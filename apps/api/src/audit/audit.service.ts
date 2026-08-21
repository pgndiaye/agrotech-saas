import { Injectable, Logger } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Clés dont la valeur est remplacée par `[masqué]` dans les snapshots. */
const CHAMPS_SENSIBLES = ['passwordHash', 'password', 'token', 'apiKey', 'secret'];

export interface AuditEntree {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string | null;
  targetTenantId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  status?: AuditStatus;
  errorMessage?: string | null;
}

export interface FiltresAudit {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Écrit une ligne d'audit. Ne lève jamais : l'échec de la journalisation ne
   * doit pas faire échouer l'action métier qu'elle accompagne.
   */
  async log(entree: AuditEntree): Promise<void> {
    const data = {
      actorId: entree.actorId ?? null,
      actorEmail: entree.actorEmail ?? null,
      actorRole: entree.actorRole,
      action: entree.action,
      entity: entree.entity,
      entityId: entree.entityId ?? null,
      targetTenantId: entree.targetTenantId ?? null,
      before: this.masquer(entree.before),
      after: this.masquer(entree.after),
      ip: entree.ip ?? null,
      userAgent: entree.userAgent ?? null,
      status: entree.status ?? 'SUCCESS',
      errorMessage: entree.errorMessage ?? null,
    };

    try {
      await this.prisma.auditLog.create({ data });
    } catch (err) {
      // Cas courant : la cible vient d'être supprimée, la clé étrangère
      // targetTenantId ne pointe plus sur rien. La trace de la suppression est
      // précisément celle qu'il ne faut pas perdre — on réessaie sans le lien.
      if (data.targetTenantId) {
        try {
          await this.prisma.auditLog.create({
            data: { ...data, targetTenantId: null },
          });
          return;
        } catch {
          /* on tombe dans le log d'erreur ci-dessous */
        }
      }
      this.logger.error(
        `Échec d'écriture du journal d'audit (${entree.action}) : ${err}`,
      );
    }
  }

  async findAll(filtres: FiltresAudit) {
    const { page, limit, action, entity, actorId, from, to } = filtres;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(entity ? { entity } : {}),
      ...(actorId ? { actorId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: { targetTenant: { select: { name: true, slug: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Remplace récursivement la valeur des champs sensibles.
   * Retourne `Prisma.JsonNull` plutôt que `undefined` pour que la colonne Json
   * soit explicitement vide quand il n'y a rien à enregistrer.
   */
  private masquer(valeur: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (valeur === undefined || valeur === null) return Prisma.JsonNull;
    return JSON.parse(
      JSON.stringify(valeur, (cle, val) =>
        CHAMPS_SENSIBLES.includes(cle) ? '[masqué]' : val,
      ),
    );
  }
}
