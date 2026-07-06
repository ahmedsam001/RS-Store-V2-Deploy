import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logStructured } from '../../../common/logging/structured-logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly connectionRetryDelaysMs = [2_000, 4_000, 6_000, 8_000, 10_000, 12_000];

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= this.connectionRetryDelaysMs.length; attempt += 1) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;

        logStructured('info', 'database_connect_success', {
          attempt,
          maxAttempts: this.connectionRetryDelaysMs.length,
        });
        return;
      } catch (error) {
        const isFinalAttempt = attempt === this.connectionRetryDelaysMs.length;
        const payload = {
          attempt,
          maxAttempts: this.connectionRetryDelaysMs.length,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorCode: this.getPrismaErrorCode(error),
        };

        if (isFinalAttempt) {
          logStructured('error', 'database_connect_failed', payload);
          throw error;
        }

        const delayMs = this.connectionRetryDelaysMs[attempt - 1];
        logStructured('warn', 'database_connect_retry', {
          ...payload,
          nextRetryDelayMs: delayMs,
        });
        await this.delay(delayMs);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private getPrismaErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }

    return undefined;
  }
}
