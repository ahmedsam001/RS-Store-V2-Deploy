import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadImageDto } from './dto/upload-image.dto';
import { imageFileFilter } from './upload-image.filter';
import { UploadedImageFile } from './upload-file.type';
import { UploadsService } from './uploads.service';
import { FALLBACK_MAX_IMAGE_BYTES } from './uploads.constants';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UploadedImageResponse } from './uploads.types';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('reconciliation')
  reconcileProductImages() {
    return this.uploadsService.reconcileProductImages();
  }

  @Post('cleanup-orphans')
  cleanupOrphanProductImages(@CurrentUser() user: AuthenticatedUser) {
    return this.uploadsService.cleanupOrphanProductImages(user);
  }

  @Post('images')
  @RateLimit({ bucket: 'uploads_images', limit: 30, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FALLBACK_MAX_IMAGE_BYTES, files: 1 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadImage(
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body() dto: UploadImageDto,
  ): Promise<UploadedImageResponse> {
    return this.uploadsService.uploadImage(file, dto);
  }
}
