import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Filtre global : normalise toutes les réponses d'erreur sur la forme
 * `{ statusCode, code, message, path, timestamp }`.
 *
 * Le champ `code` est ce que le client web utilise pour distinguer un 403 de
 * suspension (`ORGANISATION_SUSPENDUE`) d'un 403 de rôle (`ROLE_INSUFFISANT`).
 *
 * Traduit aussi les erreurs Prisma, qui remontaient en 500 opaques.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'ERREUR_INTERNE';
    let message: string | string[] = 'Une erreur interne est survenue';
    // Champs métier ajoutés par les guards (limite/actuel d'un quota, plan
    // requis…) : ils doivent survivre à la normalisation, sinon le client ne
    // peut afficher qu'un message générique.
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const reponse = exception.getResponse();

      if (typeof reponse === 'string') {
        message = reponse;
        code = this.codeParDefaut(statusCode);
      } else {
        const {
          message: msg,
          code: c,
          statusCode: _ignore,
          error: _error,
          ...reste
        } = reponse as Record<string, unknown>;
        message = (msg as string | string[]) ?? exception.message;
        code = (c as string) ?? this.codeParDefaut(statusCode);
        details = reste;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const traduit = this.traduirePrisma(exception);
      statusCode = traduit.statusCode;
      code = traduit.code;
      message = traduit.message;
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // En production, ne jamais exposer le détail interne au client.
      if (process.env.NODE_ENV === 'production') {
        message = 'Une erreur interne est survenue';
      }
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      ...details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private traduirePrisma(erreur: Prisma.PrismaClientKnownRequestError) {
    switch (erreur.code) {
      case 'P2002': {
        const champs = (erreur.meta?.target as string[] | undefined)?.join(', ');
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLIT_UNICITE',
          message: champs
            ? `Une entrée existe déjà avec cette valeur (${champs})`
            : 'Une entrée existe déjà avec cette valeur',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'INTROUVABLE',
          message: "L'enregistrement demandé est introuvable",
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'CONTRAINTE_REFERENCE',
          message: 'Référence invalide vers un enregistrement lié',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'ERREUR_BASE_DE_DONNEES',
          message: 'Erreur de base de données',
        };
    }
  }

  private codeParDefaut(statusCode: number): string {
    const table: Record<number, string> = {
      400: 'REQUETE_INVALIDE',
      401: 'NON_AUTHENTIFIE',
      403: 'ACCES_REFUSE',
      404: 'INTROUVABLE',
      409: 'CONFLIT',
      429: 'TROP_DE_REQUETES',
    };
    return table[statusCode] ?? 'ERREUR';
  }
}
