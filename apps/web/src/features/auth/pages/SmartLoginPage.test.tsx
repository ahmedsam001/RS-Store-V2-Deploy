import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/auth-api';
import { SmartLoginPage } from '@/features/auth/pages/SmartLoginPage';
import { renderWithRouter } from '@/test/test-utils';

const authMocks = vi.hoisted(() => ({
  adminLogin: vi.fn(async () => undefined),
  customerLogin: vi.fn(async () => undefined),
  refreshCart: vi.fn(async () => undefined),
}));

vi.mock('@/features/auth/auth-api', () => ({
  authApi: {
    lookup: vi.fn(),
  },
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    adminLogin: authMocks.adminLogin,
    customerLogin: authMocks.customerLogin,
  }),
}));

vi.mock('@/features/cart', () => ({
  useCart: () => ({ refresh: authMocks.refreshCart }),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('SmartLoginPage phone-first flow', () => {
  beforeEach(() => {
    vi.mocked(authApi.lookup).mockReset();
    authMocks.adminLogin.mockClear();
    authMocks.customerLogin.mockClear();
    authMocks.refreshCart.mockClear();
  });

  it('shows only phone input first', () => {
    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login' },
    );

    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery Address/i)).not.toBeInTheDocument();
  });

  it('opens password step for admin phone and redirects to dashboard', async () => {
    vi.mocked(authApi.lookup).mockResolvedValueOnce({
      ok: true,
      role: 'admin',
      exists: true,
      requiresPassword: true,
      requiresProfile: false,
      hasProfile: true,
      phone: '01000000000',
    });

    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login' },
    );

    await userEvent.type(screen.getByLabelText(/Phone Number/i), '+201000000000');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue('01000000000');
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Password/i), 'admin-password');
    await userEvent.click(screen.getByRole('button', { name: /Admin Login/i }));

    await waitFor(() => {
      expect(authMocks.adminLogin).toHaveBeenCalledWith({
        phone: '01000000000',
        password: 'admin-password',
        rememberMe: false,
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/admin');
    });
  });

  it('logs existing customer in immediately and preserves returnTo', async () => {
    vi.mocked(authApi.lookup).mockResolvedValueOnce({
      ok: true,
      role: 'customer',
      exists: true,
      requiresPassword: false,
      requiresProfile: false,
      hasProfile: true,
      phone: '01000000000',
    });

    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login?returnTo=%2Fcheckout' },
    );

    await userEvent.type(screen.getByLabelText(/Phone Number/i), '01000000000');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(authMocks.customerLogin).toHaveBeenCalledWith({ phone: '01000000000' });
      expect(screen.getByTestId('location')).toHaveTextContent('/checkout');
    });
  });

  it('logs existing customer in to profile when returnTo is missing', async () => {
    vi.mocked(authApi.lookup).mockResolvedValueOnce({
      ok: true,
      role: 'customer',
      exists: true,
      requiresPassword: false,
      requiresProfile: false,
      hasProfile: true,
      phone: '01000000000',
    });

    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login' },
    );

    await userEvent.type(screen.getByLabelText(/Phone Number/i), '01000000000');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    });
  });

  it('opens registration fields for a new phone and creates customer', async () => {
    vi.mocked(authApi.lookup).mockResolvedValueOnce({
      ok: true,
      role: 'new',
      exists: false,
      requiresPassword: false,
      requiresProfile: true,
      hasProfile: false,
      phone: '01000000000',
    });

    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login' },
    );

    await userEvent.type(screen.getByLabelText(/Phone Number/i), '+201000000000');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue('01000000000');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Customer Name');
    await userEvent.type(screen.getByLabelText(/Delivery Address/i), 'Cairo address');
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authMocks.customerLogin).toHaveBeenCalledWith({
        phone: '01000000000',
        name: 'Customer Name',
        address: 'Cairo address',
        rememberMe: false,
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    });
  });

  it('allows going back to edit phone', async () => {
    vi.mocked(authApi.lookup).mockResolvedValueOnce({
      ok: true,
      role: 'admin',
      exists: true,
      requiresPassword: true,
      requiresProfile: false,
      hasProfile: true,
      phone: '01000000000',
    });

    renderWithRouter(
      <>
        <SmartLoginPage />
        <LocationProbe />
      </>,
      { route: '/login' },
    );

    await userEvent.type(screen.getByLabelText(/Phone Number/i), '01000000000');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Edit/i }));

    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
  });
});
