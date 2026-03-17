import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Check, X, Ban } from 'lucide-react';
import type { LeaveResponse, LeaveType } from '@/api/generated/types.gen';
import { LEAVE_TYPE_LABELS } from '@/components/leave/leave-absence-badge';

import { useTranslation } from 'react-i18next';

interface LeaveAbsenceCardProps {
  request: LeaveResponse;
  canApproveReject?: boolean;
  canCancel?: boolean;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
  onCancel?: (id: number) => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
};

export function LeaveAbsenceCard({
  request,
  canApproveReject = false,
  canCancel = false,
  onApprove,
  onReject,
  onCancel,
}: LeaveAbsenceCardProps) {
  const { t } = useTranslation();
  const initials = (request.user_full_name || `U${request.user_id}`)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const type = (request.type ?? 'OTHER') as LeaveType;

  return (
    <Card className="w-full border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-9 border">
            <AvatarImage src={request.user_avatar_url ?? ''} alt={request.user_full_name ?? ''} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold truncate">
              {request.user_full_name || `User ${request.user_id}`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Request #{request.id}</p>
          </div>
        </div>
        <Badge className={STATUS_BADGE[request.status] ?? STATUS_BADGE.PENDING}>{request.status}</Badge>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          <span>
            {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{LEAVE_TYPE_LABELS[type]}</Badge>
        </div>

        {request.reason && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
            {request.reason}
          </div>
        )}
      </CardContent>

      {(canApproveReject || canCancel) && (
        <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 py-3">
          {canApproveReject && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onReject?.(request.id)}
              >
                <X className="size-3.5" />
                {t('common.reject', 'Reject')}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => onApprove?.(request.id)}
              >
                <Check className="size-3.5" />
                {t('common.approve', 'Approve')}
              </Button>
            </>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => onCancel?.(request.id)}
            >
              <Ban className="size-3.5" />
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
