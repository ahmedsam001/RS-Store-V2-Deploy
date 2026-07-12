import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { CartService } from '../src/modules/cart/cart.service';

type CartWriteRunner = {
  runCartWrite<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

test('cart writes use explicit bounded interactive transaction options', async () => {
  let receivedOptions: Record<string, unknown> | undefined;
  const prisma = {
    $transaction: async (
      operation: (tx: Prisma.TransactionClient) => Promise<string>,
      options: Record<string, unknown>,
    ) => {
      receivedOptions = options;
      return operation({} as Prisma.TransactionClient);
    },
  };
  const service = new CartService(prisma as never, {} as never, {} as never);
  const runner = service as unknown as CartWriteRunner;

  const result = await runner.runCartWrite(async () => 'ok');

  assert.equal(result, 'ok');
  assert.equal(receivedOptions?.maxWait, 5_000);
  assert.equal(receivedOptions?.timeout, 15_000);
  assert.equal(
    receivedOptions?.isolationLevel,
    Prisma.TransactionIsolationLevel.Serializable,
  );
});

test('cart writes do not retry P2028 transaction failures', async () => {
  let transactionCalls = 0;
  const error = new Prisma.PrismaClientKnownRequestError(
    'Transaction API error: Transaction already closed',
    { code: 'P2028', clientVersion: '6.19.3' },
  );
  const prisma = {
    $transaction: async () => {
      transactionCalls += 1;
      throw error;
    },
  };
  const service = new CartService(prisma as never, {} as never, {} as never);
  const runner = service as unknown as CartWriteRunner;

  await assert.rejects(
    () => runner.runCartWrite(async () => undefined),
    (caught) => caught === error,
  );
  assert.equal(transactionCalls, 1);
});
