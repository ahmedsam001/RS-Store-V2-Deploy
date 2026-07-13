import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StorefrontFooter } from '@/features/catalog/components/StorefrontNavbar';
import { renderWithRouter } from '@/test/test-utils';

describe('StorefrontFooter layout stability', () => {
  it('declares intrinsic dimensions for the footer logo', () => {
    renderWithRouter(<StorefrontFooter settings={null} isCustomer={false} />);

    const logo = screen.getByRole('img', { name: 'RS Store' });
    expect(logo).toHaveAttribute('width', '303');
    expect(logo).toHaveAttribute('height', '90');
  });
});
