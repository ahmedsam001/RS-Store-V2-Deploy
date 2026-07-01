import { Injectable, Inject, Logger } from '@nestjs/common';
import { v2 as Cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinaryClient: typeof Cloudinary,
  ) {}

  async uploadImage(
    file: Buffer,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    try {
      const result: UploadApiResponse = await this.cloudinaryClient.uploader.upload(
        `data:image/*;base64,${file.toString('base64')}`,
        { folder, resource_type: 'image' },
      );

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      const uploadError = error as UploadApiErrorResponse;
      this.logger.error(`Failed to upload image to Cloudinary`, uploadError.message);
      throw error;
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await this.cloudinaryClient.uploader.destroy(publicId, {
        resource_type: 'image',
      });

      if (result.result !== 'ok' && result.result !== 'deleted') {
        this.logger.warn(
          `Unexpected delete result for ${publicId}: ${result.result}`,
        );
      }
    } catch (error) {
      const uploadError = error as UploadApiErrorResponse;
      this.logger.error(
        `Failed to delete image ${publicId} from Cloudinary`,
        uploadError.message,
      );
      throw error;
    }
  }

  async replaceImage(
    oldPublicId: string,
    file: Buffer,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadResult: UploadApiResponse =
        await this.cloudinaryClient.uploader.upload(
          `data:image/*;base64,${file.toString('base64')}`,
          { folder, resource_type: 'image' },
        );

      // Delete old image after successful upload
      await this.deleteImage(oldPublicId);

      return {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      };
    } catch (error) {
      const uploadError = error as UploadApiErrorResponse;
      this.logger.error(
        `Failed to replace image ${oldPublicId} in Cloudinary`,
        uploadError.message,
      );
      throw error;
    }
  }
}