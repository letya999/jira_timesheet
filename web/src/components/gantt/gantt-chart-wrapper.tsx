import * as React from "react"
import { gantt } from "dhtmlx-gantt"
import "dhtmlx-gantt/codebase/dhtmlxgantt.css"
import { cn } from "@/lib/utils"

export interface GanttChartWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks: {
    data: Array<{ 
      id: string | number
      text: string
      start_date: string | Date
      duration?: number
      progress?: number
      open?: boolean
      parent?: string | number
    }>
    links?: Array<{ 
      id: string | number
      source: string | number
      target: string | number
      type: string 
    }>
  }
  config?: any
  onTaskClick?: (id: string | number) => void
}

export function GanttChartWrapper({
  className,
  tasks,
  config,
  onTaskClick,
  ...props
}: GanttChartWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    // Standard config
    gantt.config.date_format = "%Y-%m-%d"
    
    if (config) {
      Object.assign(gantt.config, config)
    }

    gantt.init(containerRef.current)
    gantt.parse(tasks)

    const eventId = gantt.attachEvent("onTaskClick", (id: string | number) => {
      onTaskClick?.(id)
      return true
    })

    return () => {
      gantt.detachEvent(eventId)
      gantt.clearAll()
    }
  }, [tasks, config, onTaskClick])

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-[500px] border rounded-lg overflow-hidden", className)}
      {...props}
    />
  )
}
GanttChartWrapper.displayName = "GanttChartWrapper"
