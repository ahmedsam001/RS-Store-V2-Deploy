import { apiRequest } from '@/shared/api/http-client';
import type { CheckoutInput, Order } from '@/shared/types/OrderTypes';
import { optimizePaymentProofImage } from './payment-proof-image';

const PAYMENT_PROOF_REQUEST_TIMEOUT_MS = 30000;

type OrderRequestOptions = {
  csrfToken?: string | null;
  signal?: AbortSignal;
  idempotencyKey?: string;
};

export const ordersApi = {
  checkout(input: CheckoutInput, options: OrderRequestOptions = {}) {
    return apiRequest<Order>('/orders/checkout', {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
      headers: { 'Idempotency-Key': options.idempotencyKey ?? input.idempotencyKey },
    });
  },

  async checkoutWithDepositProof(
    input: CheckoutInput,
    file: File,
    options: OrderRequestOptions = {},
  ) {
    const body = new FormData();
    const optimizedFile = await optimizePaymentProofImage(file);
    body.append('file', optimizedFile);
    appendCheckoutFormFields(body, input);
    return apiRequest<Order>('/orders/checkout-with-deposit-proof', {
      method: 'POST',
      body,
      csrfToken: options.csrfToken,
      signal: options.signal,
      headers: { 'Idempotency-Key': options.idempotencyKey ?? input.idempotencyKey },
      timeoutMs: PAYMENT_PROOF_REQUEST_TIMEOUT_MS,
    });
  },

  async listMyOrders(options: OrderRequestOptions = {}) {
    return apiRequest<Order[]>('/orders/my', { signal: options.signal });
  },

  getMyOrder(orderId: string, options: OrderRequestOptions = {}) {
    return apiRequest<Order>(`/orders/my/${orderId}`, { signal: options.signal });
  },

  uploadDepositProof(orderId: string, file: File, options: OrderRequestOptions = {}) {
    return uploadProof(`/orders/${orderId}/deposit-proof`, file, options);
  },

  uploadFinalPaymentProof(
    orderId: string,
    file: File,
    method: 'instapay' | 'vodafone',
    options: OrderRequestOptions = {},
  ) {
    return uploadProof(`/orders/${orderId}/final-payment-proof`, file, options, {
      method,
    });
  },

  submitCashFinalPayment(orderId: string, options: OrderRequestOptions = {}) {
    return apiRequest<Order>(`/orders/${orderId}/final-payment`, {
      method: 'POST',
      body: { method: 'cash_at_shop' },
      csrfToken: options.csrfToken,
    });
  },
};

async function uploadProof(
  path: string,
  file: File,
  options: OrderRequestOptions = {},
  fields: Record<string, string> = {},
): Promise<Order> {
  const body = new FormData();
  const optimizedFile = await optimizePaymentProofImage(file);
  body.append('file', optimizedFile);
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return apiRequest<Order>(path, {
    method: 'POST',
    body,
    csrfToken: options.csrfToken,
    signal: options.signal,
    timeoutMs: PAYMENT_PROOF_REQUEST_TIMEOUT_MS,
  });
}

function appendCheckoutFormFields(body: FormData, input: CheckoutInput): void {
  body.append('customerName', input.customerName);
  body.append('customerPhone', input.customerPhone);
  if (input.customerEmail) body.append('customerEmail', input.customerEmail);
  body.append('shippingAddress', input.shippingAddress);
  if (input.notes) body.append('notes', input.notes);
  body.append('depositPercent', String(input.depositPercent));
  body.append('paymentMethod', input.paymentMethod);
  if (input.idempotencyKey) body.append('idempotencyKey', input.idempotencyKey);
}
