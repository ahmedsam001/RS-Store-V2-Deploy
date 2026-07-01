import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const FINAL_PAYMENT_METHODS = ['cash_at_shop', 'instapay', 'vodafone'] as const;
export type FinalPaymentMethodInput = (typeof FINAL_PAYMENT_METHODS)[number];

export class SubmitFinalPaymentDto {
  @IsIn(FINAL_PAYMENT_METHODS)
  method!: FinalPaymentMethodInput;
}

export class ReviewFinalPaymentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsIn(FINAL_PAYMENT_METHODS)
  method?: FinalPaymentMethodInput;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
