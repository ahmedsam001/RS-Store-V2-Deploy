const SMALL_IMAGE_THRESHOLD_BYTES = 1024 * 1024;
const TARGET_MAX_BYTES = 1200 * 1024;
const MAX_DIMENSION = 1600;
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITIES = [0.82, 0.76, 0.7, 0.65];
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

export async function optimizePaymentProofImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= SMALL_IMAGE_THRESHOLD_BYTES) {
    return file;
  }

  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  try {
    const image = await loadImageSource(file);
    try {
      const { width, height } = fitWithinMaxDimension(image.width, image.height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return file;

      context.drawImage(image.source, 0, 0, width, height);

      let bestFile: File | null = null;
      for (const quality of OUTPUT_QUALITIES) {
        const blob = await canvasToBlob(canvas, OUTPUT_TYPE, quality);
        if (!blob) continue;

        const optimizedFile = new File([blob], optimizedFileName(file.name), {
          type: OUTPUT_TYPE,
          lastModified: Date.now(),
        });
        bestFile = bestFile && bestFile.size <= optimizedFile.size ? bestFile : optimizedFile;

        if (optimizedFile.size <= TARGET_MAX_BYTES) {
          return optimizedFile;
        }
      }

      return bestFile && bestFile.size < file.size ? bestFile : file;
    } finally {
      image.close?.();
    }
  } catch {
    return file;
  }
}

async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  return loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<ImageSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load payment proof image'));
    };
    image.src = url;
  });
}

function fitWithinMaxDimension(width: number, height: number): { width: number; height: number } {
  const largestDimension = Math.max(width, height);
  if (largestDimension <= MAX_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_DIMENSION / largestDimension;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function optimizedFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return `${baseName || 'payment-proof'}-optimized.jpg`;
}
