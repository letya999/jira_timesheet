import { useState } from 'react'
import { useLeaveRequests, useCreateLeaveRequest } from '@/features/leave/hooks'
import { LeaveRequestCard } from '@/components/leave/leave-request-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { LEAVE_TYPE_LABELS } from '@/components/leave/leave-absence-badge'
import { Loader2, CalendarPlus, Plane } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { LeaveType, LeaveStatus } from '@/api/generated/types.gen'

export default function LeavePage() {
  const { data: requests, isLoading } = useLeaveRequests()
  const createMutation = useCreateLeaveRequest()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [type, setType] = useState<LeaveType>('VACATION')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>()
  const [reason, setReason] = useState('')

  const handleCreateRequest = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a date range')
      return
    }
    try {
      await createMutation.mutateAsync({
        leave_type: type,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        reason,
      })
      toast.success('Leave request submitted')
      setIsDialogOpen(false)
      setDateRange(undefined)
      setReason('')
    } catch {
      toast.error('Failed to submit leave request')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">
            Manage your vacation, sick leave, and other absences.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 size-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Leave Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Date Range</Label>
                <DateRangePicker
                  date={dateRange}
                  setDate={(range) => setDateRange(range as { from: Date; to: Date })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Tell us why..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request: any) => (
            <LeaveRequestCard
              key={request.id}
              id={request.id}
              userName={request.user_full_name || 'Current User'}
              userEmail={request.user_email || ''}
              type={request.type as LeaveType}
              status={request.status as LeaveStatus}
              startDate={request.start_date}
              endDate={request.end_date}
              reason={request.reason}
              canAction={false}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/30 border-dashed">
          <Plane className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No leave requests</h2>
          <p className="text-muted-foreground text-sm">
            Ready for a vacation? Click the button above to request time off.
          </p>
        </div>
      )}
    </div>
  )
}
