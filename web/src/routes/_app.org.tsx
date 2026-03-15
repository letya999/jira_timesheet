import { createRoute } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';
import { OrgPage } from '@/features/org/pages/org-page';

export const orgRoute = createRoute({
  path: 'org',
  getParentRoute: () => appLayoutRoute,
  component: () => <OrgPage />,
});
