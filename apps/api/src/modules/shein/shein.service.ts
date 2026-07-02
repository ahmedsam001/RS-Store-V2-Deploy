import { BadRequestException, Injectable, Logger } from '@nestjs/common';
// import { Prisma, SheinImportStatus } from '@prisma/client';
import { Prisma, ProductStatus, SheinImportStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { ApproveSheinImportDto } from './dto/approve-shein-import.dto';
import { CreateSheinImportDto } from './dto/create-shein-import.dto';
import { CreateSheinRequestDto } from './dto/create-shein-request.dto';
import { ReviewSheinImportDto } from './dto/review-shein-import.dto';
import { SheinImportsQueryDto } from './dto/shein-imports-query.dto';
import { UpdateSheinImportDto } from './dto/update-shein-import.dto';
import { UpdateSheinMarketplaceSettingsDto } from './dto/update-shein-marketplace-settings.dto';
import { SheinAssistJobStore } from './shein-assist-job-store.service';
import { SheinAssistedBrowserService } from './shein-assisted-browser.service';
import { SheinExtractorService } from './shein-extractor.service';
import { SheinFetchService } from './shein-fetch.service';
import { SheinPreviewNormalizer } from './shein-preview.normalizer';
import { SheinProductPublisherService } from './shein-product-publisher.service';
import { SheinUrlService } from './shein-url.service';
import {
  SheinAssistJob,
  SheinImportExtractionResponse,
  SheinImportPreview,
  SheinImportStep,
} from './shein.types';
import { SheinMarketplaceSettingsService } from './shein-marketplace-settings.service';
import { FIXED_SHEIN_CURRENCY, SheinMarketplaceSettings } from './shein-marketplace';
import { SheinWorkflowService } from './shein-workflow.service';
import { assertValidSheinSubCategory } from './shein-category-config';

const MANUAL_REVIEW_MESSAGE =
  'System could not extract all data automatically. Open SHEIN link and complete product data manually like V1.';
const ASSIST_SESSION_EXPIRED_MESSAGE =
  'The import session stopped or expired. Start again from the same product link.';
const MISSING_PRODUCT_IMAGES_MESSAGE =
  'Could not find two clear product images. You can add images manually.';

const STEP_TEMPLATES: Array<Omit<SheinImportStep, 'status'>> = [
  { id: 'prepare_link', labelEn: 'Prepare SHEIN link', labelAr: 'Prepare SHEIN link' },
  {
    id: 'open_market_link',
    labelEn: 'Open SHEIN with selected country and currency',
    labelAr: 'Open SHEIN with selected country and currency',
  },
  { id: 'start_session', labelEn: 'Start import session', labelAr: 'Start import session' },
  { id: 'try_extraction', labelEn: 'Try extraction', labelAr: 'Try extraction' },
  {
    id: 'show_preview',
    labelEn: 'Show preview if successful',
    labelAr: 'Show preview if successful',
  },
  { id: 'manual_review', labelEn: 'Manual review if failed', labelAr: 'Manual review if failed' },
];

@Injectable()
export class SheinService {
  private readonly logger = new Logger(SheinService.name);

  private readonly include = {
    requestedBy: { select: { id: true, name: true, email: true } },
    createdProduct: { select: { id: true, nameAr: true, slug: true } },
  } satisfies Prisma.SheinImportInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistJobStore: SheinAssistJobStore,
    private readonly assistedBrowser: SheinAssistedBrowserService,
    private readonly fetchService: SheinFetchService,
    private readonly extractor: SheinExtractorService,
    private readonly normalizer: SheinPreviewNormalizer,
    private readonly publisher: SheinProductPublisherService,
    private readonly urlService: SheinUrlService,
    private readonly workflow: SheinWorkflowService,
    private readonly marketplaceSettings: SheinMarketplaceSettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  getMarketplaceSettings() {
    return this.marketplaceSettings.getSettings();
  }

  updateMarketplaceSettings(dto: UpdateSheinMarketplaceSettingsDto, user: AuthenticatedUser) {
    return this.marketplaceSettings.updateSettings(dto, user);
  }

  async create(dto: CreateSheinImportDto, user: AuthenticatedUser) {
    const normalizedSourceUrl = this.urlService.parseSheinUrl(dto.sourceUrl).toString();
    this.logger.log(`SHEIN import requested source=${normalizedSourceUrl}`);
    const record = await this.prisma.sheinImport.create({
      data: {
        sourceUrl: normalizedSourceUrl,
        normalizedUrlKey:
          dto.normalizedUrlKey ?? this.urlService.normalizeUrlKey(normalizedSourceUrl),
        rawPayload: dto.rawPayload as Prisma.InputJsonValue | undefined,
        status: SheinImportStatus.PENDING,
        requestedById: user.id,
      },
      include: this.include,
    });

    const importRecord = await this.buildPreview(record.id, dto.rawPayload);
    await this.auditService.log({
      actorUserId: user.id,
      action: 'SHEIN_IMPORT_CREATED',
      entityType: 'SHEIN_IMPORT',
      entityId: record.id,
      metadata: { sourceUrl: normalizedSourceUrl, status: importRecord.status },
    });
    return this.withExtraction(importRecord);
  }

  async startV1AssistedImport(dto: CreateSheinImportDto, user: AuthenticatedUser) {
    const marketplace = await this.marketplaceSettings.getSettings();
    const normalizedSourceUrl = this.urlService.parseSheinUrl(dto.sourceUrl).toString();
    const preparedUrl = this.urlService
      .applyV1MarketToSheinUrl(normalizedSourceUrl, marketplace)
      .toString();
    this.logger.log(
      `SHEIN assisted import queued source=${normalizedSourceUrl} prepared=${preparedUrl} country=${marketplace.countryCode} currency=${marketplace.currencyCode} lang=${marketplace.language}`,
    );
    const record = await this.prisma.sheinImport.create({
      data: {
        sourceUrl: normalizedSourceUrl,
        normalizedUrlKey:
          dto.normalizedUrlKey ?? this.urlService.normalizeUrlKey(normalizedSourceUrl),
        rawPayload: {
          mode: this.assistedBrowser.isInteractiveEnabled()
            ? 'automatic_visible_chrome_admin'
            : 'frontend_browser_assisted_admin',
          marketplace: {
            countryCode: marketplace.countryCode,
            currencyCode: marketplace.currencyCode,
            language: marketplace.language,
          },
          preparedUrl,
        },
        status: SheinImportStatus.PENDING,
        requestedById: user.id,
      },
      include: this.include,
    });

    const now = new Date();
    const job: SheinAssistJob = {
      id: randomUUID(),
      importId: record.id,
      sourceUrl: record.sourceUrl,
      preparedUrl,
      assistedUrl: preparedUrl,
      status: 'queued',
      messageEn: this.assistedBrowser.isInteractiveEnabled()
        ? 'Visible Chrome window will open automatically. Solve CAPTCHA if shown, then the system will read data and close the tab.'
        : 'Import session created. Open SHEIN in the browser, then start extraction.',
      messageAr: this.assistedBrowser.isInteractiveEnabled()
        ? 'Visible Chrome window will open automatically. Solve CAPTCHA if shown, then the system will read data and close the tab.'
        : 'Import session created. Open SHEIN in the browser, then start extraction.',
      currentStep: 'prepare_link',
      progressMessage: 'queued',
      steps: STEP_TEMPLATES.map((step) => ({ ...step, status: 'pending' })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: this.assistJobStore.expiresAtFrom(now),
    };
    await this.assistJobStore.save(job);
    await this.auditService.log({
      actorUserId: user.id,
      action: 'SHEIN_ASSIST_STARTED',
      entityType: 'SHEIN_IMPORT',
      entityId: record.id,
      metadata: { jobId: job.id, sourceUrl: normalizedSourceUrl, preparedUrl },
    });

    const opened = await this.openAssistedImportSession(job, dto.rawPayload);
    return opened;
  }

  async findV1AssistedImport(jobId: string) {
    const job = await this.assistJobStore.get(jobId);
    if (!job) {
      return { ok: false, job: null, import: null, messageAr: ASSIST_SESSION_EXPIRED_MESSAGE };
    }

    const hydratedJob = this.assistJobStore.isStale(job) ? await this.expireAssistJob(job) : job;
    const record = await this.prisma.sheinImport.findUnique({
      where: { id: hydratedJob.importId },
      include: this.include,
    });
    const extraction = record
      ? this.toExtractionResponse(record, hydratedJob)
      : { status: 'failed', reason: 'Import record was not found', product: null };
    return {
      ok: true,
      assistedUrl: hydratedJob.assistedUrl ?? hydratedJob.preparedUrl,
      browserUrl: hydratedJob.assistedUrl ?? hydratedJob.preparedUrl,
      ...extraction,
      job: this.publicAssistJob(hydratedJob),
      import: record ? this.withExtraction(record, hydratedJob) : null,
    };
  }

  async continueV1AssistedImport(jobId: string) {
    const job = await this.assistJobStore.get(jobId);
    if (!job) {
      return {
        ok: false,
        status: 'failed',
        reason: ASSIST_SESSION_EXPIRED_MESSAGE,
        product: null,
        job: null,
        import: null,
      };
    }
    const record = await this.prisma.sheinImport.findUnique({
      where: { id: job.importId },
      include: this.include,
    });
    if (!record) {
      return {
        ok: false,
        status: 'failed',
        reason: 'Import record was not found',
        product: null,
        job: this.publicAssistJob(job),
        import: null,
      };
    }

    try {
      const result = await this.assistedBrowser.readAssistedSession(job.id);
      const updated = await this.applyAssistedSessionResult(job, result, undefined);
      const nextRecord = await this.prisma.sheinImport.findUnique({
        where: { id: job.importId },
        include: this.include,
      });
      return {
        ok: true,
        assistedUrl: updated.assistedUrl ?? updated.preparedUrl,
        browserUrl: updated.assistedUrl ?? updated.preparedUrl,
        ...this.toExtractionResponse(nextRecord ?? record, updated),
        job: this.publicAssistJob(updated),
        import: nextRecord
          ? this.withExtraction(nextRecord, updated)
          : this.withExtraction(record, updated),
      };
    } catch (error) {
      const message = this.friendlyExtractionMessage(
        error instanceof Error ? error.message : ASSIST_SESSION_EXPIRED_MESSAGE,
      );
      if (this.isTemporaryVisibleBrowserError(message)) {
        const updated = await this.applyAssistedSessionResult(
          job,
          {
            state: 'loading',
            message:
              'Waiting for SHEIN/CAPTCHA page to finish. Keep the visible Chrome window open; the importer will continue automatically after verification is solved.',
            sourceUrl: job.sourceUrl,
            preparedUrl: job.preparedUrl ?? job.assistedUrl ?? job.sourceUrl,
          },
          undefined,
        );
        const nextRecord = await this.prisma.sheinImport.findUnique({
          where: { id: job.importId },
          include: this.include,
        });
        return {
          ok: true,
          assistedUrl: updated.assistedUrl ?? updated.preparedUrl,
          browserUrl: updated.assistedUrl ?? updated.preparedUrl,
          ...this.toExtractionResponse(nextRecord ?? record, updated),
          job: this.publicAssistJob(updated),
          import: nextRecord
            ? this.withExtraction(nextRecord, updated)
            : this.withExtraction(record, updated),
        };
      }
      const failed = await this.failAssistJob(job, message, 'try_extraction');
      const nextRecord = await this.prisma.sheinImport.findUnique({
        where: { id: job.importId },
        include: this.include,
      });
      return {
        ok: false,
        status: 'failed',
        reason: message,
        product: null,
        assistedUrl: failed.assistedUrl ?? failed.preparedUrl,
        browserUrl: failed.assistedUrl ?? failed.preparedUrl,
        job: this.publicAssistJob(failed),
        import: nextRecord
          ? this.withExtraction(nextRecord, failed)
          : this.withExtraction(record, failed),
      };
    }
  }

  async createCustomerRequest(dto: CreateSheinRequestDto, user: AuthenticatedUser) {
    const normalizedSourceUrl = this.urlService.parseSheinUrl(dto.sourceUrl).toString();
    const record = await this.prisma.sheinImport.create({
      data: {
        sourceUrl: normalizedSourceUrl,
        normalizedUrlKey: this.urlService.normalizeUrlKey(normalizedSourceUrl),
        rawPayload: dto.notes ? { customerNotes: dto.notes.trim() } : undefined,
        status: SheinImportStatus.PENDING,
        requestedById: user.id,
      },
      include: this.include,
    });

    const prepared = await this.buildPreview(record.id, undefined);
    const needsManualReview =
      prepared.status === SheinImportStatus.MANUAL_REVIEW ||
      prepared.status === SheinImportStatus.FAILED;

    await this.notificationsService.createAdminNotification({
      titleAr: needsManualReview
        ? 'SHEIN request needs manual review'
        : 'SHEIN request ready for review',
      titleEn: needsManualReview
        ? 'SHEIN request needs manual review'
        : 'SHEIN request ready for review',
      messageAr: needsManualReview
        ? `A customer SHEIN request needs manual review: ${dto.sourceUrl}`
        : `A customer SHEIN product request is ready for admin review: ${dto.sourceUrl}`,
      messageEn: needsManualReview
        ? `A customer SHEIN request needs manual review: ${dto.sourceUrl}`
        : `A customer SHEIN product request is ready for admin review: ${dto.sourceUrl}`,
      type: 'SHEIN',
      entityType: 'SHEIN_IMPORT',
      entityId: prepared.id,
    });

    return prepared;
  }

  async findAll(query: SheinImportsQueryDto) {
    const where: Prisma.SheinImportWhereInput = {
      requestedById: query.requestedById,
      status: query.status,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sheinImport.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sheinImport.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  findById(id: string) {
    return this.prisma.sheinImport.findUniqueOrThrow({ where: { id }, include: this.include });
  }

  async update(id: string, dto: UpdateSheinImportDto, user?: AuthenticatedUser) {
    const record = await this.prisma.sheinImport.update({
      where: { id },
      data: {
        createdProductId: dto.createdProductId,
        importedImagesCount: dto.importedImagesCount,
        errorCode: dto.errorCode,
        errorMessage: dto.errorMessage,
      },
      include: this.include,
    });
    await this.auditService.log({
      actorUserId: user?.id,
      action: 'SHEIN_IMPORT_UPDATED',
      entityType: 'SHEIN_IMPORT',
      entityId: id,
      metadata: {
        createdProductId: dto.createdProductId ?? null,
        errorCode: dto.errorCode ?? null,
      },
    });
    return record;
  }

  async markReviewing(id: string, dto: ReviewSheinImportDto, user?: AuthenticatedUser) {
    const record = await this.prisma.sheinImport.findUniqueOrThrow({ where: { id } });
    const marketplace = await this.marketplaceSettings.getSettings();
    this.workflow.assertCanReview(record.status);
    const editedPayload = this.normalizer.normalize(
      dto.editedPayload ?? record.previewPayload ?? record.editedPayload ?? {},
      record.sourceUrl,
      { strictImages: Boolean(dto.editedPayload), marketplace },
    );

    const updated = await this.prisma.sheinImport.update({
      where: { id },
      data: {
        status: SheinImportStatus.REVIEWED,
        editedPayload: editedPayload as unknown as Prisma.InputJsonValue,
        errorCode: null,
        errorMessage: null,
        errors: Prisma.JsonNull,
        completedAt: null,
      },
      include: this.include,
    });
    await this.auditService.log({
      actorUserId: user?.id,
      action: 'SHEIN_IMPORT_REVIEWED',
      entityType: 'SHEIN_IMPORT',
      entityId: id,
      metadata: { from: record.status, to: updated.status },
    });
    return updated;
  }

  async approve(id: string, dto: ApproveSheinImportDto, user?: AuthenticatedUser) {
    const record = await this.prisma.sheinImport.findUniqueOrThrow({ where: { id } });
    const marketplace = await this.marketplaceSettings.getSettings();
    this.workflow.assertCanApprove(record.status);
    const editedPayload = this.normalizer.normalize(
      dto.editedPayload ?? record.editedPayload ?? record.previewPayload ?? {},
      record.sourceUrl,
      { strictImages: Boolean(dto.editedPayload), marketplace },
    );
    this.validateProductRequiredFields(editedPayload);

    const updated = await this.prisma.sheinImport.update({
      where: { id },
      data: {
        status: SheinImportStatus.APPROVED,
        editedPayload: editedPayload as unknown as Prisma.InputJsonValue,
        approvedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        errors: Prisma.JsonNull,
        completedAt: null,
      },
      include: this.include,
    });
    await this.auditService.log({
      actorUserId: user?.id,
      action: 'SHEIN_IMPORT_APPROVED',
      entityType: 'SHEIN_IMPORT',
      entityId: id,
      metadata: { from: record.status, to: updated.status },
    });
    return updated;
  }

  async createProduct(id: string, dto: ApproveSheinImportDto, user?: AuthenticatedUser) {
    const record = await this.publisher.createProduct(id, dto);
    await this.auditService.log({
      actorUserId: user?.id,
      action:
        dto.publishStatus === ProductStatus.ACTIVE
          ? 'SHEIN_IMPORT_PUBLISHED'
          : 'SHEIN_PRODUCT_CREATED',
      entityType: 'SHEIN_IMPORT',
      entityId: id,
      metadata: { status: record.status, createdProductId: record.createdProductId ?? null },
    });
    return record;
  }

  async retry(id: string, user?: AuthenticatedUser) {
    const record = await this.prisma.sheinImport.findUniqueOrThrow({ where: { id } });
    this.workflow.assertCanRetry(record.status);
    await this.prisma.sheinImport.update({
      where: { id },
      data: {
        status: SheinImportStatus.PENDING,
        retryCount: { increment: 1 },
        errorCode: null,
        errorMessage: null,
        errors: Prisma.JsonNull,
        completedAt: null,
      },
    });
    const prepared = await this.buildPreview(id, undefined);
    await this.auditService.log({
      actorUserId: user?.id,
      action: 'SHEIN_IMPORT_RETRIED',
      entityType: 'SHEIN_IMPORT',
      entityId: id,
      metadata: { from: record.status, to: prepared.status },
    });
    return prepared;
  }

  private async openAssistedImportSession(job: SheinAssistJob, rawPayload: unknown | undefined) {
    let running = await this.assistJobStore.update(job, {
      status: 'running',
      messageEn:
        'SHEIN session opened. Complete any CAPTCHA, login, or popup in the visible page, then continue extraction.',
      currentStep: 'open_market_link',
      progressMessage: 'opening_visible_browser',
    });
    running = await this.setJobStep(
      running,
      'prepare_link',
      'success',
      'SHEIN link prepared with market settings',
    );
    running = await this.setJobStep(
      running,
      'open_market_link',
      'running',
      'Opening SHEIN page in visible Chrome',
    );

    await this.prisma.sheinImport.update({
      where: { id: running.importId },
      data: {
        status: SheinImportStatus.EXTRACTING,
        rawPayload: rawPayload as Prisma.InputJsonValue | undefined,
        completedAt: null,
      },
    });

    try {
      const result = await this.assistedBrowser.openAssistedSession(
        running.id,
        running.sourceUrl,
        await this.marketplaceSettings.getSettings(),
      );
      const updatedJob = await this.applyAssistedSessionResult(running, result, rawPayload);
      const record = await this.prisma.sheinImport.findUniqueOrThrow({
        where: { id: running.importId },
        include: this.include,
      });
      return {
        ok: true,
        assistedUrl: updatedJob.assistedUrl ?? updatedJob.preparedUrl,
        browserUrl: updatedJob.assistedUrl ?? updatedJob.preparedUrl,
        ...this.toExtractionResponse(record, updatedJob),
        job: this.publicAssistJob(updatedJob),
        import: this.withExtraction(record, updatedJob),
      };
    } catch (error) {
      const message = this.friendlyExtractionMessage(
        error instanceof Error ? error.message : 'Unable to open visible SHEIN session',
      );
      if (this.isTemporaryVisibleBrowserError(message)) {
        const updatedJob = await this.applyAssistedSessionResult(
          running,
          {
            state: 'loading',
            message:
              'Waiting for SHEIN/CAPTCHA page to finish. Keep the visible Chrome window open; the importer will continue automatically after verification is solved.',
            sourceUrl: running.sourceUrl,
            preparedUrl: running.preparedUrl ?? running.assistedUrl ?? running.sourceUrl,
          },
          rawPayload,
        );
        const record = await this.prisma.sheinImport.findUniqueOrThrow({
          where: { id: running.importId },
          include: this.include,
        });
        return {
          ok: true,
          assistedUrl: updatedJob.assistedUrl ?? updatedJob.preparedUrl,
          browserUrl: updatedJob.assistedUrl ?? updatedJob.preparedUrl,
          ...this.toExtractionResponse(record, updatedJob),
          job: this.publicAssistJob(updatedJob),
          import: this.withExtraction(record, updatedJob),
        };
      }
      const failed = await this.failAssistJob(running, message, 'open_market_link');
      const record = await this.prisma.sheinImport.findUniqueOrThrow({
        where: { id: running.importId },
        include: this.include,
      });
      return {
        ok: false,
        status: 'failed',
        reason: message,
        product: null,
        assistedUrl: failed.assistedUrl ?? failed.preparedUrl,
        browserUrl: failed.assistedUrl ?? failed.preparedUrl,
        job: this.publicAssistJob(failed),
        import: this.withExtraction(record, failed),
      };
    }
  }

  private async applyAssistedSessionResult(
    job: SheinAssistJob,
    result: {
      state: 'ready' | 'verification' | 'loading';
      message: string;
      sourceUrl: string;
      preparedUrl: string;
      preview?: SheinImportPreview;
    },
    rawPayload: unknown | undefined,
  ): Promise<SheinAssistJob> {
    if (result.state === 'ready' && result.preview) {
      if (!this.isStrictPreviewReady(result.preview)) {
        return this.applyAssistedSessionResult(
          job,
          {
            ...result,
            state: 'loading',
            message:
              'Waiting for complete product name, price, and at least two valid SHEIN product images',
            preview: undefined,
          },
          rawPayload,
        );
      }
      await this.prisma.sheinImport.update({
        where: { id: job.importId },
        data: {
          status: SheinImportStatus.PREVIEW_READY,
          previewPayload: result.preview as unknown as Prisma.InputJsonValue,
          rawPayload: rawPayload as Prisma.InputJsonValue | undefined,
          errorCode: null,
          errorMessage: null,
          errors: Prisma.JsonNull,
          completedAt: null,
        },
      });
      let ready = await this.assistJobStore.update(job, {
        status: 'ready',
        assistedUrl: result.preparedUrl,
        messageEn: 'Product was extracted successfully. Review and approve it.',
        currentStep: 'show_preview',
        progressMessage: 'ready',
        finishedAt: new Date().toISOString(),
      });
      ready = await this.setJobStep(
        ready,
        'open_market_link',
        'success',
        'Opened SHEIN page in Chrome',
      );
      ready = await this.setJobStep(
        ready,
        'try_extraction',
        'success',
        'Extracted product data from page',
      );
      ready = await this.setJobStep(ready, 'show_preview', 'success', 'Preview ready for review');
      return this.setJobStep(ready, 'manual_review', 'success', 'No manual input needed');
    }

    const isVerification = result.state === 'verification';
    await this.prisma.sheinImport.update({
      where: { id: job.importId },
      data: {
        status: SheinImportStatus.EXTRACTING,
        errorCode: isVerification ? 'SHEIN_CAPTCHA_REQUIRED' : 'SHEIN_VISIBLE_PAGE_WAITING',
        errorMessage: result.message,
        errors: {
          message: result.message,
          status: isVerification ? 'captcha_required' : 'waiting_for_product_page',
        },
        completedAt: null,
      },
    });
    let waiting = await this.assistJobStore.update(job, {
      status: isVerification ? 'verification' : 'running',
      assistedUrl: result.preparedUrl,
      messageEn: result.message,
      messageAr: result.message,
      currentStep: 'try_extraction',
      progressMessage: result.message,
      lastError: undefined,
    });
    waiting = await this.setJobStep(
      waiting,
      'open_market_link',
      'success',
      'Opened SHEIN page in Chrome',
    );
    return this.setJobStep(
      waiting,
      'try_extraction',
      isVerification ? 'verification' : 'running',
      result.message,
    );
  }

  private async setJobStep(
    job: SheinAssistJob,
    stepId: string,
    status: SheinImportStep['status'],
    message?: string,
  ): Promise<SheinAssistJob> {
    const currentJob = (await this.assistJobStore.get(job.id)) ?? job;
    const index = currentJob.steps.findIndex((step) => step.id === stepId);
    if (index === -1) return currentJob;
    const now = new Date().toISOString();
    const steps = currentJob.steps.map((step, stepIndex) =>
      stepIndex === index ? { ...step, status, message, at: now } : step,
    );
    const terminalStatus = ['ready', 'manual', 'failed', 'expired', 'cancelled'].includes(
      currentJob.status,
    );
    return this.assistJobStore.update(currentJob, {
      steps,
      currentStep: stepId,
      progressMessage: message,
      status: !terminalStatus && status === 'verification' ? 'verification' : currentJob.status,
      updatedAt: now,
    });
  }

  private publicAssistJob(job: SheinAssistJob): SheinAssistJob {
    return { ...job, steps: job.steps.map((step) => ({ ...step })) };
  }

  private async expireAssistJob(job: SheinAssistJob): Promise<SheinAssistJob> {
    await this.prisma.sheinImport
      .update({
        where: { id: job.importId },
        data: {
          status: SheinImportStatus.FAILED,
          errorCode: 'SHEIN_ASSIST_SESSION_EXPIRED',
          errorMessage: ASSIST_SESSION_EXPIRED_MESSAGE,
          errors: { message: ASSIST_SESSION_EXPIRED_MESSAGE },
          completedAt: null,
        },
      })
      .catch(() => undefined);

    const expired = await this.assistJobStore.update(job, {
      status: 'expired',
      messageEn: 'The import session stopped or expired. Start again from the same product link.',
      currentStep: job.currentStep ?? 'try_extraction',
      progressMessage: ASSIST_SESSION_EXPIRED_MESSAGE,
      lastError: ASSIST_SESSION_EXPIRED_MESSAGE,
      finishedAt: new Date().toISOString(),
    });
    return this.setJobStep(
      expired,
      expired.currentStep ?? 'try_extraction',
      'error',
      ASSIST_SESSION_EXPIRED_MESSAGE,
    );
  }

  private async failAssistJob(
    job: SheinAssistJob,
    message: string,
    stepId: string = 'try_extraction',
  ): Promise<SheinAssistJob> {
    const friendlyMessage = this.friendlyExtractionMessage(message);
    await this.prisma.sheinImport
      .update({
        where: { id: job.importId },
        data: {
          status: SheinImportStatus.FAILED,
          errorCode: 'SHEIN_ASSIST_FAILED',
          errorMessage: friendlyMessage,
          errors: { message: friendlyMessage },
          completedAt: null,
        },
      })
      .catch(() => undefined);

    const failed = await this.assistJobStore.update(job, {
      status: 'failed',
      assistedUrl: job.assistedUrl ?? job.preparedUrl,
      messageEn: friendlyMessage,
      currentStep: stepId,
      progressMessage: friendlyMessage,
      lastError: friendlyMessage,
      finishedAt: new Date().toISOString(),
    });
    return this.setJobStep(failed, stepId, 'error', friendlyMessage);
  }

  private friendlyExtractionMessage(message: string): string {
    const value = String(message || '').trim();
    if (!value) return ASSIST_SESSION_EXPIRED_MESSAGE;
    if (/visible price does not match|currency mismatch/i.test(value)) {
      return 'Detected price does not match selected currency. Reopen link with correct settings.';
    }
    if (
      /price/i.test(value) &&
      /extraction failed|could not extract|missing|required|not found|invalid|NaN/i.test(value)
    ) {
      return 'Unable to determine discounted price from product page';
    }
    return value.length <= 260 ? value : MANUAL_REVIEW_MESSAGE;
  }

  private isTemporaryVisibleBrowserError(message: string): boolean {
    return /timed out|timeout|DevTools|communicate|fetch failed|ECONNREFUSED|ECONNRESET|aborted|Target closed|No target|socket|terminated while loading|tab was closed|visible chrome was closed/i.test(
      message,
    );
  }

  private async extractV1StylePreview(
    sourceUrl: string,
    marketplace: SheinMarketplaceSettings,
    onStep?: (stepId: string, status: SheinImportStep['status'], message?: string) => void,
  ): Promise<SheinImportPreview> {
    onStep?.('prepare_link', 'success', 'SHEIN link accepted and market settings added');
    onStep?.(
      'open_market_link',
      this.assistedBrowser.isInteractiveEnabled() ? 'running' : 'success',
      this.assistedBrowser.isInteractiveEnabled()
        ? 'Chrome will open automatically on admin device'
        : 'Open link in browser via Open link button',
    );
    onStep?.('start_session', 'success', 'Started SHEIN import session in V2');
    onStep?.(
      'try_extraction',
      'running',
      this.assistedBrowser.isInteractiveEnabled()
        ? 'Waiting for Chrome and reading page after any CAPTCHA'
        : 'Attempting to read page from server without opening Chrome in Docker',
    );

    if (this.assistedBrowser.isInteractiveEnabled()) {
      try {
        return await this.assistedBrowser.captureProductPreview(
          sourceUrl,
          marketplace,
          (legacyStepId, status, message) => {
            const mappedStepId = this.mapLegacyAssistedStep(legacyStepId, status);
            onStep?.(mappedStepId, status, message);
          },
        );
      } catch {
        onStep?.(
          'try_extraction',
          'warning',
          'Could not open automatic Chrome, manual path will continue without stopping import',
        );
      }
    }

    let page: { finalUrl: string; html: string } | null = null;
    let firstError: unknown;

    try {
      page = await this.fetchService.fetchProductPage(sourceUrl, marketplace);
      onStep?.('try_extraction', 'running', 'Page loaded and extracting data');
    } catch (error) {
      firstError = error;
      onStep?.(
        'try_extraction',
        'warning',
        'Could not load enough data from SHEIN, manual review will open',
      );
    }

    if (page) {
      try {
        const preview = this.extractor.extract(page.finalUrl || sourceUrl, page.html, marketplace);
        onStep?.('try_extraction', 'success', 'Extracted product data from page');
        onStep?.('show_preview', 'success', 'Preview ready for review');
        return preview;
      } catch (error) {
        firstError = error;
        onStep?.(
          'try_extraction',
          'warning',
          'SHEIN did not return enough data, manual review will open',
        );
      }
    }

    if (this.fetchService.shouldUseBrowserFallback()) {
      try {
        onStep?.(
          'try_extraction',
          'running',
          `Trying headless Chromium for a short time only ${Math.round(this.fetchService.browserTimeoutMs() / 1000)} seconds`,
        );
        const browserPage = await this.fetchService.dumpProductPageWithBrowser(
          sourceUrl,
          marketplace,
        );
        if (browserPage) {
          const preview = this.extractor.extract(
            browserPage.finalUrl || sourceUrl,
            browserPage.html,
            marketplace,
          );
          onStep?.('try_extraction', 'success', 'Data extracted via headless Chromium');
          onStep?.('show_preview', 'success', 'Preview ready for review');
          return preview;
        }
      } catch (error) {
        firstError = error;
      }
    }

    onStep?.('manual_review', 'warning', MANUAL_REVIEW_MESSAGE);
    throw firstError instanceof Error
      ? new Error(MANUAL_REVIEW_MESSAGE, { cause: firstError })
      : new Error(MANUAL_REVIEW_MESSAGE);
  }

  private async buildPreview(
    importId: string,
    rawPayload: unknown | undefined,
    onStep?: (stepId: string, status: SheinImportStep['status'], message?: string) => void,
  ) {
    const record = await this.prisma.sheinImport.findUniqueOrThrow({ where: { id: importId } });
    const marketplace = await this.marketplaceSettings.getSettings();
    this.logger.log(
      `SHEIN extraction started importId=${importId} country=${marketplace.countryCode} currency=${marketplace.currencyCode} lang=${marketplace.language}`,
    );
    await this.prisma.sheinImport.update({
      where: { id: importId },
      data: { status: SheinImportStatus.EXTRACTING, completedAt: null },
    });

    try {
      const preview = rawPayload
        ? this.normalizer.normalize(rawPayload, record.sourceUrl, { marketplace })
        : await this.extractV1StylePreview(record.sourceUrl, marketplace, onStep);

      if (preview.images.length < 2) {
        this.logger.warn(
          `SHEIN extraction manual review importId=${importId} reason=${MISSING_PRODUCT_IMAGES_MESSAGE}`,
        );
        onStep?.('manual_review', 'warning', MISSING_PRODUCT_IMAGES_MESSAGE);
        return this.prisma.sheinImport.update({
          where: { id: importId },
          data: {
            status: SheinImportStatus.MANUAL_REVIEW,
            previewPayload: preview as unknown as Prisma.InputJsonValue,
            rawPayload: rawPayload as Prisma.InputJsonValue | undefined,
            errorCode: 'SHEIN_IMPORT_IMAGES_NEED_MANUAL_REVIEW',
            errorMessage: MISSING_PRODUCT_IMAGES_MESSAGE,
            errors: { message: MISSING_PRODUCT_IMAGES_MESSAGE },
            completedAt: null,
          },
          include: this.include,
        });
      }

      this.logger.log(
        `SHEIN extraction succeeded importId=${importId} images=${preview.images.length} variants=${preview.variants.length}`,
      );
      return this.prisma.sheinImport.update({
        where: { id: importId },
        data: {
          status: SheinImportStatus.PREVIEW_READY,
          previewPayload: preview as unknown as Prisma.InputJsonValue,
          rawPayload: rawPayload as Prisma.InputJsonValue | undefined,
          errorCode: null,
          errorMessage: null,
          errors: Prisma.JsonNull,
          completedAt: null,
        },
        include: this.include,
      });
    } catch (error) {
      const friendlyMessage = this.friendlyExtractionMessage(
        error instanceof Error ? error.message : '',
      );
      this.logger.warn(`SHEIN extraction fallback importId=${importId} reason=${friendlyMessage}`);
      onStep?.('manual_review', 'warning', friendlyMessage);
      return this.prisma.sheinImport.update({
        where: { id: importId },
        data: {
          status: SheinImportStatus.MANUAL_REVIEW,
          errorCode: 'PREVIEW_EXTRACTION_NEEDS_MANUAL_REVIEW',
          errorMessage: friendlyMessage,
          errors: { message: friendlyMessage },
          completedAt: null,
        },
        include: this.include,
      });
    }
  }

  private mapLegacyAssistedStep(stepId: string, status: SheinImportStep['status']): string {
    if (stepId === 'browser_fallback') return 'open_market_link';
    if (stepId === 'read_html' || stepId === 'extract_product') return 'try_extraction';
    if (stepId === 'review_ready') return status === 'success' ? 'show_preview' : 'manual_review';
    return 'try_extraction';
  }

  private validateProductRequiredFields(payload: SheinImportPreview): void {
    if (!payload.nameAr.trim()) {
      throw new BadRequestException('Product name is required before approval');
    }
    if (
      !payload.priceAmount.trim() ||
      !Number.isFinite(Number(payload.priceAmount)) ||
      Number(payload.priceAmount) <= 0
    ) {
      throw new BadRequestException('Price is required before approval');
    }
    if (payload.currency !== FIXED_SHEIN_CURRENCY) {
      throw new BadRequestException('SHEIN import currency must be SAR (Saudi Riyal)');
    }
    if (!payload.country?.trim()) {
      throw new BadRequestException('Country is required before approval');
    }
    if (!payload.categoryId?.trim()) {
      throw new BadRequestException('Category is required before approval');
    }
    assertValidSheinSubCategory(payload.categorySlug, payload.subCategory);
  }

  private isStrictPreviewReady(preview: SheinImportPreview): boolean {
    return Boolean(
      preview.nameAr?.trim() &&
      preview.priceAmount?.trim() &&
      Number.isFinite(Number(preview.priceAmount)) &&
      Number(preview.priceAmount) > 0 &&
      preview.images.length >= 2,
    );
  }

  private withExtraction<
    T extends {
      status: SheinImportStatus;
      sourceUrl: string;
      previewPayload?: unknown;
      errorMessage?: string | null;
      errorCode?: string | null;
    },
  >(record: T, job?: SheinAssistJob): T & { extraction: SheinImportExtractionResponse } {
    return { ...record, extraction: this.toExtractionResponse(record, job) };
  }

  private toExtractionResponse(
    record: {
      status: SheinImportStatus;
      sourceUrl: string;
      previewPayload?: unknown;
      errorMessage?: string | null;
      errorCode?: string | null;
    },
    job?: SheinAssistJob,
  ): SheinImportExtractionResponse {
    if (
      job?.status === 'verification' ||
      job?.steps.some((step) => step.status === 'verification')
    ) {
      return {
        status: 'captcha_required',
        reason:
          job.progressMessage ||
          job.messageEn ||
          'SHEIN requires verification. Complete CAPTCHA in the opened browser, then retry extraction.',
        product: null,
      };
    }

    const preview = this.isPreview(record.previewPayload) ? record.previewPayload : null;
    if (record.status === SheinImportStatus.PREVIEW_READY && preview) {
      return {
        status: 'success',
        reason: 'Product extracted successfully.',
        product: this.previewToExtractedProduct(preview, record.sourceUrl),
      };
    }

    if (preview && preview.nameAr && preview.images.length > 0) {
      return {
        status: 'manual_review',
        reason:
          record.errorMessage || 'Partial product data was extracted and needs manual review.',
        product: this.previewToExtractedProduct(preview, record.sourceUrl),
      };
    }

    const reason =
      record.errorMessage || job?.lastError || job?.progressMessage || MANUAL_REVIEW_MESSAGE;
    return {
      status: record.status === SheinImportStatus.FAILED ? 'failed' : 'manual_review',
      reason,
      product: null,
    };
  }

  private previewToExtractedProduct(
    preview: SheinImportPreview,
    sourceUrl: string,
  ): SheinImportExtractionResponse['product'] {
    return {
      title: preview.nameEn || preview.nameAr,
      price: Number(preview.priceAmount),
      currency: 'SAR',
      originalPrice: preview.originalPriceAmount ? Number(preview.originalPriceAmount) : null,
      description: preview.description || '',
      images: preview.images.map((image) => image.url).filter(Boolean),
      variants: preview.variants.map((variant) => ({
        color: variant.color ?? null,
        size: variant.size ?? null,
        sku: variant.sku ?? null,
        stock: Number.isFinite(variant.stockQuantity) ? (variant.stockQuantity ?? null) : null,
      })),
      sourceUrl,
      sourceProductId: preview.sku ?? this.sourceProductIdFromUrl(sourceUrl),
      categorySuggestion: preview.categoryName ?? preview.categorySlug ?? null,
    };
  }

  private isPreview(value: unknown): value is SheinImportPreview {
    return Boolean(
      value &&
      typeof value === 'object' &&
      'nameAr' in value &&
      'priceAmount' in value &&
      'images' in value,
    );
  }

  private sourceProductIdFromUrl(sourceUrl: string): string | null {
    try {
      const url = new URL(sourceUrl);
      return (
        url.pathname.match(/-p-(\d+)/i)?.[1] ??
        url.searchParams.get('goods_id') ??
        url.searchParams.get('goodsId') ??
        url.searchParams.get('product_id') ??
        url.searchParams.get('url_from')?.match(/(?:GM)?(\d{6,})/i)?.[1] ??
        null
      );
    } catch {
      return null;
    }
  }
}
