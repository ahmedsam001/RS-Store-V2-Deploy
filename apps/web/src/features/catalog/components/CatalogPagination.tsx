import { Button } from '@/shared/components/ui/Button';
import { PaginationMeta } from '@/shared/types/CatalogTypes';

type CatalogPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
};

export function CatalogPagination({ meta, onPageChange }: CatalogPaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="rs-panel flex items-center justify-between gap-3 p-3"
      aria-label="Product pages pagination"
    >
      <Button
        variant="outline"
        disabled={!meta.hasPreviousPage}
        onClick={() => onPageChange(meta.page - 1)}
      >
        Previous
      </Button>
      <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button
        variant="outline"
        disabled={!meta.hasNextPage}
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
