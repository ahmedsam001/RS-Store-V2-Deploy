import { useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  LogOut,
  MapPin,
  PackageSearch,
  Phone,
  Shield,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { PATHS } from '@/shared/constants/routes';
import { normalizeEgyptianPhoneNumber } from '@/shared/lib/validation';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { useI18n, type Language } from '@/shared/i18n';

const profileCopy = {
  ar: {
    metaTitle: 'حسابي | RS Store',
    metaDescription: 'بيانات الحساب وروابط الطلبات في RS Store',
    loadingTitle: 'جاري تحميل الملف الشخصي',
    loadingMessage: 'جاري تحميل بيانات الحساب',
    signInRequired: 'تسجيل الدخول مطلوب',
    signInMessage: 'يرجى تسجيل الدخول لعرض حسابك',
    signInRequiredShort: 'تسجيل الدخول مطلوب',
    invalidAvatar: 'استخدم رابط صورة صحيح أو ارفع ملف JPG أو PNG أو WEBP أو GIF',
    chooseImage: 'اختار ملف صورة',
    avatarTooLarge: 'صورة الحساب يجب أن تكون 1MB أو أقل',
    avatarReadFailed: 'تعذر قراءة صورة الحساب',
    editAvatar: 'تعديل صورة الحساب',
    welcomeBack: 'أهلًا بعودتك!',
    notSet: 'غير محدد',
    myOrders: 'طلباتي',
    myOrdersDescription: 'تابع وإدارة الطلبات',
    myCart: 'سلتي',
    myCartDescription: 'عرض منتجات السلة',
    editProfile: 'تعديل الملف الشخصي',
    logout: 'تسجيل الخروج',
    avatar: 'صورة الحساب',
    avatarPlaceholder: 'الصق رابط الصورة أو ارفع صورة',
    uploadAvatar: 'رفع صورة',
    remove: 'حذف',
    avatarLocalNote: 'صورة الحساب محفوظة على هذا الجهاز ولا تغيّر بيانات الطلب أو الدفع',
    fullName: 'الاسم بالكامل',
    fullNamePlaceholder: 'اكتب اسمك بالكامل',
    phone: 'رقم الموبايل',
    address: 'العنوان',
    addressPlaceholder: 'اكتب عنوانك',
    cancel: 'إلغاء',
    saving: 'جاري الحفظ...',
    save: 'حفظ',
    personalInformation: 'البيانات الشخصية',
    preferences: 'التفضيلات',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'الإنجليزية',
    profileAvatarAlt: 'صورة الحساب',
    profileInitials: 'أحرف الاسم',
    customerFallback: 'عميل',
  },
  en: {
    metaTitle: 'My Account | RS Store',
    metaDescription: 'Account information and order links in RS Store',
    loadingTitle: 'Loading profile',
    loadingMessage: 'Loading account data',
    signInRequired: 'Sign in required',
    signInMessage: 'Please sign in to view your account',
    signInRequiredShort: 'Sign in required',
    invalidAvatar: 'Use a valid image URL or upload a JPG PNG WEBP or GIF file',
    chooseImage: 'Please choose an image file',
    avatarTooLarge: 'Avatar image must be 1 MB or smaller',
    avatarReadFailed: 'Could not read this avatar image',
    editAvatar: 'Edit avatar',
    welcomeBack: 'Welcome back!',
    notSet: 'Not set',
    myOrders: 'My Orders',
    myOrdersDescription: 'Track & manage orders',
    myCart: 'My Cart',
    myCartDescription: 'View cart items',
    editProfile: 'Edit Profile',
    logout: 'Logout',
    avatar: 'Avatar',
    avatarPlaceholder: 'Paste image URL or upload an image',
    uploadAvatar: 'Upload avatar',
    remove: 'Remove',
    avatarLocalNote: 'The avatar is saved on this device and does not change orders or checkout data',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    phone: 'Phone',
    address: 'Address',
    addressPlaceholder: 'Enter your address',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save',
    personalInformation: 'Personal Information',
    preferences: 'Preferences',
    language: 'Language',
    arabic: 'Arabic',
    english: 'English',
    profileAvatarAlt: 'Profile avatar',
    profileInitials: 'Profile initials',
    customerFallback: 'Customer',
  },
} as const;

type ProfileCopy = (typeof profileCopy)[keyof typeof profileCopy];

export function CustomerProfilePage() {
  const { language, setLanguage } = useI18n();
  const copy = profileCopy[language];
  const { status, user, logout, updateProfile } = useAuth();
  const isArabic = language === 'ar';
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name ?? '',
    phone: formatPhoneDisplay(user?.phone) ?? '',
    address: user?.address ?? '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useDocumentMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
  });

  useEffect(() => {
    if (user) {
      const savedAvatarUrl = readProfileAvatar(user.id);
      setEditForm({
        name: user.name ?? '',
        phone: formatPhoneDisplay(user.phone) ?? '',
        address: user.address ?? '',
      });
      setAvatarUrl(savedAvatarUrl);
      setAvatarDraft(savedAvatarUrl);
      setAvatarError(null);
    }
  }, [user]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);

  if (isLoading || status === 'loading') {
    return <CatalogState title={copy.loadingTitle} message={copy.loadingMessage} />;
  }

  if (status !== 'authenticated' || !user) {
    return <CatalogState title={copy.signInRequired} message={copy.signInMessage} />;
  }

  const displayName = displayProfileName(user, copy.customerFallback);
  const currentPhone = formatPhoneDisplay(user.phone) ?? '';
  const currentAddress = user.address ?? '';
  const currentName = user.name ?? '';

  function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    void updateProfile({ language: lang });
  }

  async function handleSave() {
    const currentUserId = user?.id;
    if (!currentUserId) {
      setAvatarError(copy.signInRequiredShort);
      return;
    }

    const normalizedAvatarUrl = sanitizeAvatarUrl(avatarDraft);
    if (avatarDraft.trim() && !normalizedAvatarUrl) {
      setAvatarError(copy.invalidAvatar);
      return;
    }

    setIsSaving(true);
    try {
      const phoneFormatted = formatPhoneSubmit(editForm.phone);
      await updateProfile({
        name: editForm.name || undefined,
        phone: phoneFormatted || undefined,
        address: editForm.address || undefined,
      });
      writeProfileAvatar(currentUserId, normalizedAvatarUrl);
      setAvatarUrl(normalizedAvatarUrl);
      setAvatarDraft(normalizedAvatarUrl);
      setAvatarError(null);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setEditForm({
      name: currentName,
      phone: currentPhone,
      address: currentAddress,
    });
    setAvatarDraft(avatarUrl);
    setAvatarError(null);
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError(copy.chooseImage);
      return;
    }

    if (file.size > MAX_LOCAL_AVATAR_BYTES) {
      setAvatarError(copy.avatarTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const normalizedAvatarUrl = sanitizeAvatarUrl(result);
      if (!normalizedAvatarUrl) {
        setAvatarError(copy.avatarReadFailed);
        return;
      }
      setAvatarDraft(normalizedAvatarUrl);
      setAvatarError(null);
    };
    reader.onerror = () => setAvatarError(copy.avatarReadFailed);
    reader.readAsDataURL(file);
  }

  return (
    <div className="rs-page-stack">
      <section>
        <div className="rs-panel p-4 sm:p-5">
          <div className={`flex flex-col items-center gap-4 ${isArabic ? 'rtl' : 'ltr'}`}>
            <div className="relative">
              <ProfileAvatar
                user={user}
                avatarUrl={avatarUrl}
                className="h-16 w-16 text-xl"
                copy={copy}
              />
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label={copy.editAvatar}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">{copy.welcomeBack}</p>
              <h1 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPhoneDisplay(user.phone) ?? copy.notSet}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          icon={PackageSearch}
          label={copy.myOrders}
          href={PATHS.orders}
          description={copy.myOrdersDescription}
        />
        <QuickActionCard
          icon={ShoppingCart}
          label={copy.myCart}
          href={PATHS.cart}
          description={copy.myCartDescription}
        />
        <Button
          variant="outline"
          size="md"
          onClick={() => setIsEditing(true)}
          className="h-auto justify-start gap-3 px-4 py-3"
        >
          <User className="h-5 w-5" />
          <span className="text-sm font-bold">{copy.editProfile}</span>
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => void logout()}
          className="h-auto justify-start gap-3 px-4 py-3"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-bold">{copy.logout}</span>
        </Button>
      </section>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">{copy.editProfile}</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-rs-peach-light bg-rs-cream-warm/30 p-4">
                <div className="flex flex-col items-center gap-3">
                  <ProfileAvatar
                    user={user}
                    avatarUrl={avatarDraft}
                    className="h-20 w-20 text-2xl"
                    copy={copy}
                  />
                  <div className="w-full space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      {copy.avatar}
                    </label>
                    <Input
                      placeholder={copy.avatarPlaceholder}
                      value={avatarDraft}
                      onChange={(event) => {
                        setAvatarDraft(event.target.value);
                        setAvatarError(null);
                      }}
                      disabled={isSaving}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rs-peach-light bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-rs-cream-warm">
                        <Camera className="h-4 w-4" />
                        {copy.uploadAvatar}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                          disabled={isSaving}
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAvatarDraft('');
                          setAvatarError(null);
                        }}
                        disabled={isSaving || !avatarDraft}
                        className="flex-1 gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {copy.remove}
                      </Button>
                    </div>
                    {avatarError && <p className="text-xs font-semibold text-red-600">{avatarError}</p>}
                    <p className="text-xs text-muted-foreground">{copy.avatarLocalNote}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {copy.fullName}
                </label>
                <Input
                  placeholder={copy.fullNamePlaceholder}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {copy.phone}
                </label>
                <Input
                  placeholder="01xxxxxxxxx"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSaving}
                  maxLength={11}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {copy.address}
                </label>
                <Input
                  placeholder={copy.addressPlaceholder}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {copy.cancel}
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? copy.saving : copy.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-rs-peach-light bg-rs-cream-warm/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-[hsl(var(--brand-gold))]" />
              {copy.personalInformation}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 bg-card p-4 sm:p-5">
            <InfoRow icon={User} label={copy.fullName} value={user.name ?? copy.notSet} />
            <InfoRow icon={Phone} label={copy.phone} value={formatPhoneDisplay(user.phone) ?? copy.notSet} />
            <InfoRow icon={MapPin} label={copy.address} value={user.address ?? copy.notSet} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-rs-peach-light bg-rs-cream-warm/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-[hsl(var(--brand-gold))]" />
              {copy.preferences}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rs-peach-light">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">{copy.language}</p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {language === 'ar' ? copy.arabic : copy.english}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('en')}
                  className="text-xs"
                >
                  EN
                </Button>
                <Button
                  variant={language === 'ar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('ar')}
                  className="text-xs"
                >
                  AR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ProfileAvatar({
  user,
  avatarUrl,
  className,
  copy,
}: {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  avatarUrl: string;
  className: string;
  copy: ProfileCopy;
}) {
  const safeAvatarUrl = sanitizeAvatarUrl(avatarUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [safeAvatarUrl]);

  const initials = profileInitials(user, copy.customerFallback);
  const shouldShowImage = Boolean(safeAvatarUrl && !imageFailed);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-rs-peach bg-rs-peach-light font-black text-rs-ink shadow-lg ${className}`}
    >
      {shouldShowImage ? (
        <img
          src={safeAvatarUrl}
          alt={copy.profileAvatarAlt}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="select-none leading-none" aria-label={copy.profileInitials}>
          {initials}
        </span>
      )}
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  label,
  href,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      to={href}
      className="rs-panel rs-card-hover group flex items-center gap-3 px-4 py-3 transition-shadow duration-200"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rs-gold-bg text-foreground transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rs-peach-light">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function displayProfileName(
  user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  fallback: string,
): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email?.trim() || user.phone?.trim() || fallback;
}

function profileInitials(
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  fallback: string,
): string {
  const source = displayProfileName(user, fallback);
  const parts = source
    .split(/[\s@._+-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || user.id.slice(0, 2).toUpperCase();
}

const PROFILE_AVATAR_STORAGE_PREFIX = 'rs_profile_avatar:';
const MAX_LOCAL_AVATAR_BYTES = 1024 * 1024;

function readProfileAvatar(userId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return sanitizeAvatarUrl(window.localStorage.getItem(profileAvatarStorageKey(userId))) || '';
  } catch {
    return '';
  }
}

function writeProfileAvatar(userId: string, avatarUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = profileAvatarStorageKey(userId);
    if (avatarUrl) {
      window.localStorage.setItem(key, avatarUrl);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore local storage write failures so profile updates still work.
  }
}

function profileAvatarStorageKey(userId: string): string {
  return `${PROFILE_AVATAR_STORAGE_PREFIX}${userId}`;
}

function sanitizeAvatarUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.toString();
    }
  } catch {
    return '';
  }

  return '';
}

function formatPhoneDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.startsWith('+2')) {
    return trimmed.slice(2);
  }
  if (trimmed.startsWith('20')) {
    return trimmed.slice(2);
  }
  return trimmed;
}

function formatPhoneSubmit(phone: string): string | null {
  return normalizeEgyptianPhoneNumber(phone);
}
