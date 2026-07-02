import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckoutIdempotencyStatus,
  InventoryStatus,
  OrderItemStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProofType,
  Prisma,
  SheinBatchStatus,
  UserRole,
} from '@prisma/client';
import type { PaymentProofStatus } from '@prisma/client';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { UploadedImageFile } from '../uploads/upload-file.type';
import { UploadsService } from '../uploads/uploads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductPricingService } from '../pricing/product-pricing.service';
import {
  assertCheckoutItems,
  resolveOrderCurrency,
  toOrderItemInput,
} from './checkout-order.builder';
import {
  assertCheckoutIdempotencyReplay,
  hashCheckoutRequest,
  normalizeCheckoutIdempotencyKey,
} from './checkout-idempotency';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto';
import { ReviewFinalPaymentDto, SubmitFinalPaymentDto } from './dto/submit-final-payment.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  assertOrderItemTransition,
  assertOrderTransition,
  assertPaymentProofCanBeReviewed,
} from './order-state-machine';
import { ORDER_PAYMENT_PROOFS_FOLDER } from './orders.constants';
import {
  buildCheckoutPaymentSnapshot,
  buildFinalPaymentSnapshot,
  normalizeDepositPercent,
  toFinalPaymentMethod,
} from './payment-workflow';
import {
  PAYMENT_PROOF_STATUS_APPROVED,
  PAYMENT_PROOF_STATUS_REJECTED,
} from './payment-proof-status.constants';

const orderInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          sourceSheinUrl: true,
          images: {
            select: {
              id: true,
              secureUrl: true,
              altTextAr: true,
              altTextEn: true,
            },
            orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
            take: 1,
          },
        },
      },
      sheinBatchItems: {
        include: {
          batch: {
            select: {
              id: true,
              batchCode: true,
              title: true,
              status: true,
              orderedAt: true,
              shippedAt: true,
              customsAt: true,
              arrivedEgyptAt: true,
              arrivedStoreAt: true,
              readyForPickupAt: true,
              deliveredAt: true,
              cancelledAt: true,
              updatedAt: true,
              statusHistory: {
                select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
                orderBy: { createdAt: 'asc' as const },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
  paymentProofs: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

type OrderWithProofs = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type OrderWithTimeline = OrderWithProofs & {
  timeline: Array<{
    id: string;
    action: string;
    message: string;
    createdAt: string;
    actorName?: string | null;
  }>;
};
type PaymentSettings = {
  depositMinPercent: 50 | 60 | 70;
  depositDefaultPercent: 50 | 60 | 70;
  vodafoneFeePercent: number;
};
type ReservableOrderItem = {
  productVariantId: string | null;
  productId: string | null;
  quantity: number;
};
type UploadedPaymentProofSnapshot = {
  cloudinaryPublicId: string;
  secureUrl: string;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  format?: string | null;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly notificationsService: NotificationsService,
    private readonly pricingService: ProductPricingService,
  ) {}

  checkout(
    user: AuthenticatedUser,
    dto: CheckoutOrderDto,
    idempotencyKey?: string | null,
  ): Promise<OrderWithTimeline> {
    return this.checkoutInternal(user, dto, idempotencyKey, null);
  }

  async checkoutWithDepositProof(
    user: AuthenticatedUser,
    dto: CheckoutOrderDto,
    file: UploadedImageFile | undefined,
    idempotencyKey?: string | null,
  ): Promise<OrderWithTimeline> {
    const key = normalizeCheckoutIdempotencyKey(idempotencyKey ?? dto.idempotencyKey);
    const requestHash = hashCheckoutRequest(dto);
    const replay = await this.prisma.checkoutIdempotencyKey.findUnique({
      where: { userId_key: { userId: user.id, key } },
      include: { order: { include: orderInclude } },
    });
    if (replay) {
      assertCheckoutIdempotencyReplay(replay.requestHash, requestHash, replay.orderId !== null);
      if (!replay.order) throw new ConflictException('Checkout is already being processed');
      return this.attachTimeline(replay.order);
    }

    const uploaded = await this.uploadsService.uploadImage(file, {
      folder: ORDER_PAYMENT_PROOFS_FOLDER,
    });
    try {
      const order = await this.checkoutInternal(user, dto, key, uploaded);
      const proofWasAttached = order.paymentProofs.some(
        (proof) => proof.cloudinaryPublicId === uploaded.cloudinaryPublicId,
      );
      if (!proofWasAttached) {
        await this.uploadsService.deleteImage(uploaded.cloudinaryPublicId).catch(() => undefined);
        return order;
      }
      await this.notificationsService.createAdminNotification({
        titleAr: 'New payment proof',
        titleEn: 'New payment proof',
        messageAr: `New DEPOSIT proof was uploaded for order ${order.orderNumber}`,
        messageEn: `New DEPOSIT proof was uploaded for order ${order.orderNumber}`,
        type: 'ORDER',
        entityType: 'ORDER',
        entityId: order.id,
      });
      return order;
    } catch (error) {
      await this.uploadsService.deleteImage(uploaded.cloudinaryPublicId).catch(() => undefined);
      throw error;
    }
  }

  private async checkoutInternal(
    user: AuthenticatedUser,
    dto: CheckoutOrderDto,
    idempotencyKey?: string | null,
    depositProof?: UploadedPaymentProofSnapshot | null,
  ): Promise<OrderWithTimeline> {
    const key = normalizeCheckoutIdempotencyKey(idempotencyKey ?? dto.idempotencyKey);
    const requestHash = hashCheckoutRequest(dto);

    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          const existingKey = await tx.checkoutIdempotencyKey.findUnique({
            where: { userId_key: { userId: user.id, key } },
            include: { order: { include: orderInclude } },
          });

          if (existingKey) {
            assertCheckoutIdempotencyReplay(
              existingKey.requestHash,
              requestHash,
              existingKey.orderId !== null,
            );
            if (existingKey.order) return existingKey.order;
            throw new ConflictException('Checkout is already being processed');
          }

          const idempotencyRecord = await tx.checkoutIdempotencyKey.create({
            data: { userId: user.id, key, requestHash, status: CheckoutIdempotencyStatus.STARTED },
            select: { id: true },
          });

          const cart = await tx.cart.findUnique({
            where: { userId: user.id },
            include: {
              items: {
                include: { product: true, productVariant: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
          }

          await assertCheckoutItems(tx, cart.items);
          await this.reserveInventoryForItems(tx, cart.items);

          const settings = await this.getPaymentSettings(tx);
          const currency = resolveOrderCurrency(cart.items);
          const saleAdjustments = await this.pricingService.getActiveSaleAdjustments(
            cart.items.map((item) => item.productId),
            tx,
          );
          const orderItems = cart.items.map((item) =>
            toOrderItemInput(item, this.pricingService, saleAdjustments),
          );
          const subtotalBeforeDiscount = cart.items.reduce(
            (sum, item) =>
              sum + (item.productVariant?.priceAmount ?? item.product.priceAmount) * item.quantity,
            0,
          );
          const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);
          const discountAmount = subtotalBeforeDiscount - subtotal;
          const paymentSnapshot = buildCheckoutPaymentSnapshot(
            subtotal,
            dto.depositPercent,
            dto.paymentMethod,
            settings,
          );
          const orderNumber = await this.createOrderNumber(tx);

          const order = await tx.order.create({
            data: {
              userId: user.id,
              orderNumber,
              status: OrderStatus.PENDING,
              paymentStatus: depositProof
                ? OrderPaymentStatus.DEPOSIT_SUBMITTED
                : OrderPaymentStatus.DEPOSIT_PENDING,
              currency,
              subtotalAmount: subtotalBeforeDiscount,
              discountAmount,
              totalAmount: paymentSnapshot.totalAmount,
              depositPercent: dto.depositPercent,
              depositAmount: paymentSnapshot.depositAmount,
              remainingAmount: paymentSnapshot.remainingAmount,
              depositPaymentMethod: paymentSnapshot.depositPaymentMethod,
              depositPaymentFeeAmount: paymentSnapshot.depositPaymentFeeAmount,
              finalAmountDue: paymentSnapshot.remainingAmount,
              inventoryStatus: InventoryStatus.RESERVED,
              customerNameSnapshot: dto.customerName.trim(),
              customerPhoneSnapshot: dto.customerPhone.trim(),
              customerEmailSnapshot: dto.customerEmail?.trim() || null,
              shippingAddressSnapshot: dto.shippingAddress.trim(),
              notes: dto.notes?.trim() || null,
              items: { create: orderItems },
            },
            include: orderInclude,
          });

          if (depositProof) {
            await tx.orderPaymentProof.create({
              data: {
                orderId: order.id,
                type: PaymentProofType.DEPOSIT,
                cloudinaryPublicId: depositProof.cloudinaryPublicId,
                secureUrl: depositProof.secureUrl,
                width: depositProof.width ?? null,
                height: depositProof.height ?? null,
                byteSize: depositProof.byteSize ?? null,
                format: depositProof.format ?? null,
              },
            });
          }

          await tx.checkoutIdempotencyKey.update({
            where: { id: idempotencyRecord.id },
            data: { status: CheckoutIdempotencyStatus.COMPLETED, orderId: order.id },
          });
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'ORDER_CREATED',
              entityType: 'ORDER',
              entityId: order.id,
              metadata: {
                orderNumber: order.orderNumber,
                idempotencyKey: key,
                inventoryStatus: InventoryStatus.RESERVED,
              },
            },
          });
          if (depositProof) {
            await tx.auditLog.create({
              data: {
                actorUserId: user.id,
                action: 'PAYMENT_PROOF_UPLOADED',
                entityType: 'ORDER',
                entityId: order.id,
                metadata: { proofType: PaymentProofType.DEPOSIT, checkoutFlow: true },
              },
            });
          }
          return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.attachTimeline(order);
    } catch (error) {
      if (this.isUniqueIdempotencyConflict(error)) {
        return this.replayCheckout(user.id, key, requestHash);
      }
      throw error;
    }
  }

  async findAll(query: OrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      userId: query.userId,
      status: query.status,
      OR: query.search
        ? [
            { orderNumber: { contains: query.search, mode: 'insensitive' } },
            { customerNameSnapshot: { contains: query.search, mode: 'insensitive' } },
            { customerPhoneSnapshot: { contains: query.search, mode: 'insensitive' } },
            { customerEmailSnapshot: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    } else if (query.workflow === 'ACTIVE_ORDERS') {
      where.paymentStatus = {
        notIn: [
          OrderPaymentStatus.DEPOSIT_PENDING,
          OrderPaymentStatus.DEPOSIT_SUBMITTED,
          OrderPaymentStatus.DEPOSIT_REJECTED,
        ],
      };
    } else if (query.workflow === 'PAYMENT_REVIEW') {
      where.paymentStatus = {
        in: [
          OrderPaymentStatus.DEPOSIT_SUBMITTED,
          OrderPaymentStatus.DEPOSIT_REJECTED,
          OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED,
          OrderPaymentStatus.FINAL_PAYMENT_REJECTED,
        ],
      };
    } else if (query.workflow === 'CASH_FINAL_PAYMENT_REVIEW') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.paymentStatus = OrderPaymentStatus.FINAL_PAYMENT_PENDING;
      where.finalPaymentMethod = PaymentMethod.CASH_AT_SHOP;
    } else if (query.workflow === 'READY_FOR_SHEIN_BATCH') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.paymentStatus = OrderPaymentStatus.DEPOSIT_APPROVED;
      where.items = {
        some: {
          status: { not: OrderItemStatus.CANCELLED },
          sheinBatchItems: {
            none: {
              batch: {
                status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] },
              },
            },
          },
        },
      };
    } else if (query.workflow === 'IN_SHEIN_BATCH') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.paymentStatus = OrderPaymentStatus.DEPOSIT_APPROVED;
      where.items = {
        some: {
          sheinBatchItems: {
            some: {
              batch: {
                status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] },
              },
            },
          },
        },
      };
    } else if (query.workflow === 'WAITING_FINAL_PAYMENT') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.paymentStatus = {
        in: [
          OrderPaymentStatus.FINAL_PAYMENT_PENDING,
          OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED,
          OrderPaymentStatus.FINAL_PAYMENT_REJECTED,
        ],
      };
    } else if (query.workflow === 'READY_TO_DELIVER') {
      where.status = { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] };
      where.paymentStatus = OrderPaymentStatus.PAID;
    } else if (query.workflow === 'COMPLETED') {
      where.status = OrderStatus.COMPLETED;
    } else if (query.workflow === 'CANCELLED') {
      where.status = OrderStatus.CANCELLED;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query, total) };
  }

  findMyOrders(user: AuthenticatedUser, query: OrdersQueryDto): Promise<OrderWithProofs[]> {
    return this.prisma.order.findMany({
      where: { userId: user.id, status: query.status },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  findMyOrderById(user: AuthenticatedUser, id: string): Promise<OrderWithTimeline> {
    return this.findCustomerOrder(user.id, { id });
  }

  trackMyOrder(user: AuthenticatedUser, orderNumber: string): Promise<OrderWithTimeline> {
    return this.findCustomerOrder(user.id, { orderNumber });
  }

  async findById(id: string): Promise<OrderWithTimeline> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    return this.attachTimeline(order);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actor?: AuthenticatedUser,
  ): Promise<OrderWithTimeline> {
    return this.prisma
      .$transaction(
        async (tx) => {
          const order = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
          assertOrderTransition(order.status, dto.status);
          if (
            dto.status === OrderStatus.COMPLETED &&
            order.paymentStatus !== OrderPaymentStatus.PAID
          ) {
            throw new BadRequestException('Order cannot be completed before payment is fully paid');
          }
          if (dto.status === OrderStatus.CANCELLED) {
            await this.releaseOrRestoreInventoryForOrder(tx, order);
          }
          const updated = await tx.order.update({
            where: { id },
            data: {
              status: dto.status,
              notes: dto.notes,
              completedAt: dto.status === OrderStatus.COMPLETED ? new Date() : null,
              cancelledAt: dto.status === OrderStatus.CANCELLED ? new Date() : null,
            },
            include: orderInclude,
          });
          await tx.auditLog.create({
            data: {
              actorUserId: actor?.id,
              action: 'ORDER_STATUS_UPDATED',
              entityType: 'ORDER',
              entityId: id,
              metadata: { from: order.status, to: dto.status, orderNumber: order.orderNumber },
            },
          });
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then((order) => this.attachTimeline(order));
  }

  async updateItemStatus(id: string, dto: UpdateOrderItemStatusDto, actor?: AuthenticatedUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUniqueOrThrow({
        where: { id },
        include: { order: true },
      });
      assertOrderItemTransition(item.status, dto.status);
      const updated = await tx.orderItem.update({ where: { id }, data: { status: dto.status } });
      await tx.auditLog.create({
        data: {
          actorUserId: actor?.id,
          action: 'ORDER_ITEM_STATUS_UPDATED',
          entityType: 'ORDER_ITEM',
          entityId: id,
          metadata: { from: item.status, to: dto.status, orderId: item.orderId },
        },
      });
      await this.maybeOpenFinalPayment(tx, item.orderId);
      return updated;
    });
    return result;
  }

  uploadDepositProof(
    user: AuthenticatedUser,
    orderId: string,
    file: UploadedImageFile | undefined,
  ): Promise<OrderWithTimeline> {
    return this.uploadProof(user, orderId, file, PaymentProofType.DEPOSIT);
  }

  uploadFinalPaymentProof(
    user: AuthenticatedUser,
    orderId: string,
    file: UploadedImageFile | undefined,
    dto: SubmitFinalPaymentDto,
  ): Promise<OrderWithTimeline> {
    if (dto.method === 'cash_at_shop')
      throw new BadRequestException('Cash at shop does not require proof upload');
    return this.uploadProof(
      user,
      orderId,
      file,
      PaymentProofType.FINAL_PAYMENT,
      toFinalPaymentMethod(dto.method),
    );
  }

  async submitFinalPaymentChoice(
    user: AuthenticatedUser,
    orderId: string,
    dto: SubmitFinalPaymentDto,
  ): Promise<OrderWithTimeline> {
    if (dto.method !== 'cash_at_shop')
      throw new BadRequestException('Online final payment requires proof upload');
    return this.prisma
      .$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, userId: user.id },
          include: orderInclude,
        });
        if (!order) throw new NotFoundException('Order not found');
        this.assertFinalPaymentAllowed(order);
        const finalPaymentSnapshot = buildFinalPaymentSnapshot({
          currentTotalAmount: order.totalAmount,
          currentFinalPaymentFeeAmount: order.finalPaymentFeeAmount,
          remainingAmount: order.remainingAmount,
          finalPaymentMethod: PaymentMethod.CASH_AT_SHOP,
          settings: { vodafoneFeePercent: 0 },
        });
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            ...finalPaymentSnapshot,
            finalPaidAmount: 0,
            paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_PENDING,
          },
          include: orderInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'FINAL_PAYMENT_CASH_SELECTED',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: { orderNumber: order.orderNumber, amountDue: order.remainingAmount },
          },
        });
        return updated;
      })
      .then((order) => this.attachTimeline(order));
  }

  async reviewPaymentProof(
    user: AuthenticatedUser,
    proofId: string,
    dto: ReviewPaymentProofDto,
  ): Promise<OrderWithTimeline> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER)
      throw new ForbiddenException('Admin access is required');
    return this.prisma
      .$transaction(
        async (tx) => {
          const proof = await tx.orderPaymentProof.findUnique({
            where: { id: proofId },
            include: { order: { include: orderInclude } },
          });
          if (!proof) throw new NotFoundException('Payment proof not found');
          assertPaymentProofCanBeReviewed(proof.status, proof.type, proof.order.paymentStatus);
          const now = new Date();
          const nextPaymentStatus = await this.resolveReviewedPaymentStatus(
            tx,
            proof.order,
            proof.type,
            dto.status,
          );
          const nextOrderStatus =
            proof.type === PaymentProofType.DEPOSIT && dto.status === PAYMENT_PROOF_STATUS_APPROVED
              ? OrderStatus.CONFIRMED
              : undefined;
          if (nextOrderStatus) assertOrderTransition(proof.order.status, nextOrderStatus);
          if (proof.type === PaymentProofType.DEPOSIT) {
            if (dto.status === PAYMENT_PROOF_STATUS_APPROVED)
              await this.deductReservedInventoryForOrder(tx, proof.order);
            else await this.releaseOrRestoreInventoryForOrder(tx, proof.order);
          }
          await tx.orderPaymentProof.update({
            where: { id: proofId },
            data: {
              status: dto.status,
              rejectionReason:
                dto.status === PAYMENT_PROOF_STATUS_REJECTED
                  ? (dto.rejectionReason?.trim() ?? null)
                  : null,
              reviewedById: user.id,
              reviewedAt: now,
            },
          });
          const paymentData: Prisma.OrderUpdateInput = { paymentStatus: nextPaymentStatus };
          if (nextOrderStatus) paymentData.status = nextOrderStatus;
          if (proof.type === PaymentProofType.DEPOSIT) {
            paymentData.depositPaidAmount =
              dto.status === PAYMENT_PROOF_STATUS_APPROVED ? proof.order.depositAmount : 0;
            paymentData.depositApprovedAt =
              dto.status === PAYMENT_PROOF_STATUS_APPROVED ? now : null;
          }
          if (proof.type === PaymentProofType.FINAL_PAYMENT) {
            paymentData.finalPaidAmount =
              dto.status === PAYMENT_PROOF_STATUS_APPROVED ? proof.order.finalAmountDue : 0;
            paymentData.finalPaymentApprovedAt =
              dto.status === PAYMENT_PROOF_STATUS_APPROVED ? now : null;
            if (dto.status === PAYMENT_PROOF_STATUS_APPROVED) paymentData.remainingAmount = 0;
          }
          const updatedOrder = await tx.order.update({
            where: { id: proof.orderId },
            data: paymentData,
            include: orderInclude,
          });
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'PAYMENT_PROOF_REVIEWED',
              entityType: 'PAYMENT_PROOF',
              entityId: proofId,
              metadata: { type: proof.type, status: dto.status, orderId: proof.orderId },
            },
          });
          return updatedOrder;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then((order) => this.attachTimeline(order));
  }

  async reviewFinalPayment(
    user: AuthenticatedUser,
    orderId: string,
    dto: ReviewFinalPaymentDto,
  ): Promise<OrderWithTimeline> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER)
      throw new ForbiddenException('Admin access is required');
    return this.prisma
      .$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
        if (!order) throw new NotFoundException('Order not found');
        if (
          order.paymentStatus !== OrderPaymentStatus.FINAL_PAYMENT_PENDING ||
          order.finalPaymentMethod !== PaymentMethod.CASH_AT_SHOP
        )
          throw new BadRequestException('Cash final payment is not pending review for this order');
        if (!(await this.areAllActiveItemsAtShop(tx, orderId)))
          throw new BadRequestException('All active order items must reach the shop first');
        const approved = dto.status === 'APPROVED';
        const now = new Date();
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: approved
              ? OrderPaymentStatus.PAID
              : OrderPaymentStatus.FINAL_PAYMENT_REJECTED,
            finalPaidAmount: approved ? order.finalAmountDue : 0,
            finalPaymentApprovedAt: approved ? now : null,
            remainingAmount: approved ? 0 : order.remainingAmount,
          },
          include: orderInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'FINAL_PAYMENT_REVIEWED',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: {
              status: dto.status,
              method: PaymentMethod.CASH_AT_SHOP,
              note: dto.note?.trim() ?? null,
            },
          },
        });
        return updated;
      })
      .then((order) => this.attachTimeline(order));
  }

  private async uploadProof(
    user: AuthenticatedUser,
    orderId: string,
    file: UploadedImageFile | undefined,
    type: PaymentProofType,
    finalPaymentMethod?: PaymentMethod,
  ): Promise<OrderWithTimeline> {
    const order = await this.findCustomerOrder(user.id, { id: orderId });
    this.assertProofUploadAllowed(order, type);
    const uploaded = await this.uploadsService.uploadImage(file, {
      folder: ORDER_PAYMENT_PROOFS_FOLDER,
    });
    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const current = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: orderInclude,
          });
          this.assertProofUploadAllowed(current, type);
          const paymentData = await this.buildProofUploadPaymentData(
            tx,
            current,
            type,
            finalPaymentMethod,
          );
          await tx.orderPaymentProof.create({
            data: {
              orderId,
              type,
              cloudinaryPublicId: uploaded.cloudinaryPublicId,
              secureUrl: uploaded.secureUrl,
              width: uploaded.width,
              height: uploaded.height,
              byteSize: uploaded.byteSize,
              format: uploaded.format,
            },
          });
          const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: paymentData,
            include: orderInclude,
          });
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'PAYMENT_PROOF_UPLOADED',
              entityType: 'ORDER',
              entityId: orderId,
              metadata: { proofType: type, finalPaymentMethod },
            },
          });
          return updatedOrder;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.notificationsService.createAdminNotification({
        titleAr: 'New payment proof',
        titleEn: 'New payment proof',
        messageAr: `New ${type} proof was uploaded for order ${updated.orderNumber}`,
        messageEn: `New ${type} proof was uploaded for order ${updated.orderNumber}`,
        type: 'ORDER',
        entityType: 'ORDER',
        entityId: orderId,
      });
      return this.attachTimeline(updated);
    } catch (error) {
      await this.uploadsService.deleteImage(uploaded.cloudinaryPublicId).catch(() => undefined);
      throw error;
    }
  }

  private async buildProofUploadPaymentData(
    tx: Prisma.TransactionClient,
    order: OrderWithProofs,
    type: PaymentProofType,
    finalPaymentMethod?: PaymentMethod,
  ): Promise<Prisma.OrderUpdateInput> {
    if (type === PaymentProofType.DEPOSIT) {
      if (order.inventoryStatus === InventoryStatus.RELEASED)
        await this.reserveInventoryForItems(tx, order.items);
      return {
        paymentStatus: OrderPaymentStatus.DEPOSIT_SUBMITTED,
        inventoryStatus: InventoryStatus.RESERVED,
      };
    }
    if (!finalPaymentMethod || finalPaymentMethod === PaymentMethod.CASH_AT_SHOP)
      throw new BadRequestException('Choose Instapay or Vodafone Cash for online final payment');
    this.assertFinalPaymentAllowed(order);
    const settings = await this.getPaymentSettings(tx);
    const finalPaymentSnapshot = buildFinalPaymentSnapshot({
      currentTotalAmount: order.totalAmount,
      currentFinalPaymentFeeAmount: order.finalPaymentFeeAmount,
      remainingAmount: order.remainingAmount,
      finalPaymentMethod,
      settings,
    });
    return {
      paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED,
      ...finalPaymentSnapshot,
      finalPaidAmount: 0,
      finalPaymentApprovedAt: null,
    };
  }

  private async findCustomerOrder(
    userId: string,
    where: { id?: string; orderNumber?: string },
  ): Promise<OrderWithTimeline> {
    const order = await this.prisma.order.findFirst({
      where: { ...where, userId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.attachTimeline(order);
  }

  private async replayCheckout(
    userId: string,
    key: string,
    requestHash: string,
  ): Promise<OrderWithTimeline> {
    const record = await this.prisma.checkoutIdempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
      include: { order: { include: orderInclude } },
    });
    if (!record) throw new ConflictException('Checkout retry could not be resolved');
    assertCheckoutIdempotencyReplay(record.requestHash, requestHash, record.orderId !== null);
    if (!record.order) throw new ConflictException('Checkout is already being processed');
    return this.attachTimeline(record.order);
  }

  private async attachTimeline(order: OrderWithProofs): Promise<OrderWithTimeline> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'ORDER', entityId: order.id },
          { metadata: { path: ['orderId'], equals: order.id } },
        ],
      },
      include: { actorUser: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return {
      ...order,
      timeline: logs.map((log) => ({
        id: log.id,
        action: log.action,
        message: this.describeTimelineAction(log.action),
        createdAt: log.createdAt.toISOString(),
        actorName: log.actorUser?.name ?? null,
      })),
    };
  }

  private describeTimelineAction(action: string): string {
    const messages: Record<string, string> = {
      ORDER_CREATED: 'Order created and inventory reserved',
      ORDER_STATUS_UPDATED: 'Order status updated',
      ORDER_ITEM_STATUS_UPDATED: 'Order item status updated',
      PAYMENT_PROOF_UPLOADED: 'Payment proof uploaded',
      PAYMENT_PROOF_REVIEWED: 'Payment proof reviewed',
      FINAL_PAYMENT_CASH_SELECTED: 'Final payment selected as cash at shop',
      FINAL_PAYMENT_REVIEWED: 'Final payment reviewed',
      FINAL_PAYMENT_OPENED_FROM_BATCH: 'Final payment opened from SHEIN batch arrival',
      INVENTORY_DEDUCTED: 'Inventory deducted',
      INVENTORY_RELEASED: 'Inventory released',
      INVENTORY_RESTORED: 'Inventory restored',
    };
    return messages[action] ?? action;
  }

  private assertProofUploadAllowed(order: OrderWithProofs, type: PaymentProofType): void {
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED)
      throw new BadRequestException('Payment proof cannot be uploaded for this order status');
    if (type === PaymentProofType.DEPOSIT) {
      if (
        order.paymentStatus !== OrderPaymentStatus.DEPOSIT_PENDING &&
        order.paymentStatus !== OrderPaymentStatus.DEPOSIT_REJECTED
      )
        throw new BadRequestException('Deposit proof is not expected for this order');
      return;
    }
    if (
      order.paymentStatus !== OrderPaymentStatus.FINAL_PAYMENT_PENDING &&
      order.paymentStatus !== OrderPaymentStatus.FINAL_PAYMENT_REJECTED
    )
      throw new BadRequestException('Final payment proof is not expected for this order');
  }

  private async resolveReviewedPaymentStatus(
    tx: Prisma.TransactionClient,
    order: OrderWithProofs,
    type: PaymentProofType,
    status: PaymentProofStatus,
  ): Promise<OrderPaymentStatus> {
    if (type === PaymentProofType.DEPOSIT) {
      if (status !== PAYMENT_PROOF_STATUS_APPROVED) return OrderPaymentStatus.DEPOSIT_REJECTED;
      return (await this.areAllActiveItemsAtShop(tx, order.id))
        ? OrderPaymentStatus.FINAL_PAYMENT_PENDING
        : OrderPaymentStatus.DEPOSIT_APPROVED;
    }
    return status === PAYMENT_PROOF_STATUS_APPROVED
      ? OrderPaymentStatus.PAID
      : OrderPaymentStatus.FINAL_PAYMENT_REJECTED;
  }

  private async maybeOpenFinalPayment(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        orderNumber: true,
        remainingAmount: true,
        finalPaymentFeeAmount: true,
        totalAmount: true,
      },
    });
    if (!order || order.paymentStatus !== OrderPaymentStatus.DEPOSIT_APPROVED) return;
    if (!(await this.areAllActiveItemsAtShop(tx, orderId))) return;
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_PENDING,
        finalAmountDue: order.remainingAmount,
        finalPaymentFeeAmount: 0,
        totalAmount: order.totalAmount - order.finalPaymentFeeAmount,
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
  }

  private async areAllActiveItemsAtShop(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<boolean> {
    const remaining = await tx.orderItem.count({
      where: { orderId, status: { notIn: [OrderItemStatus.SHOP, OrderItemStatus.CANCELLED] } },
    });
    return remaining === 0;
  }

  private assertFinalPaymentAllowed(order: OrderWithProofs): void {
    if (
      order.paymentStatus !== OrderPaymentStatus.FINAL_PAYMENT_PENDING &&
      order.paymentStatus !== OrderPaymentStatus.FINAL_PAYMENT_REJECTED
    )
      throw new BadRequestException('Final payment is not expected for this order');
    if (
      !order.items.length ||
      order.items.some(
        (item) => item.status !== OrderItemStatus.SHOP && item.status !== OrderItemStatus.CANCELLED,
      )
    )
      throw new BadRequestException(
        'Final payment becomes available when every active item reaches the shop',
      );
    if (order.depositPaidAmount <= 0 || !order.depositApprovedAt)
      throw new BadRequestException('Deposit must be approved before final payment');
  }

  private async reserveInventoryForItems(
    tx: Prisma.TransactionClient,
    items: ReservableOrderItem[],
  ): Promise<void> {
    for (const item of items) {
      if (!item.productVariantId || !item.productId) {
        throw new BadRequestException(
          'Every checkout item must reference a purchasable product variant',
        );
      }
      const affected = await tx.$executeRaw`
        UPDATE product_variants
        SET reserved_quantity = reserved_quantity + ${item.quantity},
            status = CASE WHEN stock_quantity - (reserved_quantity + ${item.quantity}) <= 0 THEN 'OUT_OF_STOCK'::"ProductVariantStatus" ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.productVariantId}::uuid
          AND product_id = ${item.productId}::uuid
          AND deleted_at IS NULL
          AND is_active = TRUE
          AND status = 'ACTIVE'::"ProductVariantStatus"
          AND stock_quantity - reserved_quantity >= ${item.quantity}`;
      if (affected !== 1)
        throw new BadRequestException('Insufficient stock for one or more variants');
    }
  }

  private async deductReservedInventoryForOrder(
    tx: Prisma.TransactionClient,
    order: OrderWithProofs,
  ): Promise<void> {
    if (order.inventoryStatus === InventoryStatus.DEDUCTED) return;
    if (order.inventoryStatus !== InventoryStatus.RESERVED)
      throw new ConflictException('Order inventory is not reserved');
    for (const item of order.items) {
      if (!item.productVariantId)
        throw new ConflictException('Order item is missing a reserved product variant');
      const affected = await tx.$executeRaw`
        UPDATE product_variants
        SET stock_quantity = stock_quantity - ${item.quantity},
            reserved_quantity = reserved_quantity - ${item.quantity},
            status = CASE WHEN (stock_quantity - ${item.quantity}) <= 0 THEN 'OUT_OF_STOCK'::"ProductVariantStatus" ELSE 'ACTIVE'::"ProductVariantStatus" END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.productVariantId}::uuid
          AND reserved_quantity >= ${item.quantity}
          AND stock_quantity >= ${item.quantity}`;
      if (affected !== 1)
        throw new ConflictException('Reserved inventory could not be deducted safely');
    }
    await tx.order.update({
      where: { id: order.id },
      data: { inventoryStatus: InventoryStatus.DEDUCTED },
    });
    await tx.auditLog.create({
      data: {
        action: 'INVENTORY_DEDUCTED',
        entityType: 'ORDER',
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber },
      },
    });
  }

  private async releaseOrRestoreInventoryForOrder(
    tx: Prisma.TransactionClient,
    order: OrderWithProofs,
  ): Promise<void> {
    if (
      order.inventoryStatus === InventoryStatus.RELEASED ||
      order.inventoryStatus === InventoryStatus.NONE
    )
      return;
    if (order.inventoryStatus === InventoryStatus.RESERVED) {
      for (const item of order.items) {
        if (!item.productVariantId)
          throw new ConflictException('Order item is missing a reserved product variant');
        const affected = await tx.$executeRaw`
          UPDATE product_variants
          SET reserved_quantity = reserved_quantity - ${item.quantity},
              status = CASE WHEN stock_quantity - (reserved_quantity - ${item.quantity}) > 0 THEN 'ACTIVE'::"ProductVariantStatus" ELSE 'OUT_OF_STOCK'::"ProductVariantStatus" END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${item.productVariantId}::uuid
            AND reserved_quantity >= ${item.quantity}`;
        if (affected !== 1)
          throw new ConflictException('Reserved inventory could not be released safely');
      }
      await tx.order.update({
        where: { id: order.id },
        data: { inventoryStatus: InventoryStatus.RELEASED },
      });
      await tx.auditLog.create({
        data: {
          action: 'INVENTORY_RELEASED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber },
        },
      });
      return;
    }
    if (order.inventoryStatus === InventoryStatus.DEDUCTED) {
      for (const item of order.items) {
        if (!item.productVariantId)
          throw new ConflictException('Order item is missing a deducted product variant');
        await tx.$executeRaw`UPDATE product_variants SET stock_quantity = stock_quantity + ${item.quantity}, status = CASE WHEN is_active = TRUE AND deleted_at IS NULL THEN 'ACTIVE'::"ProductVariantStatus" ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ${item.productVariantId}::uuid`;
      }
      await tx.order.update({
        where: { id: order.id },
        data: { inventoryStatus: InventoryStatus.RELEASED },
      });
      await tx.auditLog.create({
        data: {
          action: 'INVENTORY_RESTORED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { orderNumber: order.orderNumber },
        },
      });
    }
  }

  private async getPaymentSettings(tx: Prisma.TransactionClient): Promise<PaymentSettings> {
    const rows = await tx.setting.findMany({
      where: {
        key: {
          in: [
            'payment.depositMinPercent',
            'payment.depositDefaultPercent',
            'payment.vodafoneFeePercent',
          ],
        },
      },
    });
    const values = new Map(rows.map((row) => [row.key, this.settingNumber(row.value)]));
    const min = normalizeDepositPercent(values.get('payment.depositMinPercent') ?? 50, 50);
    const defaultPercent = normalizeDepositPercent(
      values.get('payment.depositDefaultPercent') ?? min,
      min,
    );
    return {
      depositMinPercent: min,
      depositDefaultPercent: defaultPercent < min ? min : defaultPercent,
      vodafoneFeePercent: Math.max(0, Math.min(20, values.get('payment.vodafoneFeePercent') ?? 1)),
    };
  }

  private settingNumber(value: Prisma.JsonValue): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isUniqueIdempotencyConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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
