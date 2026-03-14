import * as React from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"

export interface TimeGridEntry {
  taskId: string
  taskName: string
  values: Record<string, number> // date string (YYYY-MM-DD) -> hours
}

export interface TimeGridProps extends React.HTMLAttributes<HTMLDivElement> {
  startDate: Date
  entries: TimeGridEntry[]
  onValueChange?: (taskId: string, date: string, value: number) => void
}

export function TimeGrid({
  className,
  startDate,
  entries,
  onValueChange,
  ...props
}: TimeGridProps) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className={cn("w-full overflow-x-auto", className)} {...props}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left min-w-[200px]">
              <Typography variant="small" className="font-bold">Task</Typography>
            </th>
            {days.map((day) => (
              <th key={day.toISOString()} className="p-2 text-center min-w-[80px]">
                <div className="flex flex-col">
                  <Typography variant="small" className="font-bold">
                    {format(day, "EEE")}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    {format(day, "MMM d")}
                  </Typography>
                </div>
              </th>
            ))}
            <th className="p-2 text-center font-bold min-w-[80px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const rowTotal = Object.values(entry.values).reduce((sum, val) => sum + val, 0)
            return (
              <tr key={entry.taskId} className="border-b hover:bg-muted/30">
                <td className="p-2">
                  <Typography variant="small" className="font-medium line-clamp-1" title={entry.taskName}>
                    {entry.taskName}
                  </Typography>
                  <Typography variant="small" className="text-xs text-muted-foreground font-mono">
                    {entry.taskId}
                  </Typography>
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd")
                  const value = entry.values[dateStr] || 0
                  return (
                    <td key={dateStr} className="p-1">
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        className="h-8 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={value || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const newVal = parseFloat(e.target.value) || 0
                          onValueChange?.(entry.taskId, dateStr, newVal)
                        }}
                      />
                    </td>
                  )
                })}
                <td className="p-2 text-center font-bold">
                  <Typography variant="small">{rowTotal}</Typography>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
TimeGrid.displayName = "TimeGrid"
