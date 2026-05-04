import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import type { OrgUnitResponse, UserResponse } from '@/api/generated/types.gen';
import { UnifiedUser } from '@/features/employees/components/employee-columns';
import { useCreateSystemUser, useUpdateUser, usePromoteUser } from '@/features/users/hooks';
import { toast } from '@/lib/toast';

interface UserEditDialogProps {
  user: UnifiedUser | null;
  orgUnits: OrgUnitResponse[];
  isOpen: boolean;
  onClose: () => void;
  onPromoteSuccess?: (creds: UserResponse) => void;
  createMode?: boolean;
}

type FormData = {
  full_name: string;
  email: string;
  role: string;
  org_unit_ids?: number[];
};

function getApiErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || !error) return null;
  const maybe = error as { body?: { detail?: string }; message?: string };
  return maybe.body?.detail ?? maybe.message ?? null;
}

export function UserEditDialog({
  user,
  orgUnits,
  isOpen,
  onClose,
  onPromoteSuccess,
  createMode = false,
}: UserEditDialogProps) {
  const { t } = useTranslation('employees');

  const userSchema = React.useMemo(
    () =>
      z.object({
        full_name: z.string().min(2, t('validation.name_short', 'Name too short')),
        email: z.string().email(t('validation.invalid_email', 'Invalid email')),
        role: z.string(),
        org_unit_ids: z.array(z.number()).optional(),
      }),
    [t]
  );

  const isImport = !createMode && user?.type === 'import';
  const updateMutation = useUpdateUser();
  const promoteMutation = usePromoteUser();
  const createMutation = useCreateSystemUser();

  const form = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'Employee',
      org_unit_ids: [],
    },
  });

  React.useEffect(() => {
    if (createMode) {
      form.reset({
        full_name: '',
        email: '',
        role: 'Employee',
        org_unit_ids: [],
      });
      return;
    }
    if (user) {
      form.reset({
        full_name: user.full_name || user.display_name || '',
        email: user.email || '',
        role: user.role || 'Employee',
        org_unit_ids: user.org_unit_ids || (user.org_unit_id ? [user.org_unit_id] : []),
      });
    }
  }, [user, createMode, form]);

  const onSubmit = (data: FormData) => {
    if (createMode) {
      createMutation.mutate(
        {
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          org_unit_ids: data.org_unit_ids,
        },
        {
          onSuccess: (res) => {
            onPromoteSuccess?.(res as UserResponse);
            toast.success(t('create_success', 'System user created'));
            onClose();
          },
          onError: (err) => toast.error(getApiErrorMessage(err) ?? t('create_error', 'Failed to create user')),
        }
      );
      return;
    }

    if (!user) return;

    if (isImport) {
      promoteMutation.mutate(
        {
          jiraUserId: user.id,
          payload: {
            email_override: data.email,
            full_name_override: data.full_name,
          },
        },
        {
          onSuccess: (res) => {
            onPromoteSuccess?.(res as UserResponse);
            onClose();
          },
          onError: (err) => toast.error(getApiErrorMessage(err) ?? t('promote_error')),
        }
      );
    } else {
      updateMutation.mutate(
        { id: user.id, data },
        {
          onSuccess: () => {
            toast.success(t('update_success_single'));
            onClose();
          },
          onError: (err) => toast.error(getApiErrorMessage(err) ?? t('update_error')),
        }
      );
    }
  };

  const loading = updateMutation.isPending || promoteMutation.isPending || createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createMode ? t('create_system_user') : isImport ? t('create_system_user') : t('edit_user')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('full_name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(!isImport || createMode) && (
              <>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system_role')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">{t('roles.admin', 'Admin')}</SelectItem>
                          <SelectItem value="CEO">{t('roles.ceo', 'CEO')}</SelectItem>
                          <SelectItem value="PM">{t('roles.pm', 'Project Manager')}</SelectItem>
                          <SelectItem value="Employee">{t('roles.employee', 'Employee')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="org_unit_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('org_units')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={orgUnits.map((u) => ({
                            label: u.name,
                            value: u.id.toString(),
                          }))}
                          selected={field.value?.map((v) => v.toString()) ?? []}
                          onChange={(vals) => field.onChange(vals.map(Number))}
                          placeholder={t('select_units')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={loading}>
                {createMode || isImport ? t('create_get_password') : t('save_changes')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
