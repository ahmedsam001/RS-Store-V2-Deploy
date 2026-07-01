import { Global, Module } from '@nestjs/common';
import { cloudinaryProvider } from './cloudinary.provider';

@Global()
@Module({
  providers: [cloudinaryProvider],
  exports: [cloudinaryProvider],
})
export class CloudinaryModule {}
