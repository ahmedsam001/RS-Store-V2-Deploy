import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private connectPromise?: Promise<void>;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async incrementWithTtl(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }> {
    await this.ensureConnected();

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.pexpire(key, windowMs);
    }

    const ttlMs = await this.client.pttl(key);
    return { count, ttlMs: ttlMs > 0 ? ttlMs : windowMs };
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return this.client.ping();
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }

    this.connectPromise ??= this.client.connect().finally(() => {
      this.connectPromise = undefined;
    });

    await this.connectPromise;
  }
}
