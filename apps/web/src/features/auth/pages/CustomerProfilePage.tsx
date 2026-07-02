import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, PackageSearch, LogOut, Phone, MapPin, Shield, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { PATHS } from '@/shared/constants/routes';
import { normalizeEgyptianPhoneNumber } from '@/shared/lib/validation';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';

export function CustomerProfilePage() {
  const { status, user, logout, updateProfile } = useAuth();
  const isArabic = user?.language === 'ar';
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name ?? '',
    phone: formatPhoneDisplay(user?.phone) ?? '',
    address: user?.address ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useDocumentMetadata({
    title: 'My Account | RS Store',
    description: 'Account information and order links in RS Store',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name ?? '',
        phone: formatPhoneDisplay(user.phone) ?? '',
        address: user.address ?? '',
      });
    }
  }, [user]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);

  if (isLoading || status === 'loading') {
    return <CatalogState title="Loading profile" message="Loading account data" />;
  }

  if (status !== 'authenticated' || !user) {
    return <CatalogState title="Sign in required" message="Please sign in to view your account" />;
  }

  const displayName = displayProfileName(user);
  const initials = profileInitials(user);
  const currentPhone = formatPhoneDisplay(user.phone) ?? '';
  const currentAddress = user.address ?? '';
  const currentName = user.name ?? '';

  function handleLanguageChange(lang: 'ar' | 'en') {
    void updateProfile({ language: lang });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const phoneFormatted = formatPhoneSubmit(editForm.phone);
      await updateProfile({
        name: editForm.name || undefined,
        phone: phoneFormatted || undefined,
        address: editForm.address || undefined,
      });
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
  }

  return (
    <div className="rs-page-stack">
      <section>
        <div className="rs-panel p-4 sm:p-5">
          <div className={`flex flex-col items-center gap-4 ${isArabic ? 'rtl' : 'ltr'}`}>
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--brand-rose))] to-[hsl(var(--brand-rose-dark))] text-xl font-black text-white shadow-lg">
                {initials}
              </div>
              <div className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                <Shield className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className={isArabic ? 'text-center' : 'text-center'}>
              <p className="text-sm font-semibold text-muted-foreground">Welcome back!</p>
              <h1 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPhoneDisplay(user.phone) ?? 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          icon={PackageSearch}
          label="My Orders"
          href={PATHS.orders}
          description="Track & manage orders"
        />
        <QuickActionCard
          icon={ShoppingCart}
          label="My Cart"
          href={PATHS.cart}
          description="View cart items"
        />
        <Button
          variant="outline"
          size="md"
          onClick={() => setIsEditing(true)}
          className="h-auto justify-start gap-3 px-4 py-3"
        >
          <User className="h-5 w-5" />
          <span className="text-sm font-bold">Edit Profile</span>
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => void logout()}
          className="h-auto justify-start gap-3 px-4 py-3"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-bold">Logout</span>
        </Button>
      </section>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">Edit Profile</h2>
              <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Full Name
                </label>
                <Input
                  placeholder="Enter your full name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Phone
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
                  Address
                </label>
                <Input
                  placeholder="Enter your address"
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
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save'}
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
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 bg-card p-4 sm:p-5">
            <InfoRow icon={User} label="Full Name" value={user.name ?? 'Not set'} />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={formatPhoneDisplay(user.phone) ?? 'Not set'}
            />
            <InfoRow icon={MapPin} label="Address" value={user.address ?? 'Not set'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-rs-peach-light bg-rs-cream-warm/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-[hsl(var(--brand-gold))]" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rs-peach-light">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">Language</p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {user.language === 'ar' ? 'Arabic' : 'English'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={user.language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('en')}
                  className="text-xs"
                >
                  EN
                </Button>
                <Button
                  variant={user.language === 'ar' ? 'default' : 'outline'}
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

function displayProfileName(user: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email?.trim() || user.phone?.trim() || 'Customer';
}

function profileInitials(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  const source = displayProfileName(user);
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
