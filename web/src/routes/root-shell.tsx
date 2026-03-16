import { useEffect } from 'react'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

export function RootShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (pathname !== '/') return

    void router.navigate({
      to: isAuthenticated ? '/app/dashboard' : '/login',
      replace: true,
    })
  }, [pathname, isAuthenticated, router])

  if (pathname === '/') {
    return null
  }

  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
