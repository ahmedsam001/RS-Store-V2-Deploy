import type { PaymentProofStatus } from '@prisma/client';
import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';
import {
  PAYMENT_PROOF_STATUS_REJECTED,
  REVIEWABLE_PAYMENT_PROOF_STATUSES,
} from '../payment-proof-status.constants';

export class ReviewPaymentProofDto {
  @IsIn(REVIEWABLE_PAYMENT_PROOF_STATUSES)
  status!: PaymentProofStatus;

  @ValidateIf((dto: ReviewPaymentProofDto) => dto.status === PAYMENT_PROOF_STATUS_REJECTED)
  @IsString()
  @MaxLength(600)
  rejectionReason?: string;
}
