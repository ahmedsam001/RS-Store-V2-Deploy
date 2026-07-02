import { BadRequestException } from '@nestjs/common';
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES } from './uploads.constants';

type CandidateUploadFile = {
  mimetype?: string;
  originalname?: string;
};

type MulterFileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

export function imageFileFilter(
  _request: unknown,
  file: CandidateUploadFile,
  callback: MulterFileFilterCallback,
): void {
  const extension = extensionFromName(file.originalname ?? '');

  if (
    !file.mimetype ||
    !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) ||
    !ALLOWED_IMAGE_EXTENSIONS.has(extension)
  ) {
    callback(new BadRequestException('Only JPG PNG WEBP or GIF image files are allowed'), false);
    return;
  }

  callback(null, true);
}

function extensionFromName(fileName: string): string {
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}
