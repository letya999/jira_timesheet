import { Link, useMatchRoute } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-store'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  permission?: string
}

export function NavItem({ to, icon: Icon, label, permission }: NavItemProps) {
  const permissions = useAuthStore((s) => s.permissions)
  const matchRoute = useMatchRoute()
  const isActive = !!matchRoute({ to, fuzzy: true })

  if (permission && !permissions.includes(permission)) {
    return null
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to}>
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
