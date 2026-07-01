import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, PanelLeftClose, Search, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  ADMIN_MANAGEMENT_LINKS,
  ADMIN_NAV_LINKS,
  ADMIN_OPERATIONS_LINKS,
  ADMIN_QUICK_JUMP_LINKS,
  type AdminNavLink,
} from '@/features/admin/navigation/admin-navigation';
import { PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import logoUrl from '@/assets/brand/rs-logo-transparent.png';

export function AdminShell() {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCompact, setCompact] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = useMemo(() => buildInitials(user?.name ?? 'RS'), [user?.name]);
  const pageTitle = useMemo(
    () => resolvePageTitle(location.pathname),
    [location.pathname],
  );

  useDocumentMetadata({
    title: 'Admin Dashboard | RS Store',
    description: 'RS Store private admin dashboard',
    canonicalPath: '/admin',
    robots: 'noindex,nofollow',
  });

  async function handleLogout() {
    await logout(false);
    navigate(PATHS.adminLogin, { replace: true });
  }

  return (
    <div className="admin-shell-bg min-h-screen text-foreground" dir="ltr">
      <a className="skip-link" href="#admin-main">
        Skip to content
      </a>
      <div
        className={cn(
          'mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[282px_minmax(0,1fr)]',
          isCompact && 'lg:grid-cols-[94px_minmax(0,1fr)]',
        )}
      >
        <AdminSidebar
          compact={isCompact}
          onCompactToggle={() => setCompact((current) => !current)}
          onLogout={handleLogout}
          userInitials={initials}
          userName={user?.name ?? 'Admin'}
        />

        <div className="min-w-0">
          <header className="rs-admin-header">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-[#fff6e4] text-[#9a5b00]">
                  RS Store V2
                </Badge>
                <span className="hidden text-xs font-extrabold text-muted-foreground sm:inline">
                  Admin console
                </span>
              </div>
              <h1 className="mt-1 truncate text-base font-black text-[#241611] sm:text-2xl">
                {pageTitle}
              </h1>
            </div>

            <div className="hidden min-w-[250px] items-center gap-2 rounded-full border border-[#efd6c5] bg-white/78 px-3 py-2 text-sm text-muted-foreground shadow-sm xl:flex">
              <Search className="h-4 w-4 text-[#c7831e]" aria-hidden="true" />
              <div className="flex gap-1 overflow-hidden">
                {ADMIN_QUICK_JUMP_LINKS.map((link) => (
                  <Link
                    key={link.to + link.labelEn}
                    to={link.to}
                    className="rounded-full px-2 py-1 font-bold transition hover:bg-[#fff6e4] hover:text-[#241611]"
                  >
                    {link.labelEn}
                  </Link>
                ))}
              </div>
            </div>

            <a
              href={PATHS.home}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center rounded-full border border-[#efd6c5] bg-white/80 px-3 sm:px-4 text-sm font-black text-[#241611] transition hover:bg-[#fff6e4] shrink-0"
            >
              <span className="hidden sm:inline">View store</span>
              <span className="sm:hidden">Store</span>
            </a>
          </header>

          <nav className="admin-mobile-tabs flex gap-2 overflow-x-auto px-3 py-3 lg:hidden">
            {ADMIN_NAV_LINKS.map((link) => (
              <AdminMobileNavLink key={link.to} link={link} />
            ))}
          </nav>

          <main id="admin-main" className="admin-main-content min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {isMobileOpen ? (
        <MobileDrawer
          onClose={() => setMobileOpen(false)}
          onLogout={handleLogout}
          userInitials={initials}
          userName={user?.name ?? 'Admin'}
        />
      ) : null}
    </div>
  );
}

function AdminSidebar({
  compact,
  onCompactToggle,
  onLogout,
  userInitials,
  userName,
}: {
  compact: boolean;
  onCompactToggle: () => void;
  onLogout: () => void;
  userInitials: string;
  userName: string;
}) {
  return (
    <aside className="admin-sidebar sticky top-0 hidden h-screen border-e border-white/10 p-4 text-white shadow-xl lg:block">
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={cn(
            'flex items-center gap-3 rounded-3xl bg-white/10 p-3 ring-1 ring-white/10',
            compact && 'justify-center',
          )}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm">
            <img src={logoUrl} alt="RS Store" className="h-full w-full object-contain" />
          </div>
          {!compact ? (
            <div className="min-w-0">
              <p className="truncate text-base font-black">RS Store</p>
              <p className="truncate text-xs text-white/60">Premium admin system</p>
            </div>
          ) : null}
        </div>

        <div className="premium-scrollbar mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pe-1">
          <SidebarGroup
            compact={compact}
            title="Overview"
            links={ADMIN_MANAGEMENT_LINKS}
          />
          <SidebarGroup
            compact={compact}
            title="Operations"
            links={ADMIN_OPERATIONS_LINKS}
          />
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onCompactToggle}
            aria-label={compact ? 'Expand menu' : 'Compact menu'}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            {!compact ? <span>Compact menu</span> : null}
          </button>
          <div className={cn('rounded-3xl bg-white/10 p-3 ring-1 ring-white/10', compact && 'p-2')}>
            <div className={cn('flex items-center gap-3', compact && 'justify-center')}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#241611]">
                {userInitials}
              </div>
              {!compact ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{userName}</p>
                  <p className="truncate text-xs text-white/60">Secure admin session</p>
                </div>
              ) : null}
            </div>
            {!compact ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full bg-white text-[#241611] hover:bg-white/90"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({
  title,
  links,
  compact,
}: {
  title: string;
  links: AdminNavLink[];
  compact: boolean;
}) {
  return (
    <div className="space-y-2">
      {!compact ? (
        <p className="px-3 text-xs font-black uppercase tracking-wider text-white/40">{title}</p>
      ) : null}
      {links.map((link) => (
        <SidebarLink key={link.to} link={link} compact={compact} />
      ))}
    </div>
  );
}

function SidebarLink({
  link,
  compact,
}: {
  link: AdminNavLink;
  compact: boolean;
}) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.to}
      end={link.end}
      title={link.labelEn}
      className={({ isActive }) =>
        cn(
          'group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition',
          isActive
            ? 'bg-white text-[#241611] shadow-sm'
            : 'text-white/72 hover:bg-white/10 hover:text-white',
          compact && 'justify-center px-2',
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!compact ? (
        <span className="min-w-0 flex-1 truncate">{link.labelEn}</span>
      ) : null}
      {!compact && link.badge ? (
        <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black text-emerald-100">
          {link.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

function AdminMobileNavLink({ link }: { link: AdminNavLink }) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        cn(
          'admin-mobile-tab inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition',
          isActive && 'is-active',
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {link.labelEn}
    </NavLink>
  );
}

function MobileDrawer({
  onClose,
  onLogout,
  userInitials,
  userName,
}: {
  onClose: () => void;
  onLogout: () => void;
  userInitials: string;
  userName: string;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        className="absolute inset-0 bg-black/55"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="admin-sidebar relative flex h-full w-[min(88vw,360px)] flex-col p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white p-1">
              <img src={logoUrl} alt="RS Store" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-black">RS Store</p>
              <p className="text-xs text-white/60">Admin system</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="premium-scrollbar mt-6 grid gap-2 overflow-y-auto">
          {ADMIN_NAV_LINKS.map((link) => (
            <MobileDrawerLink key={link.to} link={link} onClose={onClose} />
          ))}
          <a
            href={PATHS.home}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/20 px-3 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <span>View store</span>
          </a>
        </div>
        <div className="mt-auto rounded-3xl bg-white/10 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-[#241611]">
              {userInitials}
            </div>
            <div>
              <p className="text-sm font-bold">{userName}</p>
              <p className="text-xs text-white/60">Secure admin session</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full bg-white text-[#241611] hover:bg-white/90"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>
    </div>
  );
}

function MobileDrawerLink({
  link,
  onClose,
}: {
  link: AdminNavLink;
  onClose: () => void;
}) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition',
          isActive ? 'bg-white text-[#241611]' : 'text-white/75 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{link.labelEn}</span>
    </NavLink>
  );
}

function resolvePageTitle(pathname: string): string {
  const current = [...ADMIN_NAV_LINKS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((link) => pathname === link.to || (!link.end && pathname.startsWith(`${link.to}/`)));
  if (!current) return 'Store command center';
  return current.labelEn;
}

function buildInitials(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'RS'
  );
}