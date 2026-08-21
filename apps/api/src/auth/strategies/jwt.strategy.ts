import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Point de contrôle unique de la plateforme : toutes les requêtes
   * authentifiées passent ici, et l'utilisateur est déjà rechargé depuis la
   * base à chaque appel. C'est donc l'endroit où suspension et révocation
   * prennent effet dès la requête suivante, sans attendre l'expiration du JWT
   * (7 jours par défaut).
   */
  async validate(payload: {
    sub: string;
    email: string;
    tenantId: string;
    role: string;
    iat?: number;
  }) {
    // select explicite : passwordHash ne doit jamais se retrouver dans req.user.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        tenantId: true,
        status: true,
        tokensRevokedAt: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Révocation : tout token émis avant tokensRevokedAt est refusé.
    // `iat` est en secondes, converti en millisecondes pour la comparaison.
    if (
      user.tokensRevokedAt &&
      payload.iat &&
      payload.iat * 1000 < user.tokensRevokedAt.getTime()
    ) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOQUEE',
        message: 'Votre session a été révoquée, veuillez vous reconnecter',
      });
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: 'COMPTE_SUSPENDU',
        message: 'Votre compte a été suspendu',
      });
    }

    if (user.tenant?.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: 'ORGANISATION_SUSPENDUE',
        message: 'Votre organisation a été suspendue',
      });
    }

    if (user.tenant?.status === 'DELETED') {
      throw new ForbiddenException({
        code: 'COMPTE_SUPPRIME',
        message: "Votre organisation n'existe plus",
      });
    }

    return user;
  }
}
