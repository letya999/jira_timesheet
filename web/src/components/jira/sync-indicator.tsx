import * as React from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SyncIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  isSyncing?: boolean
  lastSync?: Date | string | null
}

const SyncIndicator = React.forwardRef<HTMLDivElement, SyncIndicatorProps>(
  ({ className, isSyncing, lastSync, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
        {...props}
      >
        <RefreshCw className={cn("size-4", isSyncing && "animate-spin text-primary")} />
        <span className="tabular-nums">
          {isSyncing ? (
            "Syncing..."
          ) : lastSync ? (
            `Last sync: ${new Date(lastSync).toLocaleString()}`
          ) : (
            "Not synced"
          )}
        </span>
      </div>
    )
  }
)
SyncIndicator.displayName = "SyncIndicator"

export { SyncIndicator }
