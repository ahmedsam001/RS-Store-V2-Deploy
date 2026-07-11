import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RateLimitGuard } from "../src/common/guards/rate-limit.guard";
import { RedisService } from "../src/infrastructure/cache/redis.service";

function createContext(): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, ip: "127.0.0.1", socket: {} }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(count: number, ttlMs = 30_000): RateLimitGuard {
  const reflector = {
    getAllAndOverride: () => ({
      bucket: "catalog",
      limit: 2,
      windowMs: 60_000,
    }),
  } as unknown as Reflector;
  const redis = {
    incrementWithTtl: async () => ({ count, ttlMs }),
  } as unknown as RedisService;
  return new RateLimitGuard(reflector, redis);
}

test("allows requests at or below the configured rate limit", async () => {
  assert.equal(await createGuard(1).canActivate(createContext()), true);
  assert.equal(await createGuard(2).canActivate(createContext()), true);
});

test("rejects requests above the configured rate limit", async () => {
  await assert.rejects(
    createGuard(3, 12_500).canActivate(createContext()),
    (error: unknown) =>
      error instanceof HttpException &&
      error.getStatus() === 429 &&
      error.message.includes("13 seconds"),
  );
});

test("returns 503 when the rate limiting service is unavailable", async () => {
  const reflector = {
    getAllAndOverride: () => ({
      bucket: "catalog",
      limit: 2,
      windowMs: 60_000,
    }),
  } as unknown as Reflector;
  const redis = {
    incrementWithTtl: async () => {
      throw new Error("redis unavailable");
    },
  } as unknown as RedisService;
  const guard = new RateLimitGuard(reflector, redis);

  await assert.rejects(
    guard.canActivate(createContext()),
    (error: unknown) =>
      error instanceof HttpException && error.getStatus() === 503,
  );
});
