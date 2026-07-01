import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerLoginDto } from './customer-login.dto';

export class CompatibleLoginDto extends CustomerLoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;
}
