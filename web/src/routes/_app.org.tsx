import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';

export const orgRoute = createRoute({
  path: 'org',
  getParentRoute: () => appLayoutRoute,
  component: lazyRouteComponent(() => import('@/features/org/pages/org-page')),
});
