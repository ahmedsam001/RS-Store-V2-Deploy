import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as Cloudinary } from 'cloudinary';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuditService } from '../audit/audit.service';
import { CLOUDINARY_CLIENT } from '../../infrastructure/storage/cloudinary/cloudinary.constants';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadedImageFile } from './upload-file.type';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_IMAGE_FOLDER,
} from './uploads.constants';
import { UploadedImageResponse } from './uploads.types';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(CLOUDINARY_CLIENT) private readonly cloudinary: typeof Cloudinary,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async uploadImage(
    file: UploadedImageFile | undefined,
    dto: UploadImageDto,
  ): Promise<UploadedImageResponse> {
    this.validateFile(file);

    const folder = this.resolveFolder(dto.folder);
    const result = await this.uploadBuffer(file.buffer, folder);

    return {
      cloudinaryPublicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      byteSize: result.bytes,
      format: result.format,
    };
  }

  async uploadRemoteImage(imageUrl: string, folder: string): Promise<UploadedImageResponse> {
    const resolvedFolder = this.resolveFolder(folder);
    const result = await this.cloudinary.uploader.upload(imageUrl, {
      folder: resolvedFolder,
      resource_type: 'image',
      allowed_formats: [...ALLOWED_IMAGE_EXTENSIONS],
    });

    return {
      cloudinaryPublicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      byteSize: result.bytes,
      format: result.format,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }

  async reconcileProductImages(): Promise<{ databaseOrphans: number; cloudinaryOrphans: number }> {
    const databaseOrphansResult = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*)::bigint AS count FROM product_images pi LEFT JOIN products p ON p.id = pi.product_id WHERE p.id IS NULL`;
    const databaseOrphans = Number(databaseOrphansResult[0]?.count ?? 0n);
    const productImages = await this.prisma.productImage.findMany({
      select: { cloudinaryPublicId: true },
    });
    const knownPublicIds = new Set(productImages.map((image) => image.cloudinaryPublicId));
    const cloudinaryOrphans = await this.countCloudinaryOrphans(knownPublicIds);
    return { databaseOrphans, cloudinaryOrphans };
  }

  async cleanupOrphanProductImages(
    actor?: AuthenticatedUser,
  ): Promise<{ databaseRecordsDeleted: number; cloudinaryFilesDeleted: number }> {
    const dbResult = await this.prisma
      .$executeRaw`DELETE FROM product_images pi WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pi.product_id)`;
    const productImages = await this.prisma.productImage.findMany({
      select: { cloudinaryPublicId: true },
    });
    const knownPublicIds = new Set(productImages.map((image) => image.cloudinaryPublicId));
    const publicIds = await this.findCloudinaryOrphanPublicIds(knownPublicIds);
    await Promise.all(
      publicIds.map((publicId) => this.deleteImage(publicId).catch(() => undefined)),
    );
    const result = { databaseRecordsDeleted: dbResult, cloudinaryFilesDeleted: publicIds.length };
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'UPLOAD_ORPHANS_CLEANED',
      entityType: 'UPLOAD',
      metadata: result,
    });
    return result;
  }

  private validateFile(file: UploadedImageFile | undefined): asserts file is UploadedImageFile {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (file.size > this.configService.getOrThrow<number>('UPLOAD_MAX_IMAGE_BYTES')) {
      throw new BadRequestException('Image file exceeds the configured upload size limit');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPG PNG WEBP or GIF image files are allowed');
    }

    const extension = this.fileExtension(file.originalname);
    if (
      !ALLOWED_IMAGE_EXTENSIONS.has(extension) ||
      !this.hasExpectedImageSignature(file.buffer, extension)
    ) {
      throw new BadRequestException('Image file content does not match an allowed image type');
    }
  }

  private resolveFolder(requestedFolder: string | undefined): string {
    const folder = requestedFolder?.trim() || DEFAULT_IMAGE_FOLDER;
    const allowedFolders = this.configService
      .getOrThrow<string>('UPLOAD_ALLOWED_FOLDERS')
      .split(',')
      .map((item) => item.trim());

    if (!allowedFolders.includes(folder)) {
      throw new BadRequestException('Upload folder is not allowed');
    }

    return folder;
  }

  private uploadBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: [...ALLOWED_IMAGE_EXTENSIONS],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private async countCloudinaryOrphans(knownPublicIds: Set<string>): Promise<number> {
    return (await this.findCloudinaryOrphanPublicIds(knownPublicIds)).length;
  }

  private async findCloudinaryOrphanPublicIds(knownPublicIds: Set<string>): Promise<string[]> {
    const allowedFolders = this.configService
      .getOrThrow<string>('UPLOAD_ALLOWED_FOLDERS')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const publicIds = new Set<string>();
    for (const folder of allowedFolders) {
      let nextCursor: string | undefined;
      do {
        const response = (await this.cloudinary.api.resources({
          type: 'upload',
          prefix: folder,
          max_results: 100,
          next_cursor: nextCursor,
        })) as { resources?: Array<{ public_id?: string }>; next_cursor?: string };

        const resources = Array.isArray(response.resources) ? response.resources : [];
        for (const resource of resources) {
          if (resource.public_id && !knownPublicIds.has(resource.public_id)) {
            publicIds.add(resource.public_id);
          }
        }

        nextCursor = typeof response.next_cursor === 'string' ? response.next_cursor : undefined;
      } while (nextCursor);
    }

    return [...publicIds];
  }

  private fileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() ?? '';
  }

  private hasExpectedImageSignature(buffer: Buffer, extension: string): boolean {
    if (['jpg', 'jpeg'].includes(extension)) {
      return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (extension === 'png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (extension === 'webp') {
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    if (extension === 'gif') {
      return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    }

    return false;
  }
}
