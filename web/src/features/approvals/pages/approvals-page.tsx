import { useApprovals, useApproveEntry, useRejectEntry, useBulkApprove } from '@/features/approvals/hooks'
import { ApprovalCard } from '@/components/shared/approval-card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface TimesheetPeriod {
  id: number
  user_name: string
  user_email: string
  start_date: string
  end_date: string
  total_hours: number
  status: string
}

export default function ApprovalsPage() {
  const now = new Date()
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: rawData, isLoading } = useApprovals({ 
    status: 'SUBMITTED',
    start_date: startDate,
    end_date: endDate
  })
  
  const periods = (Array.isArray(rawData) ? rawData : (rawData as any)?.items || []) as TimesheetPeriod[]
  const approveMutation = useApproveEntry()
  const rejectMutation = useRejectEntry()
  const bulkApproveMutation = useBulkApprove()

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ periodId: id })
      toast.success('Period approved')
    } catch {
      toast.error('Failed to approve period')
    }
  }

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync({ periodId: id })
      toast.success('Period rejected')
    } catch {
      toast.error('Failed to reject period')
    }
  }

  const handleApproveAll = async () => {
    if (!periods || periods.length === 0) return
    try {
      const ids = periods.map(p => p.id)
      await bulkApproveMutation.mutateAsync(ids)
      toast.success(`Approved ${ids.length} periods`)
    } catch {
      toast.error('Failed to approve all periods')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve team timesheet submissions.
          </p>
        </div>
        {periods.length > 0 && (
          <Button 
            onClick={handleApproveAll} 
            disabled={bulkApproveMutation.isPending}
            className="bg-success hover:bg-success/90"
          >
            <CheckCircle2 className="mr-2 size-4" />
            Approve All ({periods.length})
          </Button>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/30 border-dashed">
          <AlertCircle className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No pending approvals</h2>
          <p className="text-muted-foreground text-sm">
            Everything is up to date. You'll see new submissions here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {periods.map((period) => (
            <ApprovalCard
              key={period.id}
              id={period.id}
              userName={period.user_name}
              userEmail={period.user_email}
              startDate={period.start_date}
              endDate={period.end_date}
              totalHours={period.total_hours}
              status={period.status}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
