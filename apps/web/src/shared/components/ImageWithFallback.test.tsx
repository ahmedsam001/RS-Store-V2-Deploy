import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('shows fallback when src is empty', () => {
    renderWithRouter(
      <ImageWithFallback
        src=""
        fallbackVariant="subcategory"
        width={600}
        height={750}
      />,
    );
    expect(document.querySelector('img.rs-image-with-fallback-logo')).toBeInTheDocument();
    const fallback = document.querySelector('.rs-image-with-fallback-subcategory');
    expect(fallback).toHaveAttribute(
      'title',
      'Subcategory image coming soon',
    );
    expect(fallback).toHaveStyle({ width: '600px', height: '750px' });
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

  it('propagates the admin no-translate marker to real and fallback images', () => {
    const view = renderWithRouter(
      <ImageWithFallback
        data-no-admin-translate
        src="https://example.com/image.jpg"
        alt="Active"
        fallbackVariant="subcategory"
      />,
    );
    expect(document.querySelector('img:not(.rs-image-with-fallback-logo)')).toHaveAttribute(
      'data-no-admin-translate',
    );

    view.unmount();
    renderWithRouter(
      <ImageWithFallback data-no-admin-translate fallbackVariant="subcategory" />,
    );
    expect(document.querySelector('.rs-image-with-fallback-subcategory')).toHaveAttribute(
      'data-no-admin-translate',
    );
  });
});
