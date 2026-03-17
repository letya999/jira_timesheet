import { JiraUserResponse } from '@/features/users/schemas';
import { OrgUnitResponse } from '@/features/org/schemas';
import { useUpdateJiraUser } from '@/features/users/hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { jiraUserUpdateSchema } from '@/features/users/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface EmployeeCardProps {
  employee: JiraUserResponse;
  orgUnits: OrgUnitResponse[];
  onClose: () => void;
}

export function EmployeeCard({ employee, orgUnits, onClose }: EmployeeCardProps) {
  const { t } = useTranslation('employees');
  const updateMutation = useUpdateJiraUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(jiraUserUpdateSchema),
    defaultValues: {
      org_unit_id: employee.org_unit_id,
      is_active: employee.is_active,
      weekly_quota: employee.weekly_quota,
    },
  });

  const isActive = watch('is_active');
  const orgUnitId = watch('org_unit_id');

  const onSubmit = (data: any) => {
    updateMutation.mutate(
      { id: employee.id, data },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <SheetContent className="sm:max-w-md">
      <SheetHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={employee.avatar_url || ''} alt={employee.display_name} />
            <AvatarFallback>{employee.display_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <SheetTitle>{employee.display_name}</SheetTitle>
            <SheetDescription>{employee.email}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="grid gap-6 py-4">
        <div className="flex items-center justify-between">
          <Label>{t('system_access')}</Label>
          <Badge variant={employee.user_id ? 'default' : 'secondary'}>
            {employee.user_id ? t('access_granted') : t('no_access')}
          </Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org_unit">{t('org_unit')}</Label>
            <Select
              value={orgUnitId?.toString() || 'unassigned'}
              onValueChange={(val) =>
                setValue('org_unit_id', val === 'unassigned' ? null : Number(val), {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="org_unit">
                <SelectValue placeholder={t('unassigned')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                {orgUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly_quota">{t('weekly_quota')}</Label>
            <Input
              id="weekly_quota"
              type="number"
              {...register('weekly_quota', { valueAsNumber: true })}
            />
            {errors.weekly_quota && (
              <p className="text-xs text-destructive">{errors.weekly_quota.message as string}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">{t('active_employee')}</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked, { shouldDirty: true })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending ? t('saving') : t('save_changes')}
            </Button>
          </div>
        </form>
      </div>
    </SheetContent>
  );
}
