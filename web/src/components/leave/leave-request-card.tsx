import * as React from "react"
import { format } from "date-fns"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Check, X, Ban } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeaveType, LeaveStatus } from "@/api/generated/types.gen"
import { LEAVE_TYPE_LABELS } from "./leave-absence-badge"

interface LeaveRequestCardProps {
  id: number
  userName: string
  userEmail: string
  type: LeaveType
  status: LeaveStatus
  startDate: string
  endDate: string
  reason?: string
  onApprove?: (id: number) => Promise<void>
  onReject?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
  canAction?: boolean
  className?: string
}

const statusConfig: Record<LeaveStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-700" },
  APPROVED: { label: "Approved", color: "bg-success" },
  REJECTED: { label: "Rejected", color: "bg-destructive" },
  CANCELLED: { label: "Cancelled", color: "bg-neutral-600" },
}

export function LeaveRequestCard({
  id,
  userName,
  userEmail,
  type,
  status,
  startDate,
  endDate,
  reason,
  onApprove,
  onReject,
  onCancel,
  canAction = false,
  className,
}: LeaveRequestCardProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase()
  const { label: statusLabel, color: statusColor } = statusConfig[status]

  const handleAction = async (action?: (id: number) => Promise<void>) => {
    if (!action) return
    setIsProcessing(true)
    try {
      await action(id)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="size-10 border">
          <AvatarImage src={`https://avatar.vercel.sh/${userEmail}.png`} alt={userName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <CardTitle className="text-sm font-bold">{userName}</CardTitle>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs h-4 px-1 uppercase">
              {LEAVE_TYPE_LABELS[type]}
            </Badge>
            <Badge className={cn("text-xs h-4 px-1 uppercase border-none text-white", statusColor)}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Calendar className="size-4" />
            <span>{format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}</span>
          </div>
        </div>
        {reason && (
          <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded border-l-2 border-muted italic">
            "{reason}"
          </p>
        )}
      </CardContent>
      {canAction && status === 'PENDING' && (
        <CardFooter className="flex justify-end gap-2 pt-2 border-t mt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive h-8 px-3 gap-1.5"
            onClick={() => handleAction(onReject)}
            disabled={isProcessing}
          >
            <X className="size-3.5" />
            Reject
          </Button>
          <Button 
            size="sm" 
            className="bg-success hover:bg-success/90 h-8 px-3 gap-1.5"
            onClick={() => handleAction(onApprove)}
            disabled={isProcessing}
          >
            <Check className="size-3.5" />
            Approve
          </Button>
        </CardFooter>
      )}
      {canAction && status === 'APPROVED' && (
        <CardFooter className="flex justify-end pt-2 border-t mt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 gap-1.5"
            onClick={() => handleAction(onCancel)}
            disabled={isProcessing}
          >
            <Ban className="size-3.5" />
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
