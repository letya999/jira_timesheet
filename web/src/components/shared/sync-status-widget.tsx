import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { RefreshCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SyncIndicator } from "@/components/jira/sync-indicator"
import { cn } from "@/lib/utils"
import { dateUtils } from "@/lib/date-utils"
import { useTranslation } from "react-i18next"

interface SyncStatusWidgetProps {
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncAt?: string
  progress?: number
  onTriggerSync: () => Promise<void>
  className?: string
}

export function SyncStatusWidget({
  status,
  lastSyncAt,
  progress = 0,
  onTriggerSync,
  className,
}: SyncStatusWidgetProps) {
  const { t } = useTranslation()
  const [isTriggering, setIsTriggering] = useState(false)

  const handleTrigger = async () => {
    setIsTriggering(true)
    try {
      await onTriggerSync()
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <div className={cn("p-4 border rounded-lg bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SyncIndicator 
            isSyncing={status === 'syncing'} 
            lastSync={lastSyncAt}
          />
          <div>
            <h4 className="text-sm font-semibold">{t("web.sync.title")}</h4>
            <p className="text-xs text-muted-foreground uppercase">
              {status === 'syncing'
                ? t("web.sync.syncing_in_progress")
                : `${t("web.sync.last_sync")}: ${
                    lastSyncAt
                      ? formatDistanceToNow(dateUtils.parse(lastSyncAt), { addSuffix: true })
                      : t("web.sync.never")
                  }`}
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 gap-2" 
          onClick={handleTrigger}
          disabled={status === 'syncing' || isTriggering}
        >
          <RefreshCcw className={cn("size-3.5", (status === 'syncing' || isTriggering) && "animate-spin")} />
          {t("web.sync.sync_now")}
        </Button>
      </div>

      {status === 'syncing' && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("web.sync.syncing_projects")}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          {/* Inline progress bar - no dependency on missing atom */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 p-2 rounded border border-destructive/10">
          <AlertCircle className="size-3.5" />
          <span>{t("web.sync.failed_jira")}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-xs text-success bg-success/5 p-2 rounded border border-success/10">
          <CheckCircle2 className="size-3.5" />
          <span>{t("web.sync.success")}</span>
        </div>
      )}
    </div>
  )
}
