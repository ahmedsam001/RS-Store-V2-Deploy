import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Phone, UserPlus } from 'lucide-react';
import { authApi } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { Input } from '@/shared/components/ui/Input';
import { PATHS } from '@/shared/constants/routes';
import { sanitizeReturnTo } from '@/shared/lib/return-to';
import { normalizeEgyptianPhoneNumber } from '@/shared/lib/validation';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { useI18n } from '@/shared/i18n';
import logoUrl from '@/assets/brand/rs-logo-transparent.webp';

type SmartLoginMode = 'customer-login' | 'customer-register' | 'admin-login';

type SmartLoginPageProps = {
  mode?: SmartLoginMode;
};

type AuthStep = 'phone' | 'admin-password' | 'register';

type LocationState = {
  returnTo?: string;
  reason?: 'checkout' | 'auth';
};

const authCopy = {
  ar: {
    phoneInvalid: 'اكتب رقم موبايل مصري صحيح مثل 01xxxxxxxxx',
    loginSuccessCheckout: 'تم تسجيل الدخول بنجاح. كمّل طلبك الآن.',
    welcomeBack: 'أهلًا بعودتك!',
    accountCreatedCheckout: 'تم إنشاء الحساب بنجاح. كمّل طلبك الآن.',
    accountCreated: 'تم إنشاء الحساب بنجاح.',
    phoneLabel: 'رقم الموبايل',
    editPhone: 'تعديل الرقم',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'كلمة مرور الأدمن',
    fullNameLabel: 'الاسم بالكامل',
    fullNamePlaceholder: 'اكتب اسمك بالكامل',
    addressLabel: 'عنوان التوصيل',
    addressPlaceholder: 'العنوان بالكامل مع المنطقة أو المدينة',
    rememberMe: 'تذكرني على هذا الجهاز',
    returnToStore: 'الرجوع للمتجر',
    adminKicker: 'لوحة الأدمن',
    adminHeading: 'تسجيل دخول الأدمن',
    adminChecking: 'جاري التحقق من بيانات الأدمن...',
    adminDescription: 'اكتب كلمة المرور للدخول إلى لوحة التحكم',
    registerKicker: 'حساب العميل',
    registerHeading: 'إنشاء حساب',
    registerDescription: 'هذا الرقم جديد. أضف الاسم والعنوان لإنشاء الحساب',
    phoneKicker: 'حساب RS Store',
    phoneHeading: 'تسجيل الدخول',
    phoneDescription: 'اكتب رقم الموبايل للمتابعة',
    signingIn: 'جاري الدخول...',
    adminLogin: 'دخول الأدمن',
    creating: 'جاري الإنشاء...',
    createAccount: 'إنشاء حساب',
    checking: 'جاري التحقق...',
    continue: 'متابعة',
    invalidAdminCredentials: 'بيانات الأدمن غير صحيحة. حاول مرة أخرى.',
    signInFailed: 'تعذر تسجيل الدخول. حاول مرة أخرى.',
    accountDisabled: 'هذا الحساب غير مفعل. تواصل مع الدعم.',
    alreadyRegistered: 'هذا الرقم مسجل بالفعل. سجل الدخول.',
    authFailed: 'فشل تسجيل الدخول. راجع البيانات وحاول مرة أخرى.',
  },
  en: {
    phoneInvalid: 'Please enter an Egyptian mobile number like 01xxxxxxxxx',
    loginSuccessCheckout: 'Login successful. Complete your order now.',
    welcomeBack: 'Welcome back!',
    accountCreatedCheckout: 'Account created successfully. Complete your order now.',
    accountCreated: 'Account created successfully.',
    phoneLabel: 'Phone Number',
    editPhone: 'Edit phone',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Admin password',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    addressLabel: 'Delivery Address',
    addressPlaceholder: 'Full address with area or city',
    rememberMe: 'Remember me on this device',
    returnToStore: 'Return to Store',
    adminKicker: 'Admin Panel',
    adminHeading: 'Admin Login',
    adminChecking: 'Checking admin credentials...',
    adminDescription: 'Enter your password to access the dashboard',
    registerKicker: 'Customer Account',
    registerHeading: 'Create Account',
    registerDescription: 'This phone is new. Add your name and address to create an account',
    phoneKicker: 'RS Store Account',
    phoneHeading: 'Sign In',
    phoneDescription: 'Enter your phone number to continue',
    signingIn: 'Signing in...',
    adminLogin: 'Admin Login',
    creating: 'Creating...',
    createAccount: 'Create Account',
    checking: 'Checking...',
    continue: 'Continue',
    invalidAdminCredentials: 'Invalid admin credentials. Please try again.',
    signInFailed: 'Unable to sign in. Please try again.',
    accountDisabled: 'This account is not active. Please contact support.',
    alreadyRegistered: 'This phone number is already registered. Please sign in.',
    authFailed: 'Authentication failed. Please check your details.',
  },
} as const;

type AuthCopy = (typeof authCopy)[keyof typeof authCopy];

export function SmartLoginPage({ mode }: SmartLoginPageProps = {}) {
  void mode;
  const { language } = useI18n();
  const copy = authCopy[language];
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneValue, setPhoneValue] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adminLogin, customerLogin } = useAuth();
  const { refresh } = useCart();
  const locationState = location.state as LocationState | null;

  const returnTo = useMemo(
    () =>
      sanitizeReturnTo(
        searchParams.get('redirect') ?? searchParams.get('returnTo') ?? locationState?.returnTo,
        PATHS.profile,
      ),
    [locationState?.returnTo, searchParams],
  );
  const isCheckoutFlow = returnTo === PATHS.checkout || locationState?.reason === 'checkout';
  const content = stepContent(step, isSubmitting, copy);

  useDocumentMetadata({
    title: `${content.heading} | RS Store`,
    description: content.description,
  });

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const phone = normalizeEgyptianPhoneNumber(phoneValue);
    if (!phone) {
      setError(copy.phoneInvalid);
      return;
    }

    setNormalizedPhone(phone);
    setPhoneValue(phone);
    setIsSubmitting(true);
    try {
      const result = await authApi.lookup(phone);
      if (result.role === 'admin') {
        setStep('admin-password');
        return;
      }

      if (result.role === 'customer') {
        await customerLogin({ phone });
        await refresh();
        navigate(returnTo, {
          replace: true,
          state: {
            message: isCheckoutFlow ? copy.loginSuccessCheckout : copy.welcomeBack,
          },
        });
        return;
      }

      setStep('register');
    } catch (err) {
      setError(normalizeAuthError(err, copy));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      await adminLogin({
        phone: normalizedPhone,
        password: String(form.get('password') ?? ''),
        rememberMe: form.get('rememberMe') === 'on',
      });
      navigate(PATHS.adminRoot, { replace: true });
    } catch (err) {
      setError(normalizeAuthError(err, copy, 'admin'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      await customerLogin({
        phone: normalizedPhone,
        name: String(form.get('name') ?? '').trim(),
        address: String(form.get('address') ?? '').trim(),
        rememberMe: form.get('rememberMe') === 'on',
      });
      await refresh();
      navigate(returnTo, {
        replace: true,
        state: {
          message: isCheckoutFlow ? copy.accountCreatedCheckout : copy.accountCreated,
        },
      });
    } catch (err) {
      setError(normalizeAuthError(err, copy));
    } finally {
      setIsSubmitting(false);
    }
  }

  function editPhone() {
    setStep('phone');
    setError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === 'admin-password') {
      void handleAdminSubmit(event);
      return;
    }

    if (step === 'register') {
      void handleRegisterSubmit(event);
      return;
    }

    void handlePhoneSubmit(event);
  }

  return (
    <section className="rs-auth-page" aria-labelledby="smart-login-title">
      <div className="rs-auth-card">
        <div className="text-center mb-6">
          <span
            className="inline-flex items-center justify-center h-16 w-28 rounded-3xl bg-card text-lg font-black text-rs-ink"
            aria-hidden="true"
          >
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-contain"
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
          </span>
          <p className="rs-kicker mt-3">{content.kicker}</p>
          <h1 id="smart-login-title" className="mt-2 text-2xl font-black text-rs-ink">
            {content.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-[320px] mx-auto leading-6">
            {content.description}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
              {copy.phoneLabel}
            </span>
            <Input
              name="phone"
              type="tel"
              placeholder="01xxxxxxxxx"
              required
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              value={phoneValue}
              onChange={(event) => {
                setPhoneValue(event.target.value);
                if (step !== 'phone') {
                  setStep('phone');
                  setError('');
                }
              }}
              className="text-left border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
              aria-invalid={!!error}
            />
          </label>

          {step !== 'phone' ? (
            <button
              type="button"
              onClick={editPhone}
              disabled={isSubmitting}
              className="text-sm font-extrabold text-rs-gold transition hover:text-rs-gold-dark disabled:opacity-60"
            >
              {copy.editPhone}
            </button>
          ) : null}

          {step === 'admin-password' ? (
            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                {copy.passwordLabel}
              </span>
              <Input
                name="password"
                type="password"
                placeholder={copy.passwordPlaceholder}
                required
                autoComplete="current-password"
                className="border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
              />
            </label>
          ) : null}

          {step === 'register' ? (
            <>
              <label className="block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                  {copy.fullNameLabel}
                </span>
                <Input
                  name="name"
                  type="text"
                  placeholder={copy.fullNamePlaceholder}
                  minLength={2}
                  required
                  autoComplete="name"
                  className="border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                  {copy.addressLabel}
                </span>
                <textarea
                  name="address"
                  placeholder={copy.addressPlaceholder}
                  rows={3}
                  required
                  minLength={5}
                  autoComplete="street-address"
                  className="mt-0.5 w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
                />
              </label>
            </>
          ) : null}

          {step !== 'phone' ? <RememberMe defaultChecked={isCheckoutFlow} label={copy.rememberMe} /> : null}
          <AuthError message={error} />

          <button
            className="rs-btn-primary w-full"
            type="submit"
            disabled={isSubmitting || !phoneValue.trim()}
          >
            {step === 'admin-password' ? (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            ) : step === 'register' ? (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Phone className="h-4 w-4" aria-hidden="true" />
            )}
            {submitLabel(step, isSubmitting, copy)}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm font-extrabold text-muted-foreground">
          <CatalogLink
            href={PATHS.home}
            className="inline-flex items-center gap-1 transition hover:text-rs-gold"
          >
            {copy.returnToStore} <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </CatalogLink>
        </div>
      </div>
    </section>
  );
}

function stepContent(step: AuthStep, isSubmitting: boolean, copy: AuthCopy) {
  if (step === 'admin-password') {
    return {
      kicker: copy.adminKicker,
      heading: copy.adminHeading,
      description: isSubmitting ? copy.adminChecking : copy.adminDescription,
    };
  }

  if (step === 'register') {
    return {
      kicker: copy.registerKicker,
      heading: copy.registerHeading,
      description: copy.registerDescription,
    };
  }

  return {
    kicker: copy.phoneKicker,
    heading: copy.phoneHeading,
    description: copy.phoneDescription,
  };
}

function RememberMe({ defaultChecked, label }: { defaultChecked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        name="rememberMe"
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4.5 w-4.5 rounded border-rs-peach accent-rs-gold"
      />
      <span className="text-sm font-extrabold text-rs-ink">{label}</span>
    </label>
  );
}

function submitLabel(step: AuthStep, isSubmitting: boolean, copy: AuthCopy): string {
  if (step === 'admin-password') return isSubmitting ? copy.signingIn : copy.adminLogin;
  if (step === 'register') return isSubmitting ? copy.creating : copy.createAccount;
  return isSubmitting ? copy.checking : copy.continue;
}

function AuthError({ message }: { message: string }) {
  return message ? (
    <p
      className="rs-form-error rounded-xl border border-destructive/30 bg-destructive/5 p-3"
      role="alert"
    >
      {message}
    </p>
  ) : null;
}

function normalizeAuthError(
  error: unknown,
  copy: AuthCopy,
  context: 'admin' | 'customer' = 'customer',
): string {
  const message = error instanceof Error ? error.message : '';
  if (/password|credentials|unauthorized/i.test(message)) {
    return context === 'admin' ? copy.invalidAdminCredentials : copy.signInFailed;
  }
  if (/phone/i.test(message)) {
    return copy.phoneInvalid;
  }
  if (/disabled/i.test(message)) {
    return copy.accountDisabled;
  }
  if (/duplicate|already/i.test(message)) {
    return copy.alreadyRegistered;
  }
  return message || copy.authFailed;
}
