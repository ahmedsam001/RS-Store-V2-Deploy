import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as Cloudinary } from "cloudinary";
import { logStructured } from "../../common/logging/structured-logger";
import { RedisService } from "../../infrastructure/cache/redis.service";
import {
  getPrismaErrorCode,
  getPrismaErrorName,
  isRecoverableDatabaseError,
  PrismaService,
} from "../../infrastructure/database/prisma/prisma.service";
import { CLOUDINARY_CLIENT } from "../../infrastructure/storage/cloudinary/cloudinary.constants";

type CheckState = "healthy" | "degraded" | "unhealthy";

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
      application: {
        status: "healthy" as const,
        message: "Application process is ready",
      },
    };

    const statuses = Object.values(checks).map((check) => check.status);
    const status: CheckState = statuses.includes("unhealthy")
      ? "unhealthy"
      : statuses.includes("degraded")
        ? "degraded"
        : "healthy";
    const statusCode =
      status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return {
      statusCode,
      body: { status, checks, checkedAt: new Date().toISOString() },
    };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "healthy" as const };
    } catch (error) {
      logStructured("warn", "health_postgres_unavailable", {
        errorName: getPrismaErrorName(error),
        errorCode: getPrismaErrorCode(error),
      });

      if (isRecoverableDatabaseError(error)) {
        const recovery = this.prisma.requestRuntimeRecovery(
          error,
          "health_check",
        );
        void recovery?.catch((recoveryError) => {
          logStructured("error", "health_postgres_recovery_failed", {
            errorName: getPrismaErrorName(recoveryError),
            errorCode: getPrismaErrorCode(recoveryError),
          });
        });
      }
      return {
        status: "unhealthy" as const,
        message: "PostgreSQL connection check failed",
      };
    }
  }

  private async checkRedis() {
    try {
      const result = await this.redisService.ping();
      return result === "PONG"
        ? { status: "healthy" as const }
        : {
            status: "degraded" as const,
            message: "Unexpected Redis ping response",
          };
    } catch (error) {
      logStructured("warn", "health_redis_unavailable", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return {
        status: "unhealthy" as const,
        message: "Redis connection check failed",
      };
    }
  }

  private checkCloudinaryConfig() {
    const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");
    const configured = Boolean(
      cloudName && apiKey && apiSecret && this.cloudinary.config().cloud_name,
    );
    return configured
      ? { status: "healthy" as const }
      : {
          status: "degraded" as const,
          message: "Cloudinary is not fully configured",
        };
  }
}
