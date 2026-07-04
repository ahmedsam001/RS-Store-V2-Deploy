import {
  CreditCard,
  Instagram,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useCart } from '@/features/cart';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import {
  STORE_CUSTOM_ORDER_LINK,
  STORE_FALLBACK_CATEGORY_LINKS,
  STORE_FOOTER_ACCOUNT_LINKS,
  STORE_FOOTER_CATEGORY_LINKS,
} from '@/features/catalog/navigation/storefront-navigation';
import { readSetting, settingsApi, StorefrontSettings } from '@/features/settings/settings-api';
import { LanguageSwitcher, localizeKnownLabel, useI18n } from '@/shared/i18n';
import { PATHS } from '@/shared/constants/routes';
import { buildCustomerAuthPath } from '@/shared/lib/return-to';
import logoUrl from '@/assets/brand/rs-logo-transparent.png';

export function StorefrontNavbar() {
  const { itemCount: cartCount } = useCart();
  const { language, t } = useI18n();
  const { status, user, logout } = useAuth();
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [announcement, setAnnouncement] = useState(() => t('store.announcement'));
  const [storeName, setStoreName] = useState('RS Store');
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    settingsApi
      .storefront()
      .then((data) => {
        setSettings(data);
        setAnnouncement(readSetting(data, 'store.announcement', t('store.announcement')));
        setStoreName(readSetting(data, 'store.name', 'RS Store'));
      })
      .catch(() => setSettings({}));
  }, [t]);

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-account-menu-root]')) {
        return;
      }
      setAccountOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    };

    const closeOnScroll = () => {
      setAccountOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeOnScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }, [accountOpen]);

  const isCustomer = status === 'authenticated' && user?.role === 'CUSTOMER';
  const isAdmin = status === 'authenticated' && (user?.role === 'ADMIN' || user?.role === 'OWNER');
  const primaryNavLinks = [...STORE_FALLBACK_CATEGORY_LINKS, STORE_CUSTOM_ORDER_LINK];

  function closeMenus() {
    setAccountOpen(false);
  }

  return (
    <div className="store-shell min-h-screen flex flex-col">
      <a className="skip-link" href="#store-main">
        {t('nav.skipToContent')}
      </a>

      {/* Top Announcement Bar */}
      <div className="bg-[#3A2B24] text-white text-xs py-2 text-center">
        <span className="font-medium">{announcement}</span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#F5E6E0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop / Tablet: logo left | nav center | icons right */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex-1 flex items-center">
              <CatalogLink
                href={PATHS.home}
                className="inline-flex items-center"
                aria-label={`${storeName} home`}
              >
                <img src={logoUrl} alt={storeName} className="h-10 w-auto sm:h-11" />
              </CatalogLink>
            </div>
            <nav className="overflow-x-auto px-1" aria-label={t('nav.primary')}>
              <div className="flex items-center justify-center gap-4 whitespace-nowrap md:gap-8">
                {primaryNavLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `text-sm font-semibold pb-1 border-b-2 transition-colors ${
                        isActive
                          ? 'border-[#B8860B] text-[#3A2B24]'
                          : 'border-transparent text-gray-600 hover:text-[#3A2B24] hover:border-gray-300'
                      }`
                    }
                  >
                    {localizeKnownLabel(link.label, language)}
                  </NavLink>
                ))}
              </div>
            </nav>
            <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-3">
              {isAdmin ? (
                <div className="relative" data-account-menu-root>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    aria-label={t('nav.adminAccount')}
                    aria-expanded={accountOpen}
                  >
                    <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  {accountOpen && (
                    <AdminMenu
                      user={user}
                      onLogout={() => {
                        closeMenus();
                        void logout();
                      }}
                      onNavigate={closeMenus}
                    />
                  )}
                </div>
              ) : isCustomer ? (
                <div className="relative" data-account-menu-root>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    aria-label={t('nav.account')}
                    aria-expanded={accountOpen}
                  >
                    <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  {accountOpen && (
                    <ProfileMenu
                      user={user}
                      onLogout={() => {
                        closeMenus();
                        void logout();
                      }}
                      onNavigate={closeMenus}
                    />
                  )}
                </div>
              ) : (
                <CatalogLink
                  href={buildCustomerAuthPath(PATHS.login, PATHS.profile)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                  aria-label={t('nav.login')}
                >
                  <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
                </CatalogLink>
              )}
              <CatalogLink
                href={PATHS.cart}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                aria-label={t('nav.cartItems', { count: cartCount })}
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E74C3C] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </CatalogLink>
            </div>
          </div>

          {/* Mobile: logo left | icons right | divider | nav centered */}
          <div className="flex flex-col gap-0 lg:hidden">
            <div className="flex items-center justify-between py-2">
              <CatalogLink
                href={PATHS.home}
                className="inline-flex items-center"
                aria-label={`${storeName} home`}
              >
                <img src={logoUrl} alt={storeName} className="h-10 w-auto" />
              </CatalogLink>
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <div className="relative" data-account-menu-root>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                      type="button"
                      onClick={() => setAccountOpen((open) => !open)}
                      aria-label={t('nav.adminAccount')}
                      aria-expanded={accountOpen}
                    >
                      <UserRound className="h-5 w-5" />
                    </button>
                    {accountOpen && (
                      <AdminMenu
                        user={user}
                        onLogout={() => {
                          closeMenus();
                          void logout();
                        }}
                        onNavigate={closeMenus}
                      />
                    )}
                  </div>
                ) : isCustomer ? (
                  <div className="relative" data-account-menu-root>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                      type="button"
                      onClick={() => setAccountOpen((open) => !open)}
                      aria-label={t('nav.account')}
                      aria-expanded={accountOpen}
                    >
                      <UserRound className="h-5 w-5" />
                    </button>
                    {accountOpen && (
                      <ProfileMenu
                        user={user}
                        onLogout={() => {
                          closeMenus();
                          void logout();
                        }}
                        onNavigate={closeMenus}
                      />
                    )}
                  </div>
                ) : (
                  <CatalogLink
                    href={buildCustomerAuthPath(PATHS.login, PATHS.profile)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                    aria-label={t('nav.login')}
                  >
                    <UserRound className="h-5 w-5" />
                  </CatalogLink>
                )}
                <CatalogLink
                  href={PATHS.cart}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                  aria-label={t('nav.cartItems', { count: cartCount })}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-[#241611] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </CatalogLink>
              </div>
            </div>
            <div className="h-px bg-[#F5E6E0]" />
            <nav className="overflow-x-auto px-1 py-2" aria-label={t('nav.primary')}>
              <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                {primaryNavLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `text-sm font-semibold pb-1 border-b-2 transition-colors ${
                        isActive
                          ? 'border-[#B8860B] text-[#3A2B24]'
                          : 'border-transparent text-gray-600 hover:text-[#3A2B24] hover:border-gray-300'
                      }`
                    }
                  >
                    {localizeKnownLabel(link.label, language)}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main id="store-main" className="flex-1">
        <Outlet />
      </main>

      <StorefrontFooter settings={settings} isCustomer={isCustomer} />
    </div>
  );
}

function StorefrontFooter({
  settings,
  isCustomer,
}: {
  settings: StorefrontSettings | null;
  isCustomer: boolean;
}) {
  const { language, t } = useI18n();
  const storeName = readSetting(settings, 'store.name', 'RS Store');
  const whatsapp = readSetting(settings, 'store.whatsapp', '');
  const phone = readSetting(settings, 'store.phone', '');
  const instagram = readSetting(settings, 'store.instagram', '');
  const currency = readSetting(settings, 'store.currency', 'EGP');
  const deliveryDays = readSetting(settings, 'shipping.estimatedDays', '30–45');
  const whatsappHref = buildWhatsAppHref(
    whatsapp || phone,
    t('footer.whatsappMessage', { storeName }),
  );
  const footerAccountLinks = STORE_FOOTER_ACCOUNT_LINKS.filter(
    (link) => !(link.guestOnly && isCustomer),
  );

  return (
    <footer className="rs-footer" aria-label={t('footer.storeFooter')}>
      <div className="rs-footer-inner">
        <section className="rs-footer-brand" aria-label={t('footer.aboutStore')}>
          <CatalogLink
            href={PATHS.home}
            className="rs-footer-logo"
            aria-label={`${storeName} home`}
          >
            <img src={logoUrl} alt={storeName} />
          </CatalogLink>
          <p className="rs-footer-copy">{t('footer.copy', { currency })}</p>
          <div className="rs-footer-trust-grid" aria-label={t('footer.storeBenefits')}>
            <span>
              <Truck aria-hidden="true" /> {t('footer.deliveryDays', { days: deliveryDays })}
            </span>
            <span>
              <CreditCard aria-hidden="true" /> {t('footer.depositCheckout')}
            </span>
            <span>
              <ShieldCheck aria-hidden="true" /> {t('footer.reviewedPayments')}
            </span>
          </div>
        </section>

        <nav className="rs-footer-links" aria-label={t('footer.shop')}>
          <p className="rs-footer-title">{t('footer.shop')}</p>
          <CatalogLink href={PATHS.home}>{t('nav.allProducts')}</CatalogLink>
          <CatalogLink href={PATHS.flashSales}>{t('nav.flashSale')}</CatalogLink>
          {STORE_FOOTER_CATEGORY_LINKS.map((link) => (
            <CatalogLink key={link.href} href={link.href}>
              {localizeKnownLabel(link.label, language)}
            </CatalogLink>
          ))}
          <CatalogLink href={PATHS.customOrder}>{t('nav.customOrder')}</CatalogLink>
        </nav>

        <nav className="rs-footer-links" aria-label={t('footer.account')}>
          <p className="rs-footer-title">{t('footer.account')}</p>
          {footerAccountLinks.map((link) => (
            <CatalogLink key={link.href} href={link.href}>
              {localizeKnownLabel(link.label, language)}
            </CatalogLink>
          ))}
          <CatalogLink href={PATHS.sheinRequest}>{t('nav.sheinRequest')}</CatalogLink>
        </nav>

        <section className="rs-footer-contact" aria-label={t('footer.needHelp')}>
          <p className="rs-footer-title">{t('footer.needHelp')}</p>
          {whatsappHref ? (
            <a
              className="rs-footer-action rs-footer-whatsapp-button"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" /> {t('footer.whatsapp')}
            </a>
          ) : null}
          <p className="rs-footer-help">{t('footer.helpText')}</p>
          <div className="rs-footer-actions">
            {/* {phoneHref ? (
              <a className="rs-footer-action" href={phoneHref}>
                <Phone aria-hidden="true" /> Call us
              </a>
            ) : null} */}
            {instagram ? (
              <a className="rs-footer-action" href={instagram} target="_blank" rel="noreferrer">
                <Instagram aria-hidden="true" /> {t('footer.instagram')}
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className="rs-footer-bottom">
        <p>
          {t('footer.developedBy')}{' '}
          <a
            href="https://wa.me/201152887590"
            target="_blank"
            rel="noreferrer"
            className="rs-footer-developer-link"
            aria-label={t('footer.developerContact')}
          >
            Ahmed Sami
          </a>
        </p>
      </div>
    </footer>
  );
}

function buildWhatsAppHref(value: string, message: string) {
  const normalized = normalizeWhatsAppPhone(value);
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeWhatsAppPhone(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  return digits;
}

function ProfileMenu({
  user,
  onLogout,
  onNavigate,
}: {
  user: { name?: string | null; phone?: string | null };
  onLogout: () => void;
  onNavigate: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#F5E6E0] z-50">
      <div className="p-4 border-b border-[#F5E6E0]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B8860B] text-white">
            {initials(user?.name)}
          </div>
          <div>
            <p className="font-medium text-[#3A2B24]">{user?.name}</p>
            <p className="text-sm text-gray-500" dir="ltr">
              {user?.phone}
            </p>
          </div>
        </div>
      </div>
      <div className="p-2">
        <CatalogLink
          href={PATHS.profile}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-[#3A2B24]"
        >
          <User className="h-4 w-4" />
          <span>{t('nav.profile')}</span>
        </CatalogLink>
        <CatalogLink
          href={PATHS.orders}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-[#3A2B24]"
        >
          <PackageSearch className="h-4 w-4" />
          <span>{t('nav.myOrders')}</span>
        </CatalogLink>
        <LanguageSwitcher className="h-auto w-full justify-start rounded-md px-3 py-2 text-sm font-semibold text-[#3A2B24] hover:bg-gray-50 hover:text-[#B8860B]" />
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-50 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </div>
  );
}

function AdminMenu({
  user,
  onLogout,
  onNavigate,
}: {
  user: { name?: string | null; phone?: string | null };
  onLogout: () => void;
  onNavigate: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#F5E6E0] z-50">
      <div className="p-4 border-b border-[#F5E6E0]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c7831e] text-white">
            {initials(user?.name)}
          </div>
          <div>
            <p className="font-medium text-[#3A2B24]">{user?.name}</p>
            <p className="text-sm text-gray-500" dir="ltr">
              {user?.phone}
            </p>
          </div>
        </div>
      </div>
      <div className="p-2">
        <CatalogLink
          href={PATHS.adminRoot}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-[#3A2B24]"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>{t('nav.adminDashboard')}</span>
        </CatalogLink>
        <LanguageSwitcher className="h-auto w-full justify-start rounded-md px-3 py-2 text-sm font-semibold text-[#3A2B24] hover:bg-gray-50 hover:text-[#B8860B]" />
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-50 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return 'RS';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
