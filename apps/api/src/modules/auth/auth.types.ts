import { UserRole } from '@prisma/client';

export type AuthUserResponse = {
  id: string;
  name: string;
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
  user: AuthUserResponse;
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

export type AuthMeResponse = {
  ok: true;
  csrfToken: string | null;
  user: AuthUserResponse | null;
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
