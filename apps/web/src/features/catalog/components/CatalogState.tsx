import { PackageSearch } from 'lucide-react';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';

type CatalogStateProps = {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function CatalogState({ message, title, ctaLabel, ctaHref }: CatalogStateProps) {
  return (
    <div
      className="rs-panel-soft flex min-h-72 flex-col items-center justify-center p-8 text-center"
      role="status"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageSearch className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-rs-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {ctaLabel && ctaHref ? (
        <CatalogLink href={ctaHref} className="rs-btn-primary mt-6 max-w-[240px]">
          {ctaLabel}
        </CatalogLink>
      ) : null}
    </div>
  );
}
