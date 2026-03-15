import { Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useUIStore } from '@/stores/ui-store'
import { AppSidebar } from './components/sidebar'
import { Topbar } from './components/topbar'

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

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
