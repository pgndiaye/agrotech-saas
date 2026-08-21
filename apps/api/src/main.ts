import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody : indispensable à la vérification HMAC des webhooks Wave, qui porte
  // sur les octets reçus et non sur le JSON reparsé.
  // bufferLogs : conserve les logs du démarrage jusqu'à ce que pino prenne le relais.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api/v1');

  app.use(
    helmet({
      // La CSP par défaut de helmet casse Swagger UI (page blanche) et l'API
      // ne sert pas de HTML applicatif : elle n'apporte rien ici.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:8081'];

  // Même en développement, la liste est explicite : « tout autoriser » laissait
  // n'importe quelle page web appeler l'API avec le token de l'utilisateur.
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger : désactivable, et protégé par Basic Auth quand des identifiants
  // sont fournis. La documentation expose toute la surface de l'API.
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || !isProd;

  if (swaggerEnabled) {
    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPassword = process.env.SWAGGER_PASSWORD;

    if (swaggerUser && swaggerPassword) {
      app.use(
        ['/api/docs', '/api/docs-json'],
        basicAuth({
          challenge: true,
          users: { [swaggerUser]: swaggerPassword },
        }),
      );
    } else if (isProd) {
      console.warn(
        '⚠️  Swagger activé en production sans SWAGGER_USER/SWAGGER_PASSWORD',
      );
    }

    const config = new DocumentBuilder()
      .setTitle('AgroTech SaaS API')
      .setDescription('API pour le SaaS AgroTech Sénégal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
