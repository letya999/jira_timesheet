import { useMemo, useState } from 'react'
import {
  useMarkAllRead,
  useMarkAsRead,
  useNotifications,
} from '@/features/notifications/hooks'
import type { NotificationResponse } from '@/api/generated/types.gen'
import { NotificationItem, type NotificationType } from '@/components/shared/notification-item'
import { CardList } from '@/components/shared/card-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

function toNotificationType(type?: string): NotificationType {
  const normalized = (type ?? 'SYSTEM').toUpperCase()
  if (normalized === 'INFO') return 'INFO'
  if (normalized === 'SUCCESS') return 'SUCCESS'
  if (normalized === 'WARNING') return 'WARNING'
  if (normalized === 'ERROR') return 'ERROR'
  return 'SYSTEM'
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: notifications = [], isLoading } = useNotifications({ page: 1, size: 100 })
  const markAsRead = useMarkAsRead()
  const markAllRead = useMarkAllRead()

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  )

  const visibleNotifications = useMemo(
    () => (unreadOnly ? notifications.filter((item) => !item.is_read) : notifications),
    [notifications, unreadOnly],
  )

  const handleMarkRead = async (notification: NotificationResponse) => {
    if (notification.is_read) return
    await markAsRead.mutateAsync(notification.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground">
            {t('notifications.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? t('web.notifications.show_all') : t('web.notifications.show_unread')}
          </Button>
          <Button
            variant="outline"
            onClick={() => void markAllRead.mutateAsync()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            {t('notifications.mark_all_read')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('web.notifications.inbox_count', { count: visibleNotifications.length })}
            {unreadCount > 0 ? ` • ${t('web.notifications.unread_count', { count: unreadCount })}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <CardList
            items={visibleNotifications}
            renderItem={(item) => (
              <NotificationItem
                key={item.id}
                id={item.id}
                type={toNotificationType(item.type)}
                message={item.message}
                createdAt={item.created_at}
                isRead={item.is_read ?? false}
                onRead={() => void handleMarkRead(item)}
              />
            )}
            isLoading={isLoading}
            isFetching={markAsRead.isPending || markAllRead.isPending}
            showPagination={false}
            emptyMessage={t('notifications.no_notifications')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
