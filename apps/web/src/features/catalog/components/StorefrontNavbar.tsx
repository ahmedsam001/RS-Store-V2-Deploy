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
import { NavLink, Outlet } from 'react-router-dom';
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
import { PATHS } from '@/shared/constants/routes';
import { buildCustomerAuthPath } from '@/shared/lib/return-to';
import logoUrl from '@/assets/brand/rs-logo-transparent.png';

export function StorefrontNavbar() {
  const { itemCount: cartCount } = useCart();
  const { status, user, logout } = useAuth();
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [announcement, setAnnouncement] = useState('Shien delivery order • Delivery in 30–45 days');
  const [storeName, setStoreName] = useState('RS Store');
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    settingsApi
      .storefront()
      .then((data) => {
        setSettings(data);
        setAnnouncement(
          readSetting(data, 'store.announcement', ' Shien delivery order • Delivery in 30–45 days'),
        );
        setStoreName(readSetting(data, 'store.name', 'RS Store'));
      })
      .catch(() => setSettings({}));
  }, []);

  const isCustomer = status === 'authenticated' && user?.role === 'CUSTOMER';
  const isAdmin = status === 'authenticated' && (user?.role === 'ADMIN' || user?.role === 'OWNER');
  const primaryNavLinks = [...STORE_FALLBACK_CATEGORY_LINKS, STORE_CUSTOM_ORDER_LINK];

  function closeMenus() {
    setAccountOpen(false);
  }

  return (
    <div className="store-shell min-h-screen flex flex-col">
      <a className="skip-link" href="#store-main">
        Skip to content
      </a>

      {/* Top Announcement Bar */}
      <div className="bg-[#3A2B24] text-white text-xs py-2 text-center">
        <span className="font-medium">{announcement}</span>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#F5E6E0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop / Tablet: logo left | nav center | icons right */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex-1 flex items-center">
              <CatalogLink
                href={PATHS.home}
                className="inline-flex items-center"
                aria-label="RS Store home"
              >
                <img src={logoUrl} alt={storeName} className="h-10 w-auto sm:h-11" />
              </CatalogLink>
            </div>
            <nav className="overflow-x-auto px-1" aria-label="Primary navigation">
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
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </nav>
<div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-3">
               {isAdmin ? (
                 <div className="relative">
                   <button
                     className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                     type="button"
                     onClick={() => setAccountOpen((open) => !open)}
                     aria-label="Admin account"
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
                 <div className="relative">
                   <button
                     className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                     type="button"
                     onClick={() => setAccountOpen((open) => !open)}
                     aria-label="My account"
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
                   aria-label="Login"
                 >
                   <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
                 </CatalogLink>
               )}
              <CatalogLink
                href={PATHS.cart}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                aria-label={`Cart ${cartCount} items`}
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
                 aria-label="RS Store home"
               >
                 <img src={logoUrl} alt={storeName} className="h-10 w-auto" />
               </CatalogLink>
               <div className="flex items-center gap-1.5">
                 {isAdmin ? (
                   <div className="relative">
                     <button
                       className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                       type="button"
                       onClick={() => setAccountOpen((open) => !open)}
                       aria-label="Admin account"
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
                   <div className="relative">
                     <button
                       className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                       type="button"
                       onClick={() => setAccountOpen((open) => !open)}
                       aria-label="My account"
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
                     aria-label="Login"
                   >
                     <UserRound className="h-5 w-5" />
                   </CatalogLink>
                 )}
                <CatalogLink
                  href={PATHS.cart}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-[#FFF7F1] hover:text-[#B8860B]"
                  aria-label={`Cart ${cartCount} items`}
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
            <nav className="overflow-x-auto px-1 py-2" aria-label="Primary navigation">
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
                    {link.label}
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
  const storeName = readSetting(settings, 'store.name', 'RS Store');
  const whatsapp = readSetting(settings, 'store.whatsapp', '');
  const phone = readSetting(settings, 'store.phone', '');
  const instagram = readSetting(settings, 'store.instagram', '');
  const currency = readSetting(settings, 'store.currency', 'EGP');
  const deliveryDays = readSetting(settings, 'shipping.estimatedDays', '30–45');
  const whatsappHref = buildWhatsAppHref(
    whatsapp || phone,
    `Hello ${storeName}, I need help with my order.`,
  );
  const footerAccountLinks = STORE_FOOTER_ACCOUNT_LINKS.filter(
    (link) => !(link.guestOnly && isCustomer),
  );

  return (
    <footer className="rs-footer" aria-label="Store footer">
      <div className="rs-footer-inner">
        <section className="rs-footer-brand" aria-label="About RS Store">
          <CatalogLink
            href={PATHS.home}
            className="rs-footer-logo"
            aria-label={`${storeName} home`}
          >
            <img src={logoUrl} alt={storeName} />
          </CatalogLink>
          <p className="rs-footer-copy">
            Curated fashion picks with transparent {currency} pricing, easy custom orders, and clear
            payment steps from deposit to delivery.
          </p>
          <div className="rs-footer-trust-grid" aria-label="Store benefits">
            <span>
              <Truck aria-hidden="true" /> {deliveryDays} days delivery
            </span>
            <span>
              <CreditCard aria-hidden="true" /> Deposit checkout
            </span>
            <span>
              <ShieldCheck aria-hidden="true" /> Reviewed payments
            </span>
          </div>
        </section>

        <nav className="rs-footer-links" aria-label="Shop links">
          <p className="rs-footer-title">Shop</p>
          <CatalogLink href={PATHS.home}>All Products</CatalogLink>
          <CatalogLink href={PATHS.flashSales}>Flash Sale</CatalogLink>
          {STORE_FOOTER_CATEGORY_LINKS.map((link) => (
            <CatalogLink key={link.href} href={link.href}>
              {link.label}
            </CatalogLink>
          ))}
          <CatalogLink href={PATHS.customOrder}>Custom Order</CatalogLink>
        </nav>

        <nav className="rs-footer-links" aria-label="Account links">
          <p className="rs-footer-title">Account</p>
          {footerAccountLinks.map((link) => (
            <CatalogLink key={link.href} href={link.href}>
              {link.label}
            </CatalogLink>
          ))}
          <CatalogLink href={PATHS.sheinRequest}>SHEIN Request</CatalogLink>
        </nav>

        <section className="rs-footer-contact" aria-label="Contact RS Store">
          <p className="rs-footer-title">Need help?</p>
          {whatsappHref ? (
            <a
              className="rs-footer-action rs-footer-whatsapp-button"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" /> Contact us on WhatsApp
            </a>
          ) : null}
          <p className="rs-footer-help">Ask about sizing, custom SHEIN links, deposits, or order status.</p>
          <div className="rs-footer-actions">
            {/* {phoneHref ? (
              <a className="rs-footer-action" href={phoneHref}>
                <Phone aria-hidden="true" /> Call us
              </a>
            ) : null} */}
            {instagram ? (
              <a
                className="rs-footer-action"
                href={instagram}
                target="_blank"
                rel="noreferrer"
              >
                <Instagram aria-hidden="true" /> Instagram
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className="rs-footer-bottom">
        <p>
          Developed by{' '}
          <a
            href="https://wa.me/201152887590"
            target="_blank"
            rel="noreferrer"
            className="rs-footer-developer-link"
            aria-label="Contact Ahmed Sami on WhatsApp"
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
          <span>Profile</span>
        </CatalogLink>
        <CatalogLink
          href={PATHS.orders}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-[#3A2B24]"
        >
          <PackageSearch className="h-4 w-4" />
          <span>My Orders</span>
        </CatalogLink>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-50 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
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
          <span>Admin Dashboard</span>
        </CatalogLink>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-50 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
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
