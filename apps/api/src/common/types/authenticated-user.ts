import { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  sessionId: string;
};
