import { useState, useEffect, useRef } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"

export interface TimesheetEntry {
  id: string
  taskName: string
  projectKey: string
  values: Record<string, number>
}

interface TimesheetGridProps {
  startDate: Date
  entries: TimesheetEntry[]
  onUpdate?: (id: string, date: string, value: number) => Promise<void>
  className?: string
}

export function TimesheetGrid({
  startDate,
  entries: initialEntries,
  onUpdate,
  className,
}: TimesheetGridProps) {
  const [entries, setEntries] = useState(initialEntries)
  
  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })

  const handleValueChange = async (id: string, date: string, value: number) => {
    const previousEntries = [...entries]
    
    // Optimistic update
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          values: { ...entry.values, [date]: value }
        }
      }
      return entry
    }))

    if (onUpdate) {
      try {
        await onUpdate(id, date, value)
      } catch (error) {
        // Revert on error
        setEntries(previousEntries)
        console.error("Failed to update timesheet:", error)
      }
    }
  }

  return (
    <div className={cn("flex flex-col w-full border rounded-lg bg-background", className)}>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b bg-muted/50 font-medium h-12 items-center sticky top-0 z-10">
            <div className="w-[300px] px-4 border-r h-full flex items-center">
              <Typography variant="small" className="font-bold">Task / Project</Typography>
            </div>
            {days.map((day) => (
              <div key={day.toISOString()} className="flex-1 px-2 border-r h-full flex flex-col items-center justify-center text-center">
                <Typography variant="small" className="font-bold leading-none">
                  {format(day, "EEE")}
                </Typography>
                <Typography variant="small" className="text-[10px] text-muted-foreground mt-1">
                  {format(day, "MMM d")}
                </Typography>
              </div>
            ))}
            <div className="w-20 px-2 h-full flex items-center justify-center font-bold">
              Total
            </div>
          </div>

          {/* Body with Virtualization */}
          <div 
            ref={parentRef}
            className="overflow-y-auto max-h-[500px] relative"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const entry = entries[virtualRow.index]
                if (!entry) return null
                const rowTotal = Object.values(entry.values).reduce((sum, val) => sum + (Number(val) || 0), 0)

                return (
                  <div
                    key={entry.id}
                    className="flex border-b hover:bg-muted/30 transition-colors h-[60px] absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="w-[300px] px-4 border-r h-full flex flex-col justify-center min-w-0">
                      <Typography variant="small" className="font-medium truncate" title={entry.taskName}>
                        {entry.taskName}
                      </Typography>
                      <Typography variant="small" className="text-[10px] text-muted-foreground font-mono">
                        {entry.projectKey}
                      </Typography>
                    </div>
                    {days.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd")
                      const value = entry.values[dateStr] || 0
                      return (
                        <div key={dateStr} className="flex-1 px-1 border-r h-full flex items-center">
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            className="h-8 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-primary border-none bg-transparent hover:bg-muted/50"
                            value={value || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0
                              handleValueChange(entry.id, dateStr, newVal)
                            }}
                          />
                        </div>
                      )
                    })}
                    <div className="w-20 px-2 h-full flex items-center justify-center font-bold text-sm">
                      {rowTotal}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
