import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogImage } from '@/shared/types/CatalogTypes';
import { ResponsiveImage } from '@/features/catalog/components/ResponsiveImage';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { localizeProductText, useI18n } from '@/shared/i18n';

type ProductGalleryProps = {
  images: CatalogImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const { language, t } = useI18n();
  const [activeImage, setActiveImage] = useState(() => images[0]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const selectedImage = activeImage ?? images[0];

  useEffect(() => {
    setActiveImage(images[0]);
    setActiveIndex(0);
  }, [images]);

  useEffect(() => {
    const container = thumbnailContainerRef.current;
    if (!container || !selectedImage?.id) return;
    const selectedThumb = container.querySelector(
      `[data-thumb-id="${selectedImage.id}"]`,
    ) as HTMLElement;
    if (selectedThumb) {
      const containerRect = container.getBoundingClientRect();
      const thumbRect = selectedThumb.getBoundingClientRect();
      const scrollLeft = selectedThumb.offsetLeft - containerRect.width / 2 + thumbRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedImage?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON'
      )
        return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length]);

  const goToPrevious = useCallback(() => {
    const prevIndex = activeIndex <= 0 ? images.length - 1 : activeIndex - 1;
    setActiveImage(images[prevIndex]);
    setActiveIndex(prevIndex);
  }, [activeIndex, images]);

  const goToNext = useCallback(() => {
    const nextIndex = activeIndex >= images.length - 1 ? 0 : activeIndex + 1;
    setActiveImage(images[nextIndex]);
    setActiveIndex(nextIndex);
  }, [activeIndex, images]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isDragging || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        event.preventDefault();
      }
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
      setIsDragging(false);
    },
    [isDragging, goToPrevious, goToNext],
  );

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging) return;
      event.preventDefault();
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging) return;
      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
      setIsDragging(false);
    },
    [isDragging, goToPrevious, goToNext],
  );

  if (images.length === 0) {
    return (
      <ImageWithFallback
        src={null}
        alt={productName}
        className="rs-panel-soft aspect-square sm:aspect-[4/5] w-full rounded-2xl sm:rounded-[1.5rem]"
        fallbackVariant="product"
        showFallbackLabel
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={mainImageRef}
        className="relative overflow-hidden rounded-2xl sm:rounded-[1.5rem] border border-rs-peach-light bg-card shadow-sm group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        <ResponsiveImage
          src={selectedImage.url}
          alt={localizeProductText(selectedImage.altText ?? productName, language)}
          className="aspect-square sm:aspect-[4/5] w-full object-cover lg:max-h-[720px] transition-opacity duration-300"
          widths={[480, 720, 960, 1280]}
          sizes="(min-width: 1280px) 640px, (min-width: 1024px) 52vw, 100vw"
          width={960}
          height={1200}
          loading="eager"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background focus:outline-none focus:ring-2 focus:ring-rs-gold"
              aria-label={t('product.previousImage')}
            >
              <ChevronLeft className="h-5 w-5 text-rs-ink" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background focus:outline-none focus:ring-2 focus:ring-rs-gold"
              aria-label={t('product.nextImage')}
            >
              <ChevronRight className="h-5 w-5 text-rs-ink" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          ref={thumbnailContainerRef}
          className="premium-scrollbar rs-product-gallery-thumb-container -mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
          aria-label={t('product.images')}
          role="tablist"
        >
          {images.map((image, index) => {
            const isSelected = image.id === selectedImage.id;
            return (
              <button
                key={image.id}
                type="button"
                data-thumb-id={image.id}
                onClick={() => {
                  setActiveImage(image);
                  setActiveIndex(index);
                }}
                className={`shrink-0 rounded-lg sm:rounded-xl border p-0.5 sm:p-1 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-rs-gold ${isSelected ? 'border-rs-gold bg-card shadow-sm' : 'border-rs-peach-light bg-card hover:border-rs-gold-light'}`}
                aria-label={`View image ${index + 1} of ${productName}`}
                aria-pressed={isSelected}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
              >
                <ResponsiveImage
                  src={image.url}
                  alt={localizeProductText(image.altText ?? productName, language)}
                  className="aspect-square w-12 sm:w-16 md:w-20 rounded-md sm:rounded-lg object-cover"
                  widths={[96, 144, 192]}
                  sizes="80px"
                  width={160}
                  height={160}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
