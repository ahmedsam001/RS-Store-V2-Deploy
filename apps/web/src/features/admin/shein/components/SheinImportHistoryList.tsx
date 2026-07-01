import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { AdminEmpty } from '@/features/admin/components/AdminState';
import { SheinImportHistoryListProps } from '@/features/admin/shein/types/shein.types';
import { formatSheinStatus, sanitizeSheinAdminMessage, shouldShowManualNotice, shortSheinUrl } from '@/features/admin/shein/utils/shein-review-utils';
import { AdminSheinImport } from '@/features/admin/api/admin-api';

const MANUAL_REVIEW_MESSAGE =
  'System could not extract all data automatically. Open the SHEIN link to complete product data manually.';

export function SheinImportHistoryList({
  items,
  selectedId,
  onSelect,
}: SheinImportHistoryListProps) {
  if (items.length === 0) {
    return <AdminEmpty message="No imports found" />;
  }

  return (
    <Card className="rs-shein-card">
      <CardHeader>
        <CardTitle>Import History</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <SheinImportHistoryItem
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={onSelect}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SheinImportHistoryItem({
  item,
  isSelected,
  onSelect,
}: {
  item: AdminSheinImport;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`admin-shein-history-item ${isSelected ? 'is-active' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="truncate">
          {item.editedPayload?.nameAr ??
            item.previewPayload?.nameAr ??
            shortSheinUrl(item.sourceUrl)}
        </strong>
        <Badge>{formatSheinStatus(item.status) ?? item.status}</Badge>
      </div>
      <p className="truncate text-sm text-muted-foreground" dir="ltr">
        {item.sourceUrl}
      </p>
      {shouldShowManualNotice(item) ? (
        <p className="mt-1 text-sm text-amber-700">
          {sanitizeSheinAdminMessage(item.errorMessage || MANUAL_REVIEW_MESSAGE)}
        </p>
      ) : null}
    </button>
  );
}