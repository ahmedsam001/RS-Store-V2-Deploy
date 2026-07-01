import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus, OrderPaymentStatus, OrderStatus, Prisma, SheinBatchStatus, SheinImportStatus } from '@prisma/client';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AddSheinBatchItemDto } from './dto/add-shein-batch-item.dto';
import { AvailableOrderItemsQueryDto } from './dto/available-order-items-query.dto';
import { BulkAddSheinBatchItemsDto } from './dto/bulk-add-shein-batch-items.dto';
import { CreateSheinBatchDto } from './dto/create-shein-batch.dto';
import { SheinBatchesQueryDto, type SheinBatchStatusGroup } from './dto/shein-batches-query.dto';
import { UpdateSheinBatchStatusDto } from './dto/update-shein-batch-status.dto';
import { UpdateSheinBatchItemStatusDto } from './dto/update-shein-batch-item-status.dto';
import { UpdateSheinBatchDto } from './dto/update-shein-batch.dto';

type BatchWithItems = Prisma.SheinBatchGetPayload<{
  include: {
    items: {
      include: {
        order: {
          select: {
            id: true;
            orderNumber: true;
            status: true;
            paymentStatus: true;
            totalAmount: true;
            depositPaidAmount: true;
            finalPaidAmount: true;
            finalAmountDue: true;
            remainingAmount: true;
            customerNameSnapshot: true;
            customerPhoneSnapshot: true;
          };
        };
        orderItem: { select: { id: true; status: true } };
        product: { select: { id: true; slug: true; nameAr: true; nameEn: true; sourceSheinUrl: true } };
        productVariant: { select: { id: true; sku: true; nameAr: true; nameEn: true; size: true; color: true } };
      };
      orderBy: { createdAt: 'asc' };
    };
    statusHistory: { include: { changedBy: { select: { id: true; name: true; email: true; phone: true } } }; orderBy: { createdAt: 'asc' } };
    createdBy: { select: { id: true; name: true; email: true; phone: true } };
    updatedBy: { select: { id: true; name: true; email: true; phone: true } };
  };
}>;

type SheinImportPayloadSource = {
  editedPayload: Prisma.JsonValue | null;
  previewPayload: Prisma.JsonValue | null;
};

type AvailableOrderItemPricingInput = {
  productSkuSnapshot?: string | null;
  productVariantNameSnapshot?: string | null;
  productVariantSkuSnapshot?: string | null;
  productVariantSizeSnapshot?: string | null;
  productVariantColorSnapshot?: string | null;
  product?: {
    id?: string;
    slug?: string;
    nameAr?: string;
    nameEn?: string | null;
    sourceSheinUrl?: string | null;
    sheinImports?: SheinImportPayloadSource[];
  } | null;
  productVariant?: {
    id?: string;
    sku?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
    size?: string | null;
    color?: string | null;
  } | null;
};

const terminalStatuses = new Set<SheinBatchStatus>([SheinBatchStatus.DELIVERED, SheinBatchStatus.CANCELLED]);

const statusGroups: Record<SheinBatchStatusGroup, SheinBatchStatus[]> = {
  COLLECTING: [SheinBatchStatus.DRAFT],
  ORDERED: [SheinBatchStatus.ORDERED_FROM_SHEIN],
  IN_SHIPPING: [SheinBatchStatus.SHIPPING, SheinBatchStatus.CUSTOMS, SheinBatchStatus.ARRIVED_EGYPT],
  ARRIVED_SHOP: [SheinBatchStatus.ARRIVED_STORE, SheinBatchStatus.READY_FOR_PICKUP],
  COMPLETED: [SheinBatchStatus.DELIVERED],
  CANCELLED: [SheinBatchStatus.CANCELLED],
};

const statusLabels: Record<SheinBatchStatus, string> = {
  DRAFT: 'Collecting',
  ORDERED_FROM_SHEIN: 'Ordered from SHEIN',
  SHIPPING: 'Shipping',
  CUSTOMS: 'Customs',
  ARRIVED_EGYPT: 'Arrived Egypt',
  ARRIVED_STORE: 'Arrived at store',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const batchStatusToOrderItemStatus: Record<SheinBatchStatus, OrderItemStatus> = {
  DRAFT: OrderItemStatus.PENDING,
  ORDERED_FROM_SHEIN: OrderItemStatus.SHEIN,
  SHIPPING: OrderItemStatus.KUWAIT,
  CUSTOMS: OrderItemStatus.CUSTOMS,
  ARRIVED_EGYPT: OrderItemStatus.EGYPT,
  ARRIVED_STORE: OrderItemStatus.SHOP,
  READY_FOR_PICKUP: OrderItemStatus.SHOP,
  DELIVERED: OrderItemStatus.SHOP,
  CANCELLED: OrderItemStatus.PENDING,
};

const itemStatusLabels: Record<OrderItemStatus, string> = {
  PENDING: 'Pending',
  SHEIN: 'Ordered from SHEIN',
  KUWAIT: 'Arrived Kuwait',
  CUSTOMS: 'In customs',
  EGYPT: 'Arrived Egypt',
  SHOP: 'Arrived shop',
  CANCELLED: 'Cancelled',
};

@Injectable()
export class SheinBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateSheinBatchDto, user: AuthenticatedUser) {
    const exchangeRate = this.parseRate(dto.exchangeRateSarToEgp ?? '0');
    const initialStatus = dto.status ?? SheinBatchStatus.DRAFT;
    const requestedItems = dto.items ?? [];

    const batch = await this.prisma.$transaction(async (tx) => {
      const batchCode = await this.generateBatchCode(tx);
      const created = await tx.sheinBatch.create({
        data: {
          batchCode,
          title: dto.title?.trim() || null,
          sheinOrderReference: dto.sheinOrderReference?.trim() || null,
          trackingNumber: dto.trackingNumber?.trim() || null,
          trackingCarrier: dto.trackingCarrier?.trim() || null,
          trackingUrl: dto.trackingUrl?.trim() || null,
          exchangeRateSarToEgp: exchangeRate,
          status: initialStatus,
          ...this.statusTimestampPatch(initialStatus),
          orderedAt: dto.orderedAt ?? (initialStatus === SheinBatchStatus.ORDERED_FROM_SHEIN ? new Date() : undefined),
          notes: dto.notes?.trim() || null,
          createdById: user.id,
          updatedById: user.id,
        },
      });

      for (const itemDto of requestedItems) {
        await this.createBatchItem(tx, created, itemDto);
      }
      if (requestedItems.length > 0) {
        await this.recalculateTotalsInTransaction(tx, created.id);
      }

      await tx.sheinBatchStatusHistory.create({
        data: {
          batchId: created.id,
          fromStatus: null,
          toStatus: initialStatus,
          note: requestedItems.length > 0 ? `Batch created with ${requestedItems.length} item(s)` : 'Batch created',
          changedById: user.id,
        },
      });

      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_CREATED',
        entityType: 'SHEIN_BATCH',
        entityId: created.id,
        metadata: { batchCode: created.batchCode, status: created.status, itemsCount: requestedItems.length },
      });

      return created;
    });

    return this.findById(batch.id);
  }

  async findAll(query: SheinBatchesQueryDto) {
    const where = this.buildBatchWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sheinBatch.findMany({
        where,
        include: {
          items: { select: { orderId: true } },
          createdBy: { select: { id: true, name: true, email: true, phone: true } },
          updatedBy: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { items: true, statusHistory: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sheinBatch.count({ where }),
    ]);

    const mappedItems = items.map(({ items: batchItems, ...batch }) => ({
      ...batch,
      orderCount: new Set(batchItems.map((item) => item.orderId)).size,
      itemsCount: batch._count.items,
    }));

    return { items: mappedItems, meta: buildPaginationMeta(query, total) };
  }

  async findById(id: string) {
    const batch = await this.prisma.sheinBatch.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                depositPaidAmount: true,
                finalPaidAmount: true,
                finalAmountDue: true,
                remainingAmount: true,
                customerNameSnapshot: true,
                customerPhoneSnapshot: true,
              },
            },
            orderItem: { select: { id: true, status: true } },
            product: { select: { id: true, slug: true, nameAr: true, nameEn: true, sourceSheinUrl: true } },
            productVariant: { select: { id: true, sku: true, nameAr: true, nameEn: true, size: true, color: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, email: true, phone: true } } },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, name: true, email: true, phone: true } },
        updatedBy: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!batch) {
      throw new NotFoundException('SHEIN batch was not found');
    }

    return this.mapBatch(batch);
  }

  async update(id: string, dto: UpdateSheinBatchDto, user: AuthenticatedUser) {
    await this.ensureBatchExists(id);
    const nextExchangeRate = dto.exchangeRateSarToEgp !== undefined ? this.parseRate(dto.exchangeRateSarToEgp) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.sheinBatch.update({
        where: { id },
        data: {
          title: dto.title !== undefined ? dto.title.trim() || null : undefined,
          sheinOrderReference: dto.sheinOrderReference !== undefined ? dto.sheinOrderReference.trim() || null : undefined,
          trackingNumber: dto.trackingNumber !== undefined ? dto.trackingNumber.trim() || null : undefined,
          trackingCarrier: dto.trackingCarrier !== undefined ? dto.trackingCarrier.trim() || null : undefined,
          trackingUrl: dto.trackingUrl !== undefined ? dto.trackingUrl.trim() || null : undefined,
          exchangeRateSarToEgp: nextExchangeRate,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
          updatedById: user.id,
        },
      });

      if (nextExchangeRate !== undefined) {
        await this.refreshItemEgpAmountsInTransaction(tx, id, nextExchangeRate);
        await this.regenerateWhatsappMessagesInTransaction(tx, id);
      }

      await this.recalculateTotalsInTransaction(tx, id);
      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_UPDATED',
        entityType: 'SHEIN_BATCH',
        entityId: batch.id,
        metadata: { batchCode: batch.batchCode, exchangeRateUpdated: nextExchangeRate !== undefined },
      });

      return batch;
    });

    return this.findById(updated.id);
  }

  async updateStatus(id: string, dto: UpdateSheinBatchStatusDto, user: AuthenticatedUser) {
    const current = await this.ensureBatchExists(id);
    if (current.status === dto.status) {
      return this.findById(id);
    }
    if (terminalStatuses.has(current.status)) {
      throw new BadRequestException('Delivered or cancelled SHEIN batches cannot be moved to another status');
    }

    const syncedItemStatus = batchStatusToOrderItemStatus[dto.status];
    await this.prisma.$transaction(async (tx) => {
      await tx.sheinBatch.update({
        where: { id },
        data: {
          status: dto.status,
          updatedById: user.id,
          ...this.statusTimestampPatch(dto.status),
        },
      });

      const syncResult = await this.syncOrderItemsForBatchStatusInTransaction(tx, id, syncedItemStatus);
      const openedFinalPaymentCount = syncedItemStatus === OrderItemStatus.SHOP
        ? await this.openFinalPaymentForOrdersInTransaction(tx, syncResult.orderIds, user.id)
        : 0;

      const autoFinalPaymentNote = openedFinalPaymentCount > 0
        ? ` Final payment opened for ${openedFinalPaymentCount} order(s).`
        : '';

      await tx.sheinBatchStatusHistory.create({
        data: {
          batchId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          note:
            dto.note?.trim() ||
            `Batch tracking synced ${syncResult.count} item(s) to ${itemStatusLabels[syncedItemStatus]}.${autoFinalPaymentNote}`,
          changedById: user.id,
        },
      });

      await this.regenerateWhatsappMessagesInTransaction(tx, id);

      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_STATUS_UPDATED',
        entityType: 'SHEIN_BATCH',
        entityId: id,
        metadata: {
          fromStatus: current.status,
          toStatus: dto.status,
          note: dto.note ?? null,
          syncedItemStatus,
          syncedOrderItemsCount: syncResult.count,
          openedFinalPaymentCount,
        },
      });
    });

    return this.findById(id);
  }

  async updateItemStatus(batchId: string, itemId: string, dto: UpdateSheinBatchItemStatusDto, user: AuthenticatedUser) {
    const item = await this.prisma.sheinBatchItem.findFirst({
      where: { id: itemId, batchId },
      include: { batch: { select: { id: true, batchCode: true, status: true } } },
    });
    if (!item) {
      throw new NotFoundException('SHEIN batch item was not found');
    }
    if (terminalStatuses.has(item.batch.status)) {
      throw new BadRequestException('Items inside delivered or cancelled SHEIN batches cannot be updated');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.orderItemId },
        data: { status: dto.status },
      });

      const openedFinalPaymentCount = dto.status === OrderItemStatus.SHOP
        ? await this.openFinalPaymentForOrdersInTransaction(tx, [item.orderId], user.id)
        : 0;

      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_ITEM_STATUS_UPDATED',
        entityType: 'SHEIN_BATCH_ITEM',
        entityId: item.id,
        metadata: {
          batchId,
          batchCode: item.batch.batchCode,
          orderItemId: item.orderItemId,
          status: dto.status,
          note: dto.note?.trim() || null,
          openedFinalPaymentCount,
        },
      });
    });

    return this.findById(batchId);
  }

  async addItem(batchId: string, dto: AddSheinBatchItemDto, user: AuthenticatedUser) {
    await this.addItems(batchId, { items: [dto] }, user);
    return this.findById(batchId);
  }

  async addItems(batchId: string, dto: BulkAddSheinBatchItemsDto, user: AuthenticatedUser) {
    const batch = await this.ensureBatchExists(batchId);
    if (terminalStatuses.has(batch.status)) {
      throw new BadRequestException('Cannot add items to a delivered or cancelled SHEIN batch');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const itemDto of dto.items) {
        await this.createBatchItem(tx, batch, itemDto);
      }
      await this.recalculateTotalsInTransaction(tx, batchId);
      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_ITEMS_ADDED',
        entityType: 'SHEIN_BATCH',
        entityId: batchId,
        metadata: { count: dto.items.length, orderItemIds: dto.items.map((item) => item.orderItemId) },
      });
    });

    return this.findById(batchId);
  }

  async removeItem(batchId: string, itemId: string, user: AuthenticatedUser) {
    const batch = await this.ensureBatchExists(batchId);
    if (batch.status !== SheinBatchStatus.DRAFT) {
      throw new BadRequestException('Order items can only be removed while the SHEIN batch is still collecting. Use an item cancellation workflow after the batch has been ordered or shipped.');
    }

    const item = await this.prisma.sheinBatchItem.findFirst({ where: { id: itemId, batchId } });
    if (!item) {
      throw new NotFoundException('SHEIN batch item was not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sheinBatchItem.delete({ where: { id: item.id } });
      await tx.orderItem.updateMany({
        where: { id: item.orderItemId, status: { not: OrderItemStatus.CANCELLED } },
        data: { status: OrderItemStatus.PENDING },
      });
      await this.recalculateTotalsInTransaction(tx, batchId);
      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_ITEM_REMOVED',
        entityType: 'SHEIN_BATCH',
        entityId: batchId,
        metadata: { sheinBatchItemId: item.id, orderItemId: item.orderItemId, batchStatus: batch.status },
      });
    });

    return this.findById(batchId);
  }

  async recalculate(id: string, user: AuthenticatedUser) {
    await this.recalculateTotals(id, user, true);
    return this.findById(id);
  }

  async whatsappNotifications(id: string) {
    const batch = await this.findById(id);
    const items = batch.items ?? [];
    return {
      batchId: batch.id,
      batchCode: batch.batchCode,
      status: batch.status,
      statusLabel: statusLabels[batch.status],
      items: items.map((item) => ({
        itemId: item.id,
        orderItemId: item.orderItemId,
        orderNumber: item.orderNumberSnapshot,
        customerName: item.customerNameSnapshot,
        customerPhone: item.customerPhoneSnapshot,
        productName: item.productNameSnapshot,
        variantName: item.productVariantNameSnapshot,
        quantity: item.quantity,
        totalEgpAmount: item.totalEgpAmount,
        whatsappMessage: item.whatsappMessageTemplate ?? '',
        whatsappUrl: item.whatsappUrl,
      })),
    };
  }

  async regenerateWhatsappMessages(id: string, user: AuthenticatedUser) {
    await this.ensureBatchExists(id);
    await this.prisma.$transaction(async (tx) => {
      await this.regenerateWhatsappMessagesInTransaction(tx, id);
      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_WHATSAPP_MESSAGES_REGENERATED',
        entityType: 'SHEIN_BATCH',
        entityId: id,
      });
    });
    return this.findById(id);
  }

  async updateItemWhatsappMessage(batchId: string, itemId: string, message: string, user: AuthenticatedUser) {
    await this.ensureBatchExists(batchId);
    const cleanedMessage = message.trim();
    if (!cleanedMessage) {
      throw new BadRequestException('WhatsApp message cannot be empty');
    }

    const item = await this.prisma.sheinBatchItem.findFirst({ where: { id: itemId, batchId } });
    if (!item) {
      throw new NotFoundException('SHEIN batch item was not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sheinBatchItem.update({ where: { id: item.id }, data: { whatsappMessageTemplate: cleanedMessage } });
      await this.audit.logInTransaction(tx, {
        actorUserId: user.id,
        action: 'SHEIN_BATCH_WHATSAPP_MESSAGE_UPDATED',
        entityType: 'SHEIN_BATCH_ITEM',
        entityId: item.id,
        metadata: { batchId, orderItemId: item.orderItemId },
      });
    });

    return this.findById(batchId);
  }

  async findAvailableOrderItems(query: AvailableOrderItemsQueryDto) {
    const where: Prisma.OrderItemWhereInput = {
      status: { not: OrderItemStatus.CANCELLED },
      order: {
        status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        paymentStatus: OrderPaymentStatus.DEPOSIT_APPROVED,
      },
      sheinBatchItems: { none: { batch: { status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] } } } },
    };

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { productNameSnapshot: { contains: search, mode: 'insensitive' } },
        { productVariantNameSnapshot: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customerNameSnapshot: { contains: search, mode: 'insensitive' } } },
        { order: { customerPhoneSnapshot: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.orderItem.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              depositPaidAmount: true,
              remainingAmount: true,
              customerNameSnapshot: true,
              customerPhoneSnapshot: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              slug: true,
              nameAr: true,
              nameEn: true,
              sourceSheinUrl: true,
              sheinImports: {
                where: { status: { in: [SheinImportStatus.PUBLISHED, SheinImportStatus.PRODUCT_CREATED, SheinImportStatus.SUCCEEDED] } },
                select: { editedPayload: true, previewPayload: true, publishedAt: true, createdAt: true },
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 1,
              },
            },
          },
          productVariant: { select: { id: true, sku: true, nameAr: true, nameEn: true, size: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return { items: items.map((item) => this.mapAvailableOrderItem(item)), meta: buildPaginationMeta(query, total) };
  }

  private mapAvailableOrderItem<T extends AvailableOrderItemPricingInput>(item: T) {
    const product = item.product
      ? {
          id: item.product.id,
          slug: item.product.slug,
          nameAr: item.product.nameAr,
          nameEn: item.product.nameEn,
          sourceSheinUrl: item.product.sourceSheinUrl,
        }
      : null;

    return {
      ...item,
      product,
      suggestedUnitSarAmount: this.resolveSuggestedUnitSarAmount(item),
    };
  }

  private resolveSuggestedUnitSarAmount(item: AvailableOrderItemPricingInput): string | null {
    const payload = this.resolveSheinImportPayload(item.product?.sheinImports ?? []);
    if (!payload) return null;

    return this.resolveSheinVariantPrice(payload, item) ?? this.normalizeMajorMoney(payload.priceAmount);
  }

  private resolveSheinImportPayload(imports: SheinImportPayloadSource[]): Record<string, unknown> | null {
    for (const item of imports) {
      if (this.isRecord(item.editedPayload)) return item.editedPayload;
      if (this.isRecord(item.previewPayload)) return item.previewPayload;
    }
    return null;
  }

  private resolveSheinVariantPrice(payload: Record<string, unknown>, item: AvailableOrderItemPricingInput): string | null {
    if (!Array.isArray(payload.variants)) return null;

    const variants = payload.variants.filter((variant): variant is Record<string, unknown> => this.isRecord(variant));
    const skuCandidates = new Set([
      this.normalizeComparable(item.productVariantSkuSnapshot),
      this.normalizeComparable(item.productVariant?.sku),
    ].filter((value): value is string => Boolean(value)));

    for (const variant of variants) {
      const price = this.normalizeMajorMoney(variant.priceAmount);
      const sku = this.normalizeComparable(variant.sku);
      if (price && sku && skuCandidates.has(sku)) return price;
    }

    const size = this.normalizeComparable(item.productVariantSizeSnapshot ?? item.productVariant?.size);
    const color = this.normalizeComparable(item.productVariantColorSnapshot ?? item.productVariant?.color);
    if (size || color) {
      for (const variant of variants) {
        const price = this.normalizeMajorMoney(variant.priceAmount);
        if (!price) continue;
        const variantSize = this.normalizeComparable(variant.size);
        const variantColor = this.normalizeComparable(variant.color);
        const sizeMatches = !size || variantSize === size;
        const colorMatches = !color || variantColor === color;
        if (sizeMatches && colorMatches) return price;
      }
    }

    const nameCandidates = new Set([
      this.normalizeComparable(item.productVariantNameSnapshot),
      this.normalizeComparable(item.productVariant?.nameEn),
      this.normalizeComparable(item.productVariant?.nameAr),
    ].filter((value): value is string => Boolean(value)));

    for (const variant of variants) {
      const price = this.normalizeMajorMoney(variant.priceAmount);
      if (!price) continue;
      const variantNames = [
        this.normalizeComparable(variant.nameEn),
        this.normalizeComparable(variant.nameAr),
        this.normalizeComparable(variant.name),
      ].filter((value): value is string => Boolean(value));
      if (variantNames.some((name) => nameCandidates.has(name))) return price;
    }

    return null;
  }

  private normalizeMajorMoney(value: unknown): string | null {
    const number = Number(String(value ?? '').replace(/,/g, '').trim());
    if (!Number.isFinite(number) || number <= 0) return null;
    return number.toFixed(2).replace(/\.00$/, '');
  }

  private normalizeComparable(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
    return normalized || null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private async createBatchItem(tx: Prisma.TransactionClient, batch: { id: string; batchCode: string; status: SheinBatchStatus; exchangeRateSarToEgp: Prisma.Decimal }, dto: AddSheinBatchItemDto) {
    const existingInThisBatch = await tx.sheinBatchItem.findFirst({ where: { batchId: batch.id, orderItemId: dto.orderItemId } });
    if (existingInThisBatch) {
      throw new ConflictException('This order item already exists in this SHEIN batch');
    }

    const existingActiveBatch = await tx.sheinBatchItem.findFirst({
      where: {
        orderItemId: dto.orderItemId,
        batch: { status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] } },
      },
      include: { batch: { select: { batchCode: true, status: true } } },
    });
    if (existingActiveBatch) {
      throw new ConflictException(`This order item is already assigned to active batch ${existingActiveBatch.batch.batchCode}`);
    }

    const orderItem = await tx.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            customerNameSnapshot: true,
            customerPhoneSnapshot: true,
          },
        },
        product: {
          select: {
            id: true,
            sheinImports: {
              where: { status: { in: [SheinImportStatus.PUBLISHED, SheinImportStatus.PRODUCT_CREATED, SheinImportStatus.SUCCEEDED] } },
              select: { editedPayload: true, previewPayload: true, publishedAt: true, createdAt: true },
              orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
          },
        },
        productVariant: { select: { id: true, sku: true, nameAr: true, nameEn: true, size: true, color: true } },
      },
    });
    if (!orderItem) {
      throw new NotFoundException('Order item was not found');
    }
    if (orderItem.status === OrderItemStatus.CANCELLED) {
      throw new BadRequestException('Cancelled order items cannot be added to a SHEIN batch');
    }
    if (orderItem.order.status === OrderStatus.CANCELLED || orderItem.order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cancelled or completed orders cannot be added to a SHEIN batch');
    }
    if (orderItem.order.paymentStatus !== OrderPaymentStatus.DEPOSIT_APPROVED) {
      throw new BadRequestException('Only orders with approved deposit can be added to a SHEIN batch');
    }

    const quantity = dto.quantity ?? orderItem.quantity;
    if (quantity < 1 || quantity > orderItem.quantity) {
      throw new BadRequestException('Quantity must be between 1 and the order item quantity');
    }

    const requestedUnitSarAmount = dto.unitSarAmount?.trim();
    const suggestedUnitSarAmount = this.resolveSuggestedUnitSarAmount(orderItem);
    const unitSarAmount = requestedUnitSarAmount
      ? this.parseMoney(requestedUnitSarAmount)
      : suggestedUnitSarAmount
        ? this.parseMoney(suggestedUnitSarAmount)
        : 0;
    const unitEgpAmount = dto.unitEgpAmount ? this.parseMoney(dto.unitEgpAmount) : this.convertSarToEgp(unitSarAmount, batch.exchangeRateSarToEgp);
    const totalSarAmount = unitSarAmount * quantity;
    const totalEgpAmount = unitEgpAmount * quantity;

    await tx.sheinBatchItem.create({
      data: {
        batchId: batch.id,
        orderId: orderItem.order.id,
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        productVariantId: orderItem.productVariantId,
        orderNumberSnapshot: orderItem.order.orderNumber,
        customerNameSnapshot: orderItem.order.customerNameSnapshot,
        customerPhoneSnapshot: orderItem.order.customerPhoneSnapshot,
        productNameSnapshot: orderItem.productNameSnapshot,
        productVariantNameSnapshot: orderItem.productVariantNameSnapshot,
        quantity,
        unitSarAmount,
        totalSarAmount,
        unitEgpAmount,
        totalEgpAmount,
        whatsappMessageTemplate: dto.whatsappMessageTemplate?.trim() || this.buildWhatsappMessageTemplate({
          customerName: orderItem.order.customerNameSnapshot,
          orderNumber: orderItem.order.orderNumber,
          batchCode: batch.batchCode,
          status: batch.status,
          productName: orderItem.productNameSnapshot,
          variantName: orderItem.productVariantNameSnapshot,
          quantity,
          totalEgpAmount,
        }),
        notes: dto.notes?.trim() || null,
      },
    });
  }

  private async generateBatchCode(tx: Prisma.TransactionClient) {
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const counter = await tx.sheinBatchNumberCounter.upsert({
      where: { batchMonth: month },
      create: { batchMonth: month, nextNumber: 2 },
      update: { nextNumber: { increment: 1 } },
    });
    const sequence = counter.nextNumber - 1;
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `SH-${yyyy}-${mm}-${String(sequence).padStart(3, '0')}`;
  }

  private buildBatchWhere(query: SheinBatchesQueryDto): Prisma.SheinBatchWhereInput {
    const where: Prisma.SheinBatchWhereInput = {};
    if (query.status) {
      where.status = query.status;
    } else if (query.statusGroup) {
      where.status = { in: statusGroups[query.statusGroup] };
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { batchCode: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { sheinOrderReference: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { trackingCarrier: { contains: search, mode: 'insensitive' } },
        { items: { some: { orderNumberSnapshot: { contains: search, mode: 'insensitive' } } } },
        { items: { some: { customerPhoneSnapshot: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        gte: query.createdFrom,
        lte: query.createdTo,
      };
    }
    return where;
  }

  private async ensureBatchExists(id: string) {
    const batch = await this.prisma.sheinBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('SHEIN batch was not found');
    }
    return batch;
  }

  private async recalculateTotals(id: string, user: AuthenticatedUser, audit: boolean) {
    await this.prisma.$transaction(async (tx) => {
      await this.recalculateTotalsInTransaction(tx, id);
      if (audit) {
        await this.audit.logInTransaction(tx, {
          actorUserId: user.id,
          action: 'SHEIN_BATCH_TOTALS_RECALCULATED',
          entityType: 'SHEIN_BATCH',
          entityId: id,
        });
      }
    });
  }

  private async recalculateTotalsInTransaction(tx: Prisma.TransactionClient, id: string) {
    const aggregate = await tx.sheinBatchItem.aggregate({
      where: { batchId: id },
      _sum: { quantity: true, totalSarAmount: true, totalEgpAmount: true },
    });
    await tx.sheinBatch.update({
      where: { id },
      data: {
        totalQuantity: aggregate._sum.quantity ?? 0,
        totalSarAmount: aggregate._sum.totalSarAmount ?? 0,
        totalEgpAmount: aggregate._sum.totalEgpAmount ?? 0,
      },
    });
  }

  private async refreshItemEgpAmountsInTransaction(tx: Prisma.TransactionClient, batchId: string, rate: Prisma.Decimal) {
    const items = await tx.sheinBatchItem.findMany({
      where: { batchId, unitSarAmount: { gt: 0 } },
      select: { id: true, unitSarAmount: true, quantity: true },
    });

    for (const item of items) {
      const unitEgpAmount = this.convertSarToEgp(item.unitSarAmount, rate);
      await tx.sheinBatchItem.update({
        where: { id: item.id },
        data: {
          unitEgpAmount,
          totalEgpAmount: unitEgpAmount * item.quantity,
        },
      });
    }
  }

  private async regenerateWhatsappMessagesInTransaction(tx: Prisma.TransactionClient, batchId: string) {
    const batch = await tx.sheinBatch.findUnique({
      where: { id: batchId },
      select: { id: true, batchCode: true, status: true },
    });
    if (!batch) {
      throw new NotFoundException('SHEIN batch was not found');
    }

    const items = await tx.sheinBatchItem.findMany({ where: { batchId } });
    for (const item of items) {
      await tx.sheinBatchItem.update({
        where: { id: item.id },
        data: {
          whatsappMessageTemplate: this.buildWhatsappMessageTemplate({
            customerName: item.customerNameSnapshot,
            orderNumber: item.orderNumberSnapshot,
            batchCode: batch.batchCode,
            status: batch.status,
            productName: item.productNameSnapshot,
            variantName: item.productVariantNameSnapshot,
            quantity: item.quantity,
            totalEgpAmount: item.totalEgpAmount,
          }),
        },
      });
    }
  }

  private async syncOrderItemsForBatchStatusInTransaction(tx: Prisma.TransactionClient, batchId: string, status: OrderItemStatus) {
    const items = await tx.sheinBatchItem.findMany({
      where: { batchId },
      include: { orderItem: { select: { id: true, status: true } } },
    });

    const activeItems = items.filter((item) => item.orderItem.status !== OrderItemStatus.CANCELLED);
    const orderItemIds = Array.from(new Set(activeItems.map((item) => item.orderItemId)));
    const orderIds = Array.from(new Set(activeItems.map((item) => item.orderId)));
    if (orderItemIds.length === 0) {
      return { count: 0, orderIds };
    }

    const result = await tx.orderItem.updateMany({
      where: { id: { in: orderItemIds }, status: { not: OrderItemStatus.CANCELLED } },
      data: { status },
    });
    return { count: result.count, orderIds };
  }

  private async openFinalPaymentForOrdersInTransaction(
    tx: Prisma.TransactionClient,
    orderIds: string[],
    actorUserId?: string | null,
  ) {
    let openedCount = 0;
    for (const orderId of Array.from(new Set(orderIds))) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
          remainingAmount: true,
          status: true,
        },
      });
      if (!order || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) continue;
      if (order.paymentStatus !== OrderPaymentStatus.DEPOSIT_APPROVED) continue;

      const notReadyItems = await tx.orderItem.count({
        where: {
          orderId,
          status: { notIn: [OrderItemStatus.SHOP, OrderItemStatus.CANCELLED] },
        },
      });
      if (notReadyItems > 0) continue;

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_PENDING,
          finalAmountDue: order.remainingAmount,
        },
      });
      await tx.notification.create({
        data: {
          titleAr: 'Final payment is ready',
          titleEn: 'Final payment is ready',
          messageAr: `All items for order ${order.orderNumber} reached the shop and final payment can be requested`,
          messageEn: `All items for order ${order.orderNumber} reached the shop and final payment can be requested`,
          type: 'ORDER',
          entityType: 'ORDER',
          entityId: orderId,
        },
      });
      await this.audit.logInTransaction(tx, {
        actorUserId: actorUserId ?? undefined,
        action: 'FINAL_PAYMENT_OPENED_FROM_BATCH',
        entityType: 'ORDER',
        entityId: orderId,
        metadata: { orderNumber: order.orderNumber, remainingAmount: order.remainingAmount },
      });
      openedCount += 1;
    }
    return openedCount;
  }

  private mapBatch(batch: BatchWithItems) {
    const items = batch.items.map((item) => ({
      ...item,
      whatsappUrl: this.buildWhatsappUrl(item.customerPhoneSnapshot, item.whatsappMessageTemplate ?? ''),
    }));
    return {
      ...batch,
      exchangeRateSarToEgp: batch.exchangeRateSarToEgp.toString(),
      items,
      sheinLinksWhatsappMessage: this.buildSheinLinksWhatsappMessage({
        batchCode: batch.batchCode,
        totalQuantity: batch.totalQuantity,
        totalSarAmount: batch.totalSarAmount,
        totalEgpAmount: batch.totalEgpAmount,
        items,
      }),
    };
  }

  private buildSheinLinksWhatsappMessage(input: {
    batchCode: string;
    totalQuantity: number;
    totalSarAmount: Prisma.Decimal | number;
    totalEgpAmount: Prisma.Decimal | number;
    items: Array<{
      productNameSnapshot: string;
      quantity: number;
      product?: { nameAr: string; nameEn: string | null; sourceSheinUrl: string | null } | null;
    }>;
  }) {
    const lines = [`SHEIN Batch ${input.batchCode}`, 'Products links', ''];
    input.items.forEach((item, index) => {
      lines.push(String(index + 1));
      lines.push(item.product?.nameEn || item.product?.nameAr || item.productNameSnapshot);
      lines.push(`Qty ${item.quantity}`);
      lines.push(`Link ${item.product?.sourceSheinUrl?.trim() || 'Missing link'}`);
      lines.push('');
    });
    lines.push(`Total items ${input.totalQuantity}`);
    lines.push(`Total SAR ${this.formatMinorMoney(input.totalSarAmount, 'SAR')}`);
    lines.push(`Total EGP ${this.formatMinorMoney(input.totalEgpAmount, 'EGP')}`);
    return lines.join('\n');
  }

  private formatMinorMoney(value: Prisma.Decimal | number, currency: string) {
    const numeric = value instanceof Prisma.Decimal ? value.toNumber() : Number(value);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((Number.isFinite(numeric) ? numeric : 0) / 100);
  }

  private parseMoney(value: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException('Money amount must be a positive number');
    }
    return Math.round(number * 100);
  }

  private parseRate(value: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException('Exchange rate must be a positive number');
    }
    return new Prisma.Decimal(value);
  }

  private convertSarToEgp(unitSarAmount: number, rate: Prisma.Decimal) {
    if (unitSarAmount <= 0 || rate.lte(0)) {
      return 0;
    }
    return Math.round(unitSarAmount * rate.toNumber());
  }

  private statusTimestampPatch(status: SheinBatchStatus): {
  orderedAt?: Date;
  shippedAt?: Date;
  customsAt?: Date;
  arrivedEgyptAt?: Date;
  arrivedStoreAt?: Date;
  readyForPickupAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
} {
    const now = new Date();
    if (status === SheinBatchStatus.ORDERED_FROM_SHEIN) return { orderedAt: now };
    if (status === SheinBatchStatus.SHIPPING) return { shippedAt: now };
    if (status === SheinBatchStatus.CUSTOMS) return { customsAt: now };
    if (status === SheinBatchStatus.ARRIVED_EGYPT) return { arrivedEgyptAt: now };
    if (status === SheinBatchStatus.ARRIVED_STORE) return { arrivedStoreAt: now };
    if (status === SheinBatchStatus.READY_FOR_PICKUP) return { readyForPickupAt: now };
    if (status === SheinBatchStatus.DELIVERED) return { deliveredAt: now };
    if (status === SheinBatchStatus.CANCELLED) return { cancelledAt: now };
    return {};
  }

  private buildWhatsappMessageTemplate(input: {
    customerName: string;
    orderNumber: string;
    batchCode: string;
    status: SheinBatchStatus;
    productName: string;
    variantName?: string | null;
    quantity: number;
    totalEgpAmount: number;
  }) {
    const totalEgp = (input.totalEgpAmount / 100).toFixed(2);
    const variantLine = input.variantName ? `\nSize/Color: ${input.variantName}` : '';
    const pickupLine = input.status === SheinBatchStatus.READY_FOR_PICKUP ? '\nYour order is ready for pickup from the store' : '';
    const deliveredLine = input.status === SheinBatchStatus.DELIVERED ? '\nYour order has been delivered. Thank you for trusting us.' : '';
    return `Hello ${input.customerName}\nUpdate for order #${input.orderNumber}\nProduct: ${input.productName}${variantLine}\nItems: ${input.quantity}\nShipment: ${input.batchCode}\nCurrent status: ${statusLabels[input.status]}\nTotal: ${totalEgp} EGP${pickupLine}${deliveredLine}\nWe will notify you of any new updates`;
  }

  private buildWhatsappUrl(phone: string, message: string) {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') && digits.length >= 10 ? `20${digits.slice(1)}` : digits;
    return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
  }
}
