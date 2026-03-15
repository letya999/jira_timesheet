import { useEffect, useRef } from "react"
import { gantt } from "dhtmlx-gantt"
import "dhtmlx-gantt/codebase/dhtmlxgantt.css"
import { cn } from "@/lib/utils"

export interface GanttTask {
  id: string | number
  text: string
  start_date: string | Date
  duration?: number
  progress?: number
  open?: boolean
  parent?: string | number
  type?: string
}

export interface GanttLink {
  id: string | number
  source: string | number
  target: string | number
  type: string
}

export interface GanttConfig {
  date_format?: string
  columns?: Array<{
    name: string
    label?: string
    tree?: boolean
    width?: number
    align?: "left" | "center" | "right"
    template?: (task: GanttTask) => string
  }>
  readonly?: boolean
  drag_move?: boolean
  drag_progress?: boolean
  drag_resize?: boolean
  [key: string]: any // Still allow some flexibility but typed for common ones
}

export interface GanttChartWrapperProps {
  tasks: {
    data: GanttTask[]
    links?: GanttLink[]
  }
  config?: Partial<GanttConfig>
  onTaskClick?: (id: string | number) => void
  className?: string
}

export function GanttChartWrapper({
  className,
  tasks,
  config,
  onTaskClick,
}: GanttChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
    />
  )
}
GanttChartWrapper.displayName = "GanttChartWrapper"
