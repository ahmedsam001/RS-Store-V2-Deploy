import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { logStructured } from './common/logging/structured-logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import {
  parseAllowedOrigins,
  securityHeadersMiddleware,
} from './common/middleware/security-headers.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.setGlobalPrefix(configService.getOrThrow<string>('API_PREFIX'));
  app.enableCors({
    origin: parseAllowedOrigins(configService.getOrThrow<string>('FRONTEND_ORIGIN')),
    credentials: true,
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());

  app.enableShutdownHooks();
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
  logStructured('info', 'application_started', {
    port,
    environment: configService.get<string>('NODE_ENV') ?? 'development',
  });
}

bootstrap().catch((error: unknown) => {
  logStructured('error', 'application_start_failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
