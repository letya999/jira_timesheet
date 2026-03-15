import { createRoute } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';
import { ProjectsPage } from '@/features/projects/pages/projects-page';

export const projectsRoute = createRoute({
  path: 'projects',
  getParentRoute: () => appLayoutRoute,
  component: () => <ProjectsPage />,
});
