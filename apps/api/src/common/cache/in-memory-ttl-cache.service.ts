import { Injectable } from "@nestjs/common";
import { logStructured } from "../logging/structured-logger";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
};

type CacheKeyValue = string | number | boolean | Date | null | undefined;

type CacheSetOptions = {
  staleIfErrorMs?: number;
};

@Injectable()
export class InMemoryTtlCacheService {
  private readonly maxEntries = 500;
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      if (entry.staleUntil <= now) {
        this.entries.delete(key);
      }
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(
    key: string,
    value: T,
    ttlMs: number,
    options: CacheSetOptions = {},
  ): void {
    if (ttlMs <= 0) {
      this.entries.delete(key);
      return;
    }

    this.pruneExpired();

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    const expiresAt = Date.now() + ttlMs;
    this.entries.set(key, {
      value,
      expiresAt,
      staleUntil: expiresAt + Math.max(0, options.staleIfErrorMs ?? 0),
    });
    this.enforceMaxEntries();
  }

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    options: CacheSetOptions = {},
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const pendingLoad = loader()
      .then((value) => {
        if (this.pending.get(key) === pendingLoad) {
          this.set(key, value, ttlMs, options);
        }
        return value;
      })
      .catch((error: unknown) => {
        const stale = this.getStale<T>(key);
        if (stale !== undefined) {
          logStructured("warn", "cache_stale_fallback", {
            key,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          return stale;
        }
        throw error;
      })
      .finally(() => {
        if (this.pending.get(key) === pendingLoad) {
          this.pending.delete(key);
        }
      });

    this.pending.set(key, pendingLoad);
    return pendingLoad;
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }

    for (const key of this.pending.keys()) {
      if (key.startsWith(prefix)) {
        this.pending.delete(key);
      }
    }
  }

  buildKey(prefix: string, params: Record<string, CacheKeyValue> = {}): string {
    const serializedParams = Object.entries(params)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(
        ([key, value]) =>
          `${key}=${encodeURIComponent(
            this.serializeValue(
              value as Exclude<CacheKeyValue, null | undefined>,
            ),
          )}`,
      )
      .join("&");

    return serializedParams ? `${prefix}:${serializedParams}` : prefix;
  }

  private getStale<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.staleUntil <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private serializeValue(
    value: Exclude<CacheKeyValue, null | undefined>,
  ): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil <= now) {
        this.entries.delete(key);
      }
    }
  }

  private enforceMaxEntries(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }
}
