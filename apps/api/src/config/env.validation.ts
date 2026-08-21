import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environnement {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Variables dont l'absence rend l'application non fonctionnelle.
 * Tout le reste est optionnel : les intégrations externes (SMS, paiements, IA)
 * ont des modes dégradés qu'il ne faut pas casser en les rendant obligatoires.
 */
class VariablesEnvironnement {
  @IsOptional()
  @IsEnum(Environnement)
  NODE_ENV?: Environnement;

  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL est obligatoire' })
  DATABASE_URL: string;

  // 32 caractères minimum : un secret court rend la signature HS256 attaquable
  // par force brute, et le middleware Next vérifie cette même signature.
  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET doit contenir au moins 32 caractères',
  })
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;
}

/**
 * Branché sur `ConfigModule.forRoot({ validate })` : l'application refuse de
 * démarrer avec un message explicite, au lieu de renvoyer des 500 opaques à la
 * première requête authentifiée.
 */
export function validateEnv(config: Record<string, unknown>) {
  const valides = plainToInstance(VariablesEnvironnement, config, {
    enableImplicitConversion: true,
  });

  const erreurs = validateSync(valides, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (erreurs.length > 0) {
    const details = erreurs
      .map((e) => `  - ${e.property} : ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(
      `Configuration d'environnement invalide :\n${details}\n` +
        `Vérifiez le fichier apps/api/.env`,
    );
  }

  return config;
}
