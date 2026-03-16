import { useRouter, Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useUIStore } from '@/stores/ui-store'
import { useInactivityTimer, useLogout } from '@/features/auth/hooks'
import { toast } from '@/lib/toast'
import { AppSidebar } from './components/sidebar'
import { Topbar } from './components/topbar'
import { useTranslation } from 'react-i18next'

const WARN_MS = 25 * 60 * 1000
const TIMEOUT_MS = 30 * 60 * 1000

export function AppLayout() {
  const { t } = useTranslation()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const { mutate: logout } = useLogout()
  const router = useRouter()

  useInactivityTimer({
    timeoutMs: TIMEOUT_MS,
    warnMs: WARN_MS,
    onWarn: () => {
      toast.warning(t('web.app.inactivity_warning'))
    },
    onTimeout: () => {
      logout(undefined, {
        onSuccess: () => router.navigate({ to: '/login' }),
      })
    },
  })

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
