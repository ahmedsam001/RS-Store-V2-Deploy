import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('shows fallback when src is empty', () => {
    renderWithRouter(<ImageWithFallback src="" fallbackVariant="subcategory" />);
    expect(document.querySelector('img.rs-image-with-fallback-logo')).toBeInTheDocument();
    expect(document.querySelector('.rs-image-with-fallback-subcategory')).toHaveAttribute(
      'title',
      'Subcategory image coming soon',
    );
  });

  it('shows fallback when src is undefined', () => {
    renderWithRouter(<ImageWithFallback fallbackVariant="subcategory" />);
    expect(document.querySelector('img.rs-image-with-fallback-logo')).toBeInTheDocument();
  });

  it('shows image when src is valid URL', () => {
    renderWithRouter(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="Test image"
        fallbackVariant="subcategory"
      />,
    );
    const img = document.querySelector('img:not(.rs-image-with-fallback-logo)');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });
});
