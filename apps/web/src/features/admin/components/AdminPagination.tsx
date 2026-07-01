import { Button } from '@/shared/components/ui/Button';
import type { AdminPaginationMeta } from '@/features/admin/api/admin-api';

export function AdminPagination({
  meta,
  onPageChange,
}: {
  meta: AdminPaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Page {meta.page} of {meta.totalPages} · Total {meta.total}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}