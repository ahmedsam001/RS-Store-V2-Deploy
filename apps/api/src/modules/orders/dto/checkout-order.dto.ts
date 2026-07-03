import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const DEPOSIT_PERCENT_CHOICES = [50, 60, 70] as const;
export const DEPOSIT_PAYMENT_METHODS = ['instapay', 'vodafone'] as const;

export type DepositPercentInput = (typeof DEPOSIT_PERCENT_CHOICES)[number];
export type DepositPaymentMethodInput = (typeof DEPOSIT_PAYMENT_METHODS)[number];

export class CheckoutOrderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  customerName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  customerEmail?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(600)
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @Type(() => Number)
  @IsInt()
  @IsIn(DEPOSIT_PERCENT_CHOICES)
  depositPercent!: DepositPercentInput;

  @IsIn(DEPOSIT_PAYMENT_METHODS)
  paymentMethod!: DepositPaymentMethodInput;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
