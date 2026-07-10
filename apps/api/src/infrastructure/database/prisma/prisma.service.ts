import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logStructured } from '../../../common/logging/structured-logger';

export type DatabaseRecoverySource = 'exception_filter' | 'health_check';
type ConnectionLifecycleOperation = 'startup' | 'runtime_recovery';

const TRANSIENT_DATABASE_ERROR_CODES = new Set(['P1001', 'P1002', 'P2024', 'P2028']);

export function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  for (const property of ['code', 'errorCode'] as const) {
    if (property in error) {
      const value = (error as Record<typeof property, unknown>)[property];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return undefined;
}

export function isTransientDatabaseError(error: unknown): boolean {
  return isTransientDatabaseErrorCode(getPrismaErrorCode(error));
}

export function isTransientDatabaseErrorCode(code: string | undefined): boolean {
  return code !== undefined && TRANSIENT_DATABASE_ERROR_CODES.has(code);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  protected readonly connectionRetryDelaysMs: readonly number[] = [
    2_000,
    4_000,
    6_000,
    8_000,
    10_000,
    12_000,
  ];
  protected readonly runtimeRecoveryCooldownMs: number = 30_000;

  private connectionLifecyclePromise: Promise<void> | null = null;
  private connectionLifecycleOperation: ConnectionLifecycleOperation | null = null;
  private nextRuntimeRecoveryAllowedAtMs = 0;
  private shuttingDown = false;

  onModuleInit(): void {
    const startupConnection = this.startConnectionLifecycleOperation('startup', () =>
      this.connectWithRetry(),
    );
    void startupConnection.catch((error) => {
      logStructured('error', 'database_connect_background_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorCode: getPrismaErrorCode(error),
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    try {
      await this.connectionLifecyclePromise;
    } catch {
      // Startup failures are already logged by onModuleInit; shutdown must still disconnect cleanly.
    }
    await this.$disconnect();
  }

  requestRuntimeRecovery(error: unknown, source: DatabaseRecoverySource): Promise<void> | undefined {
    if (!isTransientDatabaseError(error) || this.shuttingDown) {
      return undefined;
    }

    const errorCode = getPrismaErrorCode(error);
    if (this.connectionLifecyclePromise) {
      logStructured('info', 'database_runtime_recovery_joined', {
        source,
        errorCode,
        activeOperation: this.connectionLifecycleOperation,
      });
      return this.connectionLifecyclePromise;
    }

    const now = this.now();
    if (now < this.nextRuntimeRecoveryAllowedAtMs) {
      logStructured('warn', 'database_runtime_recovery_cooldown', {
        source,
        errorCode,
        retryAfterMs: this.nextRuntimeRecoveryAllowedAtMs - now,
      });
      return undefined;
    }

    logStructured('warn', 'database_runtime_recovery_started', {
      source,
      errorCode,
      maxAttempts: this.connectionRetryDelaysMs.length,
    });

    return this.startConnectionLifecycleOperation('runtime_recovery', () =>
      this.recoverRuntimeConnection(errorCode, source),
    );
  }

  private startConnectionLifecycleOperation(
    operation: ConnectionLifecycleOperation,
    execute: () => Promise<void>,
  ): Promise<void> {
    const trackedPromise = execute().finally(() => {
      if (this.connectionLifecyclePromise === trackedPromise) {
        this.connectionLifecyclePromise = null;
        this.connectionLifecycleOperation = null;
      }
    });

    this.connectionLifecycleOperation = operation;
    this.connectionLifecyclePromise = trackedPromise;
    return trackedPromise;
  }

  private async connectWithRetry(): Promise<void> {
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
          errorCode: getPrismaErrorCode(error),
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

  private async recoverRuntimeConnection(
    triggeringErrorCode: string | undefined,
    source: DatabaseRecoverySource,
  ): Promise<void> {
    const maxAttempts = this.connectionRetryDelaysMs.length;

    for (let attempt = 1; attempt <= maxAttempts && !this.shuttingDown; attempt += 1) {
      try {
        await this.disconnectForRuntimeRecovery(triggeringErrorCode, source, attempt, maxAttempts);
        if (this.shuttingDown) return;

        await this.$connect();
        if (this.shuttingDown) return;

        await this.$queryRaw`SELECT 1`;
        logStructured('info', 'database_runtime_recovery_success', {
          source,
          triggeringErrorCode,
          attempt,
          maxAttempts,
        });
        return;
      } catch (error) {
        const payload = {
          source,
          triggeringErrorCode,
          attempt,
          maxAttempts,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorCode: getPrismaErrorCode(error),
        };

        if (attempt === maxAttempts) {
          this.nextRuntimeRecoveryAllowedAtMs = this.now() + this.runtimeRecoveryCooldownMs;
          logStructured('error', 'database_runtime_recovery_failed', payload);
          logStructured('warn', 'database_runtime_recovery_cooldown', {
            source,
            triggeringErrorCode,
            retryAfterMs: this.runtimeRecoveryCooldownMs,
          });
          return;
        }

        const delayMs = this.connectionRetryDelaysMs[attempt - 1];
        logStructured('warn', 'database_runtime_recovery_retry', {
          ...payload,
          nextRetryDelayMs: delayMs,
        });
        await this.delay(delayMs);
      }
    }
  }

  private async disconnectForRuntimeRecovery(
    triggeringErrorCode: string | undefined,
    source: DatabaseRecoverySource,
    attempt: number,
    maxAttempts: number,
  ): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error) {
      logStructured('warn', 'database_runtime_recovery_disconnect_failed', {
        source,
        triggeringErrorCode,
        attempt,
        maxAttempts,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorCode: getPrismaErrorCode(error),
      });
    }
  }

  protected delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  protected now(): number {
    return Date.now();
  }
}
