import { SheinPriceSummaryProps } from '@/features/admin/shein/types/shein.types';
import { formatNumberForInput } from '@/features/admin/shein/utils/shein-review-utils';

export function SheinPriceSummary({
  sheinPrice,
  exchangeRate,
  storePrice,
  discount,
  rating,
}: SheinPriceSummaryProps) {
  return (
    <div className="admin-shein-price-summary">
      <div>
        <span>SHEIN SAR</span>
        <strong>{sheinPrice || '-'}</strong>
      </div>
      <div>
        <span>Exchange</span>
        <strong>{formatNumberForInput(exchangeRate)}</strong>
      </div>
      <div>
        <span>Store Price</span>
        <strong>{storePrice ? `${storePrice} EGP` : '-'}</strong>
      </div>
      <div>
        <span>Discount</span>
        <strong>{discount}%</strong>
      </div>
      <div>
        <span>Rating</span>
        <strong>{rating}</strong>
      </div>
    </div>
  );
}