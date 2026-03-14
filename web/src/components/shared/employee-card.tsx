import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UserResponse } from "@/api/generated/types.gen"
import { Clock, CheckCircle2, AlertCircle } from "lucide-react"

interface EmployeeCardProps {
  user: UserResponse
  hoursPeriod?: number
  syncStatus?: 'synced' | 'pending' | 'failed'
  className?: string
}

export function EmployeeCard({
  user,
  hoursPeriod = 0,
  syncStatus = 'synced',
  className,
}: EmployeeCardProps) {
  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "?"

  const syncConfig = {
    synced: { icon: CheckCircle2, color: "text-success", label: "Synced" },
    pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
    failed: { icon: AlertCircle, color: "text-destructive", label: "Failed" },
  }

  const { icon: SyncIcon, color: syncColor, label: syncLabel } = syncConfig[syncStatus]

  return (
    <Card className={cn("w-full max-w-sm hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="size-12 border">
          <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.full_name || user.email} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{user.full_name || user.email}</h3>
          <p className="text-sm text-muted-foreground truncate">{user.role || "Employee"}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-medium">Period Hours</span>
            <span className="text-2xl font-bold">{hoursPeriod}h</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase font-medium">Jira Sync</span>
            <div className={cn("flex items-center gap-1.5 font-medium text-sm", syncColor)}>
              <SyncIcon className="size-4" />
              {syncLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="rounded-full">
            Dept #{user.org_unit_id || 'N/A'}
          </Badge>
          <Badge 
            variant={user.is_active ? "default" : "secondary"}
            className={cn("rounded-full uppercase text-[9px]", user.is_active ? "bg-success hover:bg-success/90" : "")}
          >
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
