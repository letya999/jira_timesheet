import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  TableProperties,
  Users,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavItem } from './nav-item'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { canAccessManagerPages } from '@/lib/rbac'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, labelKey: 'common.dashboard', managerOnly: true },
  { to: '/app/journal', icon: BookOpen, labelKey: 'common.journal', managerOnly: true },
  { to: '/app/my-timesheet', icon: Clock, labelKey: 'common.my_timesheet' },
  { to: '/app/org', icon: Building2, labelKey: 'common.org_structure' },
  { to: '/app/employees', icon: Users, labelKey: 'common.employees' },
  { to: '/app/projects', icon: FolderKanban, labelKey: 'common.projects', managerOnly: true },
  { to: '/app/reports', icon: BarChart3, labelKey: 'common.reports', managerOnly: true },
  { to: '/app/approvals', icon: CheckSquare, labelKey: 'approvals.title', managerOnly: true },
  { to: '/app/control-sheet', icon: TableProperties, labelKey: 'common.control_sheet', managerOnly: true },
  { to: '/app/leave', icon: Calendar, labelKey: 'leaves.title' },
  { to: '/app/notifications', icon: Bell, labelKey: 'common.notifications' },
  { to: '/app/settings', icon: Settings, labelKey: 'common.settings' },
  { to: '/app/ai-chat', icon: MessageSquare, labelKey: 'common.ai_chat', permission: 'ai-chat:read' },
] as const

export function AppSidebar() {
  const { t } = useTranslation()
  const userRole = useAuthStore((s) => (s.user as { role?: string } | null)?.role)
  const isAiEnabled = import.meta.env.VITE_AI_ENABLED === 'true'
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.to === '/app/ai-chat' && !isAiEnabled) return false
    if (item.managerOnly && !canAccessManagerPages(userRole)) return false
    return true
  })

  return (
    <Sidebar collapsible="icon" className="border-r dark:bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('web.sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ labelKey, ...item }) => (
                <NavItem key={item.to} {...item} label={t(labelKey)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
