import { createRoute } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';
import { ProjectDetailPage } from '@/features/projects/pages/project-detail-page';

export const projectDetailRoute = createRoute({
  path: 'projects/$id',
  getParentRoute: () => appLayoutRoute,
  component: function ProjectDetail() {
    const { id } = projectDetailRoute.useParams();
    return <ProjectDetailPage projectId={Number(id)} />;
  },
});
