import type { PaymentProofStatus } from '@prisma/client';

export const PAYMENT_PROOF_STATUS_APPROVED: PaymentProofStatus = 'APPROVED';
export const PAYMENT_PROOF_STATUS_REJECTED: PaymentProofStatus = 'REJECTED';

export const REVIEWABLE_PAYMENT_PROOF_STATUSES: readonly PaymentProofStatus[] = [
  PAYMENT_PROOF_STATUS_APPROVED,
  PAYMENT_PROOF_STATUS_REJECTED,
];
