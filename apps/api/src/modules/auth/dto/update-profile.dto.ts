import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeEgyptianPhone } from '../phone-normalization';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? normalizeEgyptianPhone(value) : value))
  @IsString()
  @Matches(/^01\d{9}$/, { message: 'phone must be an Egyptian mobile number like 01xxxxxxxxx' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  newPassword?: string;
}
