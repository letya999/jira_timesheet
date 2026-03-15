import { formatInTimeZone } from "date-fns-tz"
import { ExternalLink, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProjectResponse } from "@/api/generated/types.gen"

interface ProjectRowProps {
  project: ProjectResponse
  lastSyncedAt?: string
  timezone?: string
  className?: string
}

export function ProjectRow({
  project,
  lastSyncedAt,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  className,
}: ProjectRowProps) {
  const formattedSync = lastSyncedAt 
    ? formatInTimeZone(new Date(lastSyncedAt), timezone, "MMM d, yyyy HH:mm")
    : "Never"

  return (
    <div className={cn("flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors", className)}>
      <div className="size-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
        {project.key.substring(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{project.name}</h3>
          <Badge variant="outline" className="text-xs font-mono uppercase h-4 px-1">
            {project.key}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>Synced: {formattedSync}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant={project.is_active ? "default" : "secondary"}
          className={cn("text-xs uppercase", project.is_active ? "bg-success hover:bg-success/90" : "")}
        >
          {project.is_active ? "Active" : "Inactive"}
        </Badge>
        <Button variant="ghost" size="icon" className="size-8 h-8 w-8" asChild>
          <a href={`https://your-domain.atlassian.net/browse/${project.key}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            <span className="sr-only">View in Jira</span>
          </a>
        </Button>
      </div>
    </div>
  )
}
