import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DeadEngineExceptionFilter } from './common/filters/dead-engine-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { logStructured } from './common/logging/structured-logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import {
  parseAllowedOrigins,
  securityHeadersMiddleware,
} from './common/middleware/security-headers.middleware';
import { PrismaService } from './infrastructure/database/prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const prisma = app.get(PrismaService);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.setGlobalPrefix(configService.getOrThrow<string>('API_PREFIX'), {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });
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

  // Nest evaluates global filters in reverse registration order. Keep the
  // catch-all fallback first so Prisma and HttpException filters stay authoritative.
  app.useGlobalFilters(
    new DeadEngineExceptionFilter(prisma),
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(prisma),
  );

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
