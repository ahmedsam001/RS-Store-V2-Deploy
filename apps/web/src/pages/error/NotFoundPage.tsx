import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';
import { useI18n } from '@/shared/i18n';

const notFoundCopy = {
  ar: {
    title: 'الصفحة غير موجودة',
    message: 'راجع الرابط أو ارجع إلى الكتالوج',
    cta: 'الرجوع للكتالوج',
  },
  en: {
    title: 'Page not found',
    message: 'Check the link or return to catalog',
    cta: 'Back to catalog',
  },
} as const;

export function NotFoundPage() {
  const { language } = useI18n();
  const copy = notFoundCopy[language];

  return (
    <div className="rs-container py-16 text-center">
      <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">404</p>
      <h1 className="mt-2 text-2xl font-bold text-rs-ink">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.message}</p>
      <div className="mt-6 flex justify-center">
        <CatalogLink href={PATHS.home} className="rs-btn-primary max-w-[220px]">
          {copy.cta}
        </CatalogLink>
      </div>
    </div>
  );
}
