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
import type { UserRole } from '@/shared/types/AuthTypes';

const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'OWNER'];

export type AdminNavLink = {
  to: string;
  labelEn: string;
  icon: LucideIcon;
  roles: readonly UserRole[];
  badge?: string;
  end?: boolean;
};

export type AdminNavGroup = {
  id: string;
  labelEn: string;
  icon: LucideIcon;
  children: AdminNavLink[];
};

export const ADMIN_PRIMARY_LINK: AdminNavLink = {
  to: PATHS.adminRoot,
  labelEn: 'Dashboard',
  icon: LayoutDashboard,
  roles: ADMIN_ROLES,
  end: true,
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'orders',
    labelEn: 'Orders',
    icon: ShoppingBag,
    children: [
      { to: PATHS.adminOrders, labelEn: 'Orders', icon: ShoppingBag, roles: ADMIN_ROLES, badge: 'Ready' },
      {
        to: PATHS.adminPaymentsReview,
        labelEn: 'Payments Review',
        icon: CreditCard,
        roles: ADMIN_ROLES,
        badge: 'New',
      },
      {
        to: PATHS.adminCustomOrders,
        labelEn: 'Custom Orders',
        icon: PackageSearch,
        roles: ADMIN_ROLES,
        badge: 'New',
      },
    ],
  },
  {
    id: 'products',
    labelEn: 'Products',
    icon: Package,
    children: [
      { to: PATHS.adminProducts, labelEn: 'Products', icon: Package, roles: ADMIN_ROLES },
      { to: PATHS.adminCategories, labelEn: 'Categories', icon: FolderTree, roles: ADMIN_ROLES },
    ],
  },
  {
    id: 'shein',
    labelEn: 'SHEIN',
    icon: Sparkles,
    children: [
      { to: PATHS.adminShein, labelEn: 'SHEIN Import', icon: Sparkles, roles: ADMIN_ROLES },
      {
        to: PATHS.adminSheinBatches,
        labelEn: 'SHEIN Batches',
        icon: Truck,
        roles: ADMIN_ROLES,
        badge: 'Track',
      },
    ],
  },
  {
    id: 'marketing',
    labelEn: 'Marketing',
    icon: BadgePercent,
    children: [
      {
        to: PATHS.adminFlashSales,
        labelEn: 'Flash Sales',
        icon: BadgePercent,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    id: 'settings',
    labelEn: 'Settings',
    icon: Settings,
    children: [
      { to: PATHS.adminSettings, labelEn: 'Settings', icon: Settings, roles: ADMIN_ROLES },
    ],
  },
  {
    id: 'system',
    labelEn: 'System',
    icon: ClipboardList,
    children: [
      { to: PATHS.adminReports, labelEn: 'Reports', icon: BarChart3, roles: ADMIN_ROLES, badge: 'New' },
      { to: PATHS.adminUploads, labelEn: 'Uploads', icon: UploadCloud, roles: ADMIN_ROLES },
      { to: PATHS.adminAuditLogs, labelEn: 'Audit Logs', icon: ClipboardList, roles: ADMIN_ROLES },
    ],
  },
];

export const ADMIN_NAV_LINKS = [
  ADMIN_PRIMARY_LINK,
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.children),
];

export function isAdminNavLinkActive(pathname: string, link: AdminNavLink): boolean {
  if (link.end) return pathname === link.to;
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

export function getVisibleAdminNavigation(role: UserRole | undefined): {
  primary: AdminNavLink | null;
  groups: AdminNavGroup[];
} {
  const canView = (link: AdminNavLink) => Boolean(role && link.roles.includes(role));

  return {
    primary: canView(ADMIN_PRIMARY_LINK) ? ADMIN_PRIMARY_LINK : null,
    groups: ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      children: group.children.filter(canView),
    })).filter((group) => group.children.length > 0),
  };
}

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
