import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';
import { useI18n } from '@/shared/i18n';

type SystemErrorPageProps = {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

const systemErrorCopy = {
  ar: {
    backToCatalog: 'الرجوع للكتالوج',
    loginRequiredTitle: 'تسجيل الدخول مطلوب',
    loginRequiredMessage: 'يجب تسجيل الدخول أولًا للوصول إلى هذه الصفحة',
    signIn: 'تسجيل الدخول',
    forbiddenTitle: 'غير مسموح بالوصول',
    forbiddenMessage: 'حسابك الحالي لا يملك صلاحية الوصول إلى هذه الصفحة',
    backToStore: 'الرجوع للمتجر',
    serverTitle: 'خطأ في الخادم',
    serverMessage: 'تعذر تحميل هذه الصفحة حاليًا. حاول مرة أخرى لاحقًا.',
    maintenanceTitle: 'المتجر تحت الصيانة',
    maintenanceMessage: 'نقوم بتحديثات سريعة لتحسين تجربتك. ستعود الخدمة قريبًا.',
  },
  en: {
    backToCatalog: 'Back to Catalog',
    loginRequiredTitle: 'Login Required',
    loginRequiredMessage: 'You must sign in first to access this page',
    signIn: 'Sign In',
    forbiddenTitle: 'Access Denied',
    forbiddenMessage: 'Your current account does not have permission to access this page',
    backToStore: 'Back to Store',
    serverTitle: 'Server Error',
    serverMessage: 'Unable to load this page at the moment. Please try again later.',
    maintenanceTitle: 'Store Under Maintenance',
    maintenanceMessage: 'We are performing quick updates to improve your experience. Service will be back soon.',
  },
} as const;

function SystemErrorPage({
  title,
  message,
  actionLabel,
  actionHref = PATHS.home,
}: SystemErrorPageProps) {
  const { language } = useI18n();
  const copy = systemErrorCopy[language];

  return (
    <div className="rs-container py-16 text-center">
      <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold">RS Store</p>
      <h1 className="mt-2 text-2xl font-bold text-rs-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-center">
        <CatalogLink href={actionHref} className="rs-btn-primary max-w-[220px]">
          {actionLabel ?? copy.backToCatalog}
        </CatalogLink>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  const { language } = useI18n();
  const copy = systemErrorCopy[language];

  return (
    <SystemErrorPage
      title={copy.loginRequiredTitle}
      message={copy.loginRequiredMessage}
      actionLabel={copy.signIn}
      actionHref={PATHS.login}
    />
  );
}

export function ForbiddenPage() {
  const { language } = useI18n();
  const copy = systemErrorCopy[language];

  return (
    <SystemErrorPage
      title={copy.forbiddenTitle}
      message={copy.forbiddenMessage}
      actionLabel={copy.backToStore}
    />
  );
}

export function ServerErrorPage() {
  const { language } = useI18n();
  const copy = systemErrorCopy[language];

  return <SystemErrorPage title={copy.serverTitle} message={copy.serverMessage} />;
}

export function MaintenancePage() {
  const { language } = useI18n();
  const copy = systemErrorCopy[language];

  return <SystemErrorPage title={copy.maintenanceTitle} message={copy.maintenanceMessage} />;
}
