import { BadRequestException } from '@nestjs/common';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

type MulterFileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

type CandidateUploadFile = {
  mimetype?: string;
  originalname?: string;
};

export function imageFileFilter(
  _request: unknown,
  file: CandidateUploadFile,
  callback: MulterFileFilterCallback,
): void {
  const extension = extensionFromName(file.originalname ?? '');

  if (!file.mimetype || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    callback(new BadRequestException('Only JPG, PNG, WEBP, or GIF image files are allowed'), false);
    return;
  }

  callback(null, true);
}

function extensionFromName(fileName: string): string {
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}