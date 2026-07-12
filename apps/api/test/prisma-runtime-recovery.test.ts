import assert from "node:assert/strict";
import test from "node:test";
import { ArgumentsHost } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { v2 as Cloudinary } from "cloudinary";
import { Request, Response } from "express";
import "../src/common/middleware/request-id.middleware";
import { PrismaExceptionFilter } from "../src/common/filters/prisma-exception.filter";
import { RedisService } from "../src/infrastructure/cache/redis.service";
import {
  PrismaService,
  isTransientDatabaseError,
  resolvePrismaDatasourceUrl,
} from "../src/infrastructure/database/prisma/prisma.service";
import { HealthService } from "../src/modules/health/health.service";

test("Heroku PostgreSQL datasource URLs require SSL when sslmode is absent", () => {
  for (const protocol of ["postgres", "postgresql"]) {
    const rawUrl = `${protocol}://fake_user:fake_password@db.example.test:5432/rs_store?schema=public`;
    const resolved = resolvePrismaDatasourceUrl(rawUrl, "web.1");
    assert.ok(resolved);
    const parsed = new URL(resolved);

    assert.equal(parsed.searchParams.get("sslmode"), "require");
    assert.equal(parsed.searchParams.get("schema"), "public");
    assert.equal(rawUrl.includes("sslmode"), false);
  }
});

test("existing Heroku PostgreSQL sslmode values are preserved", () => {
  const rawUrl =
    "postgresql://fake_user:fake_password@db.example.test:5432/rs_store?sslmode=verify-full";

  assert.equal(resolvePrismaDatasourceUrl(rawUrl, "worker.1"), rawUrl);
});

test("datasource URL is unchanged outside Heroku", () => {
  const rawUrl =
    "postgresql://fake_user:fake_password@localhost:5432/rs_store?schema=public";

  assert.equal(resolvePrismaDatasourceUrl(rawUrl, undefined), rawUrl);
});

test("undefined datasource URL remains undefined", () => {
  assert.equal(resolvePrismaDatasourceUrl(undefined, "web.1"), undefined);
});

test("non-PostgreSQL datasource URLs are not modified", () => {
  const rawUrl = "mysql://fake_user:fake_password@db.example.test:3306/rs_store";

  assert.equal(resolvePrismaDatasourceUrl(rawUrl, "web.1"), rawUrl);
});

test("datasource resolution does not mutate its input or process environment", () => {
  const rawUrl = "postgresql://fake_user:fake_password@db.example.test:5432/rs_store";
  const databaseUrlBefore = process.env.DATABASE_URL;
  const dynoBefore = process.env.DYNO;

  const resolved = resolvePrismaDatasourceUrl(rawUrl, "web.1");

  assert.equal(rawUrl, "postgresql://fake_user:fake_password@db.example.test:5432/rs_store");
  assert.notEqual(resolved, rawUrl);
  assert.equal(process.env.DATABASE_URL, databaseUrlBefore);
  assert.equal(process.env.DYNO, dynoBefore);
});

class TestPrismaService extends PrismaService {
  protected override readonly connectionRetryDelaysMs = [1, 2, 3];
  protected override readonly runtimeRecoveryCooldownMs = 100;
  protected override readonly heartbeatIntervalMs = 0;
  protected override readonly heartbeatConfirmationDelayMs = 1;
  protected override readonly engineRestartDelayMs = 1;

  currentTimeMs = 0;
  confirmationWait?: () => Promise<void>;
  readonly exitCodes: number[] = [];
  readonly recordedDelays: number[] = [];

  protected override delay(delayMs: number): Promise<void> {
    this.recordedDelays.push(delayMs);
    return Promise.resolve();
  }

  protected override now(): number {
    return this.currentTimeMs;
  }

  protected override exitProcess(exitCode: number): void {
    this.exitCodes.push(exitCode);
  }

  protected override waitForHeartbeatConfirmation(): Promise<void> {
    return this.confirmationWait?.() ?? super.waitForHeartbeatConfirmation();
  }

  runHeartbeatNow(): Promise<void> {
    return this.runHeartbeat();
  }
}

function replacePrismaMethod<Key extends keyof PrismaService>(
  prisma: PrismaService,
  key: Key,
  implementation: PrismaService[Key],
): void {
  Object.defineProperty(prisma, key, {
    configurable: true,
    value: implementation,
  });
}

function transientError(
  code: string,
  useInitializationCode = false,
  message = "request failed",
): Error {
  return useInitializationCode
    ? new Prisma.PrismaClientInitializationError(
        message,
        "6.19.3",
        code,
      )
    : new Prisma.PrismaClientKnownRequestError(message, {
        code,
        clientVersion: "6.19.3",
      });
}

function unknownRequestError(
  message: string,
): Prisma.PrismaClientUnknownRequestError {
  return new Prisma.PrismaClientUnknownRequestError(message, {
    clientVersion: "6.19.3",
  });
}

function rustPanicError(): Prisma.PrismaClientRustPanicError {
  return new Prisma.PrismaClientRustPanicError("query engine panic", "6.19.3");
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

function mockSuccessfulQuery(
  prisma: PrismaService,
  onQuery?: () => void,
): void {
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    onQuery?.();
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);
}

function createHttpHost(): {
  host: ArgumentsHost;
  result: { statusCode?: number; body?: Record<string, unknown> };
} {
  const result: { statusCode?: number; body?: Record<string, unknown> } = {};
  const response = {
    status(statusCode: number) {
      result.statusCode = statusCode;
      return this;
    },
    json(body: Record<string, unknown>) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  const request = {
    url: "/api/v1/cart",
    requestId: "request-1",
  } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return { host, result };
}

test("simultaneous transient failures join one runtime recovery operation", async () => {
  const prisma = new TestPrismaService();
  const disconnectStarted = deferred();
  const allowDisconnect = deferred();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
    disconnectStarted.resolve();
    await allowDisconnect.promise;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);
  mockSuccessfulQuery(prisma);

  const firstRecovery = prisma.requestRuntimeRecovery(
    transientError("P1001"),
    "exception_filter",
  );
  await disconnectStarted.promise;
  const joinedRecovery = prisma.requestRuntimeRecovery(
    transientError("P2024"),
    "health_check",
  );

  assert.equal(joinedRecovery, firstRecovery);
  assert.equal(disconnectCalls, 1);
  allowDisconnect.resolve();
  await firstRecovery;
  assert.equal(connectCalls, 1);
});

test("runtime recovery joins active startup connection retry without a competing loop", async () => {
  const prisma = new TestPrismaService();
  const startupConnectStarted = deferred();
  const allowStartupConnect = deferred();
  let connectCalls = 0;
  let disconnectCalls = 0;
  let queryCalls = 0;

  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
    startupConnectStarted.resolve();
    await allowStartupConnect.promise;
  }) as PrismaService["$connect"]);
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  mockSuccessfulQuery(prisma, () => {
    queryCalls += 1;
  });

  prisma.onModuleInit();
  await startupConnectStarted.promise;

  const joinedStartup = prisma.requestRuntimeRecovery(
    transientError("P1001"),
    "health_check",
  );

  assert.notEqual(joinedStartup, undefined);
  assert.equal(connectCalls, 1);
  assert.equal(disconnectCalls, 0);
  allowStartupConnect.resolve();
  await joinedStartup;
  assert.equal(connectCalls, 1);
  assert.equal(disconnectCalls, 0);
  assert.equal(queryCalls, 1);
});

test("transient Prisma filter responses return 503 without waiting or replaying", () => {
  const pendingRecovery = deferred();
  const recoveryCalls: Array<{ error: unknown; source: string }> = [];
  const prisma = {
    requestRuntimeRecovery(error: unknown, source: string) {
      recoveryCalls.push({ error, source });
      return pendingRecovery.promise;
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();
  const error = transientError(
    "P1001",
    true,
  ) as Prisma.PrismaClientInitializationError;

  filter.catch(error, host);

  assert.equal(result.statusCode, 503);
  assert.equal(
    result.body?.message,
    "Database temporarily unavailable. Please retry shortly",
  );
  assert.equal(recoveryCalls.length, 1);
  assert.equal(recoveryCalls[0]?.error, error);
  assert.equal(recoveryCalls[0]?.source, "exception_filter");
});

test("P2002, P2003 and P2025 filter responses do not schedule runtime recovery", () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);

  for (const [code, expectedStatus] of [
    ["P2002", 409],
    ["P2003", 409],
    ["P2025", 404],
  ] as const) {
    const { host, result } = createHttpHost();
    filter.catch(
      transientError(code) as Prisma.PrismaClientKnownRequestError,
      host,
    );
    assert.equal(result.statusCode, expectedStatus);
  }

  assert.equal(recoveryCalls, 0);
});

test("ordinary transaction lifecycle P2028 returns 503 without runtime recovery", () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();
  const error = transientError(
    "P2028",
    false,
    "Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms.",
  ) as Prisma.PrismaClientKnownRequestError;

  filter.catch(error, host);

  assert.equal(result.statusCode, 503);
  assert.equal(
    result.body?.message,
    "Database temporarily unavailable. Please retry shortly",
  );
  assert.equal(recoveryCalls, 0);
  assert.equal(isTransientDatabaseError(error), false);
  assert.equal(
    isTransientDatabaseError(
      transientError(
        "P2028",
        false,
        "Transaction API error: connection pool timeout while waiting for an interactive transaction",
      ),
    ),
    false,
  );
});

test("P2028 with an independent connection failure indication triggers recovery", () => {
  const recoveryCalls: unknown[] = [];
  const prisma = {
    requestRuntimeRecovery(error: unknown) {
      recoveryCalls.push(error);
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();
  const error = transientError(
    "P2028",
    false,
    "Transaction API error: Error in connector: connection reset by peer",
  ) as Prisma.PrismaClientKnownRequestError;

  filter.catch(error, host);

  assert.equal(result.statusCode, 503);
  assert.equal(isTransientDatabaseError(error), true);
  assert.deepEqual(recoveryCalls, [error]);
});

test("health PostgreSQL failures schedule recovery for every transient Prisma code", async () => {
  for (const code of ["P1001", "P1002", "P2024"]) {
    const recoverySources: string[] = [];
    const prisma = {
      $queryRaw: async () => {
        throw transientError(code, code === "P1001");
      },
      requestRuntimeRecovery(_error: unknown, source: string) {
        recoverySources.push(source);
        return Promise.resolve();
      },
    } as unknown as PrismaService;
    const redis = { ping: async () => "PONG" } as RedisService;
    const config = {
      get: (key: string) =>
        key === "CLOUDINARY_CLOUD_NAME" ? "rs-store" : "configured",
    } as ConfigService;
    const cloudinary = {
      config: () => ({ cloud_name: "rs-store" }),
    } as typeof Cloudinary;
    const health = new HealthService(prisma, redis, config, cloudinary);

    const result = await health.check();

    assert.equal(result.statusCode, 503);
    assert.deepEqual(recoverySources, ["health_check"]);
  }
});

test("successful recovery disconnects, reconnects, probes, logs success, and clears its lock", async () => {
  const prisma = new TestPrismaService();
  const operations: string[] = [];
  const loggedLines: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (line?: unknown) => loggedLines.push(String(line));
  console.warn = (line?: unknown) => loggedLines.push(String(line));
  try {
    replacePrismaMethod(prisma, "$disconnect", (async () => {
      operations.push("disconnect");
    }) as PrismaService["$disconnect"]);
    replacePrismaMethod(prisma, "$connect", (async () => {
      operations.push("connect");
    }) as PrismaService["$connect"]);
    mockSuccessfulQuery(prisma, () => operations.push("query"));

    await prisma.requestRuntimeRecovery(
      transientError("P1002"),
      "exception_filter",
    );
    await prisma.requestRuntimeRecovery(
      transientError("P1002"),
      "exception_filter",
    );
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  assert.deepEqual(operations, [
    "disconnect",
    "connect",
    "query",
    "disconnect",
    "connect",
    "query",
  ]);
  assert.equal(
    loggedLines.some(
      (line) =>
        JSON.parse(line).message === "database_runtime_recovery_success",
    ),
    true,
  );
});

test("failed recovery is bounded, backs off, cools down, and can restart later", async () => {
  const prisma = new TestPrismaService();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
    throw transientError("P1001");
  }) as PrismaService["$connect"]);
  mockSuccessfulQuery(prisma);

  await prisma.requestRuntimeRecovery(transientError("P1001"), "exception_filter");
  assert.equal(connectCalls, 3);
  assert.equal(disconnectCalls, 3);
  assert.deepEqual(prisma.recordedDelays, [1, 2]);

  const duringCooldown = prisma.requestRuntimeRecovery(
    transientError("P1001"),
    "exception_filter",
  );
  assert.equal(duringCooldown, undefined);
  assert.equal(connectCalls, 3);

  prisma.currentTimeMs = 100;
  await prisma.requestRuntimeRecovery(transientError("P1001"), "health_check");
  assert.equal(connectCalls, 6);
});

test("shutdown waits for active recovery and prevents new recovery work", async () => {
  const prisma = new TestPrismaService();
  const recoveryDisconnectStarted = deferred();
  const allowRecoveryDisconnect = deferred();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
    if (disconnectCalls === 1) {
      recoveryDisconnectStarted.resolve();
      await allowRecoveryDisconnect.promise;
    }
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);
  mockSuccessfulQuery(prisma);

  const recovery = prisma.requestRuntimeRecovery(
    transientError("P1001"),
    "exception_filter",
  );
  await recoveryDisconnectStarted.promise;
  const shutdown = prisma.onModuleDestroy();
  allowRecoveryDisconnect.resolve();
  await Promise.all([recovery, shutdown]);

  assert.equal(connectCalls, 0);
  assert.equal(disconnectCalls, 2);
  assert.equal(
    prisma.requestRuntimeRecovery(transientError("P1001"), "exception_filter"),
    undefined,
  );
});

test("unknown Prisma connection errors return 503 and trigger runtime recovery", () => {
  const recoveryCalls: Array<{ error: unknown; source: string }> = [];
  const prisma = {
    requestRuntimeRecovery(error: unknown, source: string) {
      recoveryCalls.push({ error, source });
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();
  const error = unknownRequestError(
    "Error in connector: server closed the connection unexpectedly",
  );

  filter.catch(error, host);

  assert.equal(result.statusCode, 503);
  assert.equal(
    result.body?.message,
    "Database temporarily unavailable. Please retry shortly",
  );
  assert.deepEqual(recoveryCalls, [{ error, source: "exception_filter" }]);
});

test("unknown non-connectivity Prisma errors are 500 instead of misleading 400 responses", () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();

  filter.catch(unknownRequestError("Unexpected query engine response"), host);

  assert.equal(result.statusCode, 500);
  assert.equal(result.body?.message, "Database request failed");
  assert.equal(recoveryCalls, 0);
});

test("Prisma engine panic returns 503 and schedules one controlled process restart", async () => {
  const prisma = new TestPrismaService();
  const filter = new PrismaExceptionFilter(prisma);
  const first = createHttpHost();
  const second = createHttpHost();

  filter.catch(rustPanicError(), first.host);
  filter.catch(rustPanicError(), second.host);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(first.result.statusCode, 503);
  assert.equal(second.result.statusCode, 503);
  assert.deepEqual(prisma.exitCodes, [1]);
});

test("successful heartbeat does not confirm or restart the Prisma pool", async () => {
  const prisma = new TestPrismaService();
  let queryCalls = 0;
  let disconnectCalls = 0;
  let connectCalls = 0;
  prisma.confirmationWait = async () => assert.fail("confirmation must not run");
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);

  await prisma.runHeartbeatNow();

  assert.equal(queryCalls, 1);
  assert.equal(disconnectCalls, 0);
  assert.equal(connectCalls, 0);
});

test("heartbeat confirmation success avoids disconnecting the Prisma pool", async () => {
  const prisma = new TestPrismaService();
  const loggedLines: string[] = [];
  const originalLog = console.log;
  let queryCalls = 0;
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    if (queryCalls === 1) {
      throw unknownRequestError("Connection reset by peer");
    }
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);

  console.log = (line?: unknown) => loggedLines.push(String(line));
  try {
    await prisma.runHeartbeatNow();
  } finally {
    console.log = originalLog;
  }

  assert.equal(queryCalls, 2);
  assert.equal(disconnectCalls, 0);
  assert.equal(connectCalls, 0);
  assert.deepEqual(prisma.recordedDelays, [1]);
  assert.equal(
    loggedLines.some(
      (line) =>
        JSON.parse(line).message === "database_heartbeat_recovered_without_restart",
    ),
    true,
  );
});

test("non-connectivity heartbeat confirmation failure does not restart the Prisma pool", async () => {
  const prisma = new TestPrismaService();
  let queryCalls = 0;
  let disconnectCalls = 0;
  let connectCalls = 0;
  let recoveryCalls = 0;

  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    if (queryCalls === 1) {
      throw transientError("P1001");
    }
    throw new Error("query validation failed");
  }) as unknown as PrismaService["$queryRaw"]);
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);
  replacePrismaMethod(prisma, "requestRuntimeRecovery", (() => {
    recoveryCalls += 1;
    return undefined;
  }) as PrismaService["requestRuntimeRecovery"]);

  await prisma.runHeartbeatNow();

  assert.equal(queryCalls, 2);
  assert.equal(disconnectCalls, 0);
  assert.equal(connectCalls, 0);
  assert.equal(recoveryCalls, 0);
});

test("two confirmed heartbeat connection failures start one bounded recovery", async () => {
  const prisma = new TestPrismaService();
  const operations: string[] = [];
  let queryCalls = 0;
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    operations.push("disconnect");
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    operations.push("connect");
  }) as PrismaService["$connect"]);
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    if (queryCalls <= 2) {
      throw transientError("P1001");
    }
    operations.push("query");
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);

  await prisma.runHeartbeatNow();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(queryCalls, 3);
  assert.deepEqual(operations, ["disconnect", "connect", "query"]);
});

test("heartbeat confirmation avoids duplicate recovery when another recovery starts", async () => {
  const prisma = new TestPrismaService();
  const confirmationStarted = deferred();
  const allowConfirmation = deferred();
  const recoveryDisconnectStarted = deferred();
  const allowRecoveryDisconnect = deferred();
  let queryCalls = 0;
  let disconnectCalls = 0;
  let connectCalls = 0;
  prisma.confirmationWait = async () => {
    confirmationStarted.resolve();
    await allowConfirmation.promise;
  };
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    if (queryCalls === 1) throw transientError("P1001");
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
    recoveryDisconnectStarted.resolve();
    await allowRecoveryDisconnect.promise;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);

  const heartbeat = prisma.runHeartbeatNow();
  await confirmationStarted.promise;
  const recovery = prisma.requestRuntimeRecovery(
    transientError("P1001"),
    "exception_filter",
  );
  await recoveryDisconnectStarted.promise;
  allowConfirmation.resolve();
  await heartbeat;

  assert.equal(queryCalls, 1);
  assert.equal(disconnectCalls, 1);
  allowRecoveryDisconnect.resolve();
  await recovery;
  assert.equal(connectCalls, 1);
  assert.equal(queryCalls, 2);
});

test("shutdown during heartbeat confirmation prevents new recovery", async () => {
  const prisma = new TestPrismaService();
  const confirmationStarted = deferred();
  const allowConfirmation = deferred();
  let queryCalls = 0;
  let disconnectCalls = 0;
  let connectCalls = 0;
  prisma.confirmationWait = async () => {
    confirmationStarted.resolve();
    await allowConfirmation.promise;
  };
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    throw transientError("P1001");
  }) as unknown as PrismaService["$queryRaw"]);
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }) as PrismaService["$disconnect"]);
  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }) as PrismaService["$connect"]);

  const heartbeat = prisma.runHeartbeatNow();
  await confirmationStarted.promise;
  const shutdown = prisma.onModuleDestroy();
  allowConfirmation.resolve();
  await Promise.all([heartbeat, shutdown]);

  assert.equal(queryCalls, 1);
  assert.equal(disconnectCalls, 1);
  assert.equal(connectCalls, 0);
});

test("heartbeat executions cannot overlap", async () => {
  const prisma = new TestPrismaService();
  const queryStarted = deferred();
  const allowQuery = deferred();
  let queryCalls = 0;
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    queryStarted.resolve();
    await allowQuery.promise;
    return [{ result: 1 }];
  }) as unknown as PrismaService["$queryRaw"]);

  const first = prisma.runHeartbeatNow();
  await queryStarted.promise;
  await prisma.runHeartbeatNow();
  allowQuery.resolve();
  await first;

  assert.equal(queryCalls, 1);
});

test("additional operational Prisma codes are treated as transient database failures", () => {
  const prisma = {
    requestRuntimeRecovery() {
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);

  for (const code of ["P1008", "P1011", "P2037"]) {
    const { host, result } = createHttpHost();
    filter.catch(
      transientError(code) as Prisma.PrismaClientKnownRequestError,
      host,
    );
    assert.equal(result.statusCode, 503);
  }
});
