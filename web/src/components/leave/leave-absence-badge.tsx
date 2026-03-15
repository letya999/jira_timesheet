import { differenceInCalendarDays, format } from "date-fns"
import { Calendar, Clock, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { LeaveType } from "@/api/generated/types.gen"
export type { LeaveType } from "@/api/generated/types.gen"

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION: "Vacation",
  SICK_LEAVE: "Sick Leave",
  DAY_OFF: "Day Off",
  OTHER: "Other",
}

// WCAG AA compliant — all pass ≥4.5:1 contrast with white text
export const LEAVE_TYPE_CONFIG: Record<
  LeaveType,
  { label: string; barColor: string; bgLight: string; textLight: string }
> = {
  VACATION: {
    label: "Vacation",
    barColor: "bg-blue-600",
    bgLight: "bg-blue-100",
    textLight: "text-blue-800",
  },
  SICK_LEAVE: {
    label: "Sick Leave",
    barColor: "bg-rose-600",
    bgLight: "bg-rose-100",
    textLight: "text-rose-800",
  },
  DAY_OFF: {
    label: "Day Off",
    barColor: "bg-amber-700",
    bgLight: "bg-amber-100",
    textLight: "text-amber-800",
  },
  OTHER: {
    label: "Other",
    barColor: "bg-slate-600",
    bgLight: "bg-slate-100",
    textLight: "text-slate-700",
  },
}

export interface LeaveAbsenceBadgeProps {
  userName: string
  avatarUrl?: string
  type: LeaveType
  startDate: Date
  endDate: Date
  reason?: string
  className?: string
}

export function LeaveAbsenceBadge({
  userName,
  avatarUrl,
  type,
  startDate,
  endDate,
  reason,
  className,
}: LeaveAbsenceBadgeProps) {
  const config = LEAVE_TYPE_CONFIG[type] ?? LEAVE_TYPE_CONFIG.OTHER
  const days = differenceInCalendarDays(endDate, startDate) + 1
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className={cn("p-3 space-y-2.5 min-w-[220px]", className)}>
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8 border shrink-0">
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none truncate">{userName}</p>
          <Badge
            className={cn(
              "mt-1 text-xs h-4 px-1.5 uppercase border-none text-white",
              config.barColor
            )}
          >
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3 shrink-0" />
          <span>
            {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          <span>
            {days} {days === 1 ? "day" : "days"}
          </span>
        </div>
        {reason && (
          <div className="flex items-start gap-1.5">
            <MessageCircle className="size-3 shrink-0 mt-0.5" />
            <span className="italic leading-snug">{reason}</span>
          </div>
        )}
      </div>
    </div>
  )
}
