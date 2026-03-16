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
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavItem } from './nav-item'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/journal', icon: BookOpen, label: 'Journal' },
  { to: '/app/my-timesheet', icon: Clock, label: 'My Timesheet' },
  { to: '/app/org', icon: Building2, label: 'Organisation' },
  { to: '/app/employees', icon: Users, label: 'Employees' },
  { to: '/app/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/app/reports', icon: BarChart3, label: 'Reports' },
  { to: '/app/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/app/control-sheet', icon: TableProperties, label: 'Control Sheet' },
  { to: '/app/leave', icon: Calendar, label: 'Leave' },
  { to: '/app/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
  { to: '/app/hr', icon: Shield, label: 'HR', permission: 'hr:read' },
  { to: '/app/ai-chat', icon: MessageSquare, label: 'AI Chat', permission: 'ai-chat:read' },
] as const

export function AppSidebar() {
  const isAiEnabled = import.meta.env.VITE_AI_ENABLED === 'true'
  const navItems = NAV_ITEMS.filter((item) => item.to !== '/app/ai-chat' || isAiEnabled)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            JT
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Jira Timesheet
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
