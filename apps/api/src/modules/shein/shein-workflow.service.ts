import { BadRequestException, Injectable } from '@nestjs/common';
import { SheinImportStatus } from '@prisma/client';

@Injectable()
export class SheinWorkflowService {
  assertCanMoveToManualReview(status: SheinImportStatus): void {
    switch (status) {
      case SheinImportStatus.PENDING:
      case SheinImportStatus.EXTRACTING:
      case SheinImportStatus.FAILED:
      case SheinImportStatus.MANUAL_REVIEW:
        return;
      default:
        throw new BadRequestException('Current import status does not allow this action');
    }
  }

  assertCanReview(status: SheinImportStatus): void {
    switch (status) {
      case SheinImportStatus.PREVIEW_READY:
      case SheinImportStatus.FAILED:
      case SheinImportStatus.MANUAL_REVIEW:
      case SheinImportStatus.REVIEWING:
      case SheinImportStatus.REVIEWED:
        return;
      default:
        throw new BadRequestException('Cannot proceed until product data is reviewed');
    }
  }

  assertCanApprove(status: SheinImportStatus): void {
    if (status !== SheinImportStatus.REVIEWED) {
      throw new BadRequestException('Cannot proceed until product data is reviewed');
    }
  }

  assertCanCreateProduct(status: SheinImportStatus): void {
    if (status !== SheinImportStatus.APPROVED) {
      throw new BadRequestException(
        'Unable to create product from SHEIN data. Please review and approve data before creating product.',
      );
    }
  }

  assertCanRetry(status: SheinImportStatus): void {
    switch (status) {
      case SheinImportStatus.PENDING:
      case SheinImportStatus.EXTRACTING:
      case SheinImportStatus.FAILED:
      case SheinImportStatus.MANUAL_REVIEW:
      case SheinImportStatus.CANCELLED:
      case SheinImportStatus.PREVIEW_READY:
      case SheinImportStatus.REVIEWING:
      case SheinImportStatus.REVIEWED:
        return;
      default:
        throw new BadRequestException('Current import status does not allow this action');
    }
  }

  completedAt(status: SheinImportStatus | undefined): Date | undefined {
    switch (status) {
      case SheinImportStatus.PRODUCT_CREATED:
      case SheinImportStatus.PUBLISHED:
      case SheinImportStatus.SUCCEEDED:
      case SheinImportStatus.CANCELLED:
        return new Date();
      default:
        return undefined;
    }
  }
}
