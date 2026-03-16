import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { OrgUnitResponse } from '@/api/generated/types.gen';
import { useBulkUpdateUsers, usePromoteUser } from '@/features/users/hooks';
import { toast } from '@/lib/toast';

interface BulkActionDialogProps {
  userIds: number[];
  orgUnits: OrgUnitResponse[];
  isOpen: boolean;
  onClose: () => void;
  mode: 'role' | 'org_unit' | 'promote' | null;
}

export function BulkActionDialog({
  userIds,
  orgUnits,
  isOpen,
  onClose,
  mode,
}: BulkActionDialogProps) {
  const { t } = useTranslation('employees');
  const [role, setRole] = React.useState('Employee');
  const [selectedUnits, setSelectedUnits] = React.useState<number[]>([]);
  const [isPromoting, setIsPromoting] = React.useState(false);
  const bulkUpdateMutation = useBulkUpdateUsers();
  const promoteMutation = usePromoteUser();

  const handleApply = async () => {
    if (mode === 'promote') {
      setIsPromoting(true);
      let successCount = 0;
      for (const id of userIds) {
        try {
          await promoteMutation.mutateAsync(id);
          successCount++;
        } catch {
          // continue promoting remaining users
        }
      }
      setIsPromoting(false);
      if (successCount > 0) {
        toast.success(t('bulk_promote_success', { count: successCount }));
      }
      if (successCount < userIds.length) {
        toast.error(t('bulk_promote_partial', { failed: userIds.length - successCount }));
      }
      onClose();
      return;
    }

    const data = mode === 'role'
      ? { role }
      : { org_unit_ids: selectedUnits };

    bulkUpdateMutation.mutate(
      { userIds, data },
      {
        onSuccess: () => {
          toast.success(t('bulk_update_success', { count: userIds.length }));
          onClose();
        },
        onError: () => toast.error(t('bulk_update_error')),
      }
    );
  };

  const isPending = bulkUpdateMutation.isPending || isPromoting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'role' ? t('set_bulk_role') : mode === 'promote' ? t('promote_to_system') : t('set_bulk_org_units')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('bulk_applying_to', { count: userIds.length })}
          </p>
        </DialogHeader>

        <div className="py-4">
          {mode === 'role' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system_role')}</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="PM">Project Manager</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : mode === 'org_unit' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('org_units')}</label>
              <MultiSelect
                options={orgUnits.map((u) => ({
                  label: u.name,
                  value: u.id.toString(),
                }))}
                value={selectedUnits.map(String)}
                onValueChange={(vals) => setSelectedUnits(vals.map(Number))}
                placeholder={t('select_units')}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('bulk_promote_confirm', { count: userIds.length })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleApply} loading={isPending}>
            {t('apply_to_users', { count: userIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
