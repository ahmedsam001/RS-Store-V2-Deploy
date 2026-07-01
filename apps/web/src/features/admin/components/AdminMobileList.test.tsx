import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminStatusBadge } from '@/features/admin/components/AdminDesign';
import {
  AdminMobileDataCard,
  AdminMobileField,
  AdminMobileList,
} from '@/features/admin/components/AdminMobileList';

describe('admin responsive data cards', () => {
  it('renders key mobile table fields with labels and values', () => {
    render(
      <AdminMobileList>
        <AdminMobileDataCard
          title="Order RS-1001"
          badge={<AdminStatusBadge value="PENDING" />}
          actions={<button type="button">View</button>}
        >
          <AdminMobileField label="Customer" value="Sarah" />
          <AdminMobileField label="Total" value="500 EGP" dir="ltr" />
        </AdminMobileDataCard>
      </AdminMobileList>,
    );

    expect(screen.getByText('Order RS-1001')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Customer')).toBeTruthy();
    expect(screen.getByText('Sarah')).toBeTruthy();
    expect(screen.getByText('View')).toBeTruthy();
  });

  it('maps admin status badges to readable labels', () => {
    render(<AdminStatusBadge value="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });
});
