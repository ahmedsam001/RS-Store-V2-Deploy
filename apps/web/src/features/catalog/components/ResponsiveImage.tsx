import { type ImgHTMLAttributes } from 'react';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { buildResponsiveImageSources } from '@/features/catalog/components/responsive-image-sources';

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes'
> & {
  src: string;
  widths: number[];
  sizes: string;
  fallbackVariant?: 'product' | 'category' | 'subcategory' | 'image';
  fallbackLabel?: string;
  showFallbackLabel?: boolean;
};

export function ResponsiveImage({
  alt,
  decoding = 'async',
  fallbackLabel,
  fallbackVariant = 'product',
  fetchPriority,
  height,
  loading = 'lazy',
  showFallbackLabel,
  sizes,
  src,
  widths,
  width,
  ...props
}: ResponsiveImageProps) {
  const { src: fallbackSrc, srcSet } = buildResponsiveImageSources(src, widths, width);

  return (
    <ImageWithFallback
      {...props}
      src={fallbackSrc}
      srcSet={srcSet || undefined}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      fallbackVariant={fallbackVariant}
      fallbackLabel={fallbackLabel}
      showFallbackLabel={showFallbackLabel}
    />
  );
}
