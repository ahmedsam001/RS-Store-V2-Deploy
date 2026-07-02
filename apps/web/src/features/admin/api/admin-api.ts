import { apiRequest } from '@/shared/api/http-client';

export type AdminList<T> = T[];
export type AdminPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
export type AdminPaginated<T> = { items: T[]; meta: AdminPaginationMeta };

function asPaginated<T>(response: AdminList<T> | AdminPaginated<T>): AdminPaginated<T> {
  if (Array.isArray(response)) {
    return {
      items: response,
      meta: {
        page: 1,
        limit: response.length || 20,
        total: response.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
  return response;
}

async function fetchList<T>(path: string): Promise<AdminPaginated<T>> {
  return asPaginated(await apiRequest<AdminList<T> | AdminPaginated<T>>(path));
}

export type AdminImage = {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  width?: number | null;
  height?: number | null;
  altTextAr?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};
export type AdminVariant = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  stockQuantity: number;
  status: string;
  priceAmount?: string | number | null;
  sortOrder?: number | null;
};
export type AdminProduct = {
  id: string;
  categoryId?: string | null;
  category?: { id: string; nameAr: string; nameEn?: string | null } | null;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
  sku: string | null;
  description?: string | null;
  sourceSheinUrl?: string | null;
  subCategory?: string | null;
  subCategoryId?: string | null;
  status: string;
  priceAmount: string | number;
  discount?: string | number | null;
  discountPercent?: string | number | null;
  rating?: string | number | null;
  currency: string;
  images?: AdminImage[];
  variants?: AdminVariant[];
  isInStock?: boolean;
  stockQuantity?: number;
};
export type AdminCategory = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  children?: AdminCategory[];
};
export type AdminCategoryInput = {
  nameAr: string;
  nameEn?: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
  image?: string;
  parentId?: string | null;
};
export type AdminSubcategoryInput = {
  nameAr: string;
  nameEn?: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
  image?: string;
};
export type AdminWriteOptions = {
  csrfToken?: string | null;
};
export type AdminOrderItemSheinBatchTracking = {
  id: string;
  batchId: string;
  orderItemId: string;
  quantity: number;
  batch: {
    id: string;
    batchCode: string;
    title?: string | null;
    status: string;
    orderedAt?: string | null;
    shippedAt?: string | null;
    customsAt?: string | null;
    arrivedStoreAt?: string | null;
    readyForPickupAt?: string | null;
    deliveredAt?: string | null;
    cancelledAt?: string | null;
    updatedAt: string;
  };
};
export type AdminOrderItemProduct = {
  id: string;
  slug?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  sourceSheinUrl?: string | null;
};
export type AdminOrderItem = {
  id: string;
  productNameSnapshot: string;
  productVariantSizeSnapshot?: string | null;
  productVariantColorSnapshot?: string | null;
  quantity: number;
  unitPriceAmount: string | number;
  lineTotalAmount: string | number;
  status: string;
  product?: AdminOrderItemProduct | null;
  sheinBatchItems?: AdminOrderItemSheinBatchTracking[];
};
export type AdminPaymentProof = {
  id: string;
  type: string;
  status: string;
  secureUrl: string;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};
export type AdminOrderTimelineEvent = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actorName?: string | null;
};
export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  subtotalAmount?: string | number;
  discountAmount?: string | number;
  depositAmount?: string | number;
  depositPaidAmount?: string | number;
  remainingAmount?: string | number;
  finalAmountDue?: string | number;
  finalPaidAmount?: string | number;
  depositPaymentMethod?: 'INSTAPAY' | 'VODAFONE' | null;
  finalPaymentMethod?: 'INSTAPAY' | 'VODAFONE' | 'CASH_AT_SHOP' | null;
  depositApprovedAt?: string | null;
  finalPaymentApprovedAt?: string | null;
  currency: string;
  customerNameSnapshot?: string;
  customerPhoneSnapshot?: string;
  customerEmailSnapshot?: string | null;
  shippingAddressSnapshot?: string;
  notes?: string | null;
  createdAt: string;
  items?: AdminOrderItem[];
  paymentProofs?: AdminPaymentProof[];
  timeline?: AdminOrderTimelineEvent[];
};
export type AdminSetting = {
  key: string;
  scope: string;
  value: unknown;
  description?: string | null;
  updatedAt: string;
};
export type AdminSettingDefinition = {
  key: string;
  scope: string;
  type: string;
  labelAr: string;
  labelEn: string;
  required: boolean;
  min?: number;
  max?: number;
};
export type AdminFlashSale = {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  discountPercent: string | number;
  status: string;
  startsAt: string;
  endsAt: string;
  products?: { product: AdminProduct }[];
};
export type SheinPreviewImage = {
  url: string;
  altTextAr?: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  format?: string;
  isPrimary?: boolean;
  source?: 'SHEIN_IMPORT' | 'ADMIN_UPLOAD';
};
export type SheinPreviewVariant = {
  sku?: string;
  nameAr: string;
  nameEn?: string;
  size?: string;
  color?: string;
  priceAmount?: string;
  stockQuantity?: number;
};
export type SheinPreviewPayload = {
  slug: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  sku?: string;
  priceAmount: string;
  originalPriceAmount?: string;
  currency: string;
  country: string;
  selectedCountry?: string;
  selectedCurrency?: string;
  actualDetectedCountry?: string;
  actualDetectedCurrency?: string;
  warnings?: string[];
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  subCategory?: string;
  exchangeRate?: string | number;
  storePriceAmount?: string;
  discount?: number;
  rating?: number;
  images: SheinPreviewImage[];
  sizes?: string[];
  colors?: string[];
  variants: SheinPreviewVariant[];
};
export type SheinExtractedProduct = {
  title: string;
  price: number;
  currency: 'SAR';
  originalPrice: number | null;
  description: string;
  images: string[];
  variants: Array<{
    color: string | null;
    size: string | null;
    sku: string | null;
    stock: number | null;
  }>;
  sourceUrl: string;
  sourceProductId: string | null;
  categorySuggestion?: string | null;
};
export type SheinExtractionEnvelope = {
  status: 'success' | 'manual_review' | 'captcha_required' | 'failed';
  reason: string;
  product: SheinExtractedProduct | null;
};

export type OrderItemStatus =
  | 'PENDING'
  | 'SHEIN'
  | 'KUWAIT'
  | 'CUSTOMS'
  | 'EGYPT'
  | 'SHOP'
  | 'CANCELLED';

export type SheinBatchStatus =
  | 'DRAFT'
  | 'ORDERED_FROM_SHEIN'
  | 'SHIPPING'
  | 'CUSTOMS'
  | 'ARRIVED_EGYPT'
  | 'ARRIVED_STORE'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED';

export type SheinBatchStatusGroup =
  | 'COLLECTING'
  | 'ORDERED'
  | 'IN_SHIPPING'
  | 'ARRIVED_SHOP'
  | 'COMPLETED'
  | 'CANCELLED';
export type AdminSheinBatchItem = {
  id: string;
  batchId: string;
  orderId: string;
  orderItemId: string;
  productId?: string | null;
  productVariantId?: string | null;
  orderNumberSnapshot: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  productNameSnapshot: string;
  productVariantNameSnapshot?: string | null;
  quantity: number;
  unitSarAmount: string | number;
  totalSarAmount: string | number;
  unitEgpAmount: string | number;
  totalEgpAmount: string | number;
  whatsappMessageTemplate?: string | null;
  whatsappUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount?: string | number;
    depositPaidAmount?: string | number;
    finalPaidAmount?: string | number;
    finalAmountDue?: string | number;
    remainingAmount?: string | number;
    customerNameSnapshot?: string;
    customerPhoneSnapshot?: string;
  };
  orderItem?: { id: string; status: OrderItemStatus };
  product?: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn?: string | null;
    sourceSheinUrl?: string | null;
  } | null;
  productVariant?: {
    id: string;
    sku?: string | null;
    nameAr: string;
    nameEn?: string | null;
    size?: string | null;
    color?: string | null;
  } | null;
};
export type AdminSheinBatchWhatsappNotification = {
  itemId: string;
  orderItemId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  totalEgpAmount: string | number;
  whatsappMessage: string;
  whatsappUrl?: string | null;
};
export type AdminSheinBatchWhatsappNotifications = {
  batchId: string;
  batchCode: string;
  status: SheinBatchStatus;
  statusLabelAr: string;
  items: AdminSheinBatchWhatsappNotification[];
};
export type AdminSheinBatchHistory = {
  id: string;
  fromStatus?: SheinBatchStatus | null;
  toStatus: SheinBatchStatus;
  note?: string | null;
  createdAt: string;
  changedBy?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
};
export type AdminSheinBatch = {
  id: string;
  batchCode: string;
  title?: string | null;
  sheinOrderReference?: string | null;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  trackingUrl?: string | null;
  status: SheinBatchStatus;
  exchangeRateSarToEgp: string | number;
  totalQuantity: number;
  totalSarAmount: string | number;
  totalEgpAmount: string | number;
  notes?: string | null;
  orderedAt?: string | null;
  shippedAt?: string | null;
  customsAt?: string | null;
  arrivedEgyptAt?: string | null;
  arrivedStoreAt?: string | null;
  readyForPickupAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number; statusHistory?: number };
  orderCount?: number;
  itemsCount?: number;
  items?: AdminSheinBatchItem[];
  statusHistory?: AdminSheinBatchHistory[];
  sheinLinksWhatsappMessage?: string;
  createdBy?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
  updatedBy?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
};
export type AdminAvailableSheinOrderItem = AdminOrderItem & {
  orderId: string;
  productId?: string | null;
  productVariantId?: string | null;
  suggestedUnitSarAmount?: string | number | null;
  productSkuSnapshot?: string | null;
  productVariantNameSnapshot?: string | null;
  productVariantSkuSnapshot?: string | null;
  productVariantSizeSnapshot?: string | null;
  productVariantColorSnapshot?: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount?: string | number;
    depositPaidAmount?: string | number;
    remainingAmount?: string | number;
    customerNameSnapshot: string;
    customerPhoneSnapshot: string;
    createdAt: string;
  };
  product?: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn?: string | null;
    sourceSheinUrl?: string | null;
  } | null;
  productVariant?: {
    id: string;
    sku?: string | null;
    nameAr: string;
    nameEn?: string | null;
    size?: string | null;
    color?: string | null;
  } | null;
};

export type AdminSheinImport = {
  id: string;
  sourceUrl: string;
  status: string;
  previewPayload: SheinPreviewPayload | null;
  editedPayload: SheinPreviewPayload | null;
  errors?: unknown;
  errorCode?: string | null;
  errorMessage: string | null;
  retryCount: number;
  importedImagesCount: number;
  createdProduct?: { id: string; nameAr: string; slug: string } | null;
  createdAt: string;
  completedAt?: string | null;
  extraction?: SheinExtractionEnvelope;
};
export type SheinImportStep = {
  id: string;
  labelAr: string;
  labelEn: string;
  status: 'pending' | 'running' | 'verification' | 'success' | 'warning' | 'error';
  message?: string;
  at?: string;
};
export type AdminSheinAssistJob = {
  id: string;
  importId: string;
  sourceUrl: string;
  preparedUrl?: string;
  assistedUrl?: string;
  status:
    | 'queued'
    | 'running'
    | 'verification'
    | 'ready'
    | 'manual'
    | 'failed'
    | 'expired'
    | 'cancelled';
  messageAr: string;
  messageEn: string;
  steps: SheinImportStep[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
};
export type AdminSheinAssistResponse = {
  ok: boolean;
  status?: SheinExtractionEnvelope['status'];
  reason?: string;
  product?: SheinExtractedProduct | null;
  assistedUrl?: string;
  browserUrl?: string;
  job: AdminSheinAssistJob | null;
  import?: AdminSheinImport | null;
};
export type AdminSheinCountry = { code: string; nameEn: string; nameAr: string };
export type AdminSheinMarketplaceSettings = {
  countryCode: string;
  currencyCode: 'SAR';
  language: string;
  countries: AdminSheinCountry[];
};
export type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: unknown;
  createdAt: string;
  actorUser?: { id: string; name: string; email?: string | null; role?: string } | null;
};
export type UploadReconciliation = { databaseOrphans: number; cloudinaryOrphans: number };
export type UploadCleanupResult = {
  databaseRecordsDeleted: number;
  cloudinaryFilesDeleted: number;
};
export type AdminNotification = {
  id: string;
  titleAr: string;
  messageAr: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
};

export type AdminOverviewRecentOrder = Pick<
  AdminOrder,
  | 'id'
  | 'orderNumber'
  | 'status'
  | 'paymentStatus'
  | 'totalAmount'
  | 'currency'
  | 'customerNameSnapshot'
  | 'customerPhoneSnapshot'
  | 'createdAt'
>;
export type AdminOverviewRecentSheinImport = Pick<
  AdminSheinImport,
  'id' | 'sourceUrl' | 'status' | 'errorMessage' | 'createdAt' | 'createdProduct'
>;
export type AdminOverviewLowStockVariant = {
  id: string;
  nameAr: string;
  size?: string | null;
  color?: string | null;
  stockQuantity: number;
  product: { id: string; nameAr: string; slug: string; status: string };
};

export type AdminReportStatusRow = {
  status: string;
  count: number;
  totalAmount?: string | number;
  paidAmount?: string | number;
  remainingAmount?: string | number;
  totalSarAmount?: string | number;
  totalEgpAmount?: string | number;
  totalQuantity?: number;
};
export type AdminReportOpenBatch = {
  id: string;
  batchCode: string;
  title?: string | null;
  status: SheinBatchStatus;
  orderCount: number;
  itemsCount: number;
  totalQuantity: number;
  totalSarAmount: string | number;
  totalEgpAmount: string | number;
  exchangeRateSarToEgp: string | number;
  createdAt: string;
  updatedAt: string;
};
export type AdminReports = {
  batches: {
    total: number;
    open: number;
    completed: number;
    cancelled: number;
    totalSarAmount: string | number;
    totalEgpAmount: string | number;
    totalQuantity: number;
    activeSarAmount: string | number;
    activeEgpAmount: string | number;
    activeQuantity: number;
    byStatus: AdminReportStatusRow[];
    openItems: AdminReportOpenBatch[];
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    readyForBatch: number;
    inBatch: number;
    waitingFinalPayment: number;
    readyToDeliver: number;
    depositReview: number;
    finalPaymentReview: number;
    cashFinalPaymentReview: number;
    totalSalesAmount: string | number;
    customerDepositPaidAmount: string | number;
    customerFinalPaidAmount: string | number;
    customerPaidAmount: string | number;
    customerRemainingAmount: string | number;
    byStatus: AdminReportStatusRow[];
    byPaymentStatus: AdminReportStatusRow[];
  };
  money: {
    totalSheinSarAmount: string | number;
    totalSheinEgpAmount: string | number;
    totalCustomerSalesAmount: string | number;
    totalCustomerPaidAmount: string | number;
    totalCustomerRemainingAmount: string | number;
  };
  generatedAt: string;
};

export type AdminOverview = {
  usersCount: number;
  productsCount: number;
  activeProductsCount: number;
  draftProductsCount: number;
  archivedProductsCount: number;
  productsWithoutImagesCount: number;
  categoriesCount: number;
  activeCategoriesCount: number;
  ordersCount: number;
  pendingOrdersCount: number;
  todayOrdersCount: number;
  todayRevenueAmount: number;
  pendingPaymentProofsCount: number;
  finalPaymentPendingCount: number;
  activeFlashSalesCount: number;
  scheduledFlashSalesCount: number;
  pendingSheinImportsCount: number;
  failedSheinImportsCount: number;
  lowStockVariantsCount: number;
  unreadNotificationsCount: number;
  recentOrders: AdminOverviewRecentOrder[];
  recentSheinImports: AdminOverviewRecentSheinImport[];
  lowStockVariants: AdminOverviewLowStockVariant[];
};

export type UploadedImageResponse = {
  cloudinaryPublicId: string;
  secureUrl: string;
  width: number;
  height: number;
  byteSize: number;
  format: string;
};

export type AdminCreateProductInput = {
  slug?: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  sourceSheinUrl?: string;
  subCategory?: string;
  subCategoryId?: string;
  priceAmount: string;
  sku?: string;
  status?: string;
  categoryId?: string;
  discount?: number;
  rating?: number;
  currency?: string;
  isInStock?: boolean;
  stockQuantity?: number;
};
export type AdminCreateVariantInput = {
  nameAr: string;
  nameEn?: string;
  sku?: string;
  size?: string;
  color?: string;
  priceAmount?: string;
  stockQuantity?: number;
  status?: string;
  sortOrder?: number;
};

function sanitizeSheinPublishPayload(
  payload?: SheinPreviewPayload,
): SheinPreviewPayload | undefined {
  if (!payload) return undefined;
  return {
    slug: payload.slug,
    nameAr: payload.nameAr,
    nameEn: payload.nameEn,
    description: payload.description,
    sku: payload.sku,
    priceAmount: payload.priceAmount,
    currency: 'SAR',
    country: payload.country,
    categoryId: payload.categoryId,
    categorySlug: payload.categorySlug,
    categoryName: payload.categoryName,
    subCategory: payload.subCategory,
    exchangeRate: payload.exchangeRate,
    storePriceAmount: payload.storePriceAmount,
    discount: payload.discount,
    rating: payload.rating,
    images: payload.images ?? [],
    sizes: payload.sizes,
    colors: payload.colors,
    variants: payload.variants ?? [],
  };
}

export const adminApi = {
  overview: () => apiRequest<AdminOverview>('/admin/overview'),
  reports: () => apiRequest<AdminReports>('/admin/reports'),
  notifications: () => apiRequest<AdminList<AdminNotification>>('/notifications?limit=10'),
  markNotificationRead: (id: string, options?: AdminWriteOptions) =>
    apiRequest<AdminNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
      csrfToken: options?.csrfToken,
    }),

  // productsPage: (query = '') => fetchList<AdminProduct>(`/products?limit=20${query}`),
  productsPage: (query = '') => fetchList<AdminProduct>(withDefaultLimit('/products', query)),
  products: async (query = '') => (await adminApi.productsPage(query)).items,
  product: (id: string) => apiRequest<AdminProduct>(`/products/${id}`),
  createProduct: (input: AdminCreateProductInput, options?: AdminWriteOptions) =>
    apiRequest<AdminProduct>('/products', {
      method: 'POST',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  updateProduct: (
    id: string,
    input: Partial<AdminCreateProductInput>,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminProduct>(`/products/${id}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  applyBulkProductDiscount: (discount: number, options?: AdminWriteOptions) =>
    apiRequest<{ updatedCount: number; discount: number }>('/products/bulk/discount', {
      method: 'PATCH',
      body: { discount },
      csrfToken: options?.csrfToken,
    }),
  deleteProduct: (id: string, options?: AdminWriteOptions) =>
    apiRequest<AdminProduct>(`/products/${id}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),
  changeProductStatus: (
    id: string,
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminProduct>(`/products/${id}/status`, {
      method: 'PATCH',
      body: { status },
      csrfToken: options?.csrfToken,
    }),
  uploadImage: (file: File, folder = 'rs-store/products', options: AdminWriteOptions = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    return apiRequest<UploadedImageResponse>('/uploads/images', {
      method: 'POST',
      body: form,
      csrfToken: options.csrfToken,
    });
  },
  addProductImage: (
    productId: string,
    input: Partial<AdminImage> & UploadedImageResponse,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminImage>(`/products/${productId}/images`, {
      method: 'POST',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  setPrimaryImage: (productId: string, imageId: string, options?: AdminWriteOptions) =>
    apiRequest<AdminImage>(`/products/${productId}/images/${imageId}/primary`, {
      method: 'PATCH',
      csrfToken: options?.csrfToken,
    }),
  deleteProductImage: (imageId: string, options?: AdminWriteOptions) =>
    apiRequest<AdminImage>(`/products/images/${imageId}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),
  createVariant: (productId: string, input: AdminCreateVariantInput, options?: AdminWriteOptions) =>
    apiRequest(`/products/${productId}/variants`, {
      method: 'POST',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  updateVariant: (
    productId: string,
    variantId: string,
    input: Partial<AdminCreateVariantInput>,
    options?: AdminWriteOptions,
  ) =>
    apiRequest(`/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  deleteVariant: (productId: string, variantId: string, options?: AdminWriteOptions) =>
    apiRequest(`/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),

  categoriesPage: (query = 'includeChildren=true') =>
    fetchList<AdminCategory>(withDefaultLimit('/categories', query)),
  categories: async () => (await adminApi.categoriesPage('includeChildren=true')).items,
  createCategory: (input: AdminCategoryInput, options: AdminWriteOptions = {}) =>
    apiRequest<AdminCategory>('/categories', {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
    }),
  updateCategory: (
    id: string,
    input: Partial<AdminCategoryInput>,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminCategory>(`/categories/${id}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options.csrfToken,
    }),
  deleteCategory: (id: string, options: AdminWriteOptions = {}) =>
    apiRequest<AdminCategory>(`/categories/${id}`, {
      method: 'DELETE',
      csrfToken: options.csrfToken,
    }),
  createSubcategory: (
    parentId: string,
    input: AdminSubcategoryInput,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminCategory>(`/categories/${parentId}/subcategories`, {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
    }),
  updateSubcategory: (
    id: string,
    input: Partial<AdminSubcategoryInput>,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminCategory>(`/categories/${id}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options.csrfToken,
    }),
  deleteSubcategory: (id: string, options: AdminWriteOptions = {}) =>
    apiRequest<AdminCategory>(`/categories/${id}`, {
      method: 'DELETE',
      csrfToken: options.csrfToken,
    }),

  ordersPage: (query = '') => fetchList<AdminOrder>(withDefaultLimit('/orders', query)),
  orders: async (query = '') => (await adminApi.ordersPage(query)).items,
  order: (id: string) => apiRequest<AdminOrder>(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string, options?: AdminWriteOptions) =>
    apiRequest<AdminOrder>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
      csrfToken: options?.csrfToken,
    }),
  updateOrderStatusWithNotes: (
    id: string,
    status: string,
    notes?: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminOrder>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: { status, notes },
      csrfToken: options?.csrfToken,
    }),
  updateOrderItemStatus: (id: string, status: string, options?: AdminWriteOptions) =>
    apiRequest(`/orders/items/${id}/status`, {
      method: 'PATCH',
      body: { status },
      csrfToken: options?.csrfToken,
    }),
  reviewPaymentProof: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminOrder>(`/orders/payment-proofs/${id}/status`, {
      method: 'PATCH',
      body: { status, rejectionReason },
      csrfToken: options?.csrfToken,
    }),
  reviewCashFinalPayment: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    note?: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminOrder>(`/orders/${id}/final-payment`, {
      method: 'PATCH',
      body: { status, method: 'cash_at_shop', note },
      csrfToken: options?.csrfToken,
    }),

  settingsPage: () => fetchList<AdminSetting>('/settings?limit=100'),
  settings: async () => (await adminApi.settingsPage()).items,
  settingDefinitions: () => apiRequest<AdminSettingDefinition[]>('/settings/definitions'),
  upsertSetting: (
    key: string,
    input: { value: unknown; scope: string; description?: string },
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSetting>(`/settings/${key}`, {
      method: 'PUT',
      body: input,
      csrfToken: options?.csrfToken,
    }),

  flashSalesPage: (query = '') =>
    fetchList<AdminFlashSale>(withDefaultLimit('/flash-sales/admin/list', query, 20)),
  flashSales: async (query = '') => (await adminApi.flashSalesPage(query)).items,
  createFlashSale: (
    input: {
      titleAr: string;
      titleEn?: string;
      discountPercent: string;
      startsAt: string;
      endsAt: string;
      status: string;
    },
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminFlashSale>('/flash-sales', {
      method: 'POST',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  updateFlashSale: (id: string, input: Partial<AdminFlashSale>, options?: AdminWriteOptions) =>
    apiRequest<AdminFlashSale>(`/flash-sales/${id}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  deleteFlashSale: (id: string, options?: AdminWriteOptions) =>
    apiRequest<AdminFlashSale>(`/flash-sales/${id}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),
  addFlashSaleProduct: (id: string, productId: string, options?: AdminWriteOptions) =>
    apiRequest(`/flash-sales/${id}/products`, {
      method: 'POST',
      body: { productId },
      csrfToken: options?.csrfToken,
    }),
  removeFlashSaleProduct: (id: string, productId: string, options?: AdminWriteOptions) =>
    apiRequest(`/flash-sales/${id}/products/${productId}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),

  sheinMarketplaceSettings: () =>
    apiRequest<AdminSheinMarketplaceSettings>('/shein/marketplace-settings'),
  updateSheinMarketplaceSettings: (
    input: { countryCode: string; language?: string },
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinMarketplaceSettings>('/shein/marketplace-settings', {
      method: 'PATCH',
      body: { ...input, currencyCode: 'SAR' },
      csrfToken: options.csrfToken,
    }),
  sheinImportsPage: (query = '') =>
    fetchList<AdminSheinImport>(withDefaultLimit('/shein/imports', query)),
  sheinImports: async (query = '') => (await adminApi.sheinImportsPage(query)).items,
  sheinImport: (id: string) => apiRequest<AdminSheinImport>(`/shein/imports/${id}`),
  createSheinImport: (
    input: { sourceUrl: string; rawPayload?: unknown },
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinImport>('/shein/imports', {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
    }),
  startSheinAssist: (
    input: { sourceUrl: string; rawPayload?: unknown },
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinAssistResponse>('/shein/imports/assist', {
      method: 'POST',
      body: input,
      csrfToken: options.csrfToken,
    }),
  sheinAssistJob: (jobId: string) =>
    apiRequest<AdminSheinAssistResponse>(`/shein/imports/assist/${jobId}`),
  continueSheinAssist: (jobId: string, options: AdminWriteOptions = {}) =>
    apiRequest<AdminSheinAssistResponse>(`/shein/imports/assist/${jobId}/continue`, {
      method: 'POST',
      csrfToken: options.csrfToken,
    }),
  reviewSheinProduct: (
    id: string,
    editedPayload: SheinPreviewPayload,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinImport>(`/shein/imports/${id}/review`, {
      method: 'POST',
      body: { editedPayload: sanitizeSheinPublishPayload(editedPayload) },
      csrfToken: options.csrfToken,
    }),
  approveSheinProduct: (
    id: string,
    editedPayload?: SheinPreviewPayload,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinImport>(`/shein/imports/${id}/approve`, {
      method: 'POST',
      body: { editedPayload: sanitizeSheinPublishPayload(editedPayload) },
      csrfToken: options.csrfToken,
    }),
  publishSheinProduct: (
    id: string,
    editedPayload?: SheinPreviewPayload,
    options: AdminWriteOptions = {},
  ) =>
    apiRequest<AdminSheinImport>(`/shein/imports/${id}/publish`, {
      method: 'POST',
      body: { editedPayload: sanitizeSheinPublishPayload(editedPayload) },
      csrfToken: options.csrfToken,
    }),
  retrySheinImport: (id: string, options: AdminWriteOptions = {}) =>
    apiRequest<AdminSheinImport>(`/shein/imports/${id}/retry`, {
      method: 'POST',
      csrfToken: options.csrfToken,
    }),

  sheinBatchesPage: (query = '') =>
    fetchList<AdminSheinBatch>(withDefaultLimit('/shein-batches', query, 20)),
  sheinBatches: async (query = '') => (await adminApi.sheinBatchesPage(query)).items,
  sheinBatch: (id: string) => apiRequest<AdminSheinBatch>(`/shein-batches/${id}`),
  createSheinBatch: (
    input: {
      title?: string;
      sheinOrderReference?: string;
      trackingNumber?: string;
      trackingCarrier?: string;
      trackingUrl?: string;
      exchangeRateSarToEgp?: string;
      status?: SheinBatchStatus;
      orderedAt?: string;
      notes?: string;
      items?: Array<{
        orderItemId: string;
        quantity?: number;
        unitSarAmount?: string;
        unitEgpAmount?: string;
        notes?: string;
      }>;
    },
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>('/shein-batches', {
      method: 'POST',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  updateSheinBatch: (
    id: string,
    input: {
      title?: string;
      sheinOrderReference?: string;
      trackingNumber?: string;
      trackingCarrier?: string;
      trackingUrl?: string;
      exchangeRateSarToEgp?: string;
      notes?: string;
    },
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${id}`, {
      method: 'PATCH',
      body: input,
      csrfToken: options?.csrfToken,
    }),
  updateSheinBatchStatus: (
    id: string,
    status: SheinBatchStatus,
    note?: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${id}/status`, {
      method: 'PATCH',
      body: { status, note },
      csrfToken: options?.csrfToken,
    }),
  updateSheinBatchItemStatus: (
    batchId: string,
    itemId: string,
    status: OrderItemStatus,
    note?: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${batchId}/items/${itemId}/status`, {
      method: 'PATCH',
      body: { status, note },
      csrfToken: options?.csrfToken,
    }),
  availableSheinOrderItemsPage: (query = '') =>
    fetchList<AdminAvailableSheinOrderItem>(
      withDefaultLimit('/shein-batches/available-order-items', query, 20),
    ),
  addSheinBatchItems: (
    id: string,
    items: Array<{
      orderItemId: string;
      quantity?: number;
      unitSarAmount?: string;
      unitEgpAmount?: string;
      notes?: string;
    }>,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${id}/items/bulk`, {
      method: 'POST',
      body: { items },
      csrfToken: options?.csrfToken,
    }),
  removeSheinBatchItem: (batchId: string, itemId: string, options?: AdminWriteOptions) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${batchId}/items/${itemId}`, {
      method: 'DELETE',
      csrfToken: options?.csrfToken,
    }),
  regenerateSheinBatchWhatsappMessages: (id: string, options?: AdminWriteOptions) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${id}/notifications/whatsapp/regenerate`, {
      method: 'POST',
      csrfToken: options?.csrfToken,
    }),
  sheinBatchWhatsappNotifications: (id: string) =>
    apiRequest<AdminSheinBatchWhatsappNotifications>(`/shein-batches/${id}/notifications/whatsapp`),
  updateSheinBatchItemWhatsappMessage: (
    batchId: string,
    itemId: string,
    message: string,
    options?: AdminWriteOptions,
  ) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${batchId}/items/${itemId}/whatsapp-message`, {
      method: 'PATCH',
      body: { message },
      csrfToken: options?.csrfToken,
    }),
  recalculateSheinBatch: (id: string, options?: AdminWriteOptions) =>
    apiRequest<AdminSheinBatch>(`/shein-batches/${id}/recalculate`, {
      method: 'POST',
      csrfToken: options?.csrfToken,
    }),

  auditLogsPage: (query = '') =>
    fetchList<AdminAuditLog>(withDefaultLimit('/admin/audit-logs', query)),
  auditLogs: async (query = '') => (await adminApi.auditLogsPage(query)).items,
  uploadReconciliation: () => apiRequest<UploadReconciliation>('/uploads/reconciliation'),
  cleanupUploadOrphans: (options?: AdminWriteOptions) =>
    apiRequest<UploadCleanupResult>('/uploads/cleanup-orphans', {
      method: 'POST',
      csrfToken: options?.csrfToken,
    }),
};

function withDefaultLimit(path: string, query = '', defaultLimit = 20): string {
  const sanitizedQuery = query.replace(/^[?&]+/, '');
  const params = new URLSearchParams(sanitizedQuery);
  if (!params.has('limit')) params.set('limit', String(defaultLimit));
  return `${path}?${params.toString()}`;
}
