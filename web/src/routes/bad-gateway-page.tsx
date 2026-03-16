import { Link } from '@tanstack/react-router'

export function BadGatewayPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">502</h1>
      <p className="text-lg font-medium">Bad Gateway</p>
      <p className="max-w-lg text-sm text-muted-foreground">
        Upstream service is unavailable or returned an invalid response. Please try again in a
        few moments.
      </p>
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Retry
        </button>
        <Link to="/app/dashboard" className="text-primary underline underline-offset-4">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
