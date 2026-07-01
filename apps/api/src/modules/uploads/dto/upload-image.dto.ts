import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UploadImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^rs-store\/[a-z0-9/_-]+$/i, {
    message: 'folder must be a safe rs-store/* path',
  })
  folder?: string;
}
