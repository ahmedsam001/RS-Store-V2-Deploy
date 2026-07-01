import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as Cloudinary } from 'cloudinary';

export const CLOUDINARY = Symbol('CLOUDINARY');

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const cloudName = configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.getOrThrow<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.getOrThrow<string>('CLOUDINARY_API_SECRET');

    Cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return Cloudinary;
  },
};