export const ROUTES = {
  login: 'login',
  register: 'register',
  adminLogin: 'admin/login',
  adminRoot: 'admin',
  adminProducts: 'products',
  adminCategories: 'categories',
  adminOrders: 'orders',
  adminPaymentsReview: 'payments-review',
  adminReports: 'reports',
  adminSettings: 'settings',
  adminFlashSales: 'flash-sales',
  adminShein: 'shein',
  adminSheinBatches: 'shein-batches',
  adminSheinBatchesNew: 'shein-batches/new',
  adminCustomOrders: 'custom-orders',
  adminUploads: 'uploads',
  adminAuditLogs: 'audit-logs',
  categoryDetails: 'categories/:categorySlug',
  productDetails: 'products/:slug',
  flashSales: 'flash-sales',
  cart: 'cart',
  checkout: 'checkout',
  orders: 'orders',
  orderDetails: 'orders/:id',
  legacyWishlist: 'wishlist',
  customOrder: 'custom-order',
  sheinRequest: 'shein-request',
  profile: 'profile',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  serverError: 'server-error',
  maintenance: 'maintenance',
  notFound: '*',
} as const;

export const PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  flashSales: '/flash-sales',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  profile: '/profile',
  customOrder: '/custom-order',
  sheinRequest: '/shein-request',
  legacyWishlist: '/wishlist',
  unauthorized: '/unauthorized',
  forbidden: '/forbidden',
  serverError: '/server-error',
  maintenance: '/maintenance',
  adminLogin: '/admin/login',
  adminRoot: '/admin',
  adminProducts: '/admin/products',
  adminCategories: '/admin/categories',
  adminOrders: '/admin/orders',
  adminPaymentsReview: '/admin/payments-review',
  adminReports: '/admin/reports',
  adminSettings: '/admin/settings',
  adminFlashSales: '/admin/flash-sales',
  adminShein: '/admin/shein',
  adminSheinBatches: '/admin/shein-batches',
  adminSheinBatchesNew: '/admin/shein-batches/new',
  adminCustomOrders: '/admin/custom-orders',
  adminUploads: '/admin/uploads',
  adminAuditLogs: '/admin/audit-logs',
} as const;

export function productPath(slug: string): string {
  return `/products/${slug}`;
}

export function categoryPath(slug: string): string {
  return `/categories/${slug}`;
}

export function orderPath(id: string): string {
  return `/orders/${id}`;
}
