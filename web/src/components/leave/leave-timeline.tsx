import * as React from "react"
import {
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWeekend,
  isSameDay,
  addMonths,
  addQuarters,
  addYears,
  isWithinInterval,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LeaveAbsenceBadge, LeaveType } from "./leave-absence-badge"
import { Typography } from "@/components/ui/typography"

export type TimelineView = "day" | "week" | "month" | "quarter" | "year"

export interface LeaveTimelineEntry {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  type: LeaveType
  startDate: Date
  endDate: Date
  reason?: string
}

export interface LeaveTimelineUser {
  id: string
  name: string
  avatarUrl?: string
}

export interface LeaveTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  view: TimelineView
  startDate: Date
  users: LeaveTimelineUser[]
  entries: LeaveTimelineEntry[]
}

export function LeaveTimeline({
  view,
  startDate,
  users,
  entries,
  className,
  ...props
}: LeaveTimelineProps) {
  const getInterval = () => {
    switch (view) {
      case "day":
        return { start: startDate, end: startDate }
      case "week":
        return { start: startOfWeek(startDate, { weekStartsOn: 1 }), end: endOfWeek(startDate, { weekStartsOn: 1 }) }
      case "month":
        return { start: startOfMonth(startDate), end: endOfMonth(startDate) }
      case "quarter":
        return { start: startOfQuarter(startDate), end: endOfQuarter(startDate) }
      case "year":
        return { start: startOfYear(startDate), end: endOfYear(startDate) }
    }
  }

  const interval = getInterval()

  // For "day" view, show a simple list
  if (view === "day") {
    const awayToday = entries.filter((e) =>
      isWithinInterval(startDate, { start: e.startDate, end: e.endDate })
    )

    return (
      <div className={cn("space-y-4", className)} {...props}>
        <Typography variant="h4">{format(startDate, "MMMM d, yyyy")}</Typography>
        {awayToday.length === 0 ? (
          <Typography className="text-muted-foreground">Everyone is present today.</Typography>
        ) : (
          <div className="grid gap-2">
            {awayToday.map((entry) => (
              <LeaveAbsenceBadge
                key={entry.id}
                userName={entry.userName}
                avatarUrl={entry.userAvatar}
                type={entry.type}
                startDate={entry.startDate}
                endDate={entry.endDate}
                reason={entry.reason}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Horizontal Timeline for other views
  const timeUnits = eachDayOfInterval(interval)
  
  // Custom grouping for quarter/year to keep it readable
  // For quarter we show 2-week blocks or weeks. Let's do weeks for simplicity in render.
  const isLargeView = view === "quarter" || view === "year"

  return (
    <div className={cn("w-full overflow-x-auto border rounded-lg", className)} {...props}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 p-2 bg-muted/50 border-r min-w-[180px] text-left">
              <Typography variant="small" className="font-bold">Team Member</Typography>
            </th>
            {timeUnits.map((date) => {
              const weekend = isWeekend(date)
              // Only show all days for week/month. For quarter/year, maybe just ticks?
              // But requirements said "with start/end dates for weeks in quarter". 
              // Let's implement a simplified grid first.
              return (
                <th
                  key={date.toISOString()}
                  className={cn(
                    "p-1 border-r min-w-[32px] text-[10px] font-medium",
                    weekend && "bg-muted/30"
                  )}
                >
                  <div className="flex flex-col items-center">
                    <span>{format(date, "d")}</span>
                    {view === "week" && <span>{format(date, "EE")}</span>}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-muted/20">
              <td className="sticky left-0 z-10 p-2 bg-background border-r flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Typography variant="small" className="font-medium truncate max-w-[120px]">
                  {user.name}
                </Typography>
              </td>
              {timeUnits.map((date) => {
                const weekend = isWeekend(date)
                const entry = entries.find(
                  (e) => e.userId === user.id && isWithinInterval(date, { start: e.startDate, end: e.endDate })
                )

                return (
                  <td
                    key={date.toISOString()}
                    className={cn("p-0 border-r relative h-10", weekend && "bg-muted/10")}
                  >
                    {entry && isSameDay(date, entry.startDate) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            className={cn(
                              "absolute inset-y-1 left-0 z-20 rounded-md cursor-pointer hover:brightness-90 transition-all shadow-sm",
                              entry.type === "vacation" ? "bg-blue-500" : 
                              entry.type === "sick" ? "bg-red-500" : 
                              entry.type === "personal" ? "bg-amber-500" : "bg-slate-500"
                            )}
                            style={{
                              width: `calc(${eachDayOfInterval({ 
                                start: entry.startDate > interval.start ? entry.startDate : interval.start, 
                                end: entry.endDate < interval.end ? entry.endDate : interval.end 
                              }).length * 100}% + ${eachDayOfInterval({ 
                                start: entry.startDate > interval.start ? entry.startDate : interval.start, 
                                end: entry.endDate < interval.end ? entry.endDate : interval.end 
                              }).length - 1}px)`
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="p-0 border-none w-auto" side="top">
                          <LeaveAbsenceBadge
                            userName={entry.userName}
                            avatarUrl={entry.userAvatar}
                            type={entry.type}
                            startDate={entry.startDate}
                            endDate={entry.endDate}
                            reason={entry.reason}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
