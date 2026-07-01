import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('shows fallback when src is empty', () => {
    renderWithRouter(<ImageWithFallback src="" fallbackVariant="subcategory" />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows fallback when src is undefined', () => {
    renderWithRouter(<ImageWithFallback fallbackVariant="subcategory" />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('shows image when src is valid URL', () => {
    renderWithRouter(<ImageWithFallback src="https://example.com/image.jpg" fallbackVariant="subcategory" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('resets error state when src changes from invalid to valid', () => {
    const { rerender } = renderWithRouter(
      <ImageWithFallback src="https://broken-link.com/image.jpg" fallbackVariant="subcategory" />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://broken-link.com/image.jpg');

    Object.defineProperty(img, 'complete', { value: false });
    img.dispatchEvent(new Event('error'));

    rerender(<ImageWithFallback src="https://valid-link.com/image.jpg" fallbackVariant="subcategory" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://valid-link.com/image.jpg');
  });
});