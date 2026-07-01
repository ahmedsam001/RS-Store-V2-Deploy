import { AdminSheinImport } from '@/features/admin/api/admin-api';
import { formatSheinStatus, formatNumberForInput } from '@/features/admin/shein/utils/shein-review-utils';

export function SheinImportCycleOverview({
  items,
  selected,
  sarExchangeRate,
}: {
  items: AdminSheinImport[];
  selected: AdminSheinImport | null;
  sarExchangeRate: number;
}) {
  const readyCount = items.filter((item) =>
    ['PREVIEW_READY', 'MANUAL_REVIEW', 'REVIEWED'].includes(item.status),
  ).length;
  const publishedCount = items.filter((item) =>
    ['PUBLISHED', 'SUCCEEDED'].includes(item.status),
  ).length;

  return (
    <section className="admin-shein-cycle-overview">
      <div className="admin-shein-cycle-hero">
        <p className="admin-shein-kicker">Admin cycle</p>
        <h2>From SHEIN link to customer-facing product</h2>
        <p>
          The workflow is now clear: paste the link, review data and images and category, then publish
          the product without approval steps or drafts
        </p>
      </div>
      <div className="admin-shein-cycle-stats">
        <div>
          <span>Exchange Rate</span>
          <strong>{formatNumberForInput(sarExchangeRate)}</strong>
          <small>SAR × rate</small>
        </div>
        <div>
          <span>Ready for Review</span>
          <strong>{readyCount}</strong>
          <small>import review</small>
        </div>
        <div>
          <span>Published</span>
          <strong>{publishedCount}</strong>
          <small>published products</small>
        </div>
        <div>
          <span>Current Status</span>
          <strong>
            {selected ? (formatSheinStatus(selected.status) ?? selected.status) : 'None'}
          </strong>
          <small>
            {selected?.createdProduct ? selected.createdProduct.nameAr : 'Select import to review'}
          </small>
        </div>
      </div>
    </section>
  );
}