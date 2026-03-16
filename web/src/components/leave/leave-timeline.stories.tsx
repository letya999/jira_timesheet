import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  isWithinInterval,
} from "date-fns"
import { ChevronLeft, ChevronRight, Users, Filter, CalendarDays, X } from "lucide-react"

import {
  LeaveTimeline,
  type TimelineView,
  type LeaveTimelineEntry,
  type LeaveTimelineUser,
} from "./leave-timeline"
import { LEAVE_TYPE_CONFIG, type LeaveType } from "./leave-absence-badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USERS: (LeaveTimelineUser & { dept: string })[] = [
  { id: "1", name: "Alice Johnson",  avatarUrl: "", role: "Engineering Lead", dept: "Engineering" },
  { id: "2", name: "Bob Smith",      avatarUrl: "", role: "Backend Dev",      dept: "Engineering" },
  { id: "3", name: "Charlie Brown",  avatarUrl: "", role: "Frontend Dev",     dept: "Engineering" },
  { id: "4", name: "Diana Prince",   avatarUrl: "", role: "Designer",         dept: "Design" },
  { id: "5", name: "Edward Norton",  avatarUrl: "", role: "QA Engineer",      dept: "Engineering" },
  { id: "6", name: "Fiona Green",    avatarUrl: "", role: "DevOps",           dept: "Infrastructure" },
  { id: "7", name: "George Harris",  avatarUrl: "", role: "Product Manager",  dept: "Product" },
  { id: "8", name: "Hannah Lee",     avatarUrl: "", role: "Data Analyst",     dept: "Analytics" },
]

function mkEntry(
  id: string,
  userId: string,
  type: LeaveType,
  start: string,
  end: string,
  reason?: string
): LeaveTimelineEntry {
  const user = MOCK_USERS.find((u) => u.id === userId)!
  return {
    id,
    userId,
    userName: user.name,
    type,
    startDate: new Date(start),
    endDate: new Date(end),
    reason,
  }
}

// Dates relative to 2026-03-15 (project's "today")
const MOCK_ENTRIES: LeaveTimelineEntry[] = [
  // ── March 2026 ──────────────────────────────────────────────────────────
  mkEntry("e01", "1", "VACATION",   "2026-03-17", "2026-03-21", "Spring break in Hawaii"),
  mkEntry("e02", "2", "SICK_LEAVE", "2026-03-13", "2026-03-14", "Flu"),
  mkEntry("e03", "3", "DAY_OFF",    "2026-03-17", "2026-03-17", "Moving apartment"),
  mkEntry("e04", "4", "VACATION",   "2026-03-10", "2026-03-14", "City trip to Paris"),
  mkEntry("e05", "5", "VACATION",   "2026-03-24", "2026-03-28", "Family vacation"),
  mkEntry("e06", "6", "SICK_LEAVE", "2026-03-15", "2026-03-16", "Migraine"),
  mkEntry("e07", "7", "DAY_OFF",    "2026-03-18", "2026-03-18", "Wedding anniversary"),
  mkEntry("e08", "8", "VACATION",   "2026-03-31", "2026-04-04", "Easter holiday"),
  mkEntry("e09", "1", "DAY_OFF",    "2026-03-28", "2026-03-28", "Doctor appointment"),
  mkEntry("e21", "6", "OTHER",      "2026-03-20", "2026-03-20", "Conference day"),
  mkEntry("e24", "8", "DAY_OFF",    "2026-03-19", "2026-03-19", "Dentist"),
  // ── April 2026 ──────────────────────────────────────────────────────────
  mkEntry("e10", "2", "VACATION",   "2026-04-07", "2026-04-11", "Road trip"),
  mkEntry("e11", "3", "SICK_LEAVE", "2026-04-21", "2026-04-21"),
  mkEntry("e12", "4", "VACATION",   "2026-04-14", "2026-04-18", "Diving trip"),
  mkEntry("e13", "5", "DAY_OFF",    "2026-04-01", "2026-04-01", "April Fools day off"),
  mkEntry("e14", "6", "VACATION",   "2026-04-21", "2026-04-25", "Hiking in Alps"),
  mkEntry("e15", "7", "VACATION",   "2026-04-28", "2026-05-02", "Golden week"),
  mkEntry("e22", "4", "DAY_OFF",    "2026-04-30", "2026-04-30"),
  // ── February 2026 ────────────────────────────────────────────────────────
  mkEntry("e16", "8", "VACATION",   "2026-02-09", "2026-02-13", "Ski holiday"),
  mkEntry("e17", "1", "SICK_LEAVE", "2026-02-20", "2026-02-21", "Cold"),
  mkEntry("e18", "3", "VACATION",   "2026-02-23", "2026-02-27", "Winter break"),
  mkEntry("e19", "5", "DAY_OFF",    "2026-02-14", "2026-02-14", "Valentine's day"),
  mkEntry("e23", "7", "SICK_LEAVE", "2026-02-03", "2026-02-05", "Back pain"),
  // ── January 2026 ─────────────────────────────────────────────────────────
  mkEntry("e20", "2", "VACATION",   "2026-01-20", "2026-01-24", "New Year extension"),
  mkEntry("e25", "5", "VACATION",   "2026-01-05", "2026-01-09", "New Year holiday"),
]

// ─── Period navigation helpers ─────────────────────────────────────────────────

function navigatePeriod(view: TimelineView, date: Date, dir: "prev" | "next"): Date {
  const d = dir === "next" ? 1 : -1
  switch (view) {
    case "day":     return addDays(date, d)
    case "week":    return addWeeks(date, d)
    case "month":   return addMonths(date, d)
    case "quarter": return addQuarters(date, d)
    case "year":    return addYears(date, d)
  }
}

function getPeriodLabel(view: TimelineView, date: Date): string {
  switch (view) {
    case "day":
      return format(date, "MMMM d, yyyy")
    case "week": {
      const ws = startOfWeek(date, { weekStartsOn: 1 })
      return `${format(ws, "MMM d")} – ${format(addDays(ws, 6), "MMM d, yyyy")}`
    }
    case "month":
      return format(date, "MMMM yyyy")
    case "quarter":
      return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yyyy")}`
    case "year":
      return format(date, "yyyy")
  }
}

function snapToViewStart(view: TimelineView, date: Date): Date {
  switch (view) {
    case "day":     return date
    case "week":    return startOfWeek(date, { weekStartsOn: 1 })
    case "month":   return startOfMonth(date)
    case "quarter": return startOfQuarter(date)
    case "year":    return startOfYear(date)
  }
}

// ─── Interactive demo ──────────────────────────────────────────────────────────

const VIEWS: TimelineView[] = ["day", "week", "month", "quarter", "year"]
const ALL_TYPES = Object.keys(LEAVE_TYPE_CONFIG) as LeaveType[]

function LeaveTimelineDemo() {
  const today = new Date("2026-03-15")
  const [view, setView] = React.useState<TimelineView>("month")
  const [currentDate, setCurrentDate] = React.useState(snapToViewStart("month", today))
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = React.useState<LeaveType[]>([])
  const [lastClicked, setLastClicked] = React.useState<LeaveTimelineEntry | null>(null)

  const handleViewChange = (v: TimelineView) => {
    setView(v)
    setCurrentDate(snapToViewStart(v, currentDate))
  }

  const toggleUser = (id: string) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleType = (t: LeaveType) =>
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )

  const visibleUsers: LeaveTimelineUser[] = (
    selectedUsers.length > 0
      ? MOCK_USERS.filter((u) => selectedUsers.includes(u.id))
      : MOCK_USERS
  ).map(({ dept: _dept, ...u }) => u)

  const visibleEntries =
    selectedTypes.length > 0
      ? MOCK_ENTRIES.filter((e) => selectedTypes.includes(e.type))
      : MOCK_ENTRIES

  // Who is away on "today" among visible users and entries
  const awayToday = visibleEntries.filter(
    (e) =>
      visibleUsers.some((u) => u.id === e.userId) &&
      isWithinInterval(today, { start: e.startDate, end: e.endDate })
  )

  const hasFilters = selectedUsers.length > 0 || selectedTypes.length > 0

  return (
    <div className="space-y-3 p-4 bg-background min-h-screen">
      {/* ── Toolbar row 1: View + Date nav ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View switcher */}
        <div
          className="flex rounded-md border overflow-hidden shrink-0"
          role="group"
          aria-label="Timeline view"
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              aria-pressed={view === v}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize border-r last:border-r-0 transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setCurrentDate(navigatePeriod(view, currentDate, "prev"))}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[160px] text-center tabular-nums">
            {getPeriodLabel(view, currentDate)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setCurrentDate(navigatePeriod(view, currentDate, "next"))}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => setCurrentDate(snapToViewStart(view, today))}
        >
          <CalendarDays className="size-3" />
          Today
        </Button>

        {hasFilters && (
          <button
            onClick={() => { setSelectedUsers([]); setSelectedTypes([]) }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}

        {/* Away today indicator */}
        {awayToday.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <div className="flex -space-x-1">
              {awayToday.slice(0, 4).map((e) => (
                <Avatar key={e.id} className="size-5 border border-background ring-0">
                  <AvatarFallback className="text-[8px] bg-muted">
                    {e.userName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              <strong className="text-foreground">{awayToday.length}</strong> away today
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar row 2: Filters ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 pb-1">
        {/* User filter */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Users className="size-3" />
            People
          </p>
          <div className="flex flex-wrap gap-1">
            {MOCK_USERS.map((user) => {
              const selected = selectedUsers.includes(user.id)
              const dimmed = selectedUsers.length > 0 && !selected
              const initials = user.name.split(" ").map((n) => n[0]).join("")
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  aria-pressed={selected}
                  title={user.role}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-all",
                    selected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : dimmed
                      ? "bg-background border-border text-muted-foreground opacity-50 hover:opacity-80"
                      : "bg-background border-border hover:bg-muted text-foreground"
                  )}
                >
                  <Avatar className="size-4 shrink-0">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                  </Avatar>
                  {user.name.split(" ")[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-border shrink-0" />

        {/* Leave type filter */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Filter className="size-3" />
            Leave type
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_TYPES.map((t) => {
              const cfg = LEAVE_TYPE_CONFIG[t]
              const selected = selectedTypes.includes(t)
              const dimmed = selectedTypes.length > 0 && !selected
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all",
                    selected
                      ? cn(cfg.barColor, "text-white border-transparent shadow-sm")
                      : dimmed
                      ? "bg-background border-border text-muted-foreground line-through opacity-50 hover:opacity-80"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  <div
                    className={cn("size-1.5 rounded-full shrink-0", cfg.barColor)}
                    aria-hidden
                  />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-end gap-3 text-xs text-muted-foreground pb-0.5 shrink-0">
          <span>
            <strong className="text-foreground">{visibleUsers.length}</strong>
            {" "}
            {visibleUsers.length === 1 ? "person" : "people"}
          </span>
          <span>
            <strong className="text-foreground">{visibleEntries.length}</strong>
            {" "}
            records
          </span>
          {selectedUsers.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {selectedUsers.length} filtered
            </Badge>
          )}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <LeaveTimeline
        view={view}
        startDate={currentDate}
        users={visibleUsers}
        entries={visibleEntries}
        onEntryClick={(entry) => setLastClicked(entry)}
      />

      {/* ── Last clicked entry ───────────────────────────────────────────── */}
      {lastClicked && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs">
          <span className="text-muted-foreground">Last clicked:</span>
          <strong>{lastClicked.userName}</strong>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-white text-[10px] font-medium",
              LEAVE_TYPE_CONFIG[lastClicked.type]?.barColor
            )}
          >
            {LEAVE_TYPE_CONFIG[lastClicked.type]?.label}
          </span>
          <span className="text-muted-foreground">
            {format(lastClicked.startDate, "MMM d")} – {format(lastClicked.endDate, "MMM d")}
          </span>
          <button
            onClick={() => setLastClicked(null)}
            className="ml-auto text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof LeaveTimeline> = {
  title: "Leave/LeaveTimeline",
  component: LeaveTimeline,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof LeaveTimeline>

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Full interactive demo — view switcher, date navigation, user & type filters. */
export const Interactive: Story = {
  render: function Render() {
    return <LeaveTimelineDemo />
  },
  parameters: { controls: { disable: true } },
}

// Minimal fixture data for static stories

const fixtureUsers: LeaveTimelineUser[] = [
  { id: "1", name: "Alice Johnson", role: "Engineering Lead" },
  { id: "2", name: "Bob Smith",     role: "Backend Dev" },
  { id: "3", name: "Charlie Brown", role: "Frontend Dev" },
]

const fixtureEntries: LeaveTimelineEntry[] = [
  mkEntry("e1", "1", "VACATION",   "2026-03-10", "2026-03-14", "City trip"),
  mkEntry("e2", "2", "SICK_LEAVE", "2026-03-12", "2026-03-13", "Flu"),
  mkEntry("e3", "3", "DAY_OFF",    "2026-03-14", "2026-03-14", "Moving day"),
]

export const WeekView: Story = {
  args: {
    view: "week",
    startDate: new Date("2026-03-09"),
    users: fixtureUsers,
    entries: fixtureEntries,
  },
}

export const MonthView: Story = {
  args: {
    view: "month",
    startDate: new Date("2026-03-01"),
    users: fixtureUsers,
    entries: fixtureEntries,
  },
}

export const QuarterView: Story = {
  args: {
    view: "quarter",
    startDate: new Date("2026-01-01"),
    users: fixtureUsers,
    entries: fixtureEntries,
  },
}

export const YearView: Story = {
  args: {
    view: "year",
    startDate: new Date("2026-01-01"),
    users: fixtureUsers,
    entries: fixtureEntries,
  },
}

export const DayView: Story = {
  args: {
    view: "day",
    startDate: new Date("2026-03-15"),
    users: fixtureUsers,
    entries: fixtureEntries,
  },
}

export const EmptyState: Story = {
  args: {
    view: "week",
    startDate: new Date("2026-03-09"),
    users: fixtureUsers,
    entries: [],
  },
}
