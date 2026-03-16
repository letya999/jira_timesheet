import { Loader2 } from 'lucide-react';
import type { LeaveResponse } from '@/api/generated/types.gen';
import { LeaveAbsenceCard } from './leave-absence-card';

interface LeaveAbsenceListProps {
  requests: LeaveResponse[];
  isLoading: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  currentUserId?: number;
  canManage?: boolean;
  allowSelfCancel?: boolean;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
  onCancel?: (id: number) => Promise<void>;
}

export function LeaveAbsenceList({
  requests,
  isLoading,
  emptyTitle,
  emptySubtitle,
  currentUserId,
  canManage = false,
  allowSelfCancel = false,
  onApprove,
  onReject,
  onCancel,
}: LeaveAbsenceListProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/10">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
        <h2 className="text-lg font-semibold">{emptyTitle}</h2>
        <p className="text-sm text-muted-foreground">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => {
        const canApproveReject = canManage && request.status === 'PENDING';
        const canCancelByManager = canManage && request.status === 'APPROVED';
        const canCancelByAuthor =
          allowSelfCancel &&
          currentUserId === request.user_id &&
          (request.status === 'PENDING' || request.status === 'APPROVED');

        return (
          <LeaveAbsenceCard
            key={request.id}
            request={request}
            canApproveReject={canApproveReject}
            canCancel={canCancelByManager || canCancelByAuthor}
            onApprove={onApprove}
            onReject={onReject}
            onCancel={onCancel}
          />
        );
      })}
    </div>
  );
}
