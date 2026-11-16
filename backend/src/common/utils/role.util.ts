import { UserRole } from '../enums/user-role.enum';

type UserContext = { userId?: string; role?: UserRole | string; };

export function isModerator(user?: UserContext): boolean {
  return (
    user?.role === UserRole.MODERATOR || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN
  );
}

export function isSuperAdmin(user?: UserContext): boolean {
  return (user?.role === UserRole.SUPER_ADMIN);
}

export function isAdmin(user?: UserContext): boolean {
  return (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN);
}
