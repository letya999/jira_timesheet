import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { projectsKeys } from '@/features/projects/hooks'
import { getProjectsApiV1ProjectsGet } from '@/api/generated/sdk.gen'

export const projectDetailRoute = createRoute({
  path: 'projects/$id',
  getParentRoute: () => appLayoutRoute,
  loader: ({ params }) =>
    queryClient.prefetchQuery({
      queryKey: projectsKeys.detail(Number(params.id)),
      queryFn: () => getProjectsApiV1ProjectsGet({ query: { limit: 1 } }).then((r) => r.data),
    }).catch(() => null),
  component: function ProjectDetailPage() {
    const { id } = projectDetailRoute.useParams()
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Project #{id}</h1>
        <p className="text-muted-foreground">Project detail placeholder — Phase 6</p>
      </div>
    )
  },
})
