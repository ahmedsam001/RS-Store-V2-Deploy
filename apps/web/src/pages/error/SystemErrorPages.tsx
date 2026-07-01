import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';

type SystemErrorPageProps = {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

function SystemErrorPage({
  title,
  message,
  actionLabel = 'Back to Catalog',
  actionHref = PATHS.home,
}: SystemErrorPageProps) {
  return (
    <div className="rs-container py-16 text-center">
      <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">RS Store</p>
      <h1 className="mt-2 text-2xl font-bold text-rs-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-center">
        <CatalogLink href={actionHref} className="rs-btn-primary max-w-[220px]">
          {actionLabel}
        </CatalogLink>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <SystemErrorPage
      title="Login Required"
      message="You must sign in first to access this page"
      actionLabel="Sign In"
      actionHref={PATHS.login}
    />
  );
}

export function ForbiddenPage() {
  return (
    <SystemErrorPage
      title="Access Denied"
      message="Your current account does not have permission to access this page"
      actionLabel="Back to Store"
    />
  );
}

export function ServerErrorPage() {
  return (
    <SystemErrorPage
      title="Server Error"
      message="Unable to load this page at the moment. Please try again later."
    />
  );
}

export function MaintenancePage() {
  return (
    <SystemErrorPage
      title="Store Under Maintenance"
      message="We are performing quick updates to improve your experience. Service will be back soon."
    />
  );
}
