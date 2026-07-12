import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { logStructured } from "../../../common/logging/structured-logger";

export function resolvePrismaDatasourceUrl(
  rawDatabaseUrl: string | undefined = process.env.DATABASE_URL,
  herokuDyno: string | undefined = process.env.DYNO,
): string | undefined {
  if (rawDatabaseUrl === undefined || !herokuDyno) {
    return rawDatabaseUrl;
  }

  const url = new URL(rawDatabaseUrl);
  const isPostgres =
    url.protocol === "postgres:" || url.protocol === "postgresql:";

  if (!isPostgres || url.searchParams.has("sslmode")) {
    return rawDatabaseUrl;
  }

  url.searchParams.set("sslmode", "require");
  return url.toString();
}

export type DatabaseRecoverySource =
  | "startup"
  | "exception_filter"
  | "health_check"
  | "heartbeat";
type ConnectionLifecycleOperation = "startup" | "runtime_recovery";

const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1011",
  "P2024",
  "P2028",
  "P2037",
]);

const TRANSIENT_DATABASE_MESSAGE_FRAGMENTS = [
  "can't reach database server",
  "database server was reached but timed out",
  "timed out fetching a new connection from the connection pool",
  "connection pool timeout",
  "error in connector",
  "connection refused",
  "connection reset",
  "connection closed",
  "server closed the connection unexpectedly",
  "connection terminated unexpectedly",
  "terminating connection",
  "broken pipe",
  "socket hang up",
  "error opening a tls connection",
  "database system is starting up",
  "database system is shutting down",
  "database system is in recovery mode",
  "remaining connection slots are reserved",
  "too many clients already",
  "too many database connections opened",
] as const;

export function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  for (const property of ["code", "errorCode"] as const) {
    if (property in error) {
      const value = (error as Record<typeof property, unknown>)[property];
      if (typeof value === "string") {
        return value;
      }
    }
  }

  return undefined;
}

export function getPrismaErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }

  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name) {
      return name;
    }
  }

  return "UnknownError";
}

function getPrismaErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
}

export function isPrismaEnginePanic(error: unknown): boolean {
  return getPrismaErrorName(error) === "PrismaClientRustPanicError";
}

export function isTransientDatabaseError(error: unknown): boolean {
  if (isTransientDatabaseErrorCode(getPrismaErrorCode(error))) {
    return true;
  }

  const message = getPrismaErrorMessage(error).toLowerCase();
  return TRANSIENT_DATABASE_MESSAGE_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
}

export function isRecoverableDatabaseError(error: unknown): boolean {
  return isTransientDatabaseError(error) || isPrismaEnginePanic(error);
}

export function isTransientDatabaseErrorCode(
  code: string | undefined,
): boolean {
  return code !== undefined && TRANSIENT_DATABASE_ERROR_CODES.has(code);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const datasourceUrl = resolvePrismaDatasourceUrl();
    super(
      datasourceUrl === undefined ? undefined : { datasourceUrl },
    );
  }

  protected readonly connectionRetryDelaysMs: readonly number[] = [
    2_000, 4_000, 6_000, 8_000, 10_000, 12_000,
  ];
  protected readonly runtimeRecoveryCooldownMs: number = 30_000;
  protected readonly heartbeatIntervalMs: number = 60_000;
  protected readonly engineRestartDelayMs: number = 1_000;

  private connectionLifecyclePromise: Promise<void> | null = null;
  private connectionLifecycleOperation: ConnectionLifecycleOperation | null =
    null;
  private nextRuntimeRecoveryAllowedAtMs = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private engineRestartTimer: NodeJS.Timeout | null = null;
  private heartbeatInFlight = false;
  private shuttingDown = false;

  onModuleInit(): void {
    this.startHeartbeat();

    const startupConnection = this.startConnectionLifecycleOperation(
      "startup",
      () => this.connectWithRetry(),
    );
    void startupConnection.catch((error) => {
      logStructured("error", "database_connect_background_failed", {
        errorName: getPrismaErrorName(error),
        errorCode: getPrismaErrorCode(error),
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    this.stopHeartbeat();
    this.cancelScheduledEngineRestart();

    try {
      await this.connectionLifecyclePromise;
    } catch {
      // Startup failures are already logged by onModuleInit; shutdown must still disconnect cleanly.
    }
    await this.$disconnect();
  }

  requestRuntimeRecovery(
    error: unknown,
    source: DatabaseRecoverySource,
  ): Promise<void> | undefined {
    if (this.shuttingDown) {
      return undefined;
    }

    if (isPrismaEnginePanic(error)) {
      this.scheduleEngineRestart(error, source);
      return Promise.resolve();
    }

    if (!isTransientDatabaseError(error)) {
      return undefined;
    }

    const errorCode = getPrismaErrorCode(error);
    if (this.connectionLifecyclePromise) {
      logStructured("info", "database_runtime_recovery_joined", {
        source,
        errorCode,
        activeOperation: this.connectionLifecycleOperation,
      });
      return this.connectionLifecyclePromise;
    }

    const now = this.now();
    if (now < this.nextRuntimeRecoveryAllowedAtMs) {
      logStructured("warn", "database_runtime_recovery_cooldown", {
        source,
        errorCode,
        retryAfterMs: this.nextRuntimeRecoveryAllowedAtMs - now,
      });
      return undefined;
    }

    logStructured("warn", "database_runtime_recovery_started", {
      source,
      errorCode,
      errorName: getPrismaErrorName(error),
      maxAttempts: this.connectionRetryDelaysMs.length,
    });

    return this.startConnectionLifecycleOperation("runtime_recovery", () =>
      this.recoverRuntimeConnection(errorCode, source),
    );
  }

  protected async runHeartbeat(): Promise<void> {
    if (
      this.shuttingDown ||
      this.heartbeatInFlight ||
      this.connectionLifecyclePromise !== null
    ) {
      return;
    }

    this.heartbeatInFlight = true;
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      logStructured("warn", "database_heartbeat_failed", {
        errorName: getPrismaErrorName(error),
        errorCode: getPrismaErrorCode(error),
      });

      const recovery = this.requestRuntimeRecovery(error, "heartbeat");
      void recovery?.catch((recoveryError) => {
        logStructured("error", "database_heartbeat_recovery_failed", {
          errorName: getPrismaErrorName(recoveryError),
          errorCode: getPrismaErrorCode(recoveryError),
        });
      });
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer || this.heartbeatIntervalMs <= 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.runHeartbeat();
    }, this.heartbeatIntervalMs);
    this.heartbeatTimer.unref();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatTimer) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleEngineRestart(
    error: unknown,
    source: DatabaseRecoverySource,
  ): void {
    if (this.engineRestartTimer || this.shuttingDown) {
      logStructured("warn", "database_engine_restart_already_scheduled", {
        source,
        errorName: getPrismaErrorName(error),
      });
      return;
    }

    logStructured("error", "database_engine_restart_scheduled", {
      source,
      errorName: getPrismaErrorName(error),
      delayMs: this.engineRestartDelayMs,
    });

    this.engineRestartTimer = setTimeout(() => {
      this.exitProcess(1);
    }, this.engineRestartDelayMs);
    this.engineRestartTimer.unref();
  }

  private cancelScheduledEngineRestart(): void {
    if (!this.engineRestartTimer) {
      return;
    }

    clearTimeout(this.engineRestartTimer);
    this.engineRestartTimer = null;
  }

  protected exitProcess(exitCode: number): void {
    process.exit(exitCode);
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
    for (
      let attempt = 1;
      attempt <= this.connectionRetryDelaysMs.length;
      attempt += 1
    ) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;

        logStructured("info", "database_connect_success", {
          attempt,
          maxAttempts: this.connectionRetryDelaysMs.length,
        });
        return;
      } catch (error) {
        const isFinalAttempt = attempt === this.connectionRetryDelaysMs.length;
        const payload = {
          attempt,
          maxAttempts: this.connectionRetryDelaysMs.length,
          errorName: getPrismaErrorName(error),
          errorCode: getPrismaErrorCode(error),
        };

        if (isPrismaEnginePanic(error)) {
          this.scheduleEngineRestart(error, "startup");
          return;
        }

        if (isFinalAttempt) {
          logStructured("error", "database_connect_failed", payload);
          throw error;
        }

        const delayMs = this.connectionRetryDelaysMs[attempt - 1];
        logStructured("warn", "database_connect_retry", {
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

    for (
      let attempt = 1;
      attempt <= maxAttempts && !this.shuttingDown;
      attempt += 1
    ) {
      try {
        await this.disconnectForRuntimeRecovery(
          triggeringErrorCode,
          source,
          attempt,
          maxAttempts,
        );
        if (this.shuttingDown) return;

        await this.$connect();
        if (this.shuttingDown) return;

        await this.$queryRaw`SELECT 1`;
        this.nextRuntimeRecoveryAllowedAtMs = 0;
        logStructured("info", "database_runtime_recovery_success", {
          source,
          triggeringErrorCode,
          attempt,
          maxAttempts,
        });
        return;
      } catch (error) {
        if (isPrismaEnginePanic(error)) {
          this.scheduleEngineRestart(error, source);
          return;
        }

        const payload = {
          source,
          triggeringErrorCode,
          attempt,
          maxAttempts,
          errorName: getPrismaErrorName(error),
          errorCode: getPrismaErrorCode(error),
        };

        if (attempt === maxAttempts) {
          this.nextRuntimeRecoveryAllowedAtMs =
            this.now() + this.runtimeRecoveryCooldownMs;
          logStructured("error", "database_runtime_recovery_failed", payload);
          logStructured("warn", "database_runtime_recovery_cooldown", {
            source,
            triggeringErrorCode,
            retryAfterMs: this.runtimeRecoveryCooldownMs,
          });
          return;
        }

        const delayMs = this.connectionRetryDelaysMs[attempt - 1];
        logStructured("warn", "database_runtime_recovery_retry", {
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
      logStructured("warn", "database_runtime_recovery_disconnect_failed", {
        source,
        triggeringErrorCode,
        attempt,
        maxAttempts,
        errorName: getPrismaErrorName(error),
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
