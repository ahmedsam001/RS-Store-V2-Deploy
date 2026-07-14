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

type ConnectionLifecycleOperation =
  | "startup"
  | "runtime_recovery"
  | "dead_engine_recovery";

type PendingDeadEngineRecovery = {
  error: unknown;
  source: DatabaseRecoverySource;
};

const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
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

const DEAD_ENGINE_MESSAGE_FRAGMENTS = [
  "engine is not yet connected",
  "response from the engine was empty",
] as const;

const P2028_CONNECTION_FAILURE_MESSAGE_FRAGMENTS = [
  "can't reach database server",
  "database server was reached but timed out",
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
] as const;

const MAX_ERROR_SUMMARY_LENGTH = 300;
const POSTGRES_URL_CREDENTIALS_PATTERN =
  /\b(postgres(?:ql)?:\/\/)([^@\s/]+)@/gi;
const LABELED_QUERY_PATTERN =
  /\b(query|sql)\s*[:=]\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\r\n]*)/gi;

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

function extractNestedErrorMessage(message: string): string {
  const trimmed = message.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown };
    return typeof parsed.message === "string" ? parsed.message : trimmed;
  } catch {
    return trimmed;
  }
}

function sanitizePrismaErrorMessage(message: string): string {
  return extractNestedErrorMessage(message)
    .replace(POSTGRES_URL_CREDENTIALS_PATTERN, "$1***@")
    .replace(LABELED_QUERY_PATTERN, "$1: [REDACTED]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getPrismaErrorSummary(error: unknown): string {
  const name = getPrismaErrorName(error);
  const message = sanitizePrismaErrorMessage(getPrismaErrorMessage(error));
  const summary = message ? `${name}: ${message}` : name;

  if (summary.length <= MAX_ERROR_SUMMARY_LENGTH) {
    return summary;
  }

  return `${summary.slice(0, MAX_ERROR_SUMMARY_LENGTH - 3)}...`;
}

export function isPrismaEnginePanic(error: unknown): boolean {
  return getPrismaErrorName(error) === "PrismaClientRustPanicError";
}

export function isDeadPrismaEngineError(error: unknown): boolean {
  if (isPrismaEnginePanic(error)) {
    return true;
  }

  const message = getPrismaErrorMessage(error).toLowerCase();
  return DEAD_ENGINE_MESSAGE_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = getPrismaErrorCode(error);
  const message = getPrismaErrorMessage(error).toLowerCase();

  if (code === "P2028") {
    return P2028_CONNECTION_FAILURE_MESSAGE_FRAGMENTS.some((fragment) =>
      message.includes(fragment),
    );
  }

  if (isTransientDatabaseErrorCode(code)) {
    return true;
  }

  return TRANSIENT_DATABASE_MESSAGE_FRAGMENTS.some((fragment) =>
    message.includes(fragment),
  );
}

export function isRecoverableDatabaseError(error: unknown): boolean {
  return isTransientDatabaseError(error) || isDeadPrismaEngineError(error);
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
    super(datasourceUrl === undefined ? undefined : { datasourceUrl });
  }

  protected readonly connectionRetryDelaysMs: readonly number[] = [
    2_000,
    4_000,
    6_000,
    8_000,
    10_000,
    12_000,
  ];
  protected readonly runtimeRecoveryCooldownMs: number = 30_000;
  protected readonly heartbeatIntervalMs: number = 60_000;
  protected readonly heartbeatConfirmationDelayMs: number = 1_000;
  protected readonly engineRestartDelayMs: number = 1_000;

  private connectionLifecyclePromise: Promise<void> | null = null;
  private connectionLifecycleOperation: ConnectionLifecycleOperation | null =
    null;
  private deadEngineFollowUpPromise: Promise<void> | null = null;
  private pendingDeadEngineRecovery: PendingDeadEngineRecovery | null = null;
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
        errorSummary: getPrismaErrorSummary(error),
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    this.stopHeartbeat();
    this.cancelScheduledEngineRestart();

    await Promise.allSettled([
      this.connectionLifecyclePromise ?? Promise.resolve(),
      this.deadEngineFollowUpPromise ?? Promise.resolve(),
    ]);

    await this.$disconnect();
  }

  engineRestartPending(): boolean {
    return this.engineRestartTimer !== null;
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

    if (isDeadPrismaEngineError(error)) {
      if (
        this.connectionLifecyclePromise &&
        this.connectionLifecycleOperation === "dead_engine_recovery"
      ) {
        return this.connectionLifecyclePromise;
      }

      if (this.connectionLifecyclePromise || this.deadEngineFollowUpPromise) {
        return this.queueDeadEngineRecoveryAfterActive(error, source);
      }

      return this.startConnectionLifecycleOperation(
        "dead_engine_recovery",
        () => this.handleDeadEngine(error, source),
      );
    }

    if (!isTransientDatabaseError(error)) {
      return undefined;
    }

    const errorCode = getPrismaErrorCode(error);

    if (this.deadEngineFollowUpPromise) {
      logStructured("info", "database_runtime_recovery_joined", {
        source,
        errorCode,
        activeOperation: "dead_engine_recovery",
      });
      return this.deadEngineFollowUpPromise;
    }

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
      errorSummary: getPrismaErrorSummary(error),
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
      this.connectionLifecyclePromise !== null ||
      this.deadEngineFollowUpPromise !== null
    ) {
      return;
    }

    this.heartbeatInFlight = true;

    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      logStructured("warn", "database_heartbeat_failed", {
        errorSummary: getPrismaErrorSummary(error),
      });

      if (isDeadPrismaEngineError(error)) {
        this.startHeartbeatRecovery(error);
        return;
      }

      if (!isTransientDatabaseError(error)) {
        return;
      }

      await this.waitForHeartbeatConfirmation();

      if (
        this.shuttingDown ||
        this.connectionLifecyclePromise !== null ||
        this.deadEngineFollowUpPromise !== null
      ) {
        return;
      }

      try {
        await this.$queryRaw`SELECT 1`;
        logStructured("info", "database_heartbeat_recovered_without_restart", {
          initialErrorSummary: getPrismaErrorSummary(error),
          confirmationDelayMs: this.heartbeatConfirmationDelayMs,
        });
      } catch (confirmationError) {
        logStructured("warn", "database_heartbeat_confirmation_failed", {
          initialErrorSummary: getPrismaErrorSummary(error),
          errorSummary: getPrismaErrorSummary(confirmationError),
          confirmationDelayMs: this.heartbeatConfirmationDelayMs,
        });

        if (
          this.shuttingDown ||
          this.connectionLifecyclePromise !== null ||
          this.deadEngineFollowUpPromise !== null
        ) {
          return;
        }

        if (!isRecoverableDatabaseError(confirmationError)) {
          return;
        }

        this.startHeartbeatRecovery(confirmationError);
      }
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  private startHeartbeatRecovery(error: unknown): void {
    const recovery = this.requestRuntimeRecovery(error, "heartbeat");
    void recovery?.catch((recoveryError) => {
      logStructured("error", "database_heartbeat_recovery_failed", {
        errorSummary: getPrismaErrorSummary(recoveryError),
      });
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer || this.heartbeatIntervalMs <= 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.runHeartbeat().catch((error) => {
        logStructured("error", "database_heartbeat_task_failed", {
          errorSummary: getPrismaErrorSummary(error),
        });
      });
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
        errorSummary: getPrismaErrorSummary(error),
      });
      return;
    }

    logStructured("error", "database_engine_restart_scheduled", {
      source,
      errorSummary: getPrismaErrorSummary(error),
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

  private queueDeadEngineRecoveryAfterActive(
    error: unknown,
    source: DatabaseRecoverySource,
  ): Promise<void> {
    if (!this.pendingDeadEngineRecovery) {
      this.pendingDeadEngineRecovery = { error, source };
    }

    if (this.deadEngineFollowUpPromise) {
      return this.deadEngineFollowUpPromise;
    }

    const activeOperation =
      this.connectionLifecyclePromise ?? Promise.resolve();

    const followUpPromise: Promise<void> = activeOperation
      .catch(() => undefined)
      .then(async () => {
        if (this.shuttingDown || this.engineRestartTimer) {
          this.pendingDeadEngineRecovery = null;
          return;
        }

        const pending = this.pendingDeadEngineRecovery;
        this.pendingDeadEngineRecovery = null;

        if (!pending) {
          return;
        }

        await this.startConnectionLifecycleOperation(
          "dead_engine_recovery",
          () => this.handleDeadEngine(pending.error, pending.source),
        );
      })
      .finally(() => {
        if (this.deadEngineFollowUpPromise === followUpPromise) {
          this.deadEngineFollowUpPromise = null;
        }
      });

    this.deadEngineFollowUpPromise = followUpPromise;
    return followUpPromise;
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
          errorSummary: getPrismaErrorSummary(error),
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

        if (isDeadPrismaEngineError(error)) {
          this.pendingDeadEngineRecovery = null;
          await this.handleDeadEngine(error, source);
          return;
        }

        const payload = {
          source,
          triggeringErrorCode,
          attempt,
          maxAttempts,
          errorSummary: getPrismaErrorSummary(error),
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

  private async handleDeadEngine(
    error: unknown,
    source: DatabaseRecoverySource,
  ): Promise<void> {
    if (this.engineRestartTimer || this.shuttingDown) {
      return;
    }

    logStructured("warn", "database_dead_engine_recovery_started", {
      source,
      errorSummary: getPrismaErrorSummary(error),
    });

    try {
      await this.$connect();
      if (this.shuttingDown) return;

      await this.$queryRaw`SELECT 1`;
      this.nextRuntimeRecoveryAllowedAtMs = 0;

      logStructured("info", "database_dead_engine_recovery_success", {
        source,
        errorSummary: getPrismaErrorSummary(error),
      });
    } catch (reconnectError) {
      logStructured("error", "database_dead_engine_recovery_failed", {
        source,
        errorSummary: getPrismaErrorSummary(reconnectError),
      });
      this.scheduleEngineRestart(error, source);
    }
  }

  protected delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  protected waitForHeartbeatConfirmation(): Promise<void> {
    return this.delay(this.heartbeatConfirmationDelayMs);
  }

  protected now(): number {
    return Date.now();
  }
}
