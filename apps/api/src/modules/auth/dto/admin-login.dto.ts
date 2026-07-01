import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RememberMeDto } from './auth-phone.dto';
import { normalizeEgyptianPhone } from '../phone-normalization';

export class AdminLoginDto extends RememberMeDto {
  @Transform(({ value }) => normalizeEgyptianPhone(value))
  @IsString()
  @Matches(/^01\d{9}$/, { message: 'phone must be an Egyptian mobile number like 01xxxxxxxxx' })
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}
