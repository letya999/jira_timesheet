import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';

export const projectsRoute = createRoute({
  path: 'projects',
  getParentRoute: () => appLayoutRoute,
  component: lazyRouteComponent(() => import('@/features/projects/pages/projects-page')),
});
