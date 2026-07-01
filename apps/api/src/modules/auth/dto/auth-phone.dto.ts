import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeEgyptianPhone } from '../phone-normalization';

export class AuthPhoneDto {
  @Transform(({ value }) => normalizeEgyptianPhone(value))
  @IsString()
  @Matches(/^01\d{9}$/, { message: 'phone must be an Egyptian mobile number like 01xxxxxxxxx' })
  phone!: string;
}

export class RememberMeDto {
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class CustomerProfileFieldsDto extends RememberMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;
}
