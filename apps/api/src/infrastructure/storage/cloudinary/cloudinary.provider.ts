import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLIENT } from './cloudinary.constants';

export const cloudinaryProvider: Provider = {
  provide: CLOUDINARY_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    cloudinary.config({
      cloud_name: configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });

    return cloudinary;
  },
};
