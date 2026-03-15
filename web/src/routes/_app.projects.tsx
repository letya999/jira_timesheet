import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { projectsKeys } from '@/features/projects/hooks'
import { getProjectsApiV1ProjectsGet } from '@/api/generated/sdk.gen'

export const projectsRoute = createRoute({
  path: 'projects',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: projectsKeys.list(),
      queryFn: () => getProjectsApiV1ProjectsGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="text-muted-foreground">Project list placeholder — Phase 6</p>
    </div>
  ),
})
