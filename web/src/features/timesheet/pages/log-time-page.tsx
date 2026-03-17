import { useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { LoginForm } from '@/features/auth/components/login-form'
import { useCurrentUser, useLogout } from '@/features/auth/hooks'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogTimeForm } from '@/features/timesheet/components/log-time-form'
import { useTranslation } from 'react-i18next'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { Languages } from 'lucide-react'

export default function LogTimePage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: currentUser } = useCurrentUser()
  const { mutate: logout } = useLogout()

  if (!isAuthenticated) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-sm">
          <Card>
            <CardContent className="pt-6">
              <LoginForm onSuccess={() => router.navigate({ to: '/log-time' })} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const userInitials =
    currentUser?.display_name?.slice(0, 2).toUpperCase() ??
    currentUser?.email?.slice(0, 2).toUpperCase() ??
    'U'

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => router.navigate({ to: '/log-time' }),
    })
  }

  return (
    <div className="min-h-svh bg-muted/20 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-4xl justify-end gap-2">
        <Button variant="outline" onClick={() => router.navigate({ to: '/app/my-timesheet' })}>
          {t('web.timesheet.go_to_app', { defaultValue: 'Open app' })}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={t('web.header.open_profile_menu')}
            >
              <Avatar size="sm">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{currentUser?.display_name ?? currentUser?.email ?? t('common.user')}</p>
              {currentUser?.email && <p className="text-xs text-muted-foreground">{currentUser.email}</p>}
            </div>
            <DropdownMenuSeparator />
            <ThemeSwitcher />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => i18n.changeLanguage('en')}>
              <Languages className="mr-2 size-4" />
              {t('web.language.english')}
              {i18n.language?.startsWith('en') ? <span className="ml-auto text-xs">v</span> : null}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('ru')}>
              <Languages className="mr-2 size-4" />
              {t('web.language.russian')}
              {i18n.language?.startsWith('ru') ? <span className="ml-auto text-xs">v</span> : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="mx-auto mt-4 w-full max-w-4xl">
        <CardHeader>
          <CardTitle>{t('web.timesheet.log_time')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LogTimeForm />
        </CardContent>
      </Card>
    </div>
  )
}
