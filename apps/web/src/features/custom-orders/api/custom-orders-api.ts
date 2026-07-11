import { apiRequest } from '@/shared/api/http-client';

export type CustomOrderStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED';

export type CustomOrderRequest = {
  id: string;
  userId: string;
  productUrl: string;
  requestedColor?: string | null;
  requestedSize?: string | null;
  quantity: number;
  customerNote?: string | null;
  customerImageUrl?: string | null;
  status: CustomOrderStatus;
  adminTitle?: string | null;
  adminImageUrl?: string | null;
  adminPriceAmount?: string | number | null;
  adminShippingAmount?: string | number | null;
  adminTotalAmount?: string | number | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  convertedOrderId?: string | null;
  convertedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email?: string | null; phone?: string | null };
  reviewedBy?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
};

export type CustomOrderCreateInput = {
  productUrl: string;
  requestedColor?: string;
  requestedSize?: string;
  quantity: number;
  customerNote?: string;
};

export type CustomOrderReviewInput = {
  status: 'ACCEPTED' | 'REJECTED';
  adminTitle?: string;
  adminPriceAmount?: string;
  adminShippingAmount?: string;
  adminTotalAmount?: string;
  adminNote?: string;
};

export type CustomOrdersAdminPage = {
  items: CustomOrderRequest[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type RequestOptions = {
  csrfToken?: string | null;
  signal?: AbortSignal;
};

export const customOrdersApi = {
  listMine(options: RequestOptions = {}) {
    return apiRequest<CustomOrderRequest[]>('/custom-orders/my', { signal: options.signal });
  },

  create(input: CustomOrderCreateInput, image?: File | null, options: RequestOptions = {}) {
    const body = new FormData();
    body.append('productUrl', input.productUrl);
    body.append('quantity', String(input.quantity));
    if (input.requestedColor) body.append('requestedColor', input.requestedColor);
    if (input.requestedSize) body.append('requestedSize', input.requestedSize);
    if (input.customerNote) body.append('customerNote', input.customerNote);
    if (image) body.append('customerImage', image);
    return apiRequest<CustomOrderRequest>('/custom-orders', {
      method: 'POST',
      body,
      csrfToken: options.csrfToken,
    });
  },

  adminList(query = '', options: RequestOptions = {}) {
    const params = new URLSearchParams(query.replace(/^[?&]+/, ''));
    if (!params.has('limit')) params.set('limit', '20');
    return apiRequest<CustomOrdersAdminPage>(`/custom-orders/admin/list?${params.toString()}`, {
      signal: options.signal,
    });
  },

  review(
    id: string,
    input: CustomOrderReviewInput,
    image?: File | null,
    options: RequestOptions = {},
  ) {
    const body = new FormData();
    body.append('status', input.status);
    if (input.adminTitle) body.append('adminTitle', input.adminTitle);
    if (input.adminPriceAmount) body.append('adminPriceAmount', input.adminPriceAmount);
    if (input.adminShippingAmount) body.append('adminShippingAmount', input.adminShippingAmount);
    if (input.adminTotalAmount) body.append('adminTotalAmount', input.adminTotalAmount);
    if (input.adminNote) body.append('adminNote', input.adminNote);
    if (image) body.append('adminImage', image);
    return apiRequest<CustomOrderRequest>(`/custom-orders/${id}/review`, {
      method: 'PATCH',
      body,
      csrfToken: options.csrfToken,
    });
  },
};
