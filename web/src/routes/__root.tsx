import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ErrorFallback } from '@/components/shared/error-fallback'

function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a
        href="/app/dashboard"
        className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Back to Dashboard
      </a>
    </div>
  )
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <ErrorFallback error={error} resetError={reset} className="max-w-md w-full" />
    </div>
  )
}

export const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error, reset }) => (
    <RootErrorComponent error={error as Error} reset={reset} />
  ),
})
