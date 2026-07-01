import { OrderPaymentStatus, OrderStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class OrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([
    'ACTIVE_ORDERS',
    'PAYMENT_REVIEW',
    'CASH_FINAL_PAYMENT_REVIEW',
    'READY_FOR_SHEIN_BATCH',
    'IN_SHEIN_BATCH',
    'WAITING_FINAL_PAYMENT',
    'READY_TO_DELIVER',
    'COMPLETED',
    'CANCELLED',
  ])
  workflow?:
    | 'ACTIVE_ORDERS'
    | 'PAYMENT_REVIEW'
    | 'CASH_FINAL_PAYMENT_REVIEW'
    | 'READY_FOR_SHEIN_BATCH'
    | 'IN_SHEIN_BATCH'
    | 'WAITING_FINAL_PAYMENT'
    | 'READY_TO_DELIVER'
    | 'COMPLETED'
    | 'CANCELLED';

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderPaymentStatus)
  paymentStatus?: OrderPaymentStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
