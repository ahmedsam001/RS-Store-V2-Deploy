import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);
  private readonly bootstrapRetryDelaysMs = [2_000, 4_000, 6_000, 8_000, 10_000, 12_000];
  private readonly transientDatabaseErrorCodes = new Set(['P1001', 'P1002', 'P2024', 'P2028']);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap(): void {
    void this.retryAdminBootstrap().catch((error) => {
      this.logger.error(
        JSON.stringify({
          message: 'admin_bootstrap_background_failed',
          errorName: this.getErrorName(error),
          errorCode: this.getPrismaErrorCode(error),
        }),
      );
    });
  }

  private async retryAdminBootstrap(): Promise<void> {
    for (let attempt = 1; attempt <= this.bootstrapRetryDelaysMs.length; attempt += 1) {
      try {
        await this.runAdminBootstrap();
        this.logger.log(
          JSON.stringify({
            message: 'admin_bootstrap_success',
            attempt,
            maxAttempts: this.bootstrapRetryDelaysMs.length,
          }),
        );
        return;
      } catch (error) {
        if (!this.isTransientDatabaseError(error)) {
          throw error;
        }

        const payload = {
          attempt,
          maxAttempts: this.bootstrapRetryDelaysMs.length,
          errorName: this.getErrorName(error),
          errorCode: this.getPrismaErrorCode(error),
        };

        if (attempt === this.bootstrapRetryDelaysMs.length) {
          this.logger.warn(
            JSON.stringify({
              message: 'admin_bootstrap_skipped_database_unavailable',
              ...payload,
            }),
          );
          return;
        }

        const delayMs = this.bootstrapRetryDelaysMs[attempt - 1];
        this.logger.warn(
          JSON.stringify({
            message: 'admin_bootstrap_retry',
            ...payload,
            nextRetryDelayMs: delayMs,
          }),
        );
        await this.delay(delayMs);
      }
    }
  }

  private async runAdminBootstrap(): Promise<void> {
    await this.ensureDefaultStorefrontCategories();

    const ownerCount = await this.prisma.user.count({
      where: { role: UserRole.OWNER, deletedAt: null },
    });

    if (ownerCount > 0) {
      return;
    }

    const bootstrapEnabled = this.configService.getOrThrow<boolean>('ADMIN_BOOTSTRAP_ENABLED');
    if (!bootstrapEnabled) {
      this.handleMissingOwner();
      return;
    }

    const email = this.configService.getOrThrow<string>('ADMIN_BOOTSTRAP_EMAIL').toLowerCase();
    const phone = this.configService.getOrThrow<string>('ADMIN_BOOTSTRAP_PHONE');
    const password = this.configService.getOrThrow<string>('ADMIN_BOOTSTRAP_PASSWORD');

    await this.assertBootstrapIdentityAvailable(email, phone);
    await this.prisma.user.create({
      data: {
        name: this.configService.getOrThrow<string>('ADMIN_BOOTSTRAP_NAME'),
        email,
        phone,
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        language: 'ar',
      },
      select: { id: true },
    });

    this.logger.warn('Initial OWNER account has been created from bootstrap environment variables');
  }

  private async ensureDefaultStorefrontCategories(): Promise<void> {
    const categories = [
      {
        slug: 'women',
        nameAr: 'Women',
        nameEn: 'Women',
        description: 'Fashion pieces bags shoes and accessories for effortless everyday style',
        sortOrder: 10,
        children: [
          'Shoes',
          'Dresses',
          'T-Shirts',
          'Blouses',
          'Hoodies',
          'Jeans',
          'Pants',
          'Skirts',
          'Bags',
          'Accessories',
          'Sandals',
          'Sneakers',
          'Slippers',
          'Heels',
          'Sleepwear',
        ],
      },
      {
        slug: 'kids',
        nameAr: 'Kids',
        nameEn: 'Kids',
        description: 'Soft outfits and playful essentials for babies and kids',
        sortOrder: 20,
        children: [
          'Shoes',
          'Dresses',
          'T-Shirts',
          'Sets',
          'Hoodies',
          'Pants',
          'Shorts',
          'Sandals',
          'Sneakers',
          'Slippers',
          'Accessories',
          'Baby Clothing',
        ],
      },
    ];

    await Promise.all(
      categories.map(async (category) => {
        const parent = await this.prisma.category.upsert({
          where: { slug: category.slug },
          update: {
            nameAr: category.nameAr,
            nameEn: category.nameEn,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
            deletedAt: null,
            parentId: null,
          },
          create: {
            slug: category.slug,
            nameAr: category.nameAr,
            nameEn: category.nameEn,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
          },
          select: { id: true, slug: true },
        });

        await Promise.all(
          category.children.map((childName, index) =>
            this.prisma.category.upsert({
              where: { slug: `${parent.slug}-${this.slugifyCategoryName(childName)}` },
              update: {
                nameAr: childName,
                nameEn: childName,
                sortOrder: (index + 1) * 10,
                isActive: true,
                deletedAt: null,
                parentId: parent.id,
              },
              create: {
                slug: `${parent.slug}-${this.slugifyCategoryName(childName)}`,
                nameAr: childName,
                nameEn: childName,
                sortOrder: (index + 1) * 10,
                isActive: true,
                parentId: parent.id,
              },
            }),
          ),
        );
      }),
    );
  }

  private slugifyCategoryName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private handleMissingOwner(): void {
    const nodeEnvironment = this.configService.getOrThrow<string>('NODE_ENV');
    if (nodeEnvironment === 'production') {
      throw new Error(
        'No OWNER account exists. Enable ADMIN_BOOTSTRAP_ENABLED once to create the first owner.',
      );
    }

    this.logger.warn(
      'No OWNER account exists. Admin login will be unavailable until an owner is created.',
    );
  }

  private async assertBootstrapIdentityAvailable(email: string, phone: string): Promise<void> {
    const duplicate = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email }, { phone }],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new Error('Admin bootstrap email or phone is already assigned to an existing user');
    }
  }

  private delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private isTransientDatabaseError(error: unknown): boolean {
    const errorCode = this.getPrismaErrorCode(error);
    if (errorCode && this.transientDatabaseErrorCodes.has(errorCode)) {
      return true;
    }

    if (this.getErrorName(error) === 'PrismaClientInitializationError') {
      return true;
    }

    return this.getErrorMessage(error).includes("Can't reach database server");
  }

  private getPrismaErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }

    return undefined;
  }

  private getErrorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '';
  }
}
