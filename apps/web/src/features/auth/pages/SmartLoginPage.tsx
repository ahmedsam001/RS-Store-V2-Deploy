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
import logoUrl from '@/assets/brand/rs-logo-transparent.png';

type SmartLoginMode = 'customer-login' | 'customer-register' | 'admin-login';

type SmartLoginPageProps = {
  mode?: SmartLoginMode;
};

type AuthStep = 'phone' | 'admin-password' | 'register';

type LocationState = {
  returnTo?: string;
  reason?: 'checkout' | 'auth';
};

export function SmartLoginPage({ mode }: SmartLoginPageProps = {}) {
  void mode;
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
  const content = stepContent(step, isSubmitting);

  useDocumentMetadata({
    title: `${content.heading} | RS Store`,
    description: content.description,
  });

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const phone = normalizeEgyptianPhoneNumber(phoneValue);
    if (!phone) {
      setError('Please enter an Egyptian mobile number like 01xxxxxxxxx');
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
            message: isCheckoutFlow
              ? 'Login successful. Complete your order now.'
              : 'Welcome back!',
          },
        });
        return;
      }

      setStep('register');
    } catch (err) {
      setError(normalizeAuthError(err));
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
      setError(normalizeAuthError(err, 'admin'));
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
          message: isCheckoutFlow
            ? 'Account created successfully. Complete your order now.'
            : 'Account created successfully.',
        },
      });
    } catch (err) {
      setError(normalizeAuthError(err));
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
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
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
            <span className="block text-sm font-extrabold text-rs-ink mb-1.5">Phone Number</span>
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
              Edit phone
            </button>
          ) : null}

          {step === 'admin-password' ? (
            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">Password</span>
              <Input
                name="password"
                type="password"
                placeholder="Admin password"
                required
                autoComplete="current-password"
                className="border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
              />
            </label>
          ) : null}

          {step === 'register' ? (
            <>
              <label className="block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">Full Name</span>
                <Input
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  minLength={2}
                  required
                  autoComplete="name"
                  className="border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                  Delivery Address
                </span>
                <textarea
                  name="address"
                  placeholder="Full address with area or city"
                  rows={3}
                  required
                  minLength={5}
                  autoComplete="street-address"
                  className="mt-0.5 w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
                />
              </label>
            </>
          ) : null}

          {step !== 'phone' ? <RememberMe defaultChecked={isCheckoutFlow} /> : null}
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
            {submitLabel(step, isSubmitting)}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm font-extrabold text-muted-foreground">
          <CatalogLink
            href={PATHS.home}
            className="inline-flex items-center gap-1 transition hover:text-rs-gold"
          >
            Return to Store <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </CatalogLink>
        </div>
      </div>
    </section>
  );
}

function stepContent(step: AuthStep, isSubmitting: boolean) {
  if (step === 'admin-password') {
    return {
      kicker: 'Admin Panel',
      heading: 'Admin Login',
      description: isSubmitting
        ? 'Checking admin credentials...'
        : 'Enter your password to access the dashboard',
    };
  }

  if (step === 'register') {
    return {
      kicker: 'Customer Account',
      heading: 'Create Account',
      description: 'This phone is new. Add your name and address to create an account',
    };
  }

  return {
    kicker: 'RS Store Account',
    heading: 'Sign In',
    description: 'Enter your phone number to continue',
  };
}

function RememberMe({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        name="rememberMe"
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4.5 w-4.5 rounded border-rs-peach accent-rs-gold"
      />
      <span className="text-sm font-extrabold text-rs-ink">Remember me on this device</span>
    </label>
  );
}

function submitLabel(step: AuthStep, isSubmitting: boolean): string {
  if (step === 'admin-password') return isSubmitting ? 'Signing in...' : 'Admin Login';
  if (step === 'register') return isSubmitting ? 'Creating...' : 'Create Account';
  return isSubmitting ? 'Checking...' : 'Continue';
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

function normalizeAuthError(error: unknown, context: 'admin' | 'customer' = 'customer'): string {
  const message = error instanceof Error ? error.message : '';
  if (/password|credentials|unauthorized/i.test(message)) {
    return context === 'admin'
      ? 'Invalid admin credentials. Please try again.'
      : 'Unable to sign in. Please try again.';
  }
  if (/phone/i.test(message)) {
    return 'Please enter an Egyptian mobile number like 01xxxxxxxxx';
  }
  if (/disabled/i.test(message)) {
    return 'This account is not active. Please contact support.';
  }
  if (/duplicate|already/i.test(message)) {
    return 'This phone number is already registered. Please sign in.';
  }
  return message || 'Authentication failed. Please check your details.';
}
