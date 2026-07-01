import { Request } from 'express';
import type { AuthSessionRecord } from '../../modules/auth/services/auth-session.service';
import { AuthenticatedUser } from './authenticated-user';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  authSession?: AuthSessionRecord;
};
