import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { adminApi, SheinPreviewImage } from '@/features/admin/api/admin-api';
import { Button } from '@/shared/components/ui/Button';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

export type EditableGalleryImage = SheinPreviewImage & {
  isPrimary?: boolean;
};

type ImageUploadGalleryProps = {
  images: EditableGalleryImage[];
  altText: string;
  disabled?: boolean;
  uploadFolder?: string;
  onChange: (images: EditableGalleryImage[]) => void;
  onNotice?: (notice: { type: 'success' | 'error'; message: string }) => void;
};

export function ImageUploadGallery({
  images,
  altText,
  disabled = false,
  uploadFolder = 'rs-store/shein-imports',
  onChange,
  onNotice,
}: ImageUploadGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function updateImages(nextImages: EditableGalleryImage[]) {
    const withPrimary = ensurePrimaryImage(nextImages);
    onChange(withPrimary);
  }

  function removeImage(index: number) {
    updateImages(images.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const nextImages = [...images];
    const [current] = nextImages.splice(index, 1);
    nextImages.splice(targetIndex, 0, current);
    updateImages(nextImages);
  }

  function selectPrimary(index: number) {
    updateImages(images.map((image, currentIndex) => ({ ...image, isPrimary: currentIndex === index })));
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploadedImages: EditableGalleryImage[] = [];
      for (const file of files) {
        const uploaded = await adminApi.uploadImage(file, uploadFolder);
        uploadedImages.push({
          url: uploaded.secureUrl,
          cloudinaryPublicId: uploaded.cloudinaryPublicId,
          width: uploaded.width,
          height: uploaded.height,
          byteSize: uploaded.byteSize,
          format: uploaded.format,
          altTextAr: altText || file.name,
          source: 'ADMIN_UPLOAD',
        });
      }
      updateImages([...images, ...uploadedImages]);
      onNotice?.({ type: 'success', message: 'Images uploaded and added to gallery' });
    } catch (error) {
      onNotice?.({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to upload images',
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void uploadFiles(event.target.files);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled && event.dataTransfer.files) void uploadFiles(event.dataTransfer.files);
  }

  return (
    <section className="space-y-3">
      <div className="admin-shein-section-title">
        <h3>Images gallery</h3>
        <small>You can delete, reorder images, select the primary image, or upload additional images</small>
      </div>

      <div
        className={`admin-upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
        />
        <strong>Drag & Drop images here</strong>
        <span>Or click to upload from desktop, mobile, or tablet</span>
<Button
           type="button"
           variant="outline"
           onClick={() => inputRef.current?.click()}
           disabled={disabled || isUploading}
         >
           {isUploading ? 'Uploading...' : 'Click to upload'}
         </Button>
      </div>

{images.length === 0 ? (
         <div className="admin-shein-empty-box">No images in gallery. Add at least one image before publishing.</div>
       ) : null}

      <div className="admin-shein-images-grid">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="admin-shein-image-card">
            <div className="admin-shein-image-frame">
              <ImageWithFallback src={image.url} alt={altText || 'Product image'} className="h-full w-full object-cover" fallbackVariant="product" />
              {image.isPrimary || (!images.some((item) => item.isPrimary) && index === 0) ? (
                <span className="admin-primary-image-badge">Primary</span>
              ) : null}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => moveImage(index, -1)}
                disabled={disabled || index === 0}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => moveImage(index, 1)}
                disabled={disabled || index === images.length - 1}
              >
                ↓
              </Button>
<Button
                 type="button"
                 className="col-span-2"
                 size="sm"
                 variant="outline"
                 onClick={() => selectPrimary(index)}
                 disabled={disabled}
               >
                 Set as primary
               </Button>
               <Button
                 type="button"
                 className="col-span-2"
                 size="sm"
                 variant="outline"
                 onClick={() => removeImage(index)}
                 disabled={disabled}
               >
                 Remove
               </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ensurePrimaryImage(images: EditableGalleryImage[]): EditableGalleryImage[] {
  if (images.length === 0) return images;
  const primaryIndex = images.findIndex((image) => image.isPrimary);
  if (primaryIndex === -1) {
    return images.map((image, index) => ({ ...image, isPrimary: index === 0 }));
  }
  return images.map((image, index) => ({ ...image, isPrimary: index === primaryIndex }));
}
