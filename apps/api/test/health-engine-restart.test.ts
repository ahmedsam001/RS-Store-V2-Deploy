import assert from "node:assert/strict";
import test from "node:test";

import { ConfigService } from "@nestjs/config";
import { v2 as Cloudinary } from "cloudinary";

import { RedisService } from "../src/infrastructure/cache/redis.service";
import { PrismaService } from "../src/infrastructure/database/prisma/prisma.service";
import { HealthService } from "../src/modules/health/health.service";

test("health reports application unhealthy while engine restart is pending", async () => {
  const prisma = {
    $queryRaw: async () => {
      throw new Error("Engine is not yet connected.");
    },
    requestRuntimeRecovery: () => Promise.resolve(),
    engineRestartPending: () => true,
  } as unknown as PrismaService;
  const redis = { ping: async () => "PONG" } as RedisService;
  const config = {
    get: () => "configured",
  } as unknown as ConfigService;
  const cloudinary = {
    config: () => ({ cloud_name: "rs-store" }),
  } as unknown as typeof Cloudinary;

  const health = new HealthService(prisma, redis, config, cloudinary);
  const result = await health.check();

  assert.equal(result.statusCode, 503);
  assert.equal(result.body.status, "unhealthy");
  assert.deepEqual(result.body.checks.application, {
    status: "unhealthy",
    message: "Database engine restart pending",
  });
});
