import { OrderItemStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSheinBatchItemStatusDto {
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
