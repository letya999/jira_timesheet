import type { LeaveResponse } from '@/api/generated/types.gen';
import { LeaveAbsenceCard } from './leave-absence-card';
import { CardList } from '@/components/shared/card-list';

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
  return (
    <CardList
      items={requests}
      renderItem={(request) => {
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
      }}
      isLoading={isLoading}
      showPagination={false}
      listClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      emptyMessage={`${emptyTitle}. ${emptySubtitle}`}
    />
  );
}
