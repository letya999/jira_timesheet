import * as React from "react"
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  getISOWeek,
  isAfter,
  isBefore,
  isToday,
  isWeekend,
  isWithinInterval,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns"
import type { LeaveStatus } from "@/api/generated/types.gen"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LeaveAbsenceBadge, LEAVE_TYPE_CONFIG, LeaveType } from "./leave-absence-badge"

export type TimelineView = "day" | "week" | "month" | "quarter" | "year"

export interface LeaveTimelineEntry {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  type: LeaveType
  status?: LeaveStatus
  startDate: Date
  endDate: Date
  reason?: string
}

export interface LeaveTimelineUser {
  id: string
  name: string
  avatarUrl?: string
  role?: string
}

export interface LeaveTimelineProps {
  view: TimelineView
  startDate: Date
  users: LeaveTimelineUser[]
  entries: LeaveTimelineEntry[]
  onEntryClick?: (entry: LeaveTimelineEntry) => void
  className?: string
}

interface Column {
  key: string
  label: string
  subLabel?: string
  start: Date
  end: Date
  isWeekend: boolean
  isToday: boolean
}

function buildColumns(view: TimelineView, startDate: Date): Column[] {
  const today = new Date()

  switch (view) {
    case "day":
      return [
        {
          key: startDate.toISOString(),
          label: format(startDate, "d MMM"),
          subLabel: format(startDate, "EEE"),
          start: startDate,
          end: startDate,
          isWeekend: isWeekend(startDate),
          isToday: isToday(startDate),
        },
      ]

    case "week": {
      // Two-week planning strip (14 days)
      const start = startOfWeek(startDate, { weekStartsOn: 1 })
      const end = addDays(start, 13)
      return eachDayOfInterval({ start, end }).map((d) => ({
        key: d.toISOString(),
        label: format(d, "d"),
        subLabel: format(d, "EEE"),
        start: d,
        end: d,
        isWeekend: isWeekend(d),
        isToday: isToday(d),
      }))
    }

    case "month": {
      // Week slots, one slot per week; show week start date only
      const monthStart = startOfMonth(startDate)
      const monthEnd = endOfMonth(startDate)
      return eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 }).map((weekStart) => {
        const weekEnd = addDays(weekStart, 6)
        const colStart = isBefore(weekStart, monthStart) ? monthStart : weekStart
        const colEnd = isAfter(weekEnd, monthEnd) ? monthEnd : weekEnd
        return {
          key: weekStart.toISOString(),
          label: format(colStart, "d MMM"),
          start: colStart,
          end: colEnd,
          isWeekend: false,
          isToday: !isAfter(today, colEnd) && !isBefore(today, colStart),
        }
      })
    }

    case "quarter": {
      // Bi-weekly slots; label with start ISO week number
      const quarterStart = startOfQuarter(startDate)
      const quarterEnd = endOfQuarter(startDate)
      const slots: Column[] = []
      let cursor = startOfWeek(quarterStart, { weekStartsOn: 1 })
      while (!isAfter(cursor, quarterEnd)) {
        const slotStart = isBefore(cursor, quarterStart) ? quarterStart : cursor
        const slotEndRaw = addDays(cursor, 13)
        const slotEnd = isAfter(slotEndRaw, quarterEnd) ? quarterEnd : slotEndRaw
        slots.push({
          key: cursor.toISOString(),
          label: `W${getISOWeek(slotStart)}`,
          subLabel: format(slotStart, "d MMM"),
          start: slotStart,
          end: slotEnd,
          isWeekend: false,
          isToday: !isAfter(today, slotEnd) && !isBefore(today, slotStart),
        })
        cursor = addDays(cursor, 14)
      }
      return slots
    }

    case "year": {
      const start = startOfYear(startDate)
      const end = endOfYear(startDate)
      return eachMonthOfInterval({ start, end }).map((monthStart) => {
        const monthEnd = endOfMonth(monthStart)
        return {
          key: monthStart.toISOString(),
          label: format(monthStart, "MMM"),
          subLabel: format(monthStart, "yyyy"),
          start: monthStart,
          end: monthEnd,
          isWeekend: false,
          isToday: !isAfter(today, monthEnd) && !isBefore(today, monthStart),
        }
      })
    }
  }
}

interface Bar {
  entry: LeaveTimelineEntry
  startIdx: number
  span: number
  clippedLeft: boolean
  clippedRight: boolean
}

function computeBarsForUser(userId: string, entries: LeaveTimelineEntry[], columns: Column[]): Bar[] {
  if (columns.length === 0) return []
  const firstCol = columns[0]
  const lastCol = columns[columns.length - 1]
  if (!firstCol || !lastCol) return []

  return entries
    .filter((e) => e.userId === userId)
    .flatMap((entry) => {
      let startIdx = -1
      let endIdx = -1
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i]
        if (!col) continue
        const overlaps = !isAfter(entry.startDate, col.end) && !isBefore(entry.endDate, col.start)
        if (overlaps) {
          if (startIdx === -1) startIdx = i
          endIdx = i
        }
      }
      if (startIdx === -1) return []
      return [
        {
          entry,
          startIdx,
          span: endIdx - startIdx + 1,
          clippedLeft: isBefore(entry.startDate, firstCol.start),
          clippedRight: isAfter(entry.endDate, lastCol.end),
        },
      ]
    })
}

const STICKY_WIDTH = 230
const COL_WIDTH: Record<TimelineView, number> = {
  day: 260,
  week: 72,
  month: 124,
  quarter: 140,
  year: 110,
}
const ROW_HEIGHT = 46

function getHeatClass(away: number, total: number): string {
  if (total === 0 || away === 0) return "bg-muted/20"
  const ratio = away / total
  if (ratio < 0.25) return "bg-emerald-100"
  if (ratio < 0.5) return "bg-amber-100"
  if (ratio < 0.75) return "bg-orange-200"
  return "bg-rose-200"
}

function DayViewPanel({
  startDate,
  users,
  entries,
}: Pick<LeaveTimelineProps, "startDate" | "users" | "entries">) {
  const awayToday = entries.filter((e) =>
    isWithinInterval(startDate, { start: e.startDate, end: e.endDate })
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <div>
          <p className="text-sm font-semibold">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">
            Away: {awayToday.length} of {users.length}
          </p>
        </div>
      </div>

      <div className={cn("rounded-lg border p-5", getHeatClass(awayToday.length, users.length))}>
        <p className="text-sm font-medium">
          {awayToday.length === 0
            ? "Everyone is present."
            : `${awayToday.length} team member(s) are away on this day.`}
        </p>
      </div>

      {awayToday.length > 0 && (
        <div className="space-y-2">
          {awayToday.map((entry) => {
            const cfg = LEAVE_TYPE_CONFIG[entry.type] ?? LEAVE_TYPE_CONFIG.OTHER
            const days = differenceInCalendarDays(entry.endDate, entry.startDate) + 1
            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={entry.userAvatar} alt={entry.userName} />
                  <AvatarFallback className="text-xs">
                    {entry.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(entry.startDate, "MMM d")} - {format(entry.endDate, "MMM d")} ·{" "}
                    {days} {days === 1 ? "day" : "days"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs text-white", cfg.barColor)}>
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function pendingOverlayStyle(isPending: boolean) {
  if (!isPending) return undefined
  return {
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 6px, rgba(255,255,255,0.45) 6px, rgba(255,255,255,0.45) 10px)",
  } as React.CSSProperties
}

export function LeaveTimeline({
  view,
  startDate,
  users,
  entries,
  onEntryClick,
  className,
}: LeaveTimelineProps) {
  if (view === "day") {
    return (
      <div className={cn("w-full", className)}>
        <DayViewPanel startDate={startDate} users={users} entries={entries} />
      </div>
    )
  }

  const columns = buildColumns(view, startDate)
  const colWidth = COL_WIDTH[view]
  const totalWidth = STICKY_WIDTH + columns.length * colWidth

  return (
    <div
      className={cn("w-full overflow-x-auto rounded-lg border bg-background", className)}
      role="region"
      aria-label="Leave timeline"
    >
      <div
        style={{
          minWidth: totalWidth,
          display: "grid",
          gridTemplateColumns: `${STICKY_WIDTH}px repeat(${columns.length}, ${colWidth}px)`,
        }}
      >
        <div
          className="sticky left-0 z-20 flex items-end border-b border-r bg-muted/70 p-2"
          style={{ gridRow: 1, gridColumn: 1, height: 54 }}
        >
          <span className="text-xs font-bold uppercase tracking-wide text-foreground/70">
            Team Member
          </span>
        </div>

        {columns.map((col, idx) => (
          <div
            key={col.key}
            role="columnheader"
            data-weekend={col.isWeekend || undefined}
            className={cn(
              "flex flex-col items-center justify-center border-b border-r",
              col.isWeekend ? "bg-muted/20" : "bg-muted/60",
              col.isToday && "bg-primary/10"
            )}
            style={{ gridRow: 1, gridColumn: idx + 2, height: 54 }}
          >
            {col.subLabel && (
              <span
                className={cn(
                  "text-[10px] leading-none",
                  col.isToday ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {col.subLabel}
              </span>
            )}
            <span
              className={cn(
                "mt-0.5 text-xs font-bold leading-none",
                col.isToday
                  ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {col.label}
            </span>
          </div>
        ))}

        {users.map((user, rowIdx) => {
          const bars = computeBarsForUser(user.id, entries, columns)
          const gridRow = rowIdx + 2
          return (
            <React.Fragment key={user.id}>
              <div
                className="sticky left-0 z-10 flex items-center gap-2.5 border-b border-r bg-background px-3"
                style={{ gridRow, gridColumn: 1, height: ROW_HEIGHT }}
              >
                <Avatar className="size-7 shrink-0">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-[10px]">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold leading-none">{user.name}</p>
                  {user.role && (
                    <p className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
                      {user.role}
                    </p>
                  )}
                </div>
              </div>

              {columns.map((col, colIdx) => (
                <div
                  key={col.key}
                  role="cell"
                  data-weekend={col.isWeekend || undefined}
                  className={cn(
                    "border-b border-r",
                    col.isWeekend ? "bg-muted/10" : "",
                    col.isToday && "bg-primary/5"
                  )}
                  style={{ gridRow, gridColumn: colIdx + 2, height: ROW_HEIGHT, zIndex: 0 }}
                />
              ))}

              {bars.map((bar) => {
                const cfg = LEAVE_TYPE_CONFIG[bar.entry.type] ?? LEAVE_TYPE_CONFIG.OTHER
                const isPending = bar.entry.status === "PENDING"
                return (
                  <div
                    key={bar.entry.id}
                    className="relative"
                    style={{
                      gridRow,
                      gridColumn: `${bar.startIdx + 2} / span ${bar.span}`,
                      height: ROW_HEIGHT,
                      zIndex: 1,
                    }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          aria-label={`${bar.entry.userName}: ${cfg.label} ${format(
                            bar.entry.startDate,
                            "MMM d"
                          )}–${format(bar.entry.endDate, "MMM d")}`}
                          className={cn(
                            "absolute inset-y-2 flex cursor-pointer items-center overflow-hidden px-2 shadow-sm transition-all",
                            "hover:brightness-110 hover:shadow-md active:brightness-95",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            cfg.barColor,
                            bar.clippedLeft && bar.clippedRight
                              ? "left-0 right-0 rounded-none"
                              : bar.clippedLeft
                              ? "left-0 right-1 rounded-r-md"
                              : bar.clippedRight
                              ? "left-1 right-0 rounded-l-md"
                              : "left-1 right-1 rounded-md"
                          )}
                          style={pendingOverlayStyle(isPending)}
                          onClick={() => onEntryClick?.(bar.entry)}
                        >
                          {bar.span >= 2 && (
                            <span className="truncate text-[11px] font-medium leading-none text-white select-none">
                              {bar.span >= 3 ? cfg.label : bar.entry.userName.split(" ")[0]}
                            </span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden border p-0 shadow-lg" side="top" align="start">
                        <LeaveAbsenceBadge
                          userName={bar.entry.userName}
                          avatarUrl={bar.entry.userAvatar}
                          type={bar.entry.type}
                          startDate={bar.entry.startDate}
                          endDate={bar.entry.endDate}
                          reason={bar.entry.reason}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}

        {users.length === 0 && (
          <div
            className="flex items-center justify-center py-12 text-sm text-muted-foreground"
            style={{ gridRow: 2, gridColumn: `1 / span ${columns.length + 1}` }}
          >
            No team members to display.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t bg-muted/20 px-3 py-2">
        {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveType, (typeof LEAVE_TYPE_CONFIG)[LeaveType]][]).map(
          ([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn("size-2.5 rounded-sm", cfg.barColor)} aria-hidden="true" />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          )
        )}
        <div className="flex items-center gap-1.5">
          <div
            className="size-2.5 rounded-sm bg-slate-500"
            style={pendingOverlayStyle(true)}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">Pending (not approved)</span>
        </div>
      </div>
    </div>
  )
}
