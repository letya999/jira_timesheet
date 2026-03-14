import * as React from "react"
import { format } from "date-fns"
import { Calendar, User, Clock, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export type LeaveType = "vacation" | "sick" | "personal" | "other"

export interface LeaveAbsenceBadgeProps {
  userName: string
  avatarUrl?: string
  type: LeaveType
  startDate: Date
  endDate: Date
  reason?: string
  className?: string
}

const typeConfig: Record<LeaveType, { label: string; color: string }> = {
  vacation: { label: "Vacation", color: "bg-blue-500" },
  sick: { label: "Sick Leave", color: "bg-red-500" },
  personal: { label: "Personal", color: "bg-amber-500" },
  other: { label: "Other", color: "bg-slate-500" },
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
  const config = typeConfig[type]

  return (
    <Card className={cn("w-72 shadow-lg border-muted", className)}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="size-10 border">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <CardTitle className="text-sm font-bold">{userName}</CardTitle>
          <Badge variant="outline" className={cn("w-fit mt-1 text-[10px] uppercase", config.color, "text-white border-none")}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 pt-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3" />
          <span>
            {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          </span>
        </div>
        {reason && (
          <div className="flex items-start gap-2 mt-1 italic text-muted-foreground">
            <Tag className="size-3 mt-0.5" />
            <span>{reason}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
