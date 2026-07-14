import assert from "node:assert/strict";
import test from "node:test";

import { HttpException, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";

import "../src/common/middleware/request-id.middleware";

import { DeadEngineExceptionFilter } from "../src/common/filters/dead-engine-exception.filter";
import { PrismaExceptionFilter } from "../src/common/filters/prisma-exception.filter";
import {
  getPrismaErrorSummary,
  isDeadPrismaEngineError,
  isRecoverableDatabaseError,
  isTransientDatabaseError,
  PrismaService,
} from "../src/infrastructure/database/prisma/prisma.service";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function deferred(): Deferred {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise?.() };
}

class TestPrismaService extends PrismaService {
  protected override readonly connectionRetryDelaysMs = [1, 2, 3];
  protected override readonly runtimeRecoveryCooldownMs = 100;
  protected override readonly heartbeatIntervalMs = 0;
  protected override readonly heartbeatConfirmationDelayMs = 1;
  protected override readonly engineRestartDelayMs = 1;

  readonly exitCodes: number[] = [];
  readonly recordedDelays: number[] = [];

  protected override delay(delayMs: number): Promise<void> {
    this.recordedDelays.push(delayMs);
    return Promise.resolve();
  }

  protected override exitProcess(exitCode: number): void {
    this.exitCodes.push(exitCode);
  }
}

function replacePrismaMethod(
  prisma: PrismaService,
  method: "$connect" | "$disconnect" | "$queryRaw",
  implementation: unknown,
): void {
  Object.defineProperty(prisma, method, {
    configurable: true,
    value: implementation,
    writable: true,
  });
}

function transientError(code = "P1001"): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Can't reach database server",
    { code, clientVersion: "6.19.3" },
  );
}

function deadEngineUnknownError(
  message = "Engine is not yet connected.",
): Prisma.PrismaClientUnknownRequestError {
  return new Prisma.PrismaClientUnknownRequestError(message, {
    clientVersion: "6.19.3",
  });
}

function deadEngineKnownError(
  message = "Engine is not yet connected.",
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code: "GenericFailure",
    clientVersion: "6.19.3",
  });
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
    requestId: "request-1",
    url: "/api/v1/cart",
  } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => host,
    switchToWs: () => host,
    getType: () => "http",
  } as unknown as ArgumentsHost;

  return { host, result };
}

test("dead-engine classifier is precise", () => {
  for (const error of [
    deadEngineUnknownError(),
    deadEngineKnownError(),
    new Error('{"is_panic":false,"message":"Engine is not yet connected."}'),
    new Error("Response from the Engine was empty"),
  ]) {
    assert.equal(isDeadPrismaEngineError(error), true);
    assert.equal(isRecoverableDatabaseError(error), true);
    assert.equal(isTransientDatabaseError(error), false);
  }

  const unrelated = deadEngineKnownError("Some other query failure");
  assert.equal(isDeadPrismaEngineError(unrelated), false);
  assert.equal(isRecoverableDatabaseError(unrelated), false);
});

test("safe Prisma summary preserves engine phrases and redacts credentials", () => {
  assert.equal(
    getPrismaErrorSummary(
      new Error('{"is_panic":false,"message":"Engine is not yet connected."}'),
    ),
    "Error: Engine is not yet connected.",
  );
  assert.equal(
    getPrismaErrorSummary(
      new Error(
        "could not connect to postgresql://user:secret@db.example.com:5432/store",
      ),
    ),
    "Error: could not connect to postgresql://***@db.example.com:5432/store",
  );
  assert.equal(
    getPrismaErrorSummary(new Error('query: "SELECT * FROM customers"')),
    "Error: query: [REDACTED]",
  );

  const summary = getPrismaErrorSummary(new Error("A".repeat(500)));
  assert.ok(summary.length <= 300);
  assert.ok(summary.endsWith("..."));
});

test("transient runtime recovery never disconnects or exits", async () => {
  const prisma = new TestPrismaService();
  let connectCalls = 0;
  let disconnectCalls = 0;

  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }));
  replacePrismaMethod(prisma, "$queryRaw", (async () => [{ result: 1 }]));
  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }));

  await prisma.requestRuntimeRecovery(transientError(), "exception_filter");

  assert.equal(connectCalls, 1);
  assert.equal(disconnectCalls, 0);
  assert.deepEqual(prisma.exitCodes, []);
});

test("shutdown is the only path that disconnects", async () => {
  const prisma = new TestPrismaService();
  let disconnectCalls = 0;

  replacePrismaMethod(prisma, "$disconnect", (async () => {
    disconnectCalls += 1;
  }));

  await prisma.onModuleDestroy();
  assert.equal(disconnectCalls, 1);
});

test("dead engine reconnect success continues without exit", async () => {
  const prisma = new TestPrismaService();
  let connectCalls = 0;
  let queryCalls = 0;

  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
  }));
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    return [{ result: 1 }];
  }));

  await prisma.requestRuntimeRecovery(
    deadEngineUnknownError(),
    "exception_filter",
  );

  assert.equal(connectCalls, 1);
  assert.equal(queryCalls, 1);
  assert.deepEqual(prisma.exitCodes, []);
});

test("failed dead-engine recovery schedules one exit", async () => {
  const prisma = new TestPrismaService();

  replacePrismaMethod(prisma, "$connect", (async () => {
    throw transientError();
  }));
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    throw transientError();
  }));

  await Promise.all([
    prisma.requestRuntimeRecovery(deadEngineUnknownError(), "heartbeat"),
    prisma.requestRuntimeRecovery(
      deadEngineUnknownError("Response from the Engine was empty"),
      "exception_filter",
    ),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(prisma.exitCodes, [1]);
  assert.equal(prisma.engineRestartPending(), true);
});

test("dead-engine failure arriving during transient recovery is followed safely", async () => {
  const prisma = new TestPrismaService();
  const transientConnectStarted = deferred();
  const releaseTransientConnect = deferred();
  let connectCalls = 0;
  let queryCalls = 0;

  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
    if (connectCalls === 1) {
      transientConnectStarted.resolve();
      await releaseTransientConnect.promise;
    }
  }));
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    queryCalls += 1;
    return [{ result: 1 }];
  }));

  const transientRecovery = prisma.requestRuntimeRecovery(
    transientError(),
    "exception_filter",
  );
  await transientConnectStarted.promise;

  const deadEngineFollowUp = prisma.requestRuntimeRecovery(
    new Error("Engine is not yet connected."),
    "heartbeat",
  );
  releaseTransientConnect.resolve();

  await Promise.all([transientRecovery, deadEngineFollowUp]);

  assert.equal(connectCalls, 2);
  assert.equal(queryCalls, 2);
  assert.deepEqual(prisma.exitCodes, []);
});

test("failed transient recovery plus pending dead engine schedules one exit", async () => {
  const prisma = new TestPrismaService();
  const firstConnectStarted = deferred();
  const releaseFirstConnect = deferred();
  let connectCalls = 0;

  replacePrismaMethod(prisma, "$connect", (async () => {
    connectCalls += 1;
    if (connectCalls === 1) {
      firstConnectStarted.resolve();
      await releaseFirstConnect.promise;
    }
    throw transientError();
  }));
  replacePrismaMethod(prisma, "$queryRaw", (async () => {
    throw transientError();
  }));

  const transientRecovery = prisma.requestRuntimeRecovery(
    transientError(),
    "exception_filter",
  );
  await firstConnectStarted.promise;
  const deadEngineFollowUp = prisma.requestRuntimeRecovery(
    new Error("Engine is not yet connected."),
    "heartbeat",
  );
  releaseFirstConnect.resolve();

  await Promise.all([transientRecovery, deadEngineFollowUp]);
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(connectCalls, 4);
  assert.deepEqual(prisma.exitCodes, [1]);
});

test("Prisma filter maps engine-state errors to 503", () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);
  const { host, result } = createHttpHost();

  filter.catch(deadEngineKnownError(), host);

  assert.equal(result.statusCode, 503);
  assert.equal(
    result.body?.message,
    "Database temporarily unavailable. Please retry shortly",
  );
  assert.equal(recoveryCalls, 1);
});

test("fallback filter handles plain dead-engine and unrelated errors safely", () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new DeadEngineExceptionFilter(prisma);

  const dead = createHttpHost();
  filter.catch(new Error("Engine is not yet connected."), dead.host);
  assert.equal(dead.result.statusCode, 503);
  assert.equal(recoveryCalls, 1);

  const unrelated = createHttpHost();
  filter.catch(new Error("Something else failed"), unrelated.host);
  assert.equal(unrelated.result.statusCode, 500);
  assert.equal(unrelated.result.body?.message, "Internal server error");
  assert.equal(recoveryCalls, 1);
});

test("fallback filter preserves HttpException and Prisma behavior", () => {
  const prisma = {
    requestRuntimeRecovery() {
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new DeadEngineExceptionFilter(prisma);

  const http = createHttpHost();
  filter.catch(new HttpException("Teapot", HttpStatus.I_AM_A_TEAPOT), http.host);
  assert.equal(http.result.statusCode, HttpStatus.I_AM_A_TEAPOT);

  const prismaConflict = createHttpHost();
  const conflict = new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
  filter.catch(conflict, prismaConflict.host);
  assert.equal(prismaConflict.result.statusCode, HttpStatus.CONFLICT);
});
