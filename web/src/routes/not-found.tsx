import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { RootNotFoundPage } from './root-not-found-page'

export const notFoundRoute = createRoute({
  path: '/404',
  getParentRoute: () => rootRoute,
  component: RootNotFoundPage,
})
