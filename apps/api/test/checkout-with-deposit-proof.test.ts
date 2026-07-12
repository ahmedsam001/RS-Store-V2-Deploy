/* eslint-disable @typescript-eslint/no-explicit-any -- transaction test doubles mirror Prisma's nested API */
import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../src/common/types/authenticated-user';
import { OrdersService } from '../src/modules/orders/orders.service';

const user: AuthenticatedUser = { id: 'user-1', role: UserRole.CUSTOMER, sessionId: 'session-1' };
const dto = {
  customerName: 'Test Customer',
  customerPhone: '+201000000000',
  customerEmail: 'customer@example.com',
  shippingAddress: '10 Test Street Cairo',
  depositPercent: 50,
  paymentMethod: 'instapay',
  idempotencyKey: 'checkout-key-123456',
} as const;
const file = { buffer: Buffer.from('image'), originalname: 'proof.png' } as never;
const uploadedProof = {
  cloudinaryPublicId: 'orders/proof-1',
  secureUrl: 'https://example.test/proof-1',
  width: 100,
  height: 100,
  byteSize: 5,
  format: 'png',
};

function prismaError(code: string, target?: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('request failed', {
    code,
    clientVersion: '6.19.3',
    meta: target ? { target } : undefined,
  });
}

type HarnessOptions = {
  preflightError?: Error;
  transactionError?: Error;
  clearCartError?: Error;
  notificationError?: Error;
};

function createHarness(options: HarnessOptions = {}) {
  const state = {
    cartItems: [
      {
        id: 'cart-item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        productVariantId: 'variant-1',
        customOrderRequestId: null,
        quantity: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        product: {
          id: 'product-1',
          nameAr: 'Product',
          sku: 'PRODUCT-1',
          currency: 'EGP',
          priceAmount: 100,
          discountPercent: 0,
        },
        productVariant: {
          id: 'variant-1',
          nameAr: 'Medium',
          sku: 'VARIANT-1',
          size: 'M',
          color: 'Black',
          priceAmount: 100,
        },
        customOrderRequest: null,
      },
    ],
    stockQuantity: 5,
    reservedQuantity: 0,
    orders: [] as Array<Record<string, any>>,
    proofs: [] as Array<Record<string, any>>,
    idempotency: [] as Array<Record<string, any>>,
  };
  const uploadCalls: string[] = [];
  const deleteCalls: string[] = [];
  let notificationCalls = 0;
  let preflightCalls = 0;

  const findIdempotency = (key: string) => {
    const record = state.idempotency.find((item) => item.userId === user.id && item.key === key);
    if (!record) return null;
    const order = state.orders.find((item) => item.id === record.orderId) ?? null;
    return { ...record, order };
  };

  const makeTransaction = () => ({
    checkoutIdempotencyKey: {
      findUnique: async ({ where }: any) => findIdempotency(where.userId_key.key),
      create: async ({ data }: any) => {
        const record = { id: `key-${state.idempotency.length + 1}`, ...data, orderId: null };
        state.idempotency.push(record);
        return { id: record.id };
      },
      update: async ({ where, data }: any) => {
        const record = state.idempotency.find((item) => item.id === where.id)!;
        Object.assign(record, data);
        return record;
      },
    },
    cart: {
      findUnique: async () => ({ id: 'cart-1', userId: user.id, items: state.cartItems }),
    },
    product: { findFirst: async () => ({ id: 'product-1' }) },
    productVariant: {
      findFirst: async () => ({
        id: 'variant-1',
        stockQuantity: state.stockQuantity,
        reservedQuantity: state.reservedQuantity,
      }),
      count: async () => 1,
    },
    setting: { findMany: async () => [] },
    $executeRaw: async () => {
      if (state.stockQuantity - state.reservedQuantity < 1) return 0;
      state.reservedQuantity += 1;
      return 1;
    },
    $queryRaw: async () => [{ order_number: 'RS-20260712-000001' }],
    order: {
      create: async ({ data }: any) => {
        const order = {
          id: `order-${state.orders.length + 1}`,
          ...data,
          orderNumber: data.orderNumber,
          paymentProofs: [],
          items: data.items.create,
          user: { id: user.id },
        };
        state.orders.push(order);
        return order;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const order = state.orders.find((item) => item.id === where.id);
        if (!order) throw prismaError('P2025');
        return order;
      },
    },
    orderPaymentProof: {
      create: async ({ data }: any) => {
        const proof = { id: `proof-${state.proofs.length + 1}`, ...data };
        state.proofs.push(proof);
        const order = state.orders.find((item) => item.id === data.orderId)!;
        order.paymentProofs.push(proof);
        return proof;
      },
    },
    customOrderRequest: { updateMany: async () => ({ count: 0 }) },
    cartItem: {
      deleteMany: async () => {
        if (options.clearCartError) throw options.clearCartError;
        const count = state.cartItems.length;
        state.cartItems = [];
        return { count };
      },
    },
    auditLog: { create: async ({ data }: any) => data },
  });

  const prisma = {
    checkoutIdempotencyKey: {
      findUnique: async ({ where }: any) => {
        preflightCalls += 1;
        if (options.preflightError && preflightCalls === 1) throw options.preflightError;
        return findIdempotency(where.userId_key.key);
      },
    },
    $transaction: async (callback: (tx: any) => Promise<any>) => {
      if (options.transactionError) throw options.transactionError;
      const snapshot = structuredClone(state);
      try {
        return await callback(makeTransaction());
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
    auditLog: { findMany: async () => [] },
  };
  const uploads = {
    uploadImage: async () => {
      uploadCalls.push('upload');
      return uploadedProof;
    },
    deleteImage: async (publicId: string) => {
      deleteCalls.push(publicId);
    },
  };
  const notifications = {
    createAdminNotification: async () => {
      notificationCalls += 1;
      if (options.notificationError) throw options.notificationError;
    },
  };
  const pricing = {
    getActiveSaleAdjustments: async () => new Map(),
    resolveProductPricing: () => ({ finalPriceAmount: 100 }),
  };
  const service = new OrdersService(
    prisma as never,
    uploads as never,
    notifications as never,
    pricing as never,
  );

  return {
    service,
    state,
    uploadCalls,
    deleteCalls,
    notificationCalls: () => notificationCalls,
  };
}

test('preserves a transient Prisma checkout failure for the global 503 mapping', async () => {
  const error = prismaError('P2024');
  const harness = createHarness({ preflightError: error });

  await assert.rejects(
    () => harness.service.checkoutWithDepositProof(user, dto, file, undefined, 'request-1'),
    (caught) => caught === error,
  );
  assert.equal(harness.uploadCalls.length, 0);
});

test('replays a duplicate checkout submission without uploading or creating another order', async () => {
  const harness = createHarness();
  const first = await harness.service.checkoutWithDepositProof(user, dto, file);
  const second = await harness.service.checkoutWithDepositProof(user, dto, file);

  assert.equal(second.id, first.id);
  assert.equal(harness.state.orders.length, 1);
  assert.equal(harness.uploadCalls.length, 1);
});

test('deletes an uploaded proof when the database transaction fails', async () => {
  const error = prismaError('P1001');
  const harness = createHarness({ transactionError: error });

  await assert.rejects(
    () => harness.service.checkoutWithDepositProof(user, dto, file),
    (caught) => caught === error,
  );
  assert.deepEqual(harness.deleteCalls, [uploadedProof.cloudinaryPublicId]);
});

test('does not convert an unrelated P2002 into an idempotency replay conflict', async () => {
  const error = prismaError('P2002', ['order_number']);
  const harness = createHarness({ transactionError: error });

  await assert.rejects(
    () => harness.service.checkoutWithDepositProof(user, dto, file),
    (caught) => caught === error,
  );
  assert.deepEqual(harness.deleteCalls, [uploadedProof.cloudinaryPublicId]);
});

test('rolls back order, proof, idempotency and stock when cart clearing fails', async () => {
  const harness = createHarness({ clearCartError: prismaError('P2003') });

  await assert.rejects(() => harness.service.checkoutWithDepositProof(user, dto, file));
  assert.equal(harness.state.orders.length, 0);
  assert.equal(harness.state.proofs.length, 0);
  assert.equal(harness.state.idempotency.length, 0);
  assert.equal(harness.state.reservedQuantity, 0);
});

test('keeps the cart intact after a failed checkout', async () => {
  const harness = createHarness({ transactionError: prismaError('P2028') });

  await assert.rejects(() => harness.service.checkoutWithDepositProof(user, dto, file));
  assert.equal(harness.state.cartItems.length, 1);
});

test('successful checkout still reserves stock, attaches proof and clears the cart', async () => {
  const harness = createHarness({ notificationError: prismaError('P2024') });

  const order = await harness.service.checkoutWithDepositProof(user, dto, file);

  assert.equal(order.paymentProofs.length, 1);
  assert.equal(harness.state.orders.length, 1);
  assert.equal(harness.state.reservedQuantity, 1);
  assert.equal(harness.state.cartItems.length, 0);
  assert.equal(harness.notificationCalls(), 1);
  assert.equal(harness.deleteCalls.length, 0);
});
