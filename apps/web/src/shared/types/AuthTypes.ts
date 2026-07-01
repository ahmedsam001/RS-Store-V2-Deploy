export type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  language: string;
  role: UserRole;
};

export type AuthResponse = {
  ok: true;
  csrfToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type AuthMeResponse = {
  ok: true;
  csrfToken: string | null;
  user: AuthUser | null;
};

export type AuthLookupResponse = {
  ok: true;
  role: 'admin' | 'customer' | 'new';
  exists: boolean;
  requiresPassword: boolean;
  requiresProfile: boolean;
  hasProfile: boolean;
  phone: string;
};

export type CustomerLoginInput = {
  phone: string;
  name?: string;
  address?: string;
  language?: string;
  rememberMe?: boolean;
};

export type AdminLoginInput = {
  phone: string;
  password: string;
  rememberMe?: boolean;
};

export type ProfileUpdateInput = {
  name?: string;
  phone?: string;
  address?: string;
  language?: string;
  currentPassword?: string;
  newPassword?: string;
};

export type SessionListItem = {
  id: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  lastSeenAt: string | null;
  createdAt: string;
  isCurrent: boolean;
};
