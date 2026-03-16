import { createRootRoute } from '@tanstack/react-router'
import { RootNotFoundPage } from './root-not-found-page'
import { RootErrorComponent } from './root-error-component'
import { RootShell } from './root-shell'

export const rootRoute = createRootRoute({
  component: RootShell,
  notFoundComponent: RootNotFoundPage,
  errorComponent: ({ error, reset }) => (
    <RootErrorComponent error={error as Error} reset={reset} />
  ),
})
