import { Button } from '@/shared/components/ui/Button';
import { PaginationMeta } from '@/shared/types/CatalogTypes';
import { useI18n } from '@/shared/i18n';

type CatalogPaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
};

export function CatalogPagination({ meta, onPageChange }: CatalogPaginationProps) {
  const { t } = useI18n();
  if (meta.totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="rs-panel flex items-center justify-between gap-3 p-3"
      aria-label={t('pagination.label')}
    >
      <Button
        variant="outline"
        disabled={!meta.hasPreviousPage}
        onClick={() => onPageChange(meta.page - 1)}
      >
        {t('pagination.previous')}
      </Button>
      <span className="rounded-full bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
        {t('pagination.pageOf', { page: meta.page, totalPages: meta.totalPages })}
      </span>
      <Button
        variant="outline"
        disabled={!meta.hasNextPage}
        onClick={() => onPageChange(meta.page + 1)}
      >
        {t('pagination.next')}
      </Button>
    </nav>
  );
}
