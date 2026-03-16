import { Link } from '@tanstack/react-router'

export function RootNotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        to="/app/dashboard"
        className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
