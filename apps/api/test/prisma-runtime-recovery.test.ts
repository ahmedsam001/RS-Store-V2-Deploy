import assert from 'node:assert/strict';
import test from 'node:test';
import { ArgumentsHost } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { v2 as Cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import '../src/common/middleware/request-id.middleware';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { RedisService } from '../src/infrastructure/cache/redis.service';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { HealthService } from '../src/modules/health/health.service';

class TestPrismaService extends PrismaService {
  protected override readonly connectionRetryDelaysMs = [1, 2, 3];
  protected override readonly runtimeRecoveryCooldownMs = 100;

  currentTimeMs = 0;
  readonly recordedDelays: number[] = [];

  protected override delay(delayMs: number): Promise<void> {
    this.recordedDelays.push(delayMs);
    return Promise.resolve();
  }

  protected override now(): number {
    return this.currentTimeMs;
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

function transientError(code: string, useInitializationCode = false): Error {
  return useInitializationCode
    ? new Prisma.PrismaClientInitializationError('connection failed', '6.19.3', code)
    : new Prisma.PrismaClientKnownRequestError('request failed', {
        code,
        clientVersion: '6.19.3',
      });
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

function mockSuccessfulQuery(prisma: PrismaService, onQuery?: () => void): void {
  replacePrismaMethod(
    prisma,
    '$queryRaw',
    (async () => {
      onQuery?.();
      return [{ result: 1 }];
    }) as unknown as PrismaService['$queryRaw'],
  );
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
  const request = { url: '/api/v1/cart', requestId: 'request-1' } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return { host, result };
}

test('simultaneous transient failures join one runtime recovery operation', async () => {
  const prisma = new TestPrismaService();
  const disconnectStarted = deferred();
  const allowDisconnect = deferred();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(
    prisma,
    '$disconnect',
    (async () => {
      disconnectCalls += 1;
      disconnectStarted.resolve();
      await allowDisconnect.promise;
    }) as PrismaService['$disconnect'],
  );
  replacePrismaMethod(
    prisma,
    '$connect',
    (async () => {
      connectCalls += 1;
    }) as PrismaService['$connect'],
  );
  mockSuccessfulQuery(prisma);

  const firstRecovery = prisma.requestRuntimeRecovery(transientError('P1001'), 'exception_filter');
  await disconnectStarted.promise;
  const joinedRecovery = prisma.requestRuntimeRecovery(transientError('P2024'), 'health_check');

  assert.equal(joinedRecovery, firstRecovery);
  assert.equal(disconnectCalls, 1);
  allowDisconnect.resolve();
  await firstRecovery;
  assert.equal(connectCalls, 1);
});

test('runtime recovery joins active startup connection retry without a competing loop', async () => {
  const prisma = new TestPrismaService();
  const startupConnectStarted = deferred();
  const allowStartupConnect = deferred();
  let connectCalls = 0;
  let disconnectCalls = 0;
  let queryCalls = 0;

  replacePrismaMethod(
    prisma,
    '$connect',
    (async () => {
      connectCalls += 1;
      startupConnectStarted.resolve();
      await allowStartupConnect.promise;
    }) as PrismaService['$connect'],
  );
  replacePrismaMethod(
    prisma,
    '$disconnect',
    (async () => {
      disconnectCalls += 1;
    }) as PrismaService['$disconnect'],
  );
  mockSuccessfulQuery(prisma, () => {
    queryCalls += 1;
  });

  prisma.onModuleInit();
  await startupConnectStarted.promise;

  const joinedStartup = prisma.requestRuntimeRecovery(transientError('P1001'), 'health_check');

  assert.notEqual(joinedStartup, undefined);
  assert.equal(connectCalls, 1);
  assert.equal(disconnectCalls, 0);
  allowStartupConnect.resolve();
  await joinedStartup;
  assert.equal(connectCalls, 1);
  assert.equal(disconnectCalls, 0);
  assert.equal(queryCalls, 1);
});

test('transient Prisma filter responses return 503 without waiting or replaying', () => {
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
  const error = transientError('P1001', true) as Prisma.PrismaClientInitializationError;

  filter.catch(error, host);

  assert.equal(result.statusCode, 503);
  assert.equal(result.body?.message, 'Database temporarily unavailable. Please retry shortly');
  assert.equal(recoveryCalls.length, 1);
  assert.equal(recoveryCalls[0]?.error, error);
  assert.equal(recoveryCalls[0]?.source, 'exception_filter');
});

test('P2002 and P2025 filter responses do not schedule runtime recovery', () => {
  let recoveryCalls = 0;
  const prisma = {
    requestRuntimeRecovery() {
      recoveryCalls += 1;
      return Promise.resolve();
    },
  } as unknown as PrismaService;
  const filter = new PrismaExceptionFilter(prisma);

  for (const [code, expectedStatus] of [
    ['P2002', 409],
    ['P2025', 404],
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

test('health PostgreSQL failures schedule recovery for every transient Prisma code', async () => {
  for (const code of ['P1001', 'P1002', 'P2024', 'P2028']) {
    const recoverySources: string[] = [];
    const prisma = {
      $queryRaw: async () => {
        throw transientError(code, code === 'P1001');
      },
      requestRuntimeRecovery(_error: unknown, source: string) {
        recoverySources.push(source);
        return Promise.resolve();
      },
    } as unknown as PrismaService;
    const redis = { ping: async () => 'PONG' } as RedisService;
    const config = {
      get: (key: string) => (key === 'CLOUDINARY_CLOUD_NAME' ? 'rs-store' : 'configured'),
    } as ConfigService;
    const cloudinary = { config: () => ({ cloud_name: 'rs-store' }) } as typeof Cloudinary;
    const health = new HealthService(prisma, redis, config, cloudinary);

    const result = await health.check();

    assert.equal(result.statusCode, 503);
    assert.deepEqual(recoverySources, ['health_check']);
  }
});

test('successful recovery disconnects, reconnects, probes, logs success, and clears its lock', async () => {
  const prisma = new TestPrismaService();
  const operations: string[] = [];
  const loggedLines: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (line?: unknown) => loggedLines.push(String(line));
  console.warn = (line?: unknown) => loggedLines.push(String(line));
  try {
    replacePrismaMethod(
      prisma,
      '$disconnect',
      (async () => {
        operations.push('disconnect');
      }) as PrismaService['$disconnect'],
    );
    replacePrismaMethod(
      prisma,
      '$connect',
      (async () => {
        operations.push('connect');
      }) as PrismaService['$connect'],
    );
    mockSuccessfulQuery(prisma, () => operations.push('query'));

    await prisma.requestRuntimeRecovery(transientError('P1002'), 'exception_filter');
    await prisma.requestRuntimeRecovery(transientError('P1002'), 'exception_filter');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  assert.deepEqual(operations, [
    'disconnect',
    'connect',
    'query',
    'disconnect',
    'connect',
    'query',
  ]);
  assert.equal(
    loggedLines.some((line) => JSON.parse(line).message === 'database_runtime_recovery_success'),
    true,
  );
});

test('failed recovery is bounded, backs off, cools down, and can restart later', async () => {
  const prisma = new TestPrismaService();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(
    prisma,
    '$disconnect',
    (async () => {
      disconnectCalls += 1;
    }) as PrismaService['$disconnect'],
  );
  replacePrismaMethod(
    prisma,
    '$connect',
    (async () => {
      connectCalls += 1;
      throw transientError('P1001');
    }) as PrismaService['$connect'],
  );
  mockSuccessfulQuery(prisma);

  await prisma.requestRuntimeRecovery(transientError('P2028'), 'exception_filter');
  assert.equal(connectCalls, 3);
  assert.equal(disconnectCalls, 3);
  assert.deepEqual(prisma.recordedDelays, [1, 2]);

  const duringCooldown = prisma.requestRuntimeRecovery(transientError('P2028'), 'exception_filter');
  assert.equal(duringCooldown, undefined);
  assert.equal(connectCalls, 3);

  prisma.currentTimeMs = 100;
  await prisma.requestRuntimeRecovery(transientError('P2028'), 'health_check');
  assert.equal(connectCalls, 6);
});

test('shutdown waits for active recovery and prevents new recovery work', async () => {
  const prisma = new TestPrismaService();
  const recoveryDisconnectStarted = deferred();
  const allowRecoveryDisconnect = deferred();
  let disconnectCalls = 0;
  let connectCalls = 0;

  replacePrismaMethod(
    prisma,
    '$disconnect',
    (async () => {
      disconnectCalls += 1;
      if (disconnectCalls === 1) {
        recoveryDisconnectStarted.resolve();
        await allowRecoveryDisconnect.promise;
      }
    }) as PrismaService['$disconnect'],
  );
  replacePrismaMethod(
    prisma,
    '$connect',
    (async () => {
      connectCalls += 1;
    }) as PrismaService['$connect'],
  );
  mockSuccessfulQuery(prisma);

  const recovery = prisma.requestRuntimeRecovery(transientError('P1001'), 'exception_filter');
  await recoveryDisconnectStarted.promise;
  const shutdown = prisma.onModuleDestroy();
  allowRecoveryDisconnect.resolve();
  await Promise.all([recovery, shutdown]);

  assert.equal(connectCalls, 0);
  assert.equal(disconnectCalls, 2);
  assert.equal(
    prisma.requestRuntimeRecovery(transientError('P1001'), 'exception_filter'),
    undefined,
  );
});
