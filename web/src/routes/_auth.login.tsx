/* eslint-disable react-refresh/only-export-components */
import { createRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authLayoutRoute } from './_auth'
import { LoginForm } from '@/features/auth/components/login-form'
import { setStoredToken } from '@/api/client'
import { readUsersMeApiV1UsersMeGet } from '@/api/generated/sdk.gen'
import { useAuthStore } from '@/stores/auth-store'
import type { UserProfile } from '@/stores/auth-store'
import { buildPermissionsFromRoles } from '@/lib/permissions'

function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [isProcessingToken, setIsProcessingToken] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) return

    const nextPath = params.get('next') || '/app/dashboard'
    setIsProcessingToken(true)

    ;(async () => {
      try {
        setStoredToken(token)
        const me = await readUsersMeApiV1UsersMeGet({ throwOnError: true })
        const user = me.data as UserProfile & { role?: string }
        const permissions = buildPermissionsFromRoles(user?.role ? [user.role] : [])
        setAuth(user, token, permissions)
        window.location.assign(nextPath.startsWith('/') ? nextPath : '/app/dashboard')
      } catch {
        setIsProcessingToken(false)
      }
    })()
  }, [setAuth])

  if (isProcessingToken) {
    return <div className="text-sm text-muted-foreground">Signing in...</div>
  }

  return (
    <LoginForm onSuccess={() => router.navigate({ to: '/app/dashboard' })} />
  )
}

export const loginRoute = createRoute({
  path: '/login',
  getParentRoute: () => authLayoutRoute,
  component: LoginPage,
})
