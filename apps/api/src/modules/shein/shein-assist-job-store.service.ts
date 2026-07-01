import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { SheinAssistJob } from './shein.types';

const DEFAULT_ASSIST_JOB_TTL_MS = 90 * 60_000;
const DEFAULT_STALE_JOB_MS = 20 * 60_000;
const KEY_PREFIX = 'shein:assist-job:';

@Injectable()
export class SheinAssistJobStore {
  private readonly ttlMs: number;
  private readonly staleMs: number;

  constructor(
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.ttlMs = this.parsePositiveMs(configService.get<string>('SHEIN_ASSIST_JOB_TTL_MS'), DEFAULT_ASSIST_JOB_TTL_MS);
    this.staleMs = this.parsePositiveMs(configService.get<string>('SHEIN_ASSIST_STALE_MS'), DEFAULT_STALE_JOB_MS);
  }

  ttlSeconds(): number {
    return Math.ceil(this.ttlMs / 1000);
  }

  staleThresholdMs(): number {
    return this.staleMs;
  }

  expiresAtFrom(now = new Date()): string {
    return new Date(now.getTime() + this.ttlMs).toISOString();
  }

  async save(job: SheinAssistJob): Promise<void> {
    await this.ensureConnected();
    await this.redisService.getClient().set(this.key(job.id), JSON.stringify(job), 'EX', this.ttlSeconds());
  }

  async get(jobId: string): Promise<SheinAssistJob | null> {
    await this.ensureConnected();
    const raw = await this.redisService.getClient().get(this.key(jobId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SheinAssistJob;
    } catch {
      await this.delete(jobId);
      return null;
    }
  }

  async update(job: SheinAssistJob, patch: Partial<SheinAssistJob>): Promise<SheinAssistJob> {
    const next: SheinAssistJob = {
      ...job,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
      expiresAt: patch.expiresAt ?? job.expiresAt ?? this.expiresAtFrom(),
    };
    await this.save(next);
    return next;
  }

  async delete(jobId: string): Promise<void> {
    await this.ensureConnected();
    await this.redisService.getClient().del(this.key(jobId));
  }

  isStale(job: SheinAssistJob, now = new Date()): boolean {
    if (!['queued', 'running'].includes(job.status)) return false;
    const updatedAt = new Date(job.updatedAt).getTime();
    return Number.isFinite(updatedAt) && now.getTime() - updatedAt > this.staleMs;
  }

  private key(jobId: string): string {
    return `${KEY_PREFIX}${jobId}`;
  }

  private async ensureConnected(): Promise<void> {
    await this.redisService.ping();
  }

  private parsePositiveMs(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
  }
}
