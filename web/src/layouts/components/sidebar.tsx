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
  Shield,
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

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, labelKey: 'common.dashboard' },
  { to: '/app/journal', icon: BookOpen, labelKey: 'common.journal' },
  { to: '/app/my-timesheet', icon: Clock, labelKey: 'common.my_timesheet' },
  { to: '/app/org', icon: Building2, labelKey: 'common.org_structure' },
  { to: '/app/employees', icon: Users, labelKey: 'common.employees' },
  { to: '/app/projects', icon: FolderKanban, labelKey: 'common.projects' },
  { to: '/app/reports', icon: BarChart3, labelKey: 'common.reports' },
  { to: '/app/approvals', icon: CheckSquare, labelKey: 'approvals.title' },
  { to: '/app/control-sheet', icon: TableProperties, labelKey: 'common.control_sheet' },
  { to: '/app/leave', icon: Calendar, labelKey: 'leaves.title' },
  { to: '/app/notifications', icon: Bell, labelKey: 'common.notifications' },
  { to: '/app/settings', icon: Settings, labelKey: 'common.settings' },
  { to: '/app/hr', icon: Shield, labelKey: 'leaves.hr_module', permission: 'hr:read' },
  { to: '/app/ai-chat', icon: MessageSquare, labelKey: 'common.ai_chat', permission: 'ai-chat:read' },
] as const

export function AppSidebar() {
  const { t } = useTranslation()
  const isAiEnabled = import.meta.env.VITE_AI_ENABLED === 'true'
  const navItems = NAV_ITEMS.filter((item) => item.to !== '/app/ai-chat' || isAiEnabled)

  return (
    <Sidebar collapsible="icon">
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
