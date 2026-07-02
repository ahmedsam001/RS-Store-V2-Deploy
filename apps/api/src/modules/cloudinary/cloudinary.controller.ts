import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService, CloudinaryUploadResult } from './cloudinary.service';
import { imageFileFilter } from './cloudinary.file-filter';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  async testUpload(
    @UploadedFile() file: UploadedImageFile,
  ): Promise<{ success: boolean } & CloudinaryUploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('Image file is required');
    }

    const result = await this.cloudinaryService.uploadImage(file.buffer, 'rs-store/test');

    return {
      success: true,
      ...result,
    };
  }
}
