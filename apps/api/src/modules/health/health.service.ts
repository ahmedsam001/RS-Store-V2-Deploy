import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as Cloudinary } from 'cloudinary';
import { RedisService } from '../../infrastructure/cache/redis.service';
import {
  isTransientDatabaseError,
  PrismaService,
} from '../../infrastructure/database/prisma/prisma.service';
import { CLOUDINARY_CLIENT } from '../../infrastructure/storage/cloudinary/cloudinary.constants';

type CheckState = 'healthy' | 'degraded' | 'unhealthy';

type HealthCheckResult = {
  status: CheckState;
  checks: Record<string, { status: CheckState; message?: string }>;
  checkedAt: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @Inject(CLOUDINARY_CLIENT) private readonly cloudinary: typeof Cloudinary,
  ) {}

  async check(): Promise<{ statusCode: number; body: HealthCheckResult }> {
    const checks = {
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
      cloudinary: this.checkCloudinaryConfig(),
      application: { status: 'healthy' as const, message: 'Application process is ready' },
    };

    const statuses = Object.values(checks).map((check) => check.status);
    const status: CheckState = statuses.includes('unhealthy')
      ? 'unhealthy'
      : statuses.includes('degraded')
        ? 'degraded'
        : 'healthy';
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return { statusCode, body: { status, checks, checkedAt: new Date().toISOString() } };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' as const };
    } catch (error) {
      if (isTransientDatabaseError(error)) {
        void this.prisma.requestRuntimeRecovery(error, 'health_check');
      }
      return { status: 'unhealthy' as const, message: this.errorMessage(error) };
    }
  }

  private async checkRedis() {
    try {
      const result = await this.redisService.ping();
      return result === 'PONG'
        ? { status: 'healthy' as const }
        : { status: 'degraded' as const, message: 'Unexpected Redis ping response' };
    } catch (error) {
      return { status: 'unhealthy' as const, message: this.errorMessage(error) };
    }
  }

  private checkCloudinaryConfig() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const configured = Boolean(
      cloudName && apiKey && apiSecret && this.cloudinary.config().cloud_name,
    );
    return configured
      ? { status: 'healthy' as const }
      : { status: 'degraded' as const, message: 'Cloudinary is not fully configured' };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
