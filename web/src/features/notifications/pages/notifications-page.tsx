import { useMemo, useState } from 'react'
import {
  useMarkAllRead,
  useMarkAsRead,
  useNotifications,
} from '@/features/notifications/hooks'
import type { NotificationResponse } from '@/api/generated/types.gen'
import { NotificationItem, type NotificationType } from '@/components/shared/notification-item'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Loader2 } from 'lucide-react'

function toNotificationType(type?: string): NotificationType {
  const normalized = (type ?? 'SYSTEM').toUpperCase()
  if (normalized === 'INFO') return 'INFO'
  if (normalized === 'SUCCESS') return 'SUCCESS'
  if (normalized === 'WARNING') return 'WARNING'
  if (normalized === 'ERROR') return 'ERROR'
  return 'SYSTEM'
}

export default function NotificationsPage() {
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
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Review updates from approvals, leave workflow, and integrations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? 'Show all' : 'Show unread'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void markAllRead.mutateAsync()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Inbox ({visibleNotifications.length})
            {unreadCount > 0 ? ` • ${unreadCount} unread` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're up to date."
              className="py-16"
            />
          ) : (
            <div>
              {visibleNotifications.map((item) => (
                <NotificationItem
                  key={item.id}
                  id={item.id}
                  type={toNotificationType(item.type)}
                  message={item.message}
                  createdAt={item.created_at}
                  isRead={item.is_read ?? false}
                  onRead={() => void handleMarkRead(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
