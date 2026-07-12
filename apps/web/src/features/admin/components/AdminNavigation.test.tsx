import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_LINKS,
} from '@/features/admin/navigation/admin-navigation';
import { PATHS } from '@/shared/constants/routes';
import { renderWithRouter } from '@/test/test-utils';
import adminShellSource from './AdminShell.tsx?raw';
import { AdminNavigation } from './AdminShell';

describe('AdminNavigation', () => {
  it('keeps the dashboard standalone and groups every existing sidebar route', () => {
    expect(ADMIN_NAV_LINKS.map((link) => link.to)).toEqual([
      PATHS.adminRoot,
      PATHS.adminOrders,
      PATHS.adminPaymentsReview,
      PATHS.adminCustomOrders,
      PATHS.adminProducts,
      PATHS.adminCategories,
      PATHS.adminShein,
      PATHS.adminSheinBatches,
      PATHS.adminFlashSales,
      PATHS.adminSettings,
      PATHS.adminReports,
      PATHS.adminUploads,
      PATHS.adminAuditLogs,
    ]);
    expect(
      Object.fromEntries(
        ADMIN_NAV_GROUPS.map((group) => [
          group.labelEn,
          group.children.map((link) => link.to),
        ]),
      ),
    ).toEqual({
      Orders: [PATHS.adminOrders, PATHS.adminPaymentsReview, PATHS.adminCustomOrders],
      Products: [PATHS.adminProducts, PATHS.adminCategories],
      SHEIN: [PATHS.adminShein, PATHS.adminSheinBatches],
      Marketing: [PATHS.adminFlashSales],
      Settings: [PATHS.adminSettings],
      System: [PATHS.adminReports, PATHS.adminUploads, PATHS.adminAuditLogs],
    });
    expect(ADMIN_NAV_LINKS.some((link) => link.to === PATHS.adminSheinBatchesNew)).toBe(false);
  });

  it('renders the dashboard and opens the parent of the active child route', () => {
    renderWithRouter(
      <AdminNavigation instanceId="test" role="ADMIN" />,
      { route: PATHS.adminPaymentsReview },
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      PATHS.adminRoot,
    );
    const ordersGroup = screen.getByRole('button', { name: 'Orders' });
    expect(ordersGroup).toHaveAttribute('aria-expanded', 'true');
    expect(ordersGroup).toHaveAttribute('data-active', 'true');
    expect(document.getElementById(ordersGroup.getAttribute('aria-controls') ?? '')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Payments Review/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('uses segment-aware active matching for nested SHEIN batch routes', () => {
    renderWithRouter(
      <AdminNavigation instanceId="test" role="OWNER" />,
      { route: PATHS.adminSheinBatchesNew },
    );

    expect(screen.getByRole('button', { name: 'SHEIN' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: /SHEIN Batches/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'SHEIN Import' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('expands only one group at a time and supports manual collapse', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AdminNavigation instanceId="test" role="ADMIN" />,
      { route: PATHS.adminPaymentsReview },
    );

    const ordersGroup = screen.getByRole('button', { name: 'Orders' });
    const productsGroup = screen.getByRole('button', { name: 'Products' });
    await user.click(productsGroup);
    expect(productsGroup).toHaveAttribute('aria-expanded', 'true');
    expect(ordersGroup).toHaveAttribute('aria-expanded', 'false');

    await user.click(productsGroup);
    expect(productsGroup).toHaveAttribute('aria-expanded', 'false');
  });

  it('hides unauthorized children and empty parent groups', () => {
    const { container } = renderWithRouter(
      <AdminNavigation instanceId="test" role="CUSTOMER" />,
      { route: PATHS.adminRoot },
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument();
  });

  it('closes mobile navigation after selecting a real route', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderWithRouter(
      <AdminNavigation instanceId="mobile-test" onNavigate={onNavigate} role="ADMIN" />,
      { route: PATHS.adminOrders },
    );

    const ordersGroup = screen.getByRole('button', { name: 'Orders' });
    const controlledRegion = document.getElementById(
      ordersGroup.getAttribute('aria-controls') ?? '',
    );
    expect(controlledRegion).not.toBeNull();
    await user.click(within(controlledRegion!).getByRole('link', { name: /Payments Review/ }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('keeps dynamic admin identity values protected from automatic translation', () => {
    expect(adminShellSource.match(/data-no-admin-translate/g)).toHaveLength(2);
  });
});
