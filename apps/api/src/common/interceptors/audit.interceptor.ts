import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  AUDIT_KEY,
  AuditEntity,
  AuditOptions,
} from '../decorators/audit.decorator';

/** État « avant » de la cible, par type d'entité. */
type Chargeur = (id: string) => Promise<Record<string, unknown> | null>;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly chargeurs: Partial<Record<AuditEntity, Chargeur>>;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private audit: AuditService,
  ) {
    this.chargeurs = {
      tenant: (id) => this.prisma.tenant.findUnique({ where: { id } }) as any,
      user: (id) =>
        this.prisma.user.findUnique({
          where: { id },
          // passwordHash volontairement exclu du snapshot
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            language: true,
            tenantId: true,
            suspendedReason: true,
          },
        }) as any,
      payment: (id) => this.prisma.payment.findUnique({ where: { id } }) as any,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<AuditOptions>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de @Audit() → aucune journalisation. C'est ce qui exclut les lectures.
    if (!options) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const acteur = req.user;
    const entityId: string | undefined = req.params?.[options.idParam ?? 'id'];
    const ip =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      null;
    const userAgent = (req.headers?.['user-agent'] as string) ?? null;

    const contexteCommun = {
      actorId: acteur?.id ?? null,
      actorEmail: acteur?.email ?? null,
      actorRole: acteur?.role ?? 'INCONNU',
      action: options.action,
      entity: options.entity,
      entityId: entityId ?? null,
      ip,
      userAgent,
    };

    // L'état « avant » doit être capturé AVANT l'exécution du handler.
    const avantPromise = this.chargerAvant(options.entity, entityId);

    return next.handle().pipe(
      tap((resultat) => {
        void avantPromise.then((avant) => {
          const apres = this.extraireApres(resultat);
          this.audit.log({
            ...contexteCommun,
            targetTenantId: this.resoudreTenant(options.entity, avant, apres),
            before: avant,
            // Ne conserver que les clés effectivement modifiées : un snapshot
            // complet noierait l'information utile.
            after: this.diff(avant, apres),
            status: 'SUCCESS',
          });
        });
      }),
      catchError((erreur) => {
        void avantPromise.then((avant) => {
          this.audit.log({
            ...contexteCommun,
            targetTenantId: this.resoudreTenant(options.entity, avant, null),
            before: avant,
            after: null,
            status: 'FAILURE',
            errorMessage: erreur?.message ?? String(erreur),
          });
        });
        // Les échecs sont journalisés puis relancés : c'est ce qui rend
        // visible une tentative d'action non autorisée.
        return throwError(() => erreur);
      }),
    );
  }

  private async chargerAvant(
    entity: AuditEntity,
    id?: string,
  ): Promise<Record<string, unknown> | null> {
    if (!id) return null;
    const chargeur = this.chargeurs[entity];
    if (!chargeur) return null;
    try {
      return await chargeur(id);
    } catch {
      return null;
    }
  }

  /** La réponse d'une suppression est `{ message }` : rien à diffuser. */
  private extraireApres(resultat: unknown): Record<string, unknown> | null {
    if (!resultat || typeof resultat !== 'object') return null;
    if ('message' in (resultat as object) && Object.keys(resultat).length === 1) {
      return null;
    }
    return resultat as Record<string, unknown>;
  }

  private diff(
    avant: Record<string, unknown> | null,
    apres: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!apres) return null;
    if (!avant) return apres;

    const modifie: Record<string, unknown> = {};
    for (const [cle, valeur] of Object.entries(apres)) {
      if (JSON.stringify(avant[cle]) !== JSON.stringify(valeur)) {
        modifie[cle] = valeur;
      }
    }
    return Object.keys(modifie).length ? modifie : null;
  }

  private resoudreTenant(
    entity: AuditEntity,
    avant: Record<string, unknown> | null,
    apres: Record<string, unknown> | null,
  ): string | null {
    if (entity === 'tenant') {
      return (avant?.id as string) ?? (apres?.id as string) ?? null;
    }
    return (
      (avant?.tenantId as string) ?? (apres?.tenantId as string) ?? null
    );
  }
}
