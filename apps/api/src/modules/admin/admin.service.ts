import { Injectable } from '@nestjs/common';
import {
  FlashSaleStatus,
  OrderItemStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SheinBatchStatus,
} from '@prisma/client';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';



type AggregateCountValue = number | boolean | { _all?: number | null } | null | undefined;

const getAggregateCount = (value: AggregateCountValue): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object') {
    return value._all ?? 0;
  }
  return 0;
};

const calculateOutstandingAmount = (sum?: { totalAmount?: number | null; depositPaidAmount?: number | null; finalPaidAmount?: number | null } | null): number => {
  const total = sum?.totalAmount ?? 0;
  const paid = (sum?.depositPaidAmount ?? 0) + (sum?.finalPaidAmount ?? 0);
  return Math.max(0, total - paid);
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [
      usersCount,
      productsCount,
      activeProductsCount,
      draftProductsCount,
      archivedProductsCount,
      productsWithoutImagesCount,
      categoriesCount,
      activeCategoriesCount,
      ordersCount,
      pendingOrdersCount,
      todayOrdersCount,
      todayRevenue,
      pendingPaymentProofsCount,
      finalPaymentPendingCount,
      activeFlashSalesCount,
      scheduledFlashSalesCount,
      pendingSheinImportsCount,
      failedSheinImportsCount,
      lowStockVariantsCount,
      unreadNotificationsCount,
      recentOrders,
      recentSheinImports,
      lowStockVariants,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { deletedAt: null, status: 'DRAFT' } }),
      this.prisma.product.count({ where: { deletedAt: null, status: 'ARCHIVED' } }),
      this.prisma.product.count({ where: { deletedAt: null, images: { none: {} } } }),
      this.prisma.category.count({ where: { deletedAt: null } }),
      this.prisma.category.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.orderPaymentProof.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.order.count({ where: { paymentStatus: 'FINAL_PAYMENT_PENDING' } }),
      this.prisma.flashSale.count({
        where: { status: FlashSaleStatus.ACTIVE, startsAt: { lte: now }, endsAt: { gt: now } },
      }),
      this.prisma.flashSale.count({
        where: {
          status: { in: [FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED] },
          startsAt: { gt: now },
        },
      }),
      this.prisma.sheinImport.count({ where: { status: { in: ['PENDING', 'PREVIEW_READY', 'REVIEWING', 'APPROVED', 'PROCESSING'] } } }),
      this.prisma.sheinImport.count({ where: { status: 'FAILED' } }),
      this.prisma.productVariant.count({ where: { deletedAt: null, isActive: true, stockQuantity: { lte: 3 } } }),
      this.prisma.notification.count({ where: { readAt: null } }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          currency: true,
          customerNameSnapshot: true,
          customerPhoneSnapshot: true,
          createdAt: true,
        },
      }),
      this.prisma.sheinImport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          sourceUrl: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          createdProduct: { select: { id: true, nameAr: true, slug: true } },
        },
      }),
      this.prisma.productVariant.findMany({
        where: { deletedAt: null, isActive: true, stockQuantity: { lte: 3 } },
        orderBy: [{ stockQuantity: 'asc' }, { updatedAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          nameAr: true,
          size: true,
          color: true,
          stockQuantity: true,
          product: { select: { id: true, nameAr: true, slug: true, status: true } },
        },
      }),
    ]);

    const todayRevenueAmount = todayRevenue._sum.totalAmount ?? 0;

    return {
      usersCount,
      productsCount,
      activeProductsCount,
      draftProductsCount,
      archivedProductsCount,
      productsWithoutImagesCount,
      categoriesCount,
      activeCategoriesCount,
      ordersCount,
      pendingOrdersCount,
      todayOrdersCount,
      todayRevenueAmount,
      pendingPaymentProofsCount,
      finalPaymentPendingCount,
      activeFlashSalesCount,
      scheduledFlashSalesCount,
      pendingSheinImportsCount,
      failedSheinImportsCount,
      lowStockVariantsCount,
      unreadNotificationsCount,
      recentOrders,
      recentSheinImports,
      lowStockVariants,
    };
  }


  async getReports() {
    const openBatchStatuses = [
      SheinBatchStatus.DRAFT,
      SheinBatchStatus.ORDERED_FROM_SHEIN,
      SheinBatchStatus.SHIPPING,
      SheinBatchStatus.CUSTOMS,
      SheinBatchStatus.ARRIVED_EGYPT,
      SheinBatchStatus.ARRIVED_STORE,
      SheinBatchStatus.READY_FOR_PICKUP,
    ];
    const activeOrderStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED];
    const nonTerminalOrderWhere = { status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] } };
    const readyForBatchWhere: Prisma.OrderWhereInput = {
      ...nonTerminalOrderWhere,
      paymentStatus: OrderPaymentStatus.DEPOSIT_APPROVED,
      items: {
        some: {
          status: { not: OrderItemStatus.CANCELLED },
          sheinBatchItems: {
            none: { batch: { status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] } } },
          },
        },
      },
    };
    const inBatchWhere: Prisma.OrderWhereInput = {
      ...nonTerminalOrderWhere,
      paymentStatus: OrderPaymentStatus.DEPOSIT_APPROVED,
      items: {
        some: {
          sheinBatchItems: {
            some: { batch: { status: { notIn: [SheinBatchStatus.CANCELLED, SheinBatchStatus.DELIVERED] } } },
          },
        },
      },
    };
    const waitingFinalPaymentWhere: Prisma.OrderWhereInput = {
      ...nonTerminalOrderWhere,
      paymentStatus: {
        in: [
          OrderPaymentStatus.FINAL_PAYMENT_PENDING,
          OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED,
          OrderPaymentStatus.FINAL_PAYMENT_REJECTED,
        ],
      },
    };
    const readyToDeliverWhere: Prisma.OrderWhereInput = {
      ...nonTerminalOrderWhere,
      paymentStatus: OrderPaymentStatus.PAID,
    };

    const [
      totalBatches,
      openBatches,
      completedBatches,
      cancelledBatches,
      batchTotals,
      activeBatchTotals,
      batchStatusGroups,
      recentOpenBatches,
      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      readyForBatchOrders,
      inBatchOrders,
      waitingFinalPaymentOrders,
      readyToDeliverOrders,
      depositReviewOrders,
      finalPaymentReviewOrders,
      cashFinalPaymentOrders,
      orderTotals,
      orderStatusGroups,
      paymentStatusGroups,
    ] = await this.prisma.$transaction([
      this.prisma.sheinBatch.count(),
      this.prisma.sheinBatch.count({ where: { status: { in: openBatchStatuses } } }),
      this.prisma.sheinBatch.count({ where: { status: SheinBatchStatus.DELIVERED } }),
      this.prisma.sheinBatch.count({ where: { status: SheinBatchStatus.CANCELLED } }),
      this.prisma.sheinBatch.aggregate({
        _sum: { totalSarAmount: true, totalEgpAmount: true, totalQuantity: true },
      }),
      this.prisma.sheinBatch.aggregate({
        where: { status: { not: SheinBatchStatus.CANCELLED } },
        _sum: { totalSarAmount: true, totalEgpAmount: true, totalQuantity: true },
      }),
      this.prisma.sheinBatch.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { totalSarAmount: true, totalEgpAmount: true, totalQuantity: true },
      }),
      this.prisma.sheinBatch.findMany({
        where: { status: { in: openBatchStatuses } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          batchCode: true,
          title: true,
          status: true,
          totalQuantity: true,
          totalSarAmount: true,
          totalEgpAmount: true,
          exchangeRateSarToEgp: true,
          createdAt: true,
          updatedAt: true,
          items: { select: { orderId: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: activeOrderStatuses } } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: readyForBatchWhere }),
      this.prisma.order.count({ where: inBatchWhere }),
      this.prisma.order.count({ where: waitingFinalPaymentWhere }),
      this.prisma.order.count({ where: readyToDeliverWhere }),
      this.prisma.order.count({ where: { paymentStatus: OrderPaymentStatus.DEPOSIT_SUBMITTED } }),
      this.prisma.order.count({ where: { paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED } }),
      this.prisma.order.count({
        where: {
          ...nonTerminalOrderWhere,
          paymentStatus: OrderPaymentStatus.FINAL_PAYMENT_PENDING,
          finalPaymentMethod: PaymentMethod.CASH_AT_SHOP,
        },
      }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: {
          totalAmount: true,
          depositPaidAmount: true,
          finalPaidAmount: true,
          remainingAmount: true,
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { totalAmount: true, depositPaidAmount: true, finalPaidAmount: true, remainingAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        orderBy: { paymentStatus: 'asc' },
        _count: { _all: true },
        _sum: { totalAmount: true, depositPaidAmount: true, finalPaidAmount: true, remainingAmount: true },
      }),
    ]);

    const customerDepositPaid = orderTotals._sum.depositPaidAmount ?? 0;
    const customerFinalPaid = orderTotals._sum.finalPaidAmount ?? 0;
    const customerPaidAmount = customerDepositPaid + customerFinalPaid;
    const customerSalesAmount = orderTotals._sum.totalAmount ?? 0;
    const customerRemainingAmount = Math.max(0, customerSalesAmount - customerPaidAmount);

    const batchStatusOrder = [
      SheinBatchStatus.DRAFT,
      SheinBatchStatus.ORDERED_FROM_SHEIN,
      SheinBatchStatus.SHIPPING,
      SheinBatchStatus.CUSTOMS,
      SheinBatchStatus.ARRIVED_EGYPT,
      SheinBatchStatus.ARRIVED_STORE,
      SheinBatchStatus.READY_FOR_PICKUP,
      SheinBatchStatus.DELIVERED,
      SheinBatchStatus.CANCELLED,
    ];
    const orderStatusOrder = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED, OrderStatus.CANCELLED];
    const paymentStatusOrder = [
      OrderPaymentStatus.DEPOSIT_PENDING,
      OrderPaymentStatus.DEPOSIT_SUBMITTED,
      OrderPaymentStatus.DEPOSIT_REJECTED,
      OrderPaymentStatus.DEPOSIT_APPROVED,
      OrderPaymentStatus.FINAL_PAYMENT_PENDING,
      OrderPaymentStatus.FINAL_PAYMENT_SUBMITTED,
      OrderPaymentStatus.FINAL_PAYMENT_REJECTED,
      OrderPaymentStatus.PAID,
    ];

    return {
      batches: {
        total: totalBatches,
        open: openBatches,
        completed: completedBatches,
        cancelled: cancelledBatches,
        totalSarAmount: batchTotals._sum.totalSarAmount ?? 0,
        totalEgpAmount: batchTotals._sum.totalEgpAmount ?? 0,
        totalQuantity: batchTotals._sum.totalQuantity ?? 0,
        activeSarAmount: activeBatchTotals._sum.totalSarAmount ?? 0,
        activeEgpAmount: activeBatchTotals._sum.totalEgpAmount ?? 0,
        activeQuantity: activeBatchTotals._sum.totalQuantity ?? 0,
        byStatus: batchStatusOrder.map((status) => {
          const row = batchStatusGroups.find((item) => item.status === status);
          return {
            status,
            count: getAggregateCount(row?._count),
            totalSarAmount: row?._sum?.totalSarAmount ?? 0,
            totalEgpAmount: row?._sum?.totalEgpAmount ?? 0,
            totalQuantity: row?._sum?.totalQuantity ?? 0,
          };
        }),
        openItems: recentOpenBatches.map((batch) => ({
          id: batch.id,
          batchCode: batch.batchCode,
          title: batch.title,
          status: batch.status,
          orderCount: new Set(batch.items.map((item) => item.orderId)).size,
          itemsCount: batch._count.items,
          totalQuantity: batch.totalQuantity,
          totalSarAmount: batch.totalSarAmount,
          totalEgpAmount: batch.totalEgpAmount,
          exchangeRateSarToEgp: batch.exchangeRateSarToEgp,
          createdAt: batch.createdAt,
          updatedAt: batch.updatedAt,
        })),
      },
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        readyForBatch: readyForBatchOrders,
        inBatch: inBatchOrders,
        waitingFinalPayment: waitingFinalPaymentOrders,
        readyToDeliver: readyToDeliverOrders,
        depositReview: depositReviewOrders,
        finalPaymentReview: finalPaymentReviewOrders,
        cashFinalPaymentReview: cashFinalPaymentOrders,
        totalSalesAmount: customerSalesAmount,
        customerDepositPaidAmount: customerDepositPaid,
        customerFinalPaidAmount: customerFinalPaid,
        customerPaidAmount,
        customerRemainingAmount,
        byStatus: orderStatusOrder.map((status) => {
          const row = orderStatusGroups.find((item) => item.status === status);
          return {
            status,
            count: getAggregateCount(row?._count),
            totalAmount: row?._sum?.totalAmount ?? 0,
            paidAmount: (row?._sum?.depositPaidAmount ?? 0) + (row?._sum?.finalPaidAmount ?? 0),
            remainingAmount: calculateOutstandingAmount(row?._sum),
          };
        }),
        byPaymentStatus: paymentStatusOrder.map((status) => {
          const row = paymentStatusGroups.find((item) => item.paymentStatus === status);
          return {
            status,
            count: getAggregateCount(row?._count),
            totalAmount: row?._sum?.totalAmount ?? 0,
            paidAmount: (row?._sum?.depositPaidAmount ?? 0) + (row?._sum?.finalPaidAmount ?? 0),
            remainingAmount: calculateOutstandingAmount(row?._sum),
          };
        }),
      },
      money: {
        totalSheinSarAmount: activeBatchTotals._sum.totalSarAmount ?? 0,
        totalSheinEgpAmount: activeBatchTotals._sum.totalEgpAmount ?? 0,
        totalCustomerSalesAmount: customerSalesAmount,
        totalCustomerPaidAmount: customerPaidAmount,
        totalCustomerRemainingAmount: customerRemainingAmount,
      },
      generatedAt: new Date(),
    };
  }

  async findAuditLogs(query: AuditLogsQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      actorUserId: query.actorUserId,
      action: query.action ? { contains: query.action, mode: 'insensitive' } : undefined,
      entityType: query.entityType ? { contains: query.entityType, mode: 'insensitive' } : undefined,
      entityId: query.entityId ? { contains: query.entityId, mode: 'insensitive' } : undefined,
      createdAt:
        query.createdFrom || query.createdTo
          ? {
              gte: query.createdFrom,
              lte: query.createdTo,
            }
          : undefined,
      OR: search
        ? [
            { action: { contains: search, mode: 'insensitive' } },
            { entityType: { contains: search, mode: 'insensitive' } },
            { entityId: { contains: search, mode: 'insensitive' } },
            { actorUser: { is: { name: { contains: search, mode: 'insensitive' } } } },
            { actorUser: { is: { email: { contains: search, mode: 'insensitive' } } } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actorUser: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }
}
