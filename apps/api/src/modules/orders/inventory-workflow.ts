export const INVENTORY_RESERVATION_STRATEGY = 'RESERVE_ON_ORDER_CREATED' as const;

export function getAvailableStock(stockQuantity: number, reservedQuantity: number): number {
  return Math.max(0, stockQuantity - reservedQuantity);
}

export function canReserveStock(stockQuantity: number, reservedQuantity: number, requestedQuantity: number): boolean {
  return requestedQuantity > 0 && getAvailableStock(stockQuantity, reservedQuantity) >= requestedQuantity;
}
