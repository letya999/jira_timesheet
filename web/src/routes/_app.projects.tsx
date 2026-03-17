import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessManagerPages } from '@/lib/rbac';

export const projectsRoute = createRoute({
  path: 'projects',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const role = (useAuthStore.getState().user as { role?: string } | null)?.role;
    if (!canAccessManagerPages(role)) {
      throw redirect({ to: '/app/my-timesheet' });
    }
  },
  component: lazyRouteComponent(
    () => import('@/features/projects/pages/projects-page'),
    'ProjectsPage',
  ),
});
