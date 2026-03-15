import { formatDistanceToNow } from "date-fns"
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  XCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM'

interface NotificationItemProps {
  id: number
  type: NotificationType
  message: string
  createdAt: string
  isRead: boolean
  onRead?: (id: number) => void
  className?: string
}

const typeConfig = {
  INFO: { icon: Info, color: "text-blue-700", bg: "bg-blue-500/10" },
  SUCCESS: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  WARNING: { icon: AlertCircle, color: "text-amber-700", bg: "bg-amber-500/10" },
  ERROR: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  SYSTEM: { icon: Bell, color: "text-primary", bg: "bg-primary/10" },
}

export function NotificationItem({
  id,
  type,
  message,
  createdAt,
  isRead,
  onRead,
  className,
}: NotificationItemProps) {
  const { icon: Icon, color, bg } = typeConfig[type]

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 border-b hover:bg-muted/30 transition-colors cursor-pointer relative",
        !isRead && "bg-primary/5",
        className
      )}
      onClick={() => onRead?.(id)}
    >
      {!isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
      )}
      <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("size-4", color)} />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", !isRead ? "font-semibold" : "text-muted-foreground")}>
          {message}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
        </div>
      </div>
      {!isRead && (
        <div className="size-2 bg-primary rounded-full shrink-0 mt-1.5" />
      )}
    </div>
  )
}
