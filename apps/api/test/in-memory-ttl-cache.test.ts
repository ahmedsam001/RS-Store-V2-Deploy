import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryTtlCacheService } from "../src/common/cache/in-memory-ttl-cache.service";

test("serves stale public cache data when refresh fails inside stale-if-error window", async () => {
  const cache = new InMemoryTtlCacheService();
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;

  try {
    cache.set("catalog:products", { items: ["cached"] }, 100, {
      staleIfErrorMs: 500,
    });
    now = 1_101;

    const result = await cache.getOrSet(
      "catalog:products",
      100,
      async () => {
        throw new Error("database unavailable");
      },
      { staleIfErrorMs: 500 },
    );

    assert.deepEqual(result, { items: ["cached"] });
  } finally {
    Date.now = originalNow;
  }
});

test("does not serve stale data after its stale-if-error window expires", async () => {
  const cache = new InMemoryTtlCacheService();
  const originalNow = Date.now;
  let now = 2_000;
  Date.now = () => now;

  try {
    cache.set("catalog:products", { items: ["cached"] }, 100, {
      staleIfErrorMs: 500,
    });
    now = 2_601;

    await assert.rejects(
      cache.getOrSet(
        "catalog:products",
        100,
        async () => {
          throw new Error("database unavailable");
        },
        { staleIfErrorMs: 500 },
      ),
      /database unavailable/,
    );
  } finally {
    Date.now = originalNow;
  }
});

test("cache invalidation removes stale fallback data", async () => {
  const cache = new InMemoryTtlCacheService();
  const originalNow = Date.now;
  let now = 3_000;
  Date.now = () => now;

  try {
    cache.set("catalog:products", { items: ["cached"] }, 100, {
      staleIfErrorMs: 500,
    });
    now = 3_101;
    cache.deleteByPrefix("catalog:");

    await assert.rejects(
      cache.getOrSet(
        "catalog:products",
        100,
        async () => {
          throw new Error("database unavailable");
        },
        { staleIfErrorMs: 500 },
      ),
      /database unavailable/,
    );
  } finally {
    Date.now = originalNow;
  }
});
