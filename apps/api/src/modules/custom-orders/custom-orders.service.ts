import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomOrderStatus,
  InventoryStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { moneyStringToMinorUnits } from '../../common/money/money';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UploadedImageFile } from '../uploads/upload-file.type';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { CustomOrdersQueryDto } from './dto/custom-orders-query.dto';
import { ReviewCustomOrderDto } from './dto/review-custom-order.dto';

const CUSTOM_ORDER_IMAGE_FOLDER = 'rs-store/products';

const customOrderInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  reviewedBy: { select: { id: true, name: true, email: true, phone: true } },
  convertedOrder: { select: { id: true, orderNumber: true, status: true, paymentStatus: true } },
} satisfies Prisma.CustomOrderRequestInclude;

const customOrderOrderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  paymentProofs: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly auditService: AuditService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCustomOrderDto, file?: UploadedImageFile) {
    const uploaded = file
      ? await this.uploadsService.uploadImage(file, { folder: CUSTOM_ORDER_IMAGE_FOLDER })
      : null;

    try {
      const created = await this.prisma.customOrderRequest.create({
        data: {
          userId: user.id,
          productUrl: dto.productUrl.trim(),
          requestedColor: this.optionalText(dto.requestedColor),
          requestedSize: this.optionalText(dto.requestedSize),
          quantity: dto.quantity,
          customerNote: this.optionalText(dto.customerNote),
          customerImageUrl: uploaded?.secureUrl ?? null,
          customerImagePublicId: uploaded?.cloudinaryPublicId ?? null,
        },
        include: customOrderInclude,
      });

      await this.auditService.log({
        actorUserId: user.id,
        action: 'CUSTOM_ORDER_CREATED',
        entityType: 'CUSTOM_ORDER',
        entityId: created.id,
        metadata: { productUrl: created.productUrl, quantity: created.quantity },
      });

      return created;
    } catch (error) {
      if (uploaded) await this.uploadsService.deleteImage(uploaded.cloudinaryPublicId).catch(() => undefined);
      throw error;
    }
  }

  findMine(user: AuthenticatedUser) {
    return this.prisma.customOrderRequest.findMany({
      where: { userId: user.id },
      include: customOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAdmin(query: CustomOrdersQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomOrderRequestWhereInput = {
      status: query.status,
      OR: search
        ? [
            { productUrl: { contains: search, mode: 'insensitive' } },
            { requestedColor: { contains: search, mode: 'insensitive' } },
            { requestedSize: { contains: search, mode: 'insensitive' } },
            { customerNote: { contains: search, mode: 'insensitive' } },
            { adminTitle: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customOrderRequest.findMany({
        where,
        include: customOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.customOrderRequest.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query, total) };
  }

  async review(actor: AuthenticatedUser, id: string, dto: ReviewCustomOrderDto, file?: UploadedImageFile) {
    if (dto.status !== CustomOrderStatus.ACCEPTED && dto.status !== CustomOrderStatus.REJECTED) {
      throw new BadRequestException('Custom order can only be accepted or rejected');
    }

    const current = await this.prisma.customOrderRequest.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Custom order request not found');
    if (current.convertedOrderId) throw new ConflictException('Converted custom orders cannot be edited');

    const uploaded = file
      ? await this.uploadsService.uploadImage(file, { folder: CUSTOM_ORDER_IMAGE_FOLDER })
      : null;

    try {
      const data = this.buildReviewData(actor, dto, uploaded);
      const updated = await this.prisma.$transaction(async (tx) => {
        const record = await tx.customOrderRequest.update({
          where: { id },
          data,
          include: customOrderInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'CUSTOM_ORDER_REVIEWED',
            entityType: 'CUSTOM_ORDER',
            entityId: id,
            metadata: { from: current.status, to: dto.status, adminTitle: data.adminTitle ?? current.adminTitle },
          },
        });
        return record;
      });

      if (uploaded && current.adminImagePublicId) {
        await this.uploadsService.deleteImage(current.adminImagePublicId).catch(() => undefined);
      }

      return updated;
    } catch (error) {
      if (uploaded) await this.uploadsService.deleteImage(uploaded.cloudinaryPublicId).catch(() => undefined);
      throw error;
    }
  }

  async createOrderFromAccepted(user: AuthenticatedUser, id: string) {
    const request = await this.prisma.customOrderRequest.findFirst({
      where: { id, userId: user.id },
      include: { user: true, convertedOrder: { include: customOrderOrderInclude } },
    });
    if (!request) throw new NotFoundException('Custom order request not found');
    if (request.status !== CustomOrderStatus.ACCEPTED) throw new BadRequestException('Custom order is not accepted yet');
    if (request.convertedOrder) return request.convertedOrder;
    if (!request.adminTitle || request.adminTotalAmount === null) {
      throw new BadRequestException('Custom order is missing final product details');
    }

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.customOrderRequest.findUnique({ where: { id } });
      if (!locked || locked.userId !== user.id) throw new NotFoundException('Custom order request not found');
      if (locked.convertedOrderId) {
        return tx.order.findUniqueOrThrow({ where: { id: locked.convertedOrderId }, include: customOrderOrderInclude });
      }

      const title = locked.adminTitle;
      if (!title) throw new BadRequestException('Custom order is missing final product title');
      const orderNumber = await this.createOrderNumber(tx);
      const total = locked.adminTotalAmount ?? 0;
      const depositPercent = 50;
      const depositAmount = Math.ceil((total * depositPercent) / 100);
      const remainingAmount = Math.max(total - depositAmount, 0);
      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber,
          status: OrderStatus.PENDING,
          paymentStatus: OrderPaymentStatus.DEPOSIT_PENDING,
          currency: 'EGP',
          subtotalAmount: total,
          discountAmount: 0,
          totalAmount: total,
          depositPercent,
          depositAmount,
          remainingAmount,
          depositPaymentMethod: PaymentMethod.INSTAPAY,
          depositPaymentFeeAmount: 0,
          finalAmountDue: remainingAmount,
          inventoryStatus: InventoryStatus.NONE,
          customerNameSnapshot: request.user.name,
          customerPhoneSnapshot: request.user.phone ?? 'Not provided',
          customerEmailSnapshot: request.user.email,
          shippingAddressSnapshot: request.user.address ?? 'Custom order checkout',
          notes: locked.adminNote,
          items: {
            create: {
              productId: null,
              productVariantId: null,
              productNameSnapshot: title,
              productSkuSnapshot: `CUSTOM-${locked.id.slice(0, 8).toUpperCase()}`,
              productVariantNameSnapshot: null,
              productVariantSkuSnapshot: null,
              productVariantSizeSnapshot: locked.requestedSize,
              productVariantColorSnapshot: locked.requestedColor,
              quantity: locked.quantity,
              unitPriceAmount: Math.floor(total / locked.quantity),
              lineTotalAmount: total,
            },
          },
        },
        include: customOrderOrderInclude,
      });

      await tx.customOrderRequest.update({ where: { id }, data: { convertedOrderId: order.id } });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'CUSTOM_ORDER_CONVERTED_TO_ORDER',
          entityType: 'CUSTOM_ORDER',
          entityId: id,
          metadata: { orderId: order.id, orderNumber },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'ORDER_CREATED_FROM_CUSTOM_ORDER',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { customOrderId: id, orderNumber },
        },
      });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private buildReviewData(
    actor: AuthenticatedUser,
    dto: ReviewCustomOrderDto,
    uploaded: { secureUrl: string; cloudinaryPublicId: string } | null,
  ): Prisma.CustomOrderRequestUpdateInput {
    const accepted = dto.status === CustomOrderStatus.ACCEPTED;
    const adminTitle = this.optionalText(dto.adminTitle);
    const total = this.optionalMoney(dto.adminTotalAmount, 'adminTotalAmount');
    if (accepted && (!adminTitle || total === null)) {
      throw new BadRequestException('Accepted custom orders need a title and total amount');
    }

    return {
      status: dto.status,
      adminTitle,
      adminPriceAmount: this.optionalMoney(dto.adminPriceAmount, 'adminPriceAmount'),
      adminShippingAmount: this.optionalMoney(dto.adminShippingAmount, 'adminShippingAmount'),
      adminTotalAmount: total,
      adminNote: this.optionalText(dto.adminNote),
      adminImageUrl: uploaded?.secureUrl,
      adminImagePublicId: uploaded?.cloudinaryPublicId,
      reviewedBy: { connect: { id: actor.id } },
      reviewedAt: new Date(),
    };
  }

  private optionalText(value?: string | null): string | null {
    const text = value?.trim();
    return text ? text : null;
  }

  private optionalMoney(value: string | undefined, fieldName: string): number | null {
    const text = value?.trim();
    return text ? moneyStringToMinorUnits(text, fieldName) : null;
  }

  private async createOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const [counter] = await tx.$queryRaw<Array<{ order_number: string }>>`
      WITH upserted AS (
        INSERT INTO order_number_counters (order_date, next_number)
        VALUES (CURRENT_DATE, 2)
        ON CONFLICT (order_date)
        DO UPDATE SET next_number = order_number_counters.next_number + 1, updated_at = CURRENT_TIMESTAMP
        RETURNING order_date, next_number - 1 AS sequence_number
      )
      SELECT 'RS-' || to_char(order_date, 'YYYYMMDD') || '-' || lpad(sequence_number::text, 6, '0') AS order_number
      FROM upserted`;
    return counter.order_number;
  }
}
