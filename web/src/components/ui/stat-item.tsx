import * as React from "react"
import { cn } from "@/lib/utils"

interface StatItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: string | number
    label: string
    variant?: "positive" | "negative" | "neutral"
  }
}

const StatItem = React.forwardRef<HTMLDivElement, StatItemProps>(
  ({ className, label, value, description, icon, trend, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-1 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "font-medium",
                  trend.variant === "positive" && "text-emerald-500",
                  trend.variant === "negative" && "text-destructive",
                  trend.variant === "neutral" && "text-muted-foreground"
                )}
              >
                {trend.value}
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
          {description && !trend && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    )
  }
)
StatItem.displayName = "StatItem"

export { StatItem }
