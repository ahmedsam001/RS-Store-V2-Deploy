import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';

export function NotFoundPage() {
  return (
    <div className="rs-container py-16 text-center">
      <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">404</p>
      <h1 className="mt-2 text-2xl font-bold text-rs-ink">Page not found</h1>
      <p className="mt-3 text-muted-foreground">Check the link or return to catalog</p>
      <div className="mt-6 flex justify-center">
        <CatalogLink href={PATHS.home} className="rs-btn-primary max-w-[220px]">
          Back to catalog
        </CatalogLink>
      </div>
    </div>
  );
}
