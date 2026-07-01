import { type ImgHTMLAttributes } from 'react';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

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
  fallbackLabel,
  fallbackVariant = 'product',
  height,
  loading = 'lazy',
  showFallbackLabel,
  sizes,
  src,
  widths,
  width,
  ...props
}: ResponsiveImageProps) {
  const normalizedWidths = [...new Set(widths)].sort((first, second) => first - second);
  const fallbackWidth = Number(
    width ?? normalizedWidths[Math.floor(normalizedWidths.length / 2)] ?? 800,
  );
  const fallbackSrc = transformCloudinaryUrl(src, fallbackWidth);
  const srcSet = normalizedWidths
    .map((imageWidth) => `${transformCloudinaryUrl(src, imageWidth)} ${imageWidth}w`)
    .join(', ');

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
      decoding="async"
      fallbackVariant={fallbackVariant}
      fallbackLabel={fallbackLabel}
      showFallbackLabel={showFallbackLabel}
    />
  );
}

function transformCloudinaryUrl(src: string, width: number): string {
  if (!src.includes('/upload/')) {
    return src;
  }

  return src.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width}/`);
}
