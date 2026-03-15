import { createRoute } from '@tanstack/react-router'
import { authLayoutRoute } from './_auth'

function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="text-sm text-muted-foreground">to your account</p>
      </div>
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Login form — Phase 6
      </div>
    </div>
  )
}

export const loginRoute = createRoute({
  path: '/login',
  getParentRoute: () => authLayoutRoute,
  component: LoginPage,
})
