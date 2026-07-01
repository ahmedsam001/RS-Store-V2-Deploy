import { type CSSProperties, type ImgHTMLAttributes, useEffect, useState } from 'react';
import logoUrl from '@/assets/brand/rs-logo-transparent.png';

type FallbackVariant = 'product' | 'category' | 'subcategory' | 'image';

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackVariant?: FallbackVariant;
  fallbackLabel?: string;
  showFallbackLabel?: boolean;
};

const fallbackLabels: Record<FallbackVariant, string> = {
  product: 'Product image coming soon',
  category: 'Category image coming soon',
  subcategory: 'Subcategory image coming soon',
  image: 'Image coming soon',
};

export function ImageWithFallback({
  alt = '',
  className,
  fallbackLabel,
  fallbackVariant = 'image',
  height,
  onError,
  showFallbackLabel = false,
  src,
  style,
  title,
  width,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = typeof src === 'string' && src.trim().length > 0 ? src : null;

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  if (normalizedSrc && !hasError) {
    return (
      <img
        {...props}
        src={normalizedSrc}
        alt={alt}
        className={className}
        height={height}
        width={width}
        style={style}
        title={title}
        onError={(event) => {
          setHasError(true);
          onError?.(event);
        }}
      />
    );
  }

  const label = fallbackLabel ?? fallbackLabels[fallbackVariant];
  const fallbackStyle: CSSProperties = {
    ...style,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: showFallbackLabel ? 'column' : undefined,
    gap: showFallbackLabel ? '0.35rem' : undefined,
    width: style?.width ?? width,
    height: style?.height ?? height,
  };

  return (
    <span
      className={`rs-image-with-fallback rs-image-with-fallback-${fallbackVariant}${className ? ` ${className}` : ''}`}
      style={fallbackStyle}
      title={title ?? label}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <img
        src={logoUrl}
        alt=""
        draggable={false}
        className="rs-image-with-fallback-logo"
        style={{
          width: 'auto',
          height: 'auto',
          maxWidth: showFallbackLabel ? '56%' : '64%',
          maxHeight: showFallbackLabel ? '52%' : '64%',
          objectFit: 'contain',
          objectPosition: 'center',
          padding: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      {showFallbackLabel ? <span className="rs-image-with-fallback-label">{label}</span> : null}
    </span>
  );
}
