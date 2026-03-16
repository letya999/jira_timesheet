import { useRouter } from '@tanstack/react-router'
import { useCurrentUser, useLogout } from '@/features/auth/hooks'
import { useNotificationStats } from '@/features/notifications/hooks'
import { AppHeader } from './app-header'
import { useTranslation } from 'react-i18next'

export function Topbar() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const { mutate: logout } = useLogout()
  const router = useRouter()
  const { data: notificationStats } = useNotificationStats()
  const unreadCount = notificationStats?.unread_count ?? 0

  const userInitials =
    user?.display_name?.slice(0, 2).toUpperCase() ??
    user?.email?.slice(0, 2).toUpperCase() ??
    'U'

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => router.navigate({ to: '/login' }),
    })
  }

  return (
    <AppHeader
      userName={user?.display_name ?? user?.email ?? t('common.user')}
      userEmail={user?.email}
      userInitials={userInitials}
      unreadCount={unreadCount}
      onOpenNotifications={() => router.navigate({ to: '/app/notifications' })}
      onLogout={handleLogout}
    />
  )
}
