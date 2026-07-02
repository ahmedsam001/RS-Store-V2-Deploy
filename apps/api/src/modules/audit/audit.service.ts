import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

type AuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: this.toCreateInput(input) });
    } catch {
      this.logger.warn(`Audit log write failed for ${input.action} on ${input.entityType}`);
    }
  }

  logInTransaction(tx: Prisma.TransactionClient, input: AuditInput) {
    return tx.auditLog.create({ data: this.toCreateInput(input) });
  }

  private toCreateInput(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
    return {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: this.redactMetadata(input.metadata ?? {}),
    };
  }

  private redactMetadata(metadata: Prisma.InputJsonValue): Prisma.InputJsonValue {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return metadata;
    }

    const blockedKeys = new Set([
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ]);
    const clone: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, value] of Object.entries(metadata)) {
      clone[key] = blockedKeys.has(key) ? '[REDACTED]' : (value as Prisma.InputJsonValue);
    }
    return clone;
  }
}
