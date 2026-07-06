import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InMemoryTtlCacheService } from '../../common/cache/in-memory-ttl-cache.service';
import { PUBLIC_CACHE_PREFIXES } from '../../common/cache/public-cache-prefixes';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SettingsQueryDto } from './dto/settings-query.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { getSettingDefinitions, validateSettingValue } from './settings-registry';

@Injectable()
export class SettingsService {
  private readonly storefrontSettingsCacheTtlMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cache: InMemoryTtlCacheService,
  ) {}

  async findAll(query: SettingsQueryDto) {
    const where: Prisma.SettingWhereInput = { scope: query.scope };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.setting.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.setting.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  findByKey(key: string) {
    return this.prisma.setting.findUniqueOrThrow({ where: { key } });
  }

  findDefinitions() {
    return getSettingDefinitions();
  }

  async findStorefrontSettings() {
    return this.cache.getOrSet(
      `${PUBLIC_CACHE_PREFIXES.settings}storefront`,
      this.storefrontSettingsCacheTtlMs,
      () => this.findStorefrontSettingsUncached(),
    );
  }

  private async findStorefrontSettingsUncached() {
    const allowedKeys = [
      'store.name',
      'store.whatsapp',
      'store.phone',
      'store.instagram',
      'store.currency',
      'payment.depositMinPercent',
      'payment.depositDefaultPercent',
      'payment.vodafoneFeePercent',
      'payment.vodafoneCash',
      'payment.instapay',
      'shipping.estimatedDays',
    ];
    const rows = await this.prisma.setting.findMany({ where: { key: { in: allowedKeys } } });
    return rows.reduce<Record<string, unknown>>((result, setting) => {
      result[setting.key] = setting.value;
      return result;
    }, {});
  }

  async upsert(key: string, dto: UpsertSettingDto, user: AuthenticatedUser) {
    const validated = validateSettingValue(key, dto.value, dto.scope);
    const data = {
      value: validated.value as Prisma.InputJsonValue,
      scope: validated.scope,
      description: dto.description,
      updatedById: user.id,
    };

    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
    await this.auditService.log({
      actorUserId: user.id,
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      entityId: key,
      metadata: { scope: dto.scope },
    });
    this.cache.deleteByPrefix(PUBLIC_CACHE_PREFIXES.settings);
    return setting;
  }

  async remove(key: string, user?: AuthenticatedUser) {
    const setting = await this.prisma.setting.delete({ where: { key } });
    await this.auditService.log({
      actorUserId: user?.id,
      action: 'SETTING_DELETED',
      entityType: 'SETTING',
      entityId: key,
    });
    this.cache.deleteByPrefix(PUBLIC_CACHE_PREFIXES.settings);
    return setting;
  }
}
