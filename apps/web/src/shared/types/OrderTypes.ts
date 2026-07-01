export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';
export type OrderItemStatus =
  | 'PENDING'
  | 'SHEIN'
  | 'KUWAIT'
  | 'CUSTOMS'
  | 'EGYPT'
  | 'SHOP'
  | 'CANCELLED';
export type OrderPaymentStatus =
  | 'DEPOSIT_PENDING'
  | 'DEPOSIT_SUBMITTED'
  | 'DEPOSIT_REJECTED'
  | 'DEPOSIT_APPROVED'
  | 'FINAL_PAYMENT_PENDING'
  | 'FINAL_PAYMENT_SUBMITTED'
  | 'FINAL_PAYMENT_REJECTED'
  | 'PAID';
export type PaymentProofType = 'DEPOSIT' | 'FINAL_PAYMENT';
export type PaymentMethod = 'INSTAPAY' | 'VODAFONE' | 'CASH_AT_SHOP';
export type PaymentProofStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type OrderMoney = {
  amount?: string;
  currency?: string;
};


export type CustomerSheinBatchStatus =
  | 'DRAFT'
  | 'ORDERED_FROM_SHEIN'
  | 'SHIPPING'
  | 'CUSTOMS'
  | 'ARRIVED_EGYPT'
  | 'ARRIVED_STORE'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED';
export type CustomerSheinBatchHistory = {
  id: string;
  fromStatus?: CustomerSheinBatchStatus | null;
  toStatus: CustomerSheinBatchStatus;
  note?: string | null;
  createdAt: string;
};
export type CustomerSheinBatchTracking = {
  id: string;
  batchCode: string;
  title?: string | null;
  status: CustomerSheinBatchStatus;
  orderedAt?: string | null;
  shippedAt?: string | null;
  customsAt?: string | null;
  arrivedEgyptAt?: string | null;
  arrivedStoreAt?: string | null;
  readyForPickupAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
  statusHistory?: CustomerSheinBatchHistory[];
};
export type CustomerSheinBatchItemTracking = {
  id: string;
  batchId: string;
  orderItemId: string;
  quantity: number;
  batch: CustomerSheinBatchTracking;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  productVariantId: string | null;
  productNameSnapshot: string;
  productSkuSnapshot: string | null;
  productVariantNameSnapshot: string | null;
  productVariantSkuSnapshot: string | null;
  productVariantSizeSnapshot: string | null;
  productVariantColorSnapshot: string | null;
  quantity: number;
  unitPriceAmount: string | number;
  lineTotalAmount: string | number;
  status: OrderItemStatus;
  sheinBatchItems?: CustomerSheinBatchItemTracking[];
};

export type OrderPaymentProof = {
  id: string;
  type: PaymentProofType;
  status: PaymentProofStatus;
  secureUrl: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type OrderTimelineEvent = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actorName?: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currency: string;
  subtotalAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  depositPercent: number;
  depositAmount: string | number;
  remainingAmount: string | number;
  depositPaymentMethod: PaymentMethod;
  depositPaymentFeeAmount: string | number;
  depositPaidAmount: string | number;
  finalPaymentMethod: PaymentMethod | null;
  finalPaymentFeeAmount: string | number;
  finalAmountDue: string | number;
  finalPaidAmount: string | number;
  inventoryStatus: 'NONE' | 'RESERVED' | 'DEDUCTED' | 'RELEASED';
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string | null;
  shippingAddressSnapshot: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  paymentProofs: OrderPaymentProof[];
  timeline?: OrderTimelineEvent[];
};

export type CheckoutInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  notes?: string;
  depositPercent: 50 | 60 | 70;
  paymentMethod: 'instapay' | 'vodafone';
  idempotencyKey?: string;
};
