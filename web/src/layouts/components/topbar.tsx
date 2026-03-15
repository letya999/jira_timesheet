import { Bell, LogOut } from 'lucide-react'
import { Link, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { useCurrentUser, useLogout } from '@/features/auth/hooks'
import { useNotificationStats } from '@/features/notifications/hooks'

export function Topbar() {
  const { data: user } = useCurrentUser()
  const { mutate: logout } = useLogout()
  const router = useRouter()
  const { data: notificationStats } = useNotificationStats()
  const unreadCount = notificationStats?.unread_count ?? 0

  const userInitials =
    user?.display_name?.slice(0, 2).toUpperCase() ??
    user?.username?.slice(0, 2).toUpperCase() ??
    'U'

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => router.navigate({ to: '/login' }),
    })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher variant="compact" />
        <Button variant="ghost" size="icon" asChild className="relative">
          <Link to="/app/notifications">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center p-0 text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar size="sm">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.display_name ?? user?.username ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <ThemeSwitcher />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
