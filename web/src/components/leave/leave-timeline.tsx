import * as React from "react"
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWeekend,
  isWithinInterval,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  isToday,
  isBefore,
  isAfter,
  differenceInCalendarDays,
} from "date-fns"
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

// ─── Column model ─────────────────────────────────────────────────────────────

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
          label: format(startDate, "d"),
          subLabel: format(startDate, "EEE"),
          start: startDate,
          end: startDate,
          isWeekend: isWeekend(startDate),
          isToday: isToday(startDate),
        },
      ]

    case "week": {
      const start = startOfWeek(startDate, { weekStartsOn: 1 })
      const end = endOfWeek(startDate, { weekStartsOn: 1 })
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
      const start = startOfMonth(startDate)
      const end = endOfMonth(startDate)
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

    case "quarter": {
      const qStart = startOfQuarter(startDate)
      const qEnd = endOfQuarter(startDate)
      return eachWeekOfInterval({ start: qStart, end: qEnd }, { weekStartsOn: 1 }).map(
        (weekStart, i) => {
          const weekEnd = addDays(weekStart, 6)
          const colStart = isBefore(weekStart, qStart) ? qStart : weekStart
          const colEnd = isAfter(weekEnd, qEnd) ? qEnd : weekEnd
          return {
            key: weekStart.toISOString(),
            label: `W${i + 1}`,
            subLabel: format(colStart, "MMM d"),
            start: colStart,
            end: colEnd,
            isWeekend: false,
            isToday: !isAfter(today, colEnd) && !isBefore(today, colStart),
          }
        }
      )
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

// ─── Bar model ────────────────────────────────────────────────────────────────

interface Bar {
  entry: LeaveTimelineEntry
  startIdx: number
  span: number
  /** Whether leave starts before the visible window */
  clippedLeft: boolean
  /** Whether leave ends after the visible window */
  clippedRight: boolean
}

function computeBarsForUser(
  userId: string,
  entries: LeaveTimelineEntry[],
  columns: Column[]
): Bar[] {
  return entries
    .filter((e) => e.userId === userId)
    .flatMap((entry) => {
      let startIdx = -1
      let endIdx = -1
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i]
        const overlaps =
          !isAfter(entry.startDate, col.end) && !isBefore(entry.endDate, col.start)
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
          clippedLeft: isBefore(entry.startDate, columns[0].start),
          clippedRight: isAfter(entry.endDate, columns[columns.length - 1].end),
        },
      ]
    })
}

// ─── Column sizing ────────────────────────────────────────────────────────────

const STICKY_WIDTH = 200
const COL_WIDTH: Record<TimelineView, number> = {
  day: 120,
  week: 52,
  month: 40,
  quarter: 64,
  year: 80,
}
const ROW_HEIGHT = 44

// ─── Day-view list ────────────────────────────────────────────────────────────

function DayViewList({
  startDate,
  entries,
}: Pick<LeaveTimelineProps, "startDate" | "entries">) {
  const awayToday = entries.filter((e) =>
    isWithinInterval(startDate, { start: e.startDate, end: e.endDate })
  )

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">
        {format(startDate, "EEEE, MMMM d, yyyy")}
        {isToday(startDate) && (
          <span className="ml-2 text-xs font-normal text-primary">Today</span>
        )}
      </p>

      {awayToday.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
          Everyone is present today.
        </p>
      ) : (
        <div className="space-y-2">
          {awayToday.map((entry) => {
            const config = LEAVE_TYPE_CONFIG[entry.type] ?? LEAVE_TYPE_CONFIG.OTHER
            const days = differenceInCalendarDays(entry.endDate, entry.startDate) + 1
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={entry.userAvatar} alt={entry.userName} />
                  <AvatarFallback className="text-xs">
                    {entry.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(entry.startDate, "MMM d")} – {format(entry.endDate, "MMM d")} ·{" "}
                    {days} {days === 1 ? "day" : "days"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full text-white",
                    config.barColor
                  )}
                >
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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
        <DayViewList startDate={startDate} entries={entries} />
      </div>
    )
  }

  const columns = buildColumns(view, startDate)
  const colWidth = COL_WIDTH[view]
  const totalWidth = STICKY_WIDTH + columns.length * colWidth

  return (
    <div
      className={cn("w-full overflow-x-auto border rounded-lg bg-background", className)}
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
        {/* ── Header row ─────────────────────────────── */}
        <div
          className="sticky left-0 z-20 flex items-end p-2 bg-muted/60 border-b border-r"
          style={{ gridRow: 1, gridColumn: 1, height: 48 }}
        >
          <span className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
            Team Member
          </span>
        </div>

        {columns.map((col, colIdx) => (
          <div
            key={col.key}
            role="columnheader"
            data-weekend={col.isWeekend || undefined}
            className={cn(
              "flex flex-col items-center justify-end pb-1.5 border-b border-r",
              col.isWeekend ? "bg-muted/20" : "bg-muted/60",
              col.isToday && "bg-primary/10"
            )}
            style={{ gridRow: 1, gridColumn: colIdx + 2, height: 48 }}
          >
            {col.subLabel && (
              <span
                className={cn(
                  "text-[10px] leading-none",
                  col.isToday ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {col.subLabel}
              </span>
            )}
            <span
              className={cn(
                "text-xs font-bold leading-none mt-0.5",
                col.isToday
                  ? "size-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {col.label}
            </span>
          </div>
        ))}

        {/* ── User rows ──────────────────────────────── */}
        {users.map((user, rowIdx) => {
          const bars = computeBarsForUser(user.id, entries, columns)
          const gridRow = rowIdx + 2

          return (
            <React.Fragment key={user.id}>
              {/* Sticky user name cell */}
              <div
                className="sticky left-0 z-10 flex items-center gap-2.5 px-3 bg-background border-b border-r"
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
                  <p className="text-xs font-semibold truncate leading-none">{user.name}</p>
                  {user.role && (
                    <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
                      {user.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Background cells */}
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

              {/* Leave bars */}
              {bars.map((bar) => {
                const config = LEAVE_TYPE_CONFIG[bar.entry.type] ?? LEAVE_TYPE_CONFIG.OTHER
                return (
                  <div
                    key={bar.entry.id}
                    // position: relative is CRITICAL — keeps absolute child scoped to this grid cell
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
                          aria-label={`${bar.entry.userName}: ${config.label} ${format(bar.entry.startDate, "MMM d")}–${format(bar.entry.endDate, "MMM d")}`}
                          className={cn(
                            "absolute inset-y-2 cursor-pointer transition-all shadow-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            "flex items-center px-2 overflow-hidden",
                            "hover:brightness-110 hover:shadow-md active:brightness-95",
                            config.barColor,
                            // Rounded caps: show which side is clipped
                            bar.clippedLeft && bar.clippedRight
                              ? "rounded-none left-0 right-0"
                              : bar.clippedLeft
                              ? "rounded-r-md left-0 right-1"
                              : bar.clippedRight
                              ? "rounded-l-md left-1 right-0"
                              : "rounded-md left-1 right-1"
                          )}
                          onClick={() => onEntryClick?.(bar.entry)}
                        >
                          {bar.span >= 2 && (
                            <span className="text-[11px] font-medium text-white truncate leading-none select-none">
                              {bar.span >= 3
                                ? config.label
                                : bar.entry.userName.split(" ")[0]}
                            </span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 w-auto overflow-hidden border shadow-lg"
                        side="top"
                        align="start"
                      >
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

        {/* Empty state rows */}
        {users.length === 0 && (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground py-12"
            style={{ gridRow: 2, gridColumn: `1 / span ${columns.length + 1}` }}
          >
            No team members to display.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t bg-muted/20 flex-wrap">
        {(
          Object.entries(LEAVE_TYPE_CONFIG) as [LeaveType, (typeof LEAVE_TYPE_CONFIG)[LeaveType]][]
        ).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("size-2.5 rounded-sm", cfg.barColor)} aria-hidden="true" />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
