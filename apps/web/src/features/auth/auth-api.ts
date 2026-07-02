import { apiRequest } from '@/shared/api/http-client';
import type {
  AdminLoginInput,
  AuthLookupResponse,
  AuthMeResponse,
  AuthResponse,
  CustomerLoginInput,
  ProfileUpdateInput,
  SessionListItem,
} from '@/shared/types/AuthTypes';

export const authApi = {
  me: () => apiRequest<AuthMeResponse>('/auth/me', { cache: 'no-store' }),

  lookup: (phone: string) =>
    apiRequest<AuthLookupResponse>('/auth/lookup', { method: 'POST', body: { phone } }),

  customerLogin: (input: CustomerLoginInput) =>
    apiRequest<AuthResponse>('/auth/customer/login', {
      method: 'POST',
      body: input,
      cache: 'no-store',
    }),

  adminLogin: (input: AdminLoginInput) =>
    apiRequest<AuthResponse>('/auth/admin/login', {
      method: 'POST',
      body: input,
      cache: 'no-store',
    }),

  logout: (csrfToken: string | null, allDevices = false) =>
    apiRequest<{ ok: true }>('/auth/logout', {
      method: 'POST',
      body: { allDevices },
      csrfToken,
      cache: 'no-store',
    }),

  updateProfile: (input: ProfileUpdateInput, csrfToken: string | null) =>
    apiRequest<{ ok: true; user: AuthResponse['user'] }>('/auth/profile', {
      method: 'PATCH',
      body: input,
      csrfToken,
      cache: 'no-store',
    }),

  sessions: () => apiRequest<{ ok: true; sessions: SessionListItem[] }>('/auth/sessions'),

  revokeSession: (sessionId: string, csrfToken: string | null) =>
    apiRequest<{ ok: true }>(`/auth/sessions/${sessionId}`, { method: 'DELETE', csrfToken }),
};
