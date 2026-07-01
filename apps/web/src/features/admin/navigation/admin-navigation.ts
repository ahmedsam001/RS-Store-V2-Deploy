import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  BarChart3,
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Package,
  PackageSearch,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  UploadCloud,
} from 'lucide-react';
import { PATHS } from '@/shared/constants/routes';

export type AdminNavLink = {
  to: string;
  labelEn: string;
  icon: LucideIcon;
  badge?: string;
  end?: boolean;
};

export const ADMIN_MANAGEMENT_LINKS: AdminNavLink[] = [
  {
    to: PATHS.adminRoot,
    labelEn: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  { to: PATHS.adminProducts, labelEn: 'Products', icon: Package },
  { to: PATHS.adminCategories, labelEn: 'Categories', icon: FolderTree },
  { to: PATHS.adminCustomOrders, labelEn: 'Custom Orders', icon: PackageSearch, badge: 'New' },
  { to: PATHS.adminPaymentsReview, labelEn: 'Payments Review', icon: CreditCard, badge: 'New' },
  { to: PATHS.adminOrders, labelEn: 'Orders', icon: ShoppingBag, badge: 'Ready' },
  { to: PATHS.adminReports, labelEn: 'Reports', icon: BarChart3, badge: 'New' },
  {
    to: PATHS.adminFlashSales,
    labelEn: 'Flash Sales',
    icon: BadgePercent,
  },
];

export const ADMIN_OPERATIONS_LINKS: AdminNavLink[] = [
  { to: PATHS.adminShein, labelEn: 'SHEIN Import', icon: Sparkles },
  { to: PATHS.adminSheinBatches, labelEn: 'SHEIN Batches', icon: Truck, badge: 'Track' },
  { to: PATHS.adminUploads, labelEn: 'Uploads', icon: UploadCloud },
  { to: PATHS.adminSettings, labelEn: 'Settings', icon: Settings },
  { to: PATHS.adminAuditLogs, labelEn: 'Audit Logs', icon: ClipboardList },
];

export const ADMIN_NAV_LINKS = [...ADMIN_MANAGEMENT_LINKS, ...ADMIN_OPERATIONS_LINKS];

type QuickJumpLink = {
  to: string;
  labelEn: string;
};

export const ADMIN_QUICK_JUMP_LINKS: QuickJumpLink[] = [
  { to: PATHS.adminProducts, labelEn: 'Add Product' },
  { to: PATHS.adminCustomOrders, labelEn: 'Custom Orders' },
  { to: PATHS.adminPaymentsReview, labelEn: 'Review Payment' },
  { to: PATHS.adminShein, labelEn: 'SHEIN Import' },
  { to: PATHS.adminSheinBatches, labelEn: 'SHEIN Batches' },
  { to: PATHS.adminReports, labelEn: 'Reports' },
];
