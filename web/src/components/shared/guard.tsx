import type { ReactNode } from 'react';
import { usePermissions } from '@/features/auth/hooks';

interface GuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the current user has the required permission.
 * Renders `fallback` (default: null) when the permission is missing.
 */
export function Guard({ permission, children, fallback = null }: GuardProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
