/* eslint-disable react-refresh/only-export-components */
import { createRoute, useRouter } from '@tanstack/react-router'
import { authLayoutRoute } from './_auth'
import { LoginForm } from '@/features/auth/components/login-form'

function LoginPage() {
  const router = useRouter()

  return (
    <LoginForm onSuccess={() => router.navigate({ to: '/app/dashboard' })} />
  )
}

export const loginRoute = createRoute({
  path: '/login',
  getParentRoute: () => authLayoutRoute,
  component: LoginPage,
})
