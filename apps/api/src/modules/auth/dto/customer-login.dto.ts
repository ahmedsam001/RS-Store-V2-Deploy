import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { CustomerProfileFieldsDto } from './auth-phone.dto';
import { normalizeEgyptianPhone } from '../phone-normalization';

export class CustomerLoginDto extends CustomerProfileFieldsDto {
  @Transform(({ value }) => normalizeEgyptianPhone(value))
  @IsString()
  @Matches(/^01\d{9}$/, { message: 'phone must be an Egyptian mobile number like 01xxxxxxxxx' })
  phone!: string;
}
