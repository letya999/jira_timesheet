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
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useUsers, useMergeUsers } from '@/features/users/hooks';
import { JiraUserResponse, UserResponse, UserType } from '@/api/generated/types.gen';
import { toast } from '@/lib/toast';

interface MergeUserDialogProps {
  importUser: JiraUserResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MergeUserDialog({
  importUser,
  isOpen,
  onClose,
}: MergeUserDialogProps) {
  const { t } = useTranslation('employees');
  const [search, setSearch] = React.useState('');
  const { data: usersData, isLoading } = useUsers({
    search: search || undefined,
    type: UserType.SYSTEM,
    enabled: isOpen,
  });
  const mergeMutation = useMergeUsers();

  const handleMerge = (systemUserId: number) => {
    if (!importUser) return;
    mergeMutation.mutate(
      { jiraUserId: importUser.id, systemUserId },
      {
        onSuccess: () => {
          toast.success(t('merge_success'));
          onClose();
        },
        onError: () => toast.error(t('merge_error')),
      }
    );
  };

  const users: UserResponse[] = usersData?.items?.filter(
    (u): u is UserResponse => 'email' in u
  ) ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('merge_dialog_title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('merge_dialog_subtitle', { name: importUser?.display_name })}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_system_users')}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
            {isLoading ? (
              <p className="text-sm text-center py-4">{t('loading')}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-center py-4">{t('no_users_found')}</p>
            ) : (
              users.map((user: UserResponse) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group"
                >
                  <div>
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMerge(user.id)}
                    loading={mergeMutation.isPending}
                  >
                    {t('merge_action')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
